CREATE TABLE player_army (
    player_id UUID REFERENCES players(id),
    troop_id UUID REFERENCES troops_catalog(id),
    quantity SMALLINT NOT NULL DEFAULT 1,
    PRIMARY KEY (player_id, troop_id)
);