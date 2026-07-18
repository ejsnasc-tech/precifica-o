CREATE TABLE IF NOT EXISTS estoque (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  empresa_id INTEGER NOT NULL,
  nome TEXT NOT NULL,
  unidade TEXT NOT NULL DEFAULT 'un',
  quantidade_atual REAL NOT NULL DEFAULT 0,
  quantidade_minima REAL NOT NULL DEFAULT 0,
  custo_unitario REAL NOT NULL DEFAULT 0,
  criado_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS estoque_movimentos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  estoque_id INTEGER NOT NULL,
  tipo TEXT NOT NULL,
  quantidade REAL NOT NULL,
  observacao TEXT,
  criado_at TEXT DEFAULT (datetime('now'))
);
