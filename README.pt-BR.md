🌐 **Idioma:** [English](README.md) | Português (Brasil)

# 🩸 HemoTrack

HemoTrack é uma aplicação full-stack para organizar exames de sangue, visualizar tendências de resultados ao longo do tempo e obter um resumo assistido por IA sobre os números — com suporte a múltiplos perfis (ex: família) e múltiplos provedores de IA (Gemini, OpenAI ou Claude, à escolha do usuário).

É um projeto de portfólio/estudo: o objetivo principal é demonstrar arquitetura full-stack moderna (Angular standalone + API REST + WebSocket), integração com múltiplos provedores de IA por trás de uma interface comum, e boas práticas básicas de segurança (JWT, criptografia de chaves de API, validação de entrada).

> ⚠️ Os feedbacks de IA são apenas informativos e **não substituem consulta médica profissional**.

## Funcionalidades

- Cadastro de exames de sangue (manual ou por upload de PDF, com extração automática via IA)
- Múltiplos perfis por usuário (ex: você, cônjuge, filhos)
- Gráficos de tendência dos marcadores ao longo do tempo
- Análise assistida por IA do histórico de exames (Gemini, OpenAI ou Claude — chave própria do usuário, criptografada no banco)
- Geração de relatório em PDF
- Lembretes de reexame por tipo de exame
- Atualização em tempo real do progresso de extração de PDF (Socket.IO)

## Stack

**Backend** — `hemotrack-backend/backend/`
- Node.js + Express 4
- Sequelize 6 + PostgreSQL 16
- Socket.IO 4 (tempo real)
- JWT (`jsonwebtoken`) + `bcryptjs`
- `express-validator`, `multer` (upload), Puppeteer (PDF)
- Criptografia própria para chaves de API de IA (`encryption.service.js`)
- Testes: Vitest + Supertest · Lint/format: Biome

**Frontend** — `hemotrack-frontend/`
- Angular 19 (standalone components, sem NgModules)
- PrimeNG + Chart.js + `socket.io-client`
- TypeScript estrito

**IA** — três adapters intercambiáveis atrás de uma interface comum:
`shared/gateways/ai/{gemini,openai,claude}.adapter.js`

## Estrutura do repositório

```
hemotrack/
├── docker-compose.yml       # orquestra backend + frontend + PostgreSQL
├── hemotrack-backend/
│   └── backend/             # API (Express, Sequelize, Socket.IO)
│       └── src/
│           ├── modules/exams/       # Controller → Service → Repository (módulo piloto da arquitetura)
│           ├── routes/              # demais rotas (auth, profile, report, settings)
│           ├── shared/gateways/ai/  # adapters de IA + factory
│           ├── middleware/ models/ database/ socket/
├── hemotrack-frontend/       # Angular 19 + PrimeNG
└── specs/                    # mission, tech-stack, roadmap e arquitetura do projeto
```

Consulte [specs/mission.md](specs/mission.md), [specs/tech-stack.md](specs/tech-stack.md), [specs/ARCHITECTURE.md](specs/ARCHITECTURE.md) e [specs/roadmap.md](specs/roadmap.md) para mais detalhes de propósito, stack e decisões de arquitetura.

## Pré-requisitos

