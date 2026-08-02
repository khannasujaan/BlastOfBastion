CREATE TABLE defense_buildings (
    building_id INT PRIMARY KEY REFERENCES building_catalog(id),
    range SMALLINT NOT NULL,
    damage_per_attack SMALLINT NOT NULL,
    attack_speed_ms INTEGER NOT NULL
);

CREATE TABLE resources_gen (
    building_id INT PRIMARY KEY REFERENCES building_catalog(id),
    gen_per_hour BIGINT NOT NULL DEFAULT 0,
    storage BIGINT NOT NULL DEFAULT 0
);

CREATE TABLE resource_storage (
    building_id INT PRIMARY KEY REFERENCES building_catalog(id),
    storage BIGINT NOT NULL DEFAULT 0
);