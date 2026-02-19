# How to Run the Backend (and PostgreSQL)

## What you need to know

- **PostgreSQL** = the database. The backend (Node.js API) talks to it to store and read data.
- You don’t install Postgres on your Mac. This project runs it inside **Docker** (one command).
- **Order:** start Postgres first → then run migrations → then start the backend.

---

## Step 1: Start PostgreSQL (and Redis)

From the **project root** (e.g. `Centre-Labs-main`):

```bash
cd /Users/abhinavverma/Desktop/Centre-Labs-main
bash dev-db.sh start
```

- **Requires:** Docker Desktop installed and running.
- This starts:
  - **PostgreSQL** on `localhost:5432` (database: `peptides_db`, user: `peptides_user`, password: `dev_password_2024`)
  - **Redis** on `localhost:6379` (optional cache)

Check they’re running:

```bash
bash dev-db.sh status
```

---

## Step 2: Fix DB permissions (first time or after P1010)

If you get **P1010** (“User was denied access”) when running migrations, run this once:

```bash
docker exec peptides_dev_db psql -U peptides_user -d peptides_db -c "
ALTER DATABASE peptides_db OWNER TO peptides_user;
GRANT ALL ON SCHEMA public TO peptides_user;
GRANT CREATE ON SCHEMA public TO peptides_user;
GRANT CONNECT ON DATABASE peptides_db TO peptides_user;
"
```

---

## Step 3: Migrations and backend

From the **project root**:

```bash
cd nodejs-api
npx prisma generate
npx prisma migrate deploy
npm run dev
```

- **`npx prisma generate`** – generates the DB client used by the API.
- **`npx prisma migrate deploy`** – applies migrations (creates/updates tables).
- **`npm run dev`** – starts the API (nodemon) on **http://localhost:3001**.

---

## Quick copy-paste (run in order)

```bash
cd /Users/abhinavverma/Desktop/Centre-Labs-main
bash dev-db.sh start
bash dev-db.sh status
cd nodejs-api
npx prisma generate
npx prisma migrate deploy
npm run dev
```

If you see P1010, run the `docker exec peptides_dev_db ...` block from Step 2, then run `npx prisma migrate deploy` and `npm run dev` again.

---

## Useful commands

| What | Command |
|------|--------|
| Start DB + Redis | `bash dev-db.sh start` (from project root) |
| Status | `bash dev-db.sh status` |
| Stop DB + Redis | `bash dev-db.sh stop` |
| Seed DB (sample data) | `bash dev-db.sh seed` (from project root) |
| Open DB in terminal | `docker exec -it peptides_dev_db psql -U peptides_user -d peptides_db` |
| Prisma Studio (DB UI) | `cd nodejs-api && npx prisma studio` (e.g. http://localhost:5555) |

---

## Summary

1. **PostgreSQL** = database; it runs in Docker via `bash dev-db.sh start`.
2. **Backend** = Node.js API in `nodejs-api`; it needs the DB running, then `npx prisma migrate deploy` and `npm run dev`.
