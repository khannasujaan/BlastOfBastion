CREATE TYPE b_type AS ENUM ('defense', 'resGen', 'storage');

CREATE TABLE building_catalog (
    id INT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type b_type,
    level SMALLINT NOT NULL DEFAULT 1,
    base_health SMALLINT NOT NULL DEFAULT 0,
    unlock_thall_level SMALLINT NOT NULL DEFAULT 1,
    cost_gold BIGINT NOT NULL DEFAULT 0,
    cost_elixir BIGINT NOT NULL DEFAULT 0,
    build_time BIGINT NOT NULL,
    UNIQUE(name, level),
    CONSTRAINT check_exclusive_cost CHECK ((cost_gold = 0 OR cost_elixir = 0)AND NOT(cost_gold = 0 AND cost_elixir = 0))
);