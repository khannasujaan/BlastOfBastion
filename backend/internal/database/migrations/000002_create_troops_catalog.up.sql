CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE troops_catalog (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    damage SMALLINT NOT NULL DEFAULT 0,
    health SMALLINT NOT NULL DEFAULT 0,
    housing_space SMALLINT NOT NULL DEFAULT 0,
    level SMALLINT NOT NULL DEFAULT 1,
    speed SMALLINT NOT NULL DEFAULT 10,
    unlock_thall_level SMALLINT NOT NULL DEFAULT 1,
    range SMALLINT NOT NULL DEFAULT 1,
    UNIQUE(name, level)
);