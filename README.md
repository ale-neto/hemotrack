# 🩸 HemoTrack — Gerenciador Inteligente de Exames de Sangue

Projeto de portfólio/estudo full-stack: organiza exames de sangue, acompanha tendências ao longo do tempo e gera feedback assistido por IA (Gemini / OpenAI / Claude, configurável pelo usuário).

> Consulte [specs/mission.md](specs/mission.md), [specs/tech-stack.md](specs/tech-stack.md), [specs/roadmap.md](specs/roadmap.md) e [specs/ARCHITECTURE.md](specs/ARCHITECTURE.md) para a "constituição" do projeto — propósito, stack, ordem de implementação e padrões de arquitetura.

## Estrutura do repositório

```
hemotrack/
├── hemotrack-backend/     # API Node.js + docker-compose
│   └── backend/           # código-fonte da API (Express, Sequelize, Socket.IO)
├── hemotrack-frontend/     # Angular 19 + PrimeNG
└── specs/                 # constituição do projeto (mission, tech-stack, roadmap)
```

## Stack (resumo)
- **Backend:** Node.js 22 + Express + Sequelize + PostgreSQL 16 + Socket.IO
- **Frontend:** Angular 19 + PrimeNG 18 + Chart.js
- **IA:** Gemini / OpenAI / Claude (chave configurável pelo usuário, por perfil)
- **PDF Export:** Puppeteer

Detalhes completos em [specs/tech-stack.md](specs/tech-stack.md).

## Início rápido

### 1. Variáveis de ambiente
```bash
cd hemotrack-backend/backend
cp .env.example .env
# edite .env com as chaves JWT e de criptografia
```

### 2. Rodar com Docker (recomendado)
```bash
cd hemotrack-backend
docker compose up --build
```

### 3. Rodar localmente (dev)
```bash
# Terminal 1 — PostgreSQL
docker run -d -p 5432:5432 \
  -e POSTGRES_DB=hemotrack \
  -e POSTGRES_USER=hemotrack \
  -e POSTGRES_PASSWORD=hemotrack_pass \
  postgres:16-alpine

# Terminal 2 — Backend
cd hemotrack-backend/backend
npm install
npm run dev

# Terminal 3 — Frontend
cd hemotrack-frontend
npm install
npm start
```

## Acessos
| Serviço | URL |
|---|---|
| Frontend | http://localhost:4200 |
| Backend API | http://localhost:3000/api |
| Swagger Docs | http://localhost:3000/api-docs |
| Health Check | http://localhost:3000/api/health |

## Configurar IA
1. Acesse **Configurações** após fazer login
2. Selecione o provider: Gemini, OpenAI ou Claude
3. Cole sua API Key
4. Salve

## ⚠️ Aviso
Este app é uma ferramenta de organização pessoal. Os feedbacks de IA são informativos e **não substituem consulta médica profissional**.
