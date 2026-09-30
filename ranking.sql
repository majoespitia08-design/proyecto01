-- BASE DE DATOS 2: ranking.db  ->  puntos y puestos de los usuarios

-- Total de XP de cada jugador (una fila por usuario registrado)
CREATE TABLE IF NOT EXISTS ranking (
  user_id      INTEGER PRIMARY KEY,          -- id del usuario en users.db
  username     TEXT    NOT NULL,
  xp           INTEGER NOT NULL DEFAULT 0,
  games_played INTEGER NOT NULL DEFAULT 0,
  updated_at   TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Historial: los puntos recogidos en cada partida
CREATE TABLE IF NOT EXISTS scores (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL,
  game       TEXT    NOT NULL,               -- surprise | run | shot
  level      TEXT    NOT NULL,               -- A1 | A2 | B1 | B2
  xp         INTEGER NOT NULL,
  created_at TEXT    NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES ranking(user_id)
);

CREATE INDEX IF NOT EXISTS idx_ranking_xp ON ranking (xp DESC);
CREATE INDEX IF NOT EXISTS idx_scores_user ON scores (user_id);

-- Consulta del puesto de cada usuario (los empates comparten puesto):
--   SELECT RANK() OVER (ORDER BY xp DESC) AS position, username, xp
--   FROM ranking ORDER BY position;
