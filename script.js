let db = JSON.parse(localStorage.getItem('mer_db') || '[]');

function view(id) {
    const app = document.getElementById('app');
    if(id === 'cadastro') {
        app.innerHTML = `<div class="card">
            <h2>Cadastrar Veículo</h2>
            <input type="text" id="modelo" placeholder="Modelo">
            <input type="text" id="placa" placeholder="Placa">
            <button class="btn-main" onclick="salvar()">Salvar</button>
        </div>`;
    } else {
        app.innerHTML = `<div class="grid" id="lista"></div>`;
        render();
    }
}

function salvar() {
    const v = { id: Date.now(), modelo: document.getElementById('modelo').value, placa: document.getElementById('placa').value.toUpperCase() };
    db.push(v);
    localStorage.setItem('mer_db', JSON.stringify(db));
    alert('Salvo com sucesso!');
    view('estoque');
}

function render() {
    document.getElementById('lista').innerHTML = db.map((v, i) => `
        <div class="card">
            <h3>${v.modelo}</h3>
            <p>Placa: ${v.placa}</p>
            <button class="nav-btn" onclick="excluir(${i})">Remover</button>
        </div>
    `).join('');
}

function exportarBackup() {
    const blob = new Blob([JSON.stringify(db)], {type: 'application/json'});
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'meu_estoque.json'; a.click();
}

// Inicializar na view de estoque
view('estoque');
