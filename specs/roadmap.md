# Roadmap

Ordem de implementação em fases pequenas. O código atual já tem bastante scaffolding (rotas de auth/exams/profile/report/settings, models, 3 adapters de IA, frontend com features separadas) — as fases abaixo assumem "terminar e estabilizar o que existe" antes de aprofundar cada área, na ordem: **fundação → polimento de MVP → IA → relatórios/visualização**.

## Fase 0 — Fundação (auth + CRUD core de ponta a ponta)
- [x] Validar fluxo completo de registro/login/JWT (`auth.routes.js`, `auth.middleware.js`, `AuthGuard`, `AuthInterceptor`) rodando via Docker Compose. _(`docker-compose.yml` estava quebrado — build context do frontend apontava para `hemotrack-backend/frontend`, que não existe; movido para a raiz do repo com paths corrigidos para `./hemotrack-backend/backend` e `./hemotrack-frontend`. Stack sobe com `docker compose up --build`; validado via curl: register→201, login→200, `/me` com token→200, `/me` sem token→401.)_
- [x] CRUD de exames funcionando de ponta a ponta (criar, listar, detalhar, editar, excluir) entre `exams-list`, `exam-form`, `exam-detail` e a API. _(Validado via curl contra a API real em Docker: POST/GET/GET:id/PUT/DELETE em `/api/exams` retornando 200/201 corretamente.)_
- [x] CRUD básico de perfis (`profiles.component.ts` + `profile.routes.js`). _(Validado via curl: POST/GET/PUT/DELETE em `/api/profiles` retornando 200/201 corretamente.)_

### Refatoração piloto: módulo `exams` seguindo ARCHITECTURE.md
Módulo escolhido como prova de conceito da arquitetura em camadas descrita em [ARCHITECTURE.md](ARCHITECTURE.md) (Controller → Service → Repository → Gateway), antes de replicar o padrão nos demais módulos.
- [x] Resolver duplicidade `exam.routes.js` (319 linhas) vs `exams.routes.js` (35 linhas) — consolidar em um único arquivo de rotas. _(`exams.routes.js` era código morto — nunca importado por `server.js` e, na prática, quebrado (referenciava `router`/models sem os `require`s correspondentes). Removido; `exam.routes.js` é o único arquivo de rotas de exames agora.)_
- [x] Extrair `exam.repository.js` — mover todo acesso a `BloodExam`/`ExamResult`/`ExamType` via Sequelize para lá; rota deixa de importar models diretamente. _(`src/modules/exams/exam.repository.js`.)_
- [x] Extrair `exam.service.js` — mover a regra de negócio hoje inline nas rotas (filtros, orquestração de IA, emissão de eventos) para o service. _(`src/modules/exams/exam.service.js`; inclui a extração/orquestração de PDF em background que antes vivia dentro da rota.)_
- [x] Extrair `exam.mapper.js` — substituir os `.toJSON()`/`.toPublicJSON()` ad-hoc do model por um mapper explícito na borda. _(`src/modules/exams/exam.mapper.js`; preserva exatamente o formato de resposta anterior — lista/criação/edição sem `status` por resultado, detalhe com `status`.)_
- [x] Mover `services/adapters/{gemini,openai,claude}.adapter.js` para `shared/gateways/ai/`, com `ai.service.js` virando a factory que escolhe o adapter; `exam.service.js` passa a chamar a gateway em vez da rota chamar `ai.service` direto. _(`src/shared/gateways/ai/{gemini,openai,claude}.adapter.js` + `ai-gateway.factory.js`; `report.routes.js` também atualizado para o novo caminho.)_
- [x] `exam.routes.js` final só registra rotas e delega ao controller — sem lógica, sem Sequelize, sem chamada direta a Puppeteer/Socket.IO/adapters de IA. _(`src/modules/exams/{exam.routes.js,exam.controller.js}`; validado ponta a ponta via Docker Compose — list/detail/create/update/delete/share/shared-link, incluindo os casos 404/403.)_

_Durante a refatoração, dois bugs pré-existentes foram encontrados e corrigidos (fora do escopo original, mas bloqueando a validação):_
- _Contrato dos eventos Socket.IO da extração de PDF não batia com o que o frontend espera (`emitExtractionComplete`/`Error` emitiam `{examData}`/`{error}` sem `examId`, e com formato diferente do lido em `socket.service.ts`) — corrigido em `socketServer.js`. Rota morta `POST /exams/extract-pdf` (nunca chamada pelo frontend, não persistia nada) removida._
- _`error.middleware.js` mascarava `err.message` para **qualquer** status em produção, não só 5xx — isso quebrava mensagens 404/403 específicas assim que o service passou a lançar erros em vez da rota escrever a resposta direto. Corrigido para só mascarar em erros ≥500._

## Fase 1 — Polimento de MVP
- [x] Dashboard exibindo dados reais (não placeholder) — `dashboard.component.ts`. _(Já implementado antes deste roadmap ser escrito/atualizado — usa `ExamService`/`ReminderService`/`ProfileService` reais via signals, sem dado mock. Redação antiga do roadmap estava desatualizada.)_
- [x] Tela de Configurações completa: seleção de provedor de IA + salvar chave de API criptografada (`settings.routes.js` + `encryption.service.js`). _(Já implementado. Validado via curl+Docker: PUT `/api/settings` grava a chave, GET retorna mascarada como `***configured***`, e a chave está de fato criptografada no Postgres — `SELECT` direto na tabela mostra `iv:ciphertext`, nunca texto plano.)_
- [x] Tratamento de erros consistente ponta a ponta (`error.middleware.js` no backend + feedback de erro no frontend). _(Corrigido durante a refatoração do módulo exams: `error.middleware.js` mascarava `err.message` em produção para qualquer status; agora só mascara ≥500, preservando mensagens 404/403 específicas. Frontend já tinha tratamento de erro via toasts nos components verificados.)_
- [x] Upload de resultados de exame (`upload.middleware.js`) integrado ao formulário de exame. _(Já implementado — `exam-form.component.ts` monta `FormData` e faz POST para `/exams/upload-pdf`.)_
- [x] Socket.IO: definir e validar pelo menos um caso de uso real de atualização em tempo real (ex: status de processamento de IA). _(Caso de uso já existia — progresso de extração de PDF — mas o contrato de payload entre backend e frontend estava quebrado (campos/nome divergentes); corrigido em `socketServer.js` durante a Fase 0. Ver nota na Fase 0.)_

## Fase 2 — Aprofundar integração de IA
- [ ] Levar `openai.adapter.js` e `claude.adapter.js` (~52 linhas cada) ao mesmo nível de completude do `gemini.adapter.js` (~356 linhas).
- [ ] Consolidar a interface comum dos adapters em `ai.service.js` (hoje com 21 linhas — provavelmente só delega; formalizar contrato único).
- [ ] Troca de provedor pelo usuário sem quebrar histórico de insights já gerados.
- [ ] Qualidade/consistência dos prompts e das respostas de IA (ex: sempre incluir o aviso de que não substitui avaliação médica).

## Fase 3 — Relatórios e visualização
- [ ] Geração de PDF via Puppeteer (`report.routes.js`) com layout definitivo.
- [ ] Gráficos de tendência de exames ao longo do tempo no frontend (Chart.js) na tela de detalhe/relatórios.
- [ ] Exportação/download do relatório a partir da UI (`reports.component.ts`).

## Fora do escopo desta versão
- Multi-tenancy / múltiplos pacientes por clínica (ver [mission.md](mission.md) — não-objetivo).
- Infraestrutura de produção enterprise (scaling, HA) — não é prioridade para um projeto de portfólio.
