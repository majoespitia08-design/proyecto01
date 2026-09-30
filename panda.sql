-- =====================================================================
-- English Panda Games  ->  panda.sql  (un solo archivo, base panda.db)
--   1) REGISTRO:  tabla users
--   2) PUESTOS:   tablas ranking (total de XP) y scores (puntos por partida)
-- =====================================================================

-- ---------- 1) REGISTRO DE USUARIOS ----------
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  username      TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---------- 2) PUESTOS SEGUN LOS PUNTOS ----------
-- Total de XP de cada jugador (una fila por usuario registrado)
CREATE TABLE IF NOT EXISTS ranking (
  user_id      INTEGER PRIMARY KEY,
  xp           INTEGER NOT NULL DEFAULT 0,
  games_played INTEGER NOT NULL DEFAULT 0,
  updated_at   TEXT    NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Historial: los puntos recogidos en cada partida
CREATE TABLE IF NOT EXISTS scores (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL,
  game       TEXT    NOT NULL,             -- surprise | run | shot
  level      TEXT    NOT NULL,             -- A1 | A2 | B1 | B2
  xp         INTEGER NOT NULL,
  created_at TEXT    NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_ranking_xp ON ranking (xp DESC);
CREATE INDEX IF NOT EXISTS idx_scores_user ON scores (user_id);

-- Consulta del puesto de cada usuario (los empates comparten puesto):
--   SELECT RANK() OVER (ORDER BY r.xp DESC) AS position, u.username, r.xp
--   FROM ranking r JOIN users u ON u.id = r.user_id
--   ORDER BY position;
