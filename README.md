🌐 **Language:** English | [Português (Brasil)](README.pt-BR.md)

# HemoTrack

HemoTrack is a full-stack application for organizing blood exam results, visualizing result trends over time, and getting an AI-assisted summary of the numbers — with support for multiple profiles (e.g. family members) and multiple AI providers (Gemini, OpenAI, or Claude, chosen by the user).

It's a portfolio/study project: the main goal is to demonstrate modern full-stack architecture (Angular standalone components + REST API + WebSocket), integration with multiple AI providers behind a common interface, and basic security practices (JWT, encrypted API keys, input validation).

> ⚠️ AI feedback is informational only and **does not replace professional medical advice**.

## Features

- Blood exam registration (manual entry or PDF upload with automatic AI extraction)
- Multiple profiles per user (e.g. yourself, spouse, children)
- Trend charts for each marker over time
- AI-assisted analysis of exam history (Gemini, OpenAI, or Claude — user's own API key, encrypted at rest)
- PDF report generation
- Re-exam reminders per exam type
- Real-time PDF extraction progress (Socket.IO)

## Stack

**Backend** — `hemotrack-backend/`
- Node.js + Express 4
- Sequelize 6 + PostgreSQL 16
- Socket.IO 4 (real-time)
- JWT (`jsonwebtoken`) + `bcryptjs`
- `express-validator`, `multer` (uploads), Puppeteer (PDF)
- Custom encryption service for AI API keys (`encryption.service.js`)
- Tests: Vitest + Supertest · Lint/format: Biome

**Frontend** — `hemotrack-frontend/`
- Angular 19 (standalone components, no NgModules)
- PrimeNG + Chart.js + `socket.io-client`
- Strict TypeScript

**AI** — three interchangeable adapters behind a common interface:
`shared/gateways/ai/{gemini,openai,claude}.adapter.js`

## Repository structure

```
hemotrack/
├── docker-compose.yml       # orchestrates backend + frontend + PostgreSQL
├── hemotrack-backend/        # API (Express, Sequelize, Socket.IO)
│   └── src/
│       ├── modules/exams/       # Controller → Service → Repository (architecture pilot module)
│       ├── routes/              # remaining routes (auth, profile, report, settings)
│       ├── shared/gateways/ai/  # AI adapters + factory
│       ├── middleware/ models/ database/ socket/
├── hemotrack-frontend/       # Angular 19 + PrimeNG
└── specs/                    # project mission, tech stack, roadmap and architecture docs
```

See [specs/mission.md](specs/mission.md), [specs/tech-stack.md](specs/tech-stack.md), [specs/ARCHITECTURE.md](specs/ARCHITECTURE.md) and [specs/roadmap.md](specs/roadmap.md) for more details on purpose, stack and architecture decisions.

## Prerequisites

- [Docker](https://www.docker.com/) and Docker Compose (recommended way to run it)
- Or, to run without Docker: Node.js 20+, PostgreSQL 16 and the Angular CLI

## Running it (Docker Compose — recommended)

1. Set up the backend environment variables:

   ```bash
   cd hemotrack-backend
   cp .env.example .env
   # edit .env — especially JWT_SECRET and ENCRYPTION_KEY (see section below)
   cd ..
   ```

2. Start all three services (PostgreSQL + backend + frontend) from the repository root:

   ```bash
   docker compose up --build
   ```

3. Access:

   | Service | URL |
   |---|---|
   | Frontend | http://localhost:4200 |
   | Backend API | http://localhost:3000/api |
   | Health check | http://localhost:3000/api/health |

To stop: `docker compose down` (database data lives in a named volume and persists across runs; use `docker compose down -v` to wipe it).

## Running it locally (without Docker)

```bash
# 1. PostgreSQL (via Docker, just the database)
docker run -d -p 5432:5432 \
  -e POSTGRES_DB=hemotrack \
  -e POSTGRES_USER=hemotrack \
  -e POSTGRES_PASSWORD=hemotrack_pass \
  postgres:16-alpine

# 2. Backend
cd hemotrack-backend
cp .env.example .env   # edit as needed
npm install
npm run dev             # nodemon, reloads on change

# 3. Frontend (in another terminal)
cd hemotrack-frontend
npm install
npm start                # ng serve --port 4200
```

On startup, the backend runs migrations (`sequelize.sync`) and seeds the default exam types automatically — no manual seed step needed.

## Environment variables (`hemotrack-backend/.env`)

| Variable | Description |
|---|---|
| `PORT` | Backend port (default `3000`) |
| `NODE_ENV` | `development` or `production` |
| `JWT_SECRET` | Secret used to sign JWTs — minimum 32 characters |
| `JWT_EXPIRES_IN` | Token lifetime (e.g. `7d`) |
| `ENCRYPTION_KEY` | 32-byte hex key (64 hex characters) used to encrypt AI API keys at rest |
| `DB_HOST` / `DB_PORT` / `DB_NAME` / `DB_USER` / `DB_PASS` | PostgreSQL connection |
| `MAX_FILE_SIZE_MB` | Max upload size for PDFs |
| `UPLOAD_DIR` | Directory where uploaded PDFs are stored |
| `FRONTEND_URL` | Frontend URL, used for CORS and for building share links |

Generate a valid `ENCRYPTION_KEY` with:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Running the tests

```bash
# Backend — Vitest + Supertest
cd hemotrack-backend
npm test

# Frontend — Karma + Jasmine
cd hemotrack-frontend
npm test
```

## Main API routes

All authenticated routes expect `Authorization: Bearer <token>`.

| Method | Route | Description |
|---|---|---|
| POST | `/api/auth/register` | Creates a user (+ default profile and settings) |
| POST | `/api/auth/login` | Logs in, returns a JWT |
| GET | `/api/auth/me` | Authenticated user's data |
| GET/POST | `/api/exams` | List / create exams |
| GET/PUT/DELETE | `/api/exams/:id` | Get / update / delete an exam |
| POST | `/api/exams/upload-pdf` | Upload a PDF for AI-assisted extraction (progress via Socket.IO) |
| POST | `/api/exams/:id/share` | Generates a temporary public link for an exam |
| GET/POST | `/api/profiles` | List / create profiles (family members) |
| PUT/DELETE | `/api/profiles/:id` | Update / delete a profile |
| GET | `/api/reports/:examTypeId` | Historical series for an exam type (for the chart) |
| POST | `/api/reports/:examTypeId/analyze` | Generates an AI analysis of the history |
| GET | `/api/reports/:examTypeId/pdf` | Exports a PDF report |
| GET/PUT | `/api/settings` | User settings (AI provider, key, theme) |
| GET/POST/DELETE | `/api/exam-types` | Exam types (system defaults + custom) |
| GET/POST/PUT/DELETE | `/api/reminders` | Re-exam reminders |
| GET | `/api/health` | Health check |

## Configuring an AI provider

1. Create an account and log in
2. Go to **Settings**
3. Choose a provider (Gemini, OpenAI, or Claude) and enter your own API key
4. The key is encrypted before being saved — it's never stored in plain text

## Disclaimer

This project is a personal/family organization tool. AI-generated feedback is **informational** and does not replace medical evaluation, diagnosis, or professional consultation.

## Copyright

This project was developed by Alexandre Neto.

Feel free to draw inspiration from or use parts of this project, but please give proper credit to the author.
