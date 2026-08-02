CREATE TABLE player_stats (
    player_id UUID PRIMARY KEY REFERENCES players(id),
    gold BIGINT NOT NULL DEFAULT 1000,
    elixir BIGINT NOT NULL DEFAULT 1000,
    attacks_won BIGINT NOT NULL DEFAULT 0,
    defenses_won BIGINT NOT NULL DEFAULT 0,
    total_attacks BIGINT NOT NULL DEFAULT 0,
    total_defends BIGINT NOT NULL DEFAULT 0,
    trophies BIGINT NOT NULL DEFAULT 0,
    last_attacked_time TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    last_collected_gold TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    last_collected_elixir TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT check_logical_attacks CHECK (attacks_won <= total_attacks),
    CONSTRAINT check_logical_defenses CHECK (defenses_won <= total_defends)
);

CREATE INDEX idx_player_stats_trophies ON player_stats(trophies);