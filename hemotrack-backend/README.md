# 🩸 HemoTrack — Gerenciador Inteligente de Exames de Sangue

## Stack
- **Backend:** Node.js 22 + Express + Sequelize + PostgreSQL 16 + Socket.IO
- **Frontend:** Angular 19 + PrimeNG 18 + ECharts
- **IA:** Gemini / OpenAI / Claude (configurável pelo usuário)
- **PDF Export:** Puppeteer

## Início Rápido

### 1. Configurar variáveis de ambiente
```bash
cd backend
cp .env.example .env
# Edite .env com suas chaves JWT e de criptografia
```

### 2. Rodar com Docker (recomendado)
```bash
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
cd backend
npm install
npm run dev

# Terminal 3 — Frontend
cd frontend
npm install
ng serve
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
2. Selecione o provider: **Gemini** (recomendado, free tier generoso), OpenAI ou Claude
3. Cole sua API Key
4. Salve

### Obter API Keys gratuitas
- **Gemini:** https://aistudio.google.com/app/apikey
- **OpenAI:** https://platform.openai.com/api-keys
- **Claude:** https://console.anthropic.com/settings/keys

## Estrutura do Projeto
```
hemotrack/
├── backend/          # Node.js API
├── frontend/         # Angular 19
├── docker-compose.yml
└── README.md
```

## Backup do Banco
```bash
docker exec hemotrack-db pg_dump -U hemotrack hemotrack > backup.sql
```

## ⚠️ Aviso
Este app é uma ferramenta de organização pessoal. Os feedbacks de IA são informativos e **não substituem consulta médica profissional**.
