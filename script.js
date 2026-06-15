let db = JSON.parse(localStorage.getItem('mer_db') || '[]');

function view(id) {
    document.querySelectorAll('.view').forEach(v => v.style.display = 'none');
    document.getElementById(id).style.display = 'block';
    if(id === 'estoque') render();
}

function salvar() {
    const v = {
        id: Date.now(),
        modelo: document.getElementById('mModelo').value,
        placa: document.getElementById('mPlaca').value.toUpperCase(),
        chassi: document.getElementById('mChassi').value,
        renavam: document.getElementById('mRenavam').value,
        ipva: document.getElementById('mIpva').value,
        valor: document.getElementById('mValor').value
    };
    db.push(v);
    localStorage.setItem('mer_db', JSON.stringify(db));
    alert('Cadastrado com sucesso! ✨');
    location.reload();
}

function render() {
    document.getElementById('lista').innerHTML = db.map((v, i) => `
        <div class="card ${v.ipva === 'Atrasado' ? 'alerta' : ''}">
            <h3>${v.modelo}</h3>
            <p>Placa: ${v.placa}</p>
            <p>Status: ${v.ipva} (R$ ${v.valor})</p>
            <button onclick="excluir(${i})">Remover</button>
        </div>
    `).join('');
}

function excluir(i) {
    db.splice(i, 1);
    localStorage.setItem('mer_db', JSON.stringify(db));
    render();
}
