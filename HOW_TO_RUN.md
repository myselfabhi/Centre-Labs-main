# How to Run Centre-Labs (Peptides Website)

This project is a **full-stack peptides e-commerce** app:

- **Frontend**: Next.js 15 (TypeScript, Tailwind, shadcn/ui) on port **3000**
- **Backend**: Node.js + Express + Prisma on port **3001**
- **Database**: PostgreSQL (port 5432)
- **Cache**: Redis (port 6379, optional)

You can run it in two ways: **Docker (full stack)** or **local development**.

---

## Option A: Docker (easiest – everything in containers)

**Prerequisites:** Docker and Docker Compose.

1. **Optional – set env vars**  
   Edit `docker-compose.yaml` and set at least:
   - `JWT_SECRET`
   - `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` (or leave placeholders for basic run)
   - `EMAIL_USER` / `EMAIL_PASSWORD` (optional)

2. **Build and start**
   ```bash
   docker-compose up --build
   ```
   Or in the background:
   ```bash
   docker-compose up -d --build
   ```

3. **Open**
   - Frontend: http://localhost:3000  
   - API: http://localhost:3001  

4. **Useful commands**
   - Logs: `docker-compose logs -f api` or `docker-compose logs -f frontend`
   - Stop: `docker-compose down`
   - Reset (including DB): `docker-compose down -v`

---

## Option B: Local development (DB in Docker, app on your machine)

**Prerequisites:** Node.js 18+, npm, Docker (for PostgreSQL and Redis).

### 1. Start database and Redis

From the **project root**:

```bash
chmod +x dev-db.sh
./dev-db.sh start
```

Check:

```bash
./dev-db.sh status
```

- PostgreSQL: `localhost:5432` (user: `peptides_user`, password: `dev_password_2024`, db: `peptides_db`)
- Redis: `localhost:6379`

### 2. Backend (Node.js API)

```bash
cd nodejs-api
cp ../dev.env.example .env
# Edit .env if needed (DATABASE_URL already points to dev DB)
npm install
npx prisma generate
npx prisma migrate deploy
npm run dev
```

API will be at **http://localhost:3001**.

**Optional – seed DB (default users and data):**

```bash
# From project root
./dev-db.sh seed
```

Default logins after seed:  
`admin@example.com` / `SecurePass123!` (and similar for manager, staff).

### 3. Frontend (Next.js)

In a **second terminal**:

```bash
cd nextjs-frontend
cp ../dev.env.example .env.local
# Ensure NEXT_PUBLIC_API_URL=http://localhost:3001 in .env.local
npm install
npm run dev
```

Frontend will be at **http://localhost:3000**.

### 4. Dev commands

| Task              | Command |
|-------------------|--------|
| DB status         | `./dev-db.sh status` |
| Stop DB + Redis   | `./dev-db.sh stop`   |
| Seed DB           | `./dev-db.sh seed`   |
| Reset DB (wipe)   | `./dev-db.sh reset`  |
| Prisma Studio     | `cd nodejs-api && npx prisma studio` (e.g. http://localhost:5555) |

---

## Summary

| Goal              | Action |
|-------------------|--------|
| Run everything    | `docker-compose up --build` **or** (Docker running) `./dev-db.sh start` + run API + run frontend |
| Frontend only     | `cd nextjs-frontend && npm install && npm run dev` → http://localhost:3000 (works with mock data if API not running) |
| API only          | Requires **Docker** for PostgreSQL. Then `./dev-db.sh start`, `cd nodejs-api && npm run dev` |

**Note:** Local API + DB development needs **Docker** running for `./dev-db.sh` (PostgreSQL + Redis). Full-stack without Docker: use `docker-compose up --build`.

---

## Troubleshooting

### Prisma: "User was denied access" (P1010)

Your `.env` password must match **which** Postgres is running on port 5432:

| You started DB with   | Use this in `nodejs-api/.env` |
|-----------------------|--------------------------------|
| `./dev-db.sh start`   | `DATABASE_URL=postgresql://peptides_user:dev_password_2024@localhost:5432/peptides_db` |
| `docker-compose up`   | `DATABASE_URL=postgresql://peptides_user:peptides_password_2024@localhost:5432/peptides_db` |

- If you're not sure, run only one: stop compose with `docker-compose down`, then run `./dev-db.sh start` and keep `dev_password_2024` in `.env`.
- If you use a **system/local Postgres** (not Docker), create the DB and user yourself and grant schema access, or point `DATABASE_URL` at that instance.

### Prisma / @prisma/client version mismatch

Keep the CLI and client in sync (e.g. both `^6.11.1` in `nodejs-api/package.json`), then run:

```bash
cd nodejs-api && npm install && npx prisma generate
```

For more detail see **README.md**, **DEV_SETUP.md**, and **nextjs-frontend/README.md**.
