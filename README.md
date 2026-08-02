# Blast Of Bastion

## Prerequisites

Before you begin, ensure you have the following installed on your machine:
* Docker Desktop (or Docker Engine + Docker Compose)
* Git

## Environment Setup

Run this command in your terminal to download your project:
```bash
git clone https://github.com/khannasujaan/BlastOfBastion.git
cd BastionBlast
```


Create a `.env` file in the root directory of the project. This file is required to configure the database credentials and route internal connections.

```env
# Service ports
BACKEND_PORT=8080
FRONTEND_PORT=3000

# Database Credentials
POSTGRES_USER=postgres
POSTGRES_PASSWORD=yourpassword
POSTGRES_DB=blastofbastion
```

If you need to use other ports, change `BACKEND_PORT` and/or `FRONTEND_PORT` here and then restart Docker Compose.

Once your .env file is configured, you can spin up the entire application with a single command:

```bash
docker compose up --build
```