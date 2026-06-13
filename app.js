// ══════════════════════════════════════════════════════════════
//  MeR Seminovos — 100% localStorage, zero servidor, zero fetch
// ══════════════════════════════════════════════════════════════

const CHAVE = 'mer_veiculos_v1';

// ── State ─────────────────────────────────────────────────────
let DB          = [];
let currentView = 'dashboard';
let listMode    = false;
let searchQuery = '';
let editId      = null;
let detalheId   = null;

// ── Persistencia ──────────────────────────────────────────────
function salvar() {
  try { localStorage.setItem(CHAVE, JSON.stringify(DB)); } catch(e) { toast('Erro ao salvar no cache', 'error'); }
}
function carregar() {
  try { const r = localStorage.getItem(CHAVE); return r ? JSON.parse(r) : []; }
  catch(e) { return []; }
}

// ── CRUD local ────────────────────────────────────────────────
function dbGet(id)     { return DB.find(v => v.id === id); }
function dbAdd(obj)    { DB.push(obj); salvar(); }
function dbUpdate(obj) { const i = DB.findIndex(v => v.id === obj.id); if (i > -1) { DB[i] = obj; salvar(); } }
function dbDelete(id)  { DB = DB.filter(v => v.id !== id); salvar(); }
function uid()         { return Date.now().toString(36) + Math.random().toString(36).slice(2); }

// ── Init ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function() {
  DB = carregar();
  bindEvents();
  renderView('dashboard');
});

// ── Eventos ───────────────────────────────────────────────────
function bindEvents() {

  // Nav
  document.querySelectorAll('.nav-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.nav-btn').forEach(function(b) { b.classList.remove('active'); });
      btn.classList.add('active');
      renderView(btn.dataset.view);
    });
  });

  // Sidebar toggle
  document.getElementById('sidebarToggle').addEventListener('click', function() {
    document.getElementById('sidebar').classList.toggle('collapsed');
  });

  // Novo veiculo
  document.getElementById('btnNovoVeiculo').addEventListener('click', function() {
    abrirModal(null);
  });

  // Salvar veiculo
  document.getElementById('btnSalvar').addEventListener('click', function() {
    salvarVeiculo();
  });

  // Fechar modais
  document.getElementById('closeModal').addEventListener('click', fecharModal);
  document.getElementById('cancelModal').addEventListener('click', fecharModal);
  document.getElementById('closeDetalhe').addEventListener('click', fecharDetalhe);

  document.getElementById('modalVeiculo').addEventListener('click', function(e) {
    if (e.target === e.currentTarget) fecharModal();
  });
  document.getElementById('modalDetalhe').addEventListener('click', function(e) {
    if (e.target === e.currentTarget) fecharDetalhe();
  });

  // Filtros e busca
  document.getElementById('searchInput').addEventListener('input', function(e) {
    searchQuery = e.target.value.toLowerCase();
    if (currentView === 'veiculos') renderVeiculos();
  });
  document.getElementById('filtroTipo').addEventListener('change', function() {
    if (currentView === 'veiculos') renderVeiculos();
  });
  document.getElementById('filtroStatus').addEventListener('change', function() {
    if (currentView === 'veiculos') renderVeiculos();
  });

  // Grid / Lista
  document.getElementById('btnGrid').addEventListener('click', function() { setListMode(false); });
  document.getElementById('btnList').addEventListener('click', function() { setListMode(true); });

  // Export / Import
  document.getElementById('btnExportar').addEventListener('click', exportarXLS);
  document.getElementById('btnImportar').addEventListener('click', function() {
    document.getElementById('inputImportar').click();
  });
  document.getElementById('inputImportar').addEventListener('change', function(e) {
    var file = e.target.files[0];
    if (file) importarArquivo(file);
    e.target.value = '';
  });
}

