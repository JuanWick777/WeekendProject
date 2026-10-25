-- Extensión para generar UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabla de usuarios
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    display_name VARCHAR(50) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_users_username_lower ON users(LOWER(username));

-- Tabla de sesiones
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(64) UNIQUE NOT NULL,
    expires_at_ms BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON sessions(token_hash);

-- Tabla de partidas
CREATE TABLE IF NOT EXISTS matches (
    id VARCHAR(100) PRIMARY KEY,
    room_code VARCHAR(10),
    mode VARCHAR(50) NOT NULL DEFAULT 'rotating_control',
    seed BIGINT NOT NULL,
    template_id VARCHAR(50),
    template_version VARCHAR(20),
    generator_version VARCHAR(20),
    started_at_ms BIGINT NOT NULL,
    ended_at_ms BIGINT NOT NULL,
    duration_ms NUMERIC(10, 3) NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('completed', 'aborted')),
    finish_reason VARCHAR(20) CHECK (finish_reason IN ('time', 'forfeit', 'empty')),
    winner_id UUID REFERENCES users(id),
    draw_player_ids JSONB DEFAULT '[]'::jsonb,
    source VARCHAR(20) NOT NULL DEFAULT 'live',
    is_synthetic BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_matches_status_source ON matches(status, source);

-- Tabla de resultados por participante
CREATE TABLE IF NOT EXISTS player_results (
    match_id VARCHAR(100) REFERENCES matches(id) ON DELETE CASCADE,
    player_id UUID REFERENCES users(id) ON DELETE CASCADE,
    display_name VARCHAR(50) NOT NULL,
    score INT NOT NULL DEFAULT 0,
    control_time_ms NUMERIC(10, 3) NOT NULL DEFAULT 0,
    kills INT NOT NULL DEFAULT 0,
    deaths INT NOT NULL DEFAULT 0,
    alive_ms NUMERIC(10, 3) NOT NULL DEFAULT 0,
    participated_ms NUMERIC(10, 3) NOT NULL DEFAULT 0,
    won BOOLEAN NOT NULL DEFAULT FALSE,
    draw BOOLEAN NOT NULL DEFAULT FALSE,
    forfeited BOOLEAN NOT NULL DEFAULT FALSE,
    PRIMARY KEY (match_id, player_id)
);
CREATE INDEX IF NOT EXISTS idx_player_results_player_id ON player_results(player_id);

-- Tabla para siembra sintética
CREATE TABLE IF NOT EXISTS seed_batches (
    batch_id VARCHAR(64) PRIMARY KEY,
    inserted_matches INT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);