- [Docker](https://www.docker.com/) e Docker Compose (forma recomendada de rodar)
- Ou, para rodar sem Docker: Node.js 20+, PostgreSQL 16 e Angular CLI

## Como rodar (Docker Compose — recomendado)

1. Configure as variáveis de ambiente do backend:

   ```bash
   cd hemotrack-backend/backend
   cp .env.example .env
   # edite .env — principalmente JWT_SECRET e ENCRYPTION_KEY (veja seção abaixo)
   cd ../..
   ```

2. Suba os três serviços (PostgreSQL + backend + frontend) a partir da raiz do repositório:

   ```bash
   docker compose up --build
   ```

3. Acesse:

   | Serviço | URL |
   |---|---|
   | Frontend | http://localhost:4200 |
   | Backend API | http://localhost:3000/api |
   | Health check | http://localhost:3000/api/health |

Para parar: `docker compose down` (os dados do banco ficam em um volume nomeado e persistem entre execuções; use `docker compose down -v` para apagar tudo).

## Como rodar localmente (sem Docker)

```bash
# 1. PostgreSQL (via Docker, só o banco)
docker run -d -p 5432:5432 \
  -e POSTGRES_DB=hemotrack \
  -e POSTGRES_USER=hemotrack \
  -e POSTGRES_PASSWORD=hemotrack_pass \
  postgres:16-alpine

# 2. Backend
cd hemotrack-backend/backend
cp .env.example .env   # edite conforme necessário
npm install
npm run dev             # nodemon, recarrega a cada mudança

# 3. Frontend (em outro terminal)
cd hemotrack-frontend
npm install
npm start                # ng serve --port 4200
```

Ao subir, o backend roda as migrações (`sequelize.sync`) e semeia os tipos de exame padrão automaticamente — não é necessário nenhum passo manual de seed.

## Variáveis de ambiente (`hemotrack-backend/backend/.env`)

| Variável | Descrição |
|---|---|
| `PORT` | Porta do backend (padrão `3000`) |
| `NODE_ENV` | `development` ou `production` |
| `JWT_SECRET` | Segredo para assinar tokens JWT — mínimo 32 caracteres |
| `JWT_EXPIRES_IN` | Validade do token (ex: `7d`) |
| `ENCRYPTION_KEY` | Chave hexadecimal de 32 bytes (64 caracteres hex) usada para criptografar as chaves de API de IA no banco |
| `DB_HOST` / `DB_PORT` / `DB_NAME` / `DB_USER` / `DB_PASS` | Conexão com o PostgreSQL |
| `MAX_FILE_SIZE_MB` | Limite de tamanho para upload de PDF |
| `UPLOAD_DIR` | Diretório onde os PDFs enviados são salvos |
| `FRONTEND_URL` | URL do frontend, usada para CORS e para montar links de compartilhamento |

Gere uma `ENCRYPTION_KEY` válida com:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Rodando os testes

```bash
# Backend — Vitest + Supertest
cd hemotrack-backend/backend
npm test

# Frontend — Karma + Jasmine
cd hemotrack-frontend
npm test
```

## Principais rotas da API

Todas as rotas autenticadas esperam `Authorization: Bearer <token>`.

| Método | Rota | Descrição |
|---|---|---|
| POST | `/api/auth/register` | Cria usuário (+ perfil e configurações padrão) |
| POST | `/api/auth/login` | Login, retorna JWT |
| GET | `/api/auth/me` | Dados do usuário autenticado |
| GET/POST | `/api/exams` | Lista / cria exames |
| GET/PUT/DELETE | `/api/exams/:id` | Detalha / edita / remove um exame |
| POST | `/api/exams/upload-pdf` | Upload de PDF com extração assistida por IA (progresso via Socket.IO) |
| POST | `/api/exams/:id/share` | Gera link público temporário para um exame |
| GET/POST | `/api/profiles` | Lista / cria perfis (família) |
| PUT/DELETE | `/api/profiles/:id` | Edita / remove um perfil |
| GET | `/api/reports/:examTypeId` | Série histórica de um tipo de exame (para o gráfico) |
| POST | `/api/reports/:examTypeId/analyze` | Gera análise de IA sobre o histórico |
| GET | `/api/reports/:examTypeId/pdf` | Exporta relatório em PDF |
| GET/PUT | `/api/settings` | Configurações do usuário (provedor de IA, chave, tema) |
| GET/POST/DELETE | `/api/exam-types` | Tipos de exame (padrão do sistema + customizados) |
| GET/POST/PUT/DELETE | `/api/reminders` | Lembretes de reexame |
| GET | `/api/health` | Health check |

## Configurando um provedor de IA

1. Crie uma conta e faça login na aplicação
2. Acesse **Configurações**
3. Escolha o provedor (Gemini, OpenAI ou Claude) e informe sua própria API Key
4. A chave é criptografada antes de ser salva no banco — nunca fica em texto plano

## Aviso

Este projeto é uma ferramenta de organização pessoal/familiar. Os feedbacks gerados por IA são **informativos** e não substituem avaliação, diagnóstico ou consulta médica profissional.

## Direitos autorais

Este projeto foi desenvolvido por Alexandre Neto.

Sinta-se à vontade para se inspirar ou utilizar partes deste projeto, mas peço, por gentileza, que sejam dados os devidos créditos ao autor.
