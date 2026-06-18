CREATE TABLE troops_unlocked (
    player_id UUID REFERENCES players(id),
    troop_name VARCHAR NOT NULL,
    troop_id INT NOT NULL,
    PRIMARY KEY (player_id, troop_name)
);