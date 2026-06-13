// ══ CONFIG ════════════════════════════════════════════════════
const API = 'http://localhost:3000/api';

// ══ STATE ═════════════════════════════════════════════════════
let veiculos    = [];
let currentView = 'dashboard';
let listMode    = false;
let searchQuery = '';
let editId      = null;
let detalheId   = null;

// ══ INIT ══════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', async () => {
  await loadVeiculos();
  renderView('dashboard');
  bindEvents();
});

// ══ API ═══════════════════════════════════════════════════════
async function api(method, path, body) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(API + path, opts);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function loadVeiculos() {
  try {
    veiculos = await api('GET', '/veiculos');
  } catch {
    toast('Erro ao conectar com o servidor', 'error');
    veiculos = [];
  }
}

// ══ EVENTS ════════════════════════════════════════════════════
function bindEvents() {

  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderView(btn.dataset.view);
    });
  });

  document.getElementById('sidebarToggle').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('collapsed');
  });

  document.getElementById('btnNovoVeiculo').addEventListener('click', () => openModal());
  document.getElementById('btnGrid').addEventListener('click', () => setListMode(false));
  document.getElementById('btnList').addEventListener('click', () => setListMode(true));

  document.getElementById('searchInput').addEventListener('input', e => {
    searchQuery = e.target.value.toLowerCase();
    if (currentView === 'veiculos') renderVeiculos();
  });

  document.getElementById('filtroTipo').addEventListener('change', renderVeiculos);
  document.getElementById('filtroStatus').addEventListener('change', renderVeiculos);

  document.getElementById('formVeiculo').addEventListener('submit', saveVeiculo);
  document.getElementById('closeModal').addEventListener('click', closeModal);
  document.getElementById('cancelModal').addEventListener('click', closeModal);
  document.getElementById('modalVeiculo').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeModal();
  });

  document.getElementById('closeDetalhe').addEventListener('click', closeDetalhe);
  document.getElementById('modalDetalhe').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeDetalhe();
  });

  document.getElementById('btnExportar').addEventListener('click', exportarXLS);

  document.getElementById('btnImportar').addEventListener('click', () => {
    document.getElementById('inputImportar').click();
  });
  document.getElementById('inputImportar').addEventListener('change', e => {
    const file = e.target.files[0];
    if (file) importarArquivo(file);
    e.target.value = '';
  });
}

// ══ VIEW ROUTER ═══════════════════════════════════════════════
function renderView(view) {
  currentView = view;
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById(`view-${view}`).classList.add('active');

  const titles = {
    dashboard:   'Dashboard',
    veiculos:    'Veiculos',
    vencimentos: 'Vencimentos',
    documentos:  'Documentos'
  };
  document.getElementById('pageTitle').textContent = titles[view];

  if (view === 'dashboard')   renderDashboard();
  if (view === 'veiculos')    renderVeiculos();
  if (view === 'vencimentos') renderVencimentos();
  if (view === 'documentos')  renderDocumentos();
}

// ══ DASHBOARD ════════════════════════════════════════════════
function renderDashboard() {
  const total     = veiculos.length;
  const regulares = veiculos.filter(v => v.status === 'Regular').length;
  const pendentes = veiculos.filter(v => v.status === 'Pendente').length;
  const vencidos  = veiculos.filter(v => v.status === 'Vencido').length;
  const totalDocs = veiculos.reduce((a, v) => a + (v.documentos || []).length, 0);

  const stats = [
    { label: 'Total Veiculos', value: total,     cor: '#ffb300' },
    { label: 'Regulares',      value: regulares, cor: '#22c55e' },
    { label: 'Pendentes',      value: pendentes, cor: '#f59e0b' },
    { label: 'Vencidos',       value: vencidos,  cor: '#ef4444' },
    { label: 'Documentos',     value: totalDocs, cor: '#ff7a18' }
  ];

  document.getElementById('statsGrid').innerHTML = stats.map((s, i) => `
    <div class="stat-card" style="animation-delay:${i * .07}s;border-top-color:${s.cor}">
      <div class="stat-value" style="color:${s.cor}">${s.value}</div>
      <div class="stat-label">${s.label}</div>
    </div>`).join('');

  renderAlertas();
  renderUltimos();
}