// ── View Router ───────────────────────────────────────────────
function renderView(view) {
  currentView = view;
  document.querySelectorAll('.view').forEach(function(v) { v.classList.remove('active'); });
  document.getElementById('view-' + view).classList.add('active');
  var titles = { dashboard: 'Dashboard', veiculos: 'Veiculos', vencimentos: 'Vencimentos', documentos: 'Documentos' };
  document.getElementById('pageTitle').textContent = titles[view] || view;

  if (view === 'dashboard')   renderDashboard();
  if (view === 'veiculos')    renderVeiculos();
  if (view === 'vencimentos') renderVencimentos();
  if (view === 'documentos')  renderDocumentos();
}

// ── Dashboard ─────────────────────────────────────────────────
function renderDashboard() {
  var total     = DB.length;
  var regulares = DB.filter(function(v) { return v.status === 'Regular'; }).length;
  var pendentes = DB.filter(function(v) { return v.status === 'Pendente'; }).length;
  var vencidos  = DB.filter(function(v) { return v.status === 'Vencido'; }).length;
  var totalDocs = DB.reduce(function(a, v) { return a + (v.documentos ? v.documentos.length : 0); }, 0);

  var stats = [
    { label: 'Total Veiculos', value: total,     cor: '#ffb300' },
    { label: 'Regulares',      value: regulares, cor: '#22c55e' },
    { label: 'Pendentes',      value: pendentes, cor: '#f59e0b' },
    { label: 'Vencidos',       value: vencidos,  cor: '#ef4444' },
    { label: 'Documentos',     value: totalDocs, cor: '#ff7a18' }
  ];

  document.getElementById('statsGrid').innerHTML = stats.map(function(s, i) {
    return '<div class="stat-card" style="animation-delay:' + (i * 0.07) + 's;border-top-color:' + s.cor + '">' +
      '<div class="stat-value" style="color:' + s.cor + '">' + s.value + '</div>' +
      '<div class="stat-label">' + s.label + '</div></div>';
  }).join('');

  renderAlertas();
  renderUltimos();
}

function renderAlertas() {
  var hoje0 = new Date(); hoje0.setHours(0,0,0,0);
  var campos = [
    {key:'ipva',label:'IPVA'},{key:'licenciamento',label:'Licenciamento'},
    {key:'seguro',label:'Seguro'},{key:'cnh',label:'CNH'},
    {key:'revisao',label:'Revisao'},{key:'vistoria',label:'Vistoria'}
  ];
  var alertas = [];
  DB.forEach(function(v) {
    campos.forEach(function(c) {
      if (!v[c.key]) return;
      var d    = new Date(v[c.key] + 'T00:00:00');
      var dias = Math.ceil((d - hoje0) / 86400000);
      if (dias <= 60) alertas.push({ nome: v.apelido || v.placa || 'Sem nome', tipo: c.label, dias: dias, data: d, id: v.id });
    });
  });
  alertas.sort(function(a, b) { return a.dias - b.dias; });

  var countEl = document.getElementById('countAlertas');
  if (countEl) countEl.textContent = alertas.length;

  var el = document.getElementById('alertasVencimento');
  if (!alertas.length) {
    el.innerHTML = '<div class="empty-state" style="padding:24px"><p>Nenhum vencimento proximo nos proximos 60 dias</p></div>';
    return;
  }
  el.innerHTML = alertas.slice(0, 7).map(function(a) {
    var cor = a.dias < 0 ? '#ef4444' : a.dias <= 15 ? '#f59e0b' : '#22c55e';
    var txt = a.dias < 0 ? 'Vencido ha ' + Math.abs(a.dias) + 'd' : a.dias === 0 ? 'Vence hoje' : a.dias + 'd restantes';
    return '<div class="alerta-item" onclick="openDetalhe(\'' + a.id + '\')">' +
      '<div class="alerta-dot" style="background:' + cor + '"></div>' +
      '<div class="alerta-info"><strong>' + a.nome + '</strong><small>' + a.tipo + ' — ' + fmtDate(a.data) + '</small></div>' +
      '<span class="alerta-badge" style="background:' + cor + '22;color:' + cor + '">' + txt + '</span></div>';
  }).join('');
}

