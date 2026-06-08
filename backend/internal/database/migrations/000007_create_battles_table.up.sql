CREATE TABLE battles (
    id BIGSERIAL PRIMARY KEY,
    attacker_id UUID REFERENCES players(id),
    defender_id UUID REFERENCES players(id),
    winner_id UUID REFERENCES players(id),
    battle_logs JSONB,
    percentage_damage SMALLINT DEFAULT 0 NOT NULL,
    gold_gained BIGINT NOT NULL DEFAULT 0,
    elixir_gained BIGINT NOT NULL DEFAULT 0,
    battle_time TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT check_valid_damage CHECK (percentage_damage >= 0 AND percentage_damage <= 100),
    CONSTRAINT check_no_self_attack CHECK (attacker_id != defender_id)
);

CREATE INDEX idx_attacker_id ON battles(attacker_id);
CREATE INDEX idx_defender_id ON battles(defender_id);