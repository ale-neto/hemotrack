# Tech Stack

Documentação do stack tal como existe hoje no código (`hemotrack-backend/` e `hemotrack-frontend/`). Este documento reflete o estado atual — atualizar sempre que uma dependência de peso for adicionada/removida.

## Backend — `hemotrack-backend/`
- **Runtime:** Node.js 22
- **Framework HTTP:** Express 4
- **ORM / Banco:** Sequelize 6 + PostgreSQL 16 (`pg`, `pg-hstore`)
- **Real-time:** Socket.IO 4 (`src/socket/socketServer.js`)
- **Autenticação:** JWT (`jsonwebtoken`) + `bcryptjs` para hashing de senha (`src/middleware/auth.middleware.js`, `src/services/auth.service.js`)
- **Validação de entrada:** `express-validator`
- **Upload de arquivos:** `multer` (`src/middleware/upload.middleware.js`)
- **Criptografia de segredos:** serviço próprio `src/services/encryption.service.js` (usado para armazenar chaves de API de IA)
- **Geração de PDF:** Puppeteer (relatórios — `src/routes/report.routes.js`)
- **Logs:** `morgan`
- **IDs:** `uuid`

### Integração de IA (`src/shared/gateways/ai/`)
- `ai-gateway.factory.js` orquestra a chamada ao provedor configurado pelo usuário (e garante o aviso médico na resposta).
- `gemini.adapter.js`, `openai.adapter.js`, `claude.adapter.js` — um adapter por provedor, interface comum, provedor escolhido em runtime via configurações do usuário.
- `exam-taxonomy.js` — prompt de extração, taxonomia de tipos de exame e normalização compartilhados entre os três adapters.

### Qualidade
- **Lint/format:** Biome (`biome check .` / `biome format --write .`)
- **Testes:** Vitest + Supertest (`npm test`, config em `vitest.config.js`, testes em `tests/`)

## Frontend — `hemotrack-frontend/`
- **Framework:** Angular 19 (standalone components, sem NgModules — ver `app.config.ts` / `app.routes.ts`)
- **UI Kit:** PrimeNG 18 + `@primeuix/themes` + `primeicons`
- **Gráficos:** Chart.js 4
- **Real-time:** `socket.io-client`
- **Reatividade:** RxJS 7
- **Organização:** `core/` (guards, interceptors, models, services) + `features/` (auth, dashboard, exams, profiles, reports, settings) + `shared/components`

### Qualidade
- **Testes:** Karma + Jasmine (`ng test`)
- **TypeScript:** 5.6

## Infraestrutura
- **Containers:** Docker — `Dockerfile` próprio para backend e frontend, `docker-compose.yml` na raiz do repositório orquestrando API + PostgreSQL + frontend.
- **Servidor frontend em produção:** Nginx (`hemotrack-frontend/nginx.conf`), servindo o build Angular.
- **Ambiente:** variáveis em `.env` (backend), a partir de `.env.example`.

## Portas padrão
| Serviço | Porta |
|---|---|
| Frontend (dev) | 4200 |
| Backend API | 3000 |
| PostgreSQL | 5432 |