function renderUltimos() {
  var sorted = DB.slice().sort(function(a, b) { return new Date(b.criadoEm) - new Date(a.criadoEm); });
  var el = document.getElementById('ultimosCadastros');
  if (!sorted.length) {
    el.innerHTML = '<div class="empty-state" style="padding:24px"><p>Nenhum veiculo cadastrado ainda</p></div>';
    return;
  }
  el.innerHTML = sorted.slice(0, 6).map(function(v) {
    var sub = [v.marca, v.modelo, v.ano].filter(Boolean).join(' ') + (v.placa ? ' — ' + v.placa : '');
    return '<div class="alerta-item" onclick="openDetalhe(\'' + v.id + '\')">' +
      '<div style="width:34px;height:34px;background:rgba(255,179,0,.1);border:1px solid rgba(255,179,0,.2);border-radius:8px;display:flex;align-items:center;justify-content:center;color:#ffb300;flex-shrink:0">' + iCar(16) + '</div>' +
      '<div class="alerta-info"><strong>' + (v.apelido || 'Sem nome') + '</strong><small>' + sub + '</small></div>' +
      '<span class="status-badge status-' + (v.status || 'Regular') + '">' + (v.status || 'Regular') + '</span></div>';
  }).join('');
}

// ── Veiculos ──────────────────────────────────────────────────
function renderVeiculos() {
  var tipo   = document.getElementById('filtroTipo').value;
  var status = document.getElementById('filtroStatus').value;

  var filtered = DB.filter(function(v) {
    var q = !searchQuery ||
      (v.apelido||'').toLowerCase().includes(searchQuery) ||
      (v.placa||'').toLowerCase().includes(searchQuery) ||
      (v.marca||'').toLowerCase().includes(searchQuery) ||
      (v.modelo||'').toLowerCase().includes(searchQuery) ||
      (v.proprietario||'').toLowerCase().includes(searchQuery);
    return q && (!tipo || v.tipo === tipo) && (!status || v.status === status);
  });

  var grid = document.getElementById('veiculosGrid');
  if (listMode) grid.classList.add('list-view');
  else          grid.classList.remove('list-view');

  if (!filtered.length) {
    grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1">' + iCar(48) +
      '<h3>Nenhum veiculo encontrado</h3><p>Clique em "+ Novo Veiculo" para cadastrar</p></div>';
    return;
  }

  grid.innerHTML = filtered.map(function(v, i) {
    var pv   = proxVenc(v);
    var meta = '';
    if (v.marca)        meta += '<span><strong>' + v.marca + '</strong> ' + (v.modelo||'') + ' ' + (v.ano||'') + '</span>';
    if (v.cor)          meta += '<span>Cor: <strong>' + v.cor + '</strong></span>';
    if (v.proprietario) meta += '<span>Prop: <strong>' + v.proprietario + '</strong></span>';
    if (pv)             meta += '<span style="color:' + pv.cor + '">' + pv.label + ': ' + pv.txt + '</span>';

    return '<div class="veiculo-card" style="animation-delay:' + (i * 0.05) + 's" onclick="openDetalhe(\'' + v.id + '\')">' +
      '<div class="veiculo-card-top"><div class="veiculo-icon">' + iCar(22) + '</div>' +
      '<div><div class="veiculo-name">' + (v.apelido||'Sem nome') + '</div>' +
      '<div class="veiculo-plate">' + (v.placa||'---') + '</div></div></div>' +
      '<div class="veiculo-meta">' + meta + '</div>' +
      '<div class="veiculo-footer">' +
      '<span class="status-badge status-' + (v.status||'Regular') + '">' + (v.status||'Regular') + '</span>' +
      '<div class="veiculo-actions" onclick="event.stopPropagation()">' +
      '<button class="icon-btn btn-sm" title="Editar" onclick="abrirModal(\'' + v.id + '\')">' + iEdit() + '</button>' +
      '<button class="icon-btn btn-sm" title="Deletar" onclick="deletarVeiculo(\'' + v.id + '\')">' + iTrash() + '</button>' +
      '</div></div></div>';
  }).join('');
}