function renderAlertas() {
  const hoje0 = new Date();
  hoje0.setHours(0,0,0,0);

  const campos = [
    { key: 'ipva',          label: 'IPVA'         },
    { key: 'licenciamento', label: 'Licenciamento' },
    { key: 'seguro',        label: 'Seguro'        },
    { key: 'cnh',           label: 'CNH'           },
    { key: 'revisao',       label: 'Revisao'       },
    { key: 'vistoria',      label: 'Vistoria'      }
  ];

  const alertas = [];
  veiculos.forEach(v => {
    campos.forEach(c => {
      if (!v[c.key]) return;
      const d    = new Date(v[c.key] + 'T00:00:00');
      const dias = Math.ceil((d - hoje0) / 86400000);
      if (dias <= 60) alertas.push({ veiculo: v.apelido || v.placa || 'Sem nome', tipo: c.label, dias, data: d, id: v.id });
    });
  });
  alertas.sort((a, b) => a.dias - b.dias);

  const countEl = document.getElementById('countAlertas');
  if (countEl) countEl.textContent = alertas.length;

  const el = document.getElementById('alertasVencimento');
  if (!alertas.length) {
    el.innerHTML = `<div class="empty-state" style="padding:24px"><p>Nenhum vencimento proximo nos proximos 60 dias</p></div>`;
    return;
  }
  el.innerHTML = alertas.slice(0, 7).map(a => {
    const cor = a.dias < 0 ? '#ef4444' : a.dias <= 15 ? '#f59e0b' : '#22c55e';
    const txt = a.dias < 0 ? `Vencido ha ${Math.abs(a.dias)}d` : a.dias === 0 ? 'Vence hoje' : `${a.dias}d restantes`;
    return `
      <div class="alerta-item" onclick="openDetalhe('${a.id}')" style="cursor:pointer">
        <div class="alerta-dot" style="background:${cor}"></div>
        <div class="alerta-info">
          <strong>${a.veiculo}</strong>
          <small>${a.tipo} — ${formatDate(a.data)}</small>
        </div>
        <span class="alerta-badge" style="background:${cor}22;color:${cor}">${txt}</span>
      </div>`;
  }).join('');
}

function renderUltimos() {
  const sorted = [...veiculos].sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm));
  const el     = document.getElementById('ultimosCadastros');
  if (!sorted.length) {
    el.innerHTML = `<div class="empty-state" style="padding:24px"><p>Nenhum veiculo cadastrado ainda</p></div>`;
    return;
  }
  el.innerHTML = sorted.slice(0, 6).map(v => `
    <div class="alerta-item" style="cursor:pointer" onclick="openDetalhe('${v.id}')">
      <div style="width:34px;height:34px;background:rgba(255,179,0,.1);border:1px solid rgba(255,179,0,.2);border-radius:8px;display:flex;align-items:center;justify-content:center;color:#ffb300;flex-shrink:0">
        ${svgCar(16)}
      </div>
      <div class="alerta-info">
        <strong>${v.apelido || 'Sem nome'}</strong>
        <small>${[v.marca, v.modelo, v.ano].filter(Boolean).join(' ')} — ${v.placa || ''}</small>
      </div>
      <span class="status-badge status-${v.status || 'Regular'}">${v.status || 'Regular'}</span>
    </div>`).join('');
}

