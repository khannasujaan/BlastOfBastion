CREATE TABLE max_buildings (
    name VARCHAR NOT NULL,
    thall_level SMALLINT NOT NULL,
    quantity SMALLINT NOT NULL,
    PRIMARY KEY (name, thall_level)
);