function proxVenc(v) {
  var campos = [{key:'ipva',label:'IPVA'},{key:'licenciamento',label:'Licenciamento'},{key:'seguro',label:'Seguro'},{key:'cnh',label:'CNH'},{key:'revisao',label:'Revisao'},{key:'vistoria',label:'Vistoria'}];
  var hoje0 = new Date(); hoje0.setHours(0,0,0,0);
  var menor = null;
  campos.forEach(function(c) {
    if (!v[c.key]) return;
    var d    = new Date(v[c.key] + 'T00:00:00');
    var dias = Math.ceil((d - hoje0) / 86400000);
    if (!menor || dias < menor.dias) menor = { label: c.label, dias: dias, cor: dias < 0 ? '#ef4444' : dias <= 15 ? '#f59e0b' : '#22c55e', txt: dias < 0 ? 'Vencido ' + Math.abs(dias) + 'd' : dias + 'd' };
  });
  return menor;
}

// ── Vencimentos ───────────────────────────────────────────────
function renderVencimentos() {
  var campos = [{key:'ipva',label:'IPVA'},{key:'licenciamento',label:'Licenciamento'},{key:'seguro',label:'Seguro'},{key:'cnh',label:'CNH'},{key:'revisao',label:'Revisao'},{key:'vistoria',label:'Vistoria'}];
  var hoje0  = new Date(); hoje0.setHours(0,0,0,0);
  var rows   = [];
  DB.forEach(function(v) {
    campos.forEach(function(c) {
      if (!v[c.key]) return;
      var d    = new Date(v[c.key] + 'T00:00:00');
      var dias = Math.ceil((d - hoje0) / 86400000);
      rows.push({ v:v, c:c, d:d, dias:dias });
    });
  });
  rows.sort(function(a, b) { return a.dias - b.dias; });

  var el = document.getElementById('vencimentosWrap');
  if (!rows.length) {
    el.innerHTML = '<div class="empty-state">' + iCal(48) + '<h3>Nenhuma data cadastrada</h3><p>Adicione datas nos veiculos para acompanhar aqui</p></div>';
    return;
  }
  el.innerHTML = rows.map(function(r, i) {
    var cor = r.dias < 0 ? '#ef4444' : r.dias <= 15 ? '#f59e0b' : '#22c55e';
    var cls = r.dias < 0 ? 'venc-danger' : r.dias <= 15 ? 'venc-warning' : 'venc-ok';
    var txt = r.dias < 0 ? 'Vencido ha ' + Math.abs(r.dias) + ' dias' : r.dias === 0 ? 'Vence hoje' : r.dias + ' dias restantes';
    return '<div class="venc-row ' + cls + '" style="animation-delay:' + (i * 0.04) + 's" onclick="openDetalhe(\'' + r.v.id + '\')">' +
      '<div><div class="venc-name">' + (r.v.apelido||'Sem nome') + '</div><div class="venc-tipo">' + (r.v.placa||'') + ' — ' + (r.v.marca||'') + ' ' + (r.v.modelo||'') + '</div></div>' +
      '<div class="venc-date">' + r.c.label + '</div>' +
      '<div class="venc-date">' + fmtDate(r.d) + '</div>' +
      '<div class="venc-dias" style="color:' + cor + '">' + txt + '</div></div>';
  }).join('');
}

// ── Documentos ────────────────────────────────────────────────
function renderDocumentos() {
  var el      = document.getElementById('documentosWrap');
  var comDocs = DB.filter(function(v) { return v.documentos && v.documentos.length > 0; });
  if (!comDocs.length) {
    el.innerHTML = '<div class="empty-state">' + iDoc(48) + '<h3>Nenhum documento salvo</h3><p>Abra um veiculo e adicione documentos nos detalhes</p></div>';
    return;
  }
  el.innerHTML = comDocs.map(function(v) {
    var docs = v.documentos.map(function(d) {
      return '<div class="doc-item">' +
        '<div class="doc-icon">' + iDoc(15) + '</div>' +
        '<div class="doc-info"><strong>' + d.nome + '</strong><small>' + d.tipo + ' — ' + fmtBytes(d.tamanho) + '</small></div>' +
        '<div style="display:flex;gap:6px">' +
        (d.dataUrl ? '<a href="' + d.dataUrl + '" download="' + d.nome + '" class

