const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const app = express();
const db = new sqlite3.Database('./mer_seminovos.db');

app.get('/veiculos', (req, res) => {
    db.all("SELECT * FROM veiculos", [], (err, rows) => {
        res.json(rows);
    });
});

app.listen(3000, () => console.log('Servidor SQL rodando em http://localhost:3000'));
