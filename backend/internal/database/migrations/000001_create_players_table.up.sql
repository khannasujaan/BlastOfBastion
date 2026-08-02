CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE players (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(40) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    is_deleted BOOLEAN DEFAULT false NOT NULL
);