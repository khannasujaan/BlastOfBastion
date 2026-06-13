CREATE TABLE player_buildings (
    id BIGSERIAL PRIMARY KEY,
    player_id UUID REFERENCES players(id),
    building_id INT REFERENCES building_catalog(id),
    grid_x SMALLINT NOT NULL,
    grid_y SMALLINT NOT NULL,
    built_by TIMESTAMPTZ,
    is_built BOOLEAN NOT NULL DEFAULT false,
    UNIQUE(player_id, grid_x, grid_y)
);

CREATE INDEX idx_player_buildings_p_id ON player_buildings(player_id);
CREATE INDEX idx_player_buildings_b_id ON player_buildings(building_id);