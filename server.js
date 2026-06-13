// Substitui toda a base (usado na importação XLS/JSON)
app.post('/api/veiculos/replace', (req, res) => {
  try {
    const novo = req.body;

    if (!Array.isArray(novo)) {
      return res.status(400).json({ error: 'Formato invalido. Esperado um array.' });
    }

    // Garante que cada registro tem os campos obrigatorios
    const tratados = novo.map(v => ({
      documentos:   [],
      status:       'Regular',
      ...v,
      id:           v.id           || require('crypto').randomUUID(),
      criadoEm:     v.criadoEm     || new Date().toISOString(),
      atualizadoEm: new Date().toISOString()
    }));

    const db = readDB();
    db.veiculos = tratados; // <-- se o seu DB for objeto com chave veiculos

    // se o seu DB for array direto, use:
    // writeDB(tratados);

    writeDB(db);
    res.json({ ok: true, total: tratados.length });

  } catch (err) {
    res.status(500).json({ error: 'Erro interno: ' + err.message });
  }
});
