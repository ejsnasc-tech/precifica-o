CREATE TABLE IF NOT EXISTS codigos_acesso (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  codigo     TEXT NOT NULL UNIQUE,
  usado      INTEGER NOT NULL DEFAULT 0,
  criado_em  TEXT NOT NULL DEFAULT (datetime('now')),
  usado_em   TEXT
);

CREATE INDEX IF NOT EXISTS idx_codigos_acesso_codigo ON codigos_acesso(codigo);