// ══ VEÍCULOS ════════════════════════════════════════════════
function renderVeiculos() {
  const tipo   = document.getElementById('filtroTipo').value;
  const status = document.getElementById('filtroStatus').value;

  const filtered = veiculos.filter(v => {
    const matchQ = !searchQuery ||
      (v.apelido      || '').toLowerCase().includes(searchQuery) ||
      (v.placa        || '').toLowerCase().includes(searchQuery) ||
      (v.marca        || '').toLowerCase().includes(searchQuery) ||
      (v.modelo       || '').toLowerCase().includes(searchQuery) ||
      (v.proprietario || '').toLowerCase().includes(searchQuery);
    const matchT = !tipo   || v.tipo   === tipo;
    const matchS = !status || v.status === status;
    return matchQ && matchT && matchS;
  });

  const grid = document.getElementById('veiculosGrid');
  if (listMode) grid.classList.add('list-view');
  else          grid.classList.remove('list-view');

  if (!filtered.length) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        ${svgCar(48)}
        <h3>Nenhum veiculo encontrado</h3>
        <p>Cadastre clicando em "+ Novo Veiculo"</p>
      </div>`;
    return;
  }

  grid.innerHTML = filtered.map((v, i) => {
    const pv = proximoVencimento(v);
    return `
      <div class="veiculo-card" style="animation-delay:${i * .05}s" onclick="openDetalhe('${v.id}')">
        <div class="veiculo-card-top">
          <div class="veiculo-icon">${svgCar(22)}</div>
          <div>
            <div class="veiculo-name">${v.apelido || 'Sem nome'}</div>
            <div class="veiculo-plate">${v.placa || '---'}</div>
          </div>
        </div>
        <div class="veiculo-meta">
          ${v.marca  ? `<span><strong>${v.marca}</strong> ${v.modelo || ''} ${v.ano || ''}</span>` : ''}
          ${v.cor    ? `<span>Cor: <strong>${v.cor}</strong></span>` : ''}
          ${v.proprietario ? `<span>Prop: <strong>${v.proprietario}</strong></span>` : ''}
          ${pv       ? `<span style="color:${pv.cor}">${pv.label}: ${pv.txt}</span>` : ''}
        </div>
        <div class="veiculo-footer">
          <span class="status-badge status-${v.status || 'Regular'}">${v.status || 'Regular'}</span>
          <div class="veiculo-actions" onclick="event.stopPropagation()">
            <button class="icon-btn btn-sm" title="Editar" onclick="openModal('${v.id}')">${svgEdit()}</button>
            <button class="icon-btn btn-sm" title="Deletar" onclick="deletarVeiculo('${v.id}')">${svgTrash()}</button>
          </div>
        </div>
      </div>`;
  }).join('');
}

function proximoVencimento(v) {
  const campos = [
    { key: 'ipva', label: 'IPVA' }, { key: 'licenciamento', label: 'Licenciamento' },
    { key: 'seguro', label: 'Seguro' }, { key: 'cnh', label: 'CNH' },
    { key: 'revisao', label: 'Revisao' }, { key: 'vistoria', label: 'Vistoria' }
  ];
  const hoje0 = new Date(); hoje0.setHours(0,0,0,0);
  let menor = null;
  campos.forEach(c => {
    if (!v[c.key]) return;
    const d    = new Date(v[c.key] + 'T00:00:00');
    const dias = Math.ceil((d - hoje0) / 86400000);
    if (!menor || dias < menor.dias) menor = {
      label: c.label, dias,
      cor: dias < 0 ? '#ef4444' : dias <= 15 ? '#f59e0b' : '#22c55e',
      txt: dias < 0 ? `Vencido ${Math.abs(dias)}d` : `${dias}d`
    };
  });
  return menor;
}

// ══ VENCIMENTOS ══════════════════════════════════════════════
function renderVencimentos() {
  const campos = [
    { key: 'ipva', label: 'IPVA' }, { key: 'licenciamento', label: 'Licenciamento' },
    { key: 'seguro', label: 'Seguro' }, { key: 'cnh', label: 'CNH' },
    { key: 'revisao', label: 'Revisao' }, { key: 'vistoria', label: 'Vistoria' }
  ];
  const hoje0 = new Date(); hoje0.setHours(0,0,0,0);
  const rows  = [];

  veiculos.forEach(v => {
    campos.forEach(c => {
      if (!v[c.key]) return;
      const d    = new Date(v[c.key] + 'T00:00:00');
      const dias = Math.ceil((d - hoje0) / 86400000);
      rows.push({ v, c, d, dias });
    });
  });
  rows.sort((a, b) => a.dias - b.dias);

  const el = document.getElementById('vencimentosWrap');
  if (!rows.length) {
    el.innerHTML = `<div class="empty-state">${svgCal(48)}<h3>Nenhuma data cadastrada</h3><p>Adicione datas nos veiculos para acompanhar aqui</p></div>`;
    return;
  }
  el.innerHTML = rows.map((r, i) => {
    const cor = r.dias < 0 ? '#ef4444' : r.dias <= 15 ? '#f59e0b' : '#22c55e';
    const cls = r.dias < 0 ? 'venc-danger' : r.dias <= 15 ? 'venc-warning' : 'venc-ok';
    const txt = r.dias < 0 ? `Vencido ha ${Math.abs(r.dias)} dias` : r.dias === 0 ? 'Vence hoje' : `${r.dias} dias restantes`;
    return `
      <div class="venc-row ${cls}" style="animation-delay:${i * .04}s;cursor:pointer" onclick="openDetalhe('${r.v.id}')">
        <div>
          <div class="venc-name">${r.v.apelido || 'Sem nome'}</div>
          <div class="venc-tipo">${r.v.placa || ''} — ${r.v.marca || ''} ${r.v.modelo || ''}</div>
        </div>
        <div class="venc-date">${r.c.label}</div>
        <div class="venc-date">${formatDate(r.d)}</div>
        <div class="venc-dias" style="color:${cor}">${txt}</div>
      </div>`;
  }).join('');
}

// ══ DOCUMENTOS ═══════════════════════════════════════════════
function renderDocumentos() {
  const el      = document.getElementById('documentosWrap');
  const comDocs = veiculos.filter(v => (v.documentos || []).length > 0);
  if (!comDocs.length) {
    el.innerHTML = `<div class="empty-state">${svgDoc(48)}<h3>Nenhum documento enviado</h3><p>Abra um veiculo e envie documentos nos detalhes</p></div>`;
    return;
  }
  el.innerHTML = comDocs.map(v => `
    <div class="doc-section">
      <div class="doc-section-header">
        <span>${v.apelido || 'Sem nome'} — ${v.placa || ''}</span>
        <span class="doc-count">${v.documentos.length} arquivo(s)</span>
      </div>
      <div class="doc-list">
        ${v.documentos.map(d => `
          <div class="doc-item">
            <div class="doc-icon">${svgDoc(15)}</div>
            <div class="doc-info">
              <strong>${d.nome}</strong>
              <small>${d.tipo} — ${formatBytes(d.tamanho)} — ${formatDate(new Date(d.criadoEm))}</small>
            </div>
            <div style="display:flex;gap:6px">
              <a href="${d.url}" target="_blank" class="btn btn-ghost btn-sm">Ver</a>
              <button class="btn btn-danger btn-sm" onclick="deletarDoc('${v.id}','${d.id}')">X</button>
            </div>
          </div>`).join('')}
      </div>
    </div>`).join('');
}

// ══ MODAL VEICULO ═════════════════════════════════════════════
function openModal(id = null) {
  editId = id;
  document.getElementById('formVeiculo').reset();
  document.getElementById('veiculoId').value = '';
  const title = document.getElementById('modalTitle');

  if (id) {
    const v = veiculos.find(x => x.id === id);
    if (!v) return;
    title.textContent = 'Editar Veiculo';
    document.getElementById('veiculoId').value     = v.id;
    document.getElementById('fApelido').value      = v.apelido      || '';
    document.getElementById('fPlaca').value        = v.placa        || '';
    document.getElementById('fTipo').value         = v.tipo         || '';
    document.getElementById('fStatus').value       = v.status       || 'Regular';
    document.getElementById('fMarca').value        = v.marca        || '';
    document.getElementById('fModelo').value       = v.modelo       || '';
    document.getElementById('fAno').value          = v.ano          || '';
    document.getElementById('fCor').value          = v.cor          || '';
    document.getElementById('fRenavam').value      = v.renavam      || '';
    document.getElementById('fChassi').value       = v.chassi       || '';
    document.getElementById('fProprietario').value = v.proprietario || '';
    document.getElementById('fObs').value          = v.obs          || '';
    document.getElementById('fIpva').value         = v.ipva         || '';
    document.getElementById('fLicenciamento').value= v.licenciamento|| '';
    document.getElementById('fSeguro').value       = v.seguro       || '';
    document.getElementById('fCnh').value          = v.cnh          || '';
    document.getElementById('fRevisao').value      = v.revisao      || '';
    document.getElementById('fVistoria').value     = v.vistoria     || '';
  } else {
    title.textContent = 'Novo Veiculo';
  }

  document.getElementById('modalVeiculo').classList.add('open');
}

function closeModal() {
  document.getElementById('modalVeiculo').classList.remove('open');
  editId = null;
}

// ══ SALVAR VEICULO ════════════════════════════════════════════
async function saveVeiculo(e) {
  e.preventDefault();
  const dados = {
    apelido:        document.getElementById('fApelido').value.trim(),
    placa:          document.getElementById('fPlaca').value.trim().toUpperCase(),
    tipo:           document.getElementById('fTipo').value,
    status:         document.getElementById('fStatus').value,
    marca:          document.getElementById('fMarca').value.trim(),
    modelo:         document.getElementById('fModelo').value.trim(),
    ano:            document.getElementById('fAno').value,
    cor:            document.getElementById('fCor').value.trim(),
    renavam:        document.getElementById('fRenavam').value.trim(),
    chassi:         document.getElementById('fChassi').value.trim(),
    proprietario:   document.getElementById('fProprietario').value.trim(),
    obs:            document.getElementById('fObs').value.trim(),
    ipva:           document.getElementById('fIpva').value,
    licenciamento:  document.getElementById('fLicenciamento').value,
    seguro:         document.getElementById('fSeguro').value,
    cnh:            document.getElementById('fCnh').value,
    revisao:        document.getElementById('fRevisao').value,
    vistoria:       document.getElementById('fVistoria').value
  };

  try {
    if (editId) {
      await api('PUT', `/veiculos/${editId}`, dados);
      toast('Veiculo atualizado', 'success');
    } else {
      await api('POST', '/veiculos', dados);
      toast('Veiculo cadastrado', 'success');
    }
    await loadVeiculos();
    closeModal();
    renderView(currentView);
  } catch (err) {
    toast('Erro ao salvar: ' + err.message, 'error');
  }
}

// ══ DELETAR VEICULO ════════════════════════════════════════════
async function deletarVeiculo(id) {
  const v = veiculos.find(x => x.id === id);
  if (!confirm(`Deletar "${v?.apelido || v?.placa}"? Esta acao nao pode ser desfeita.`)) return;
  try {
    await api('DELETE', `/veiculos/${id}`);
    toast('Veiculo removido', 'success');
    await loadVeiculos();
    renderView(currentView);
    if (detalheId === id) closeDetalhe();
  } catch (err) {
    toast('Erro ao deletar: ' + err.message, 'error');
  }
}

// ══ MODAL DETALHE ═════════════════════════════════════════════
function openDetalhe(id) {
  detalheId = id;
  const v   = veiculos.find(x => x.id === id);
  if (!v) return;

  document.getElementById('detalheTitle').textContent = v.apelido || 'Detalhe';

  const campos = [
    { key: 'ipva', label: 'IPVA' }, { key: 'licenciamento', label: 'Licenciamento' },
    { key: 'seguro', label: 'Seguro' }, { key: 'cnh', label: 'CNH' },
    { key: 'revisao', label: 'Revisao' }, { key: 'vistoria', label: 'Vistoria' }
  ];
  const hoje0 = new Date(); hoje0.setHours(0,0,0,0);

  const datasHTML = campos.map(c => {
    if (!v[c.key]) return `<div class="data-pill"><label>${c.label}</label><span style="color:var(--text-muted)">—</span></div>`;
    const d    = new Date(v[c.key] + 'T00:00:00');
    const dias = Math.ceil((d - hoje0) / 86400000);
    const cor  = dias < 0 ? '#ef4444' : dias <= 15 ? '#f59e0b' : '#22c55e';
    const sub  = dias < 0 ? `Vencido ${Math.abs(dias)}d` : dias === 0 ? 'Hoje' : `${dias}d`;
    return `
      <div class="data-pill" style="border-color:${cor}44">
        <label>${c.label}</label>
        <span style="color:${cor}">${formatDate(d)}</span>
        <small style="color:${cor};font-size:10px">${sub}</small>
      </div>`;
  }).join('');

  const docsHTML = (v.documentos || []).length
    ? v.documentos.map(d => `
        <div class="doc-item">
          <div class="doc-icon">${svgDoc(15)}</div>
          <div class="doc-info">
            <strong>${d.nome}</strong>
            <small>${d.tipo} — ${formatBytes(d.tamanho)}</small>
          </div>
          <div style="display:flex;gap:6px">
            <a href="${d.url}" target="_blank" class="btn btn-ghost btn-sm">Ver</a>
            <button class="btn btn-danger btn-sm" onclick="deletarDoc('${v.id}','${d.id}')">X</button>
          </div>
        </div>`).join('')
    : `<p style="color:var(--text-muted);font-size:13px;padding:8px 0">Nenhum documento enviado</p>`;

  document.getElementById('detalheBody').innerHTML = `
    <div class="detalhe-grid">
      <div class="detalhe-info-group">
        <div class="detalhe-item"><label>Placa</label><span class="veiculo-plate" style="font-size:14px">${v.placa || '—'}</span></div>
        <div class="detalhe-item"><label>Tipo</label><span>${v.tipo || '—'}</span></div>
        <div class="detalhe-item"><label>Marca / Modelo</label><span>${[v.marca, v.modelo, v.ano].filter(Boolean).join(' ') || '—'}</span></div>
        <div class="detalhe-item"><label>Cor</label><span>${v.cor || '—'}</span></div>
        <div class="detalhe-item"><label>RENAVAM</label><span>${v.renavam || '—'}</span></div>
        <div class="detalhe-item"><label>Chassi</label><span style="font-size:12px">${v.chassi || '—'}</span></div>
      </div>
      <div class="detalhe-info-group">
        <div class="detalhe-item"><label>Proprietario</label><span>${v.proprietario || '—'}</span></div>
        <div class="detalhe-item"><label>Status</label><span class="status-badge status-${v.status || 'Regular'}">${v.status || 'Regular'}</span></div>
        <div class="detalhe-item"><label>Cadastrado em</label><span>${v.criadoEm ? formatDate(new Date(v.criadoEm)) : '—'}</span></div>
        ${v.obs ? `<div class="detalhe-item"><label>Observacoes</label><span style="font-size:13px;color:var(--text-sub)">${v.obs}</span></div>` : ''}
      </div>
    </div>

    <div class="form-section"><h3>Datas e Vencimentos</h3>
      <div class="datas-grid">${datasHTML}</div>
    </div>

    <div class="docs-section">
      <div class="docs-section-title"><span>Documentos (${(v.documentos || []).length})</span></div>
      <form class="upload-form" onsubmit="uploadDoc(event,'${v.id}')">
        <div style="display:grid;grid-template-columns:1fr 130px 160px auto;gap:8px;align-items:end;margin-bottom:12px">
          <div class="form-group"><label>Nome</label><input type="text" id="uploadNome" placeholder="Ex: CRLV 2025"/></div>
          <div class="form-group"><label>Tipo</label>
            <select id="uploadTipo">
              <option>CRLV</option><option>IPVA</option><option>Seguro</option>
              <option>CNH</option><option>Laudo</option><option>Outro</option>
            </select>
          </div>
          <div class="form-group"><label>Arquivo</label><input type="file" id="uploadFile" accept=".pdf,.jpg,.jpeg,.png,.webp" required/></div>
          <button type="submit" class="btn btn-primary">Enviar</button>
        </div>
      </form>
      <div id="docListDetalhe">${docsHTML}</div>
    </div>

    <div style="display:flex;gap:10px;justify-content:flex-end;padding-top:16px;border-top:1px solid var(--border);margin-top:8px">
      <button class="btn btn-ghost" onclick="openModal('${v.id}')">Editar</button>
      <button class="btn btn-danger" onclick="deletarVeiculo('${v.id}')">Deletar</button>
    </div>`;

  document.getElementById('modalDetalhe').classList.add('open');
}

function closeDetalhe() {
  document.getElementById('modalDetalhe').classList.remove('open');
  detalheId = null;
}

// ══ UPLOAD DOCUMENTO ══════════════════════════════════════════
async function uploadDoc(e, veiculoId) {
  e.preventDefault();
  const nome = document.getElementById('uploadNome').value.trim();
  const tipo = document.getElementById('uploadTipo').value;
  const file = document.getElementById('uploadFile').files[0];
  if (!file) { toast('Selecione um arquivo', 'warn'); return; }

  const form = new FormData();
  form.append('arquivo', file);
  form.append('nome', nome || file.name);
  form.append('tipo', tipo);

  try {
    const res = await fetch(`${API}/veiculos/${veiculoId}/documentos`, { method: 'POST', body: form });
    if (!res.ok) throw new Error(await res.text());
    toast('Documento enviado', 'success');
    await loadVeiculos();
    openDetalhe(veiculoId);
  } catch (err) {
    toast('Erro ao enviar: ' + err.message, 'error');
  }
}

// ══ DELETAR DOCUMENTO ════════════════════════════════════════
async function deletarDoc(veiculoId, docId) {
  if (!confirm('Remover este documento?')) return;
  try {
    await api('DELETE', `/veiculos/${veiculoId}/documentos/${docId}`);
    toast('Documento removido', 'success');
    await loadVeiculos();
    if (detalheId === veiculoId) openDetalhe(veiculoId);
    else renderView(currentView);
  } catch (err) {
    toast('Erro ao remover: ' + err.message, 'error');
  }
}

// ══ GRID / LISTA TOGGLE ═══════════════════════════════════════
function setListMode(val) {
  listMode = val;
  document.getElementById('btnGrid').classList.toggle('active', !val);
  document.getElementById('btnList').classList.toggle('active',  val);
  if (currentView === 'veiculos') renderVeiculos();
}

// ══ EXPORTAR XLS ══════════════════════════════════════════════
async function exportarXLS() {
  try {
    const dados = await api('GET', '/veiculos');

    const linhas = dados.map(v => ({
      'Apelido':          v.apelido        || '',
      'Placa':            v.placa          || '',
      'Tipo':             v.tipo           || '',
      'Status':           v.status         || '',
      'Marca':            v.marca          || '',
      'Modelo':           v.modelo         || '',
      'Ano':              v.ano            || '',
      'Cor':              v.cor            || '',
      'RENAVAM':          v.renavam        || '',
      'Chassi':           v.chassi         || '',
      'Proprietario':     v.proprietario   || '',
      'Observacoes':      v.obs            || '',
      'Venc. IPVA':       v.ipva           || '',
      'Venc. Licenciamento': v.licenciamento || '',
      'Venc. Seguro':     v.seguro         || '',
      'Venc. CNH':        v.cnh            || '',
      'Proxima Revisao':  v.revisao        || '',
      'Vistoria':         v.vistoria       || '',
      'Qtd Documentos':   (v.documentos || []).length,
      'Cadastrado em':    v.criadoEm ? new Date(v.criadoEm).toLocaleDateString('pt-BR') : ''
    }));

    const ws = XLSX.utils.json_to_sheet(linhas);

    // Largura das colunas
    ws['!cols'] = [
      { wch: 22 }, { wch: 12 }, { wch: 12 }, { wch: 12 },
      { wch: 16 }, { wch: 16 }, { wch: 8  }, { wch: 12 },
      { wch: 16 }, { wch: 24 }, { wch: 22 }, { wch: 28 },
      { wch: 16 }, { wch: 20 }, { wch: 14 }, { wch: 12 },
      { wch: 16 }, { wch: 12 }, { wch: 14 }, { wch: 16 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Veiculos');

    const nome = `MeR_Seminovos_${new Date().toISOString().slice(0,10)}.xlsx`;
    XLSX.writeFile(wb, nome);

    toast('Exportado para .XLS com sucesso', 'success');
  } catch (err) {
    toast('Erro ao exportar: ' + err.message, 'error');
  }
}

// ══ IMPORTAR XLS / XLSX / JSON ════════════════════════════════
async function importarArquivo(file) {
  try {
    const ext = file.name.split('.').pop().toLowerCase();
    let arr   = [];

    if (ext === 'json') {
      const text = await file.text();
      const data = JSON.parse(text);
      arr = Array.isArray(data) ? data : (Array.isArray(data.veiculos) ? data.veiculos : []);
      if (!arr.length) throw new Error('Nenhum registro no JSON');
    }

    if (ext === 'xls' || ext === 'xlsx') {
      const buffer   = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
      const sheet    = workbook.Sheets[workbook.SheetNames[0]];
      const rows     = XLSX.utils.sheet_to_json(sheet, { defval: '' });

      if (!rows.length) throw new Error('Planilha vazia');

      arr = rows.map(row => mapRowParaVeiculo(row));
    }

    if (!arr.length) throw new Error('Nenhum dado encontrado');

    await api('POST', '/veiculos/replace', arr);
    await loadVeiculos();
    renderView(currentView);
    toast(`${arr.length} veiculos importados com sucesso`, 'success');

  } catch (err) {
    toast('Erro ao importar: ' + err.message, 'error');
  }
}

// ══ MAPEAMENTO DE COLUNAS XLS → VEICULO ══════════════════════
function pick(row, aliases) {
  const keys = Object.keys(row);
  for (const alias of aliases) {
    const found = keys.find(k =>
      k.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'') ===
      alias.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    );
    if (found !== undefined) return String(row[found]).trim();
  }
  return '';
}

function parseData(val) {
  if (!val) return '';
  if (val instanceof Date && !isNaN(val)) return val.toISOString().slice(0,10);
  if (typeof val === 'number') {
    const info = XLSX.SSF.parse_date_code(val);
    if (!info) return '';
    return `${String(info.y).padStart(4,'0')}-${String(info.m).padStart(2,'0')}-${String(info.d).padStart(2,'0')}`;
  }
  const s  = String(val).trim();
  const br = s.match(/
^
(\d{2})\/(\d{2})\/(\d{4})
$
/);
  if (br) return `${br[3]}-${br[2]}-${br[1]}`;
  const d  = new Date(s);
  return isNaN(d) ? '' : d.toISOString().slice(0,10);
}

function mapRowParaVeiculo(row) {
  return {
    id:           crypto.randomUUID(),
    criadoEm:     new Date().toISOString(),
    atualizadoEm: new Date().toISOString(),
    documentos:   [],
    apelido:       pick(row, ['Apelido','Nome','Apelido / Nome']),
    placa:         pick(row, ['Placa']),
    tipo:          pick(row, ['Tipo']),
    status:        pick(row, ['Status']) || 'Regular',
    marca:         pick(row, ['Marca']),
    modelo:        pick(row, ['Modelo']),
    ano:           pick(row, ['Ano']),
    cor:           pick(row, ['Cor']),
    renavam:       pick(row, ['RENAVAM','Renavam']),
    chassi:        pick(row, ['Chassi']),
    proprietario:  pick(row, ['Proprietario','Proprietário']),
    obs:           pick(row, ['Observacoes','Observações','Obs']),
    ipva:          parseData(pick(row, ['Venc. IPVA','IPVA','Vencimento IPVA'])),
    licenciamento: parseData(pick(row, ['Venc. Licenciamento','Licenciamento'])),
    seguro:        parseData(pick(row, ['Venc. Seguro','Seguro'])),
    cnh:           parseData(pick(row, ['Venc. CNH','CNH'])),
    revisao:       parseData(pick(row, ['Proxima Revisao','Revisao','Revisão'])),
    vistoria:      parseData(pick(row, ['Vistoria']))
  };
}

// ══ TOAST ═════════════════════════════════════════════════════
function toast(msg, tipo = 'success') {
  const wrap  = document.getElementById('toastWrap');
  const cores = { success: '#22c55e', error: '#ef4444', warn: '#f59e0b' };
  const el    = document.createElement('div');
  el.className = `toast ${tipo}`;
  el.innerHTML = `
    <div style="width:8px;height:8px;border-radius:50%;background:${cores[tipo]||cores.success};flex-shrink:0"></div>
    <span>${msg}</span>`;
  wrap.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

// ══ UTILS ═════════════════════════════════════════════════════
function formatDate(d) {
  if (!d || isNaN(new Date(d))) return '—';
  const dt = d instanceof Date ? d : new Date(d);
  return dt.toLocaleDateString('pt-BR');
}

function formatBytes(b) {
  if (!b) return '—';
  if (b < 1024)    return b + ' B';
  if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
  return (b / 1048576).toFixed(1) + ' MB';
}

// ══ SVG ICONS ════════════════════════════════════════════════
function svgCar(s = 20) {
  return `<svg width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
    <path d="M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v3"/>
    <rect x="9" y="11" width="14" height="10" rx="2"/>
    <circle cx="12" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
  </svg>`;
}
function svgEdit() {
  return `<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>`;
}
function svgTrash() {
  return `<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
    <path d="M10 11v6M14 11v6"/>
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
  </svg>`;
}
function svgDoc(s = 20) {
  return `<svg width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14,2 14,8 20,8"/>
  </svg>`;
}
function svgCal(s = 20) {
  return `<svg width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
    <rect x="3" y="4" width="18" height="18" rx="2"/>
    <path d="M16 2v4M8 2v4M3 10h18"/>
  </svg>`;
}
