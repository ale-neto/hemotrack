# Roadmap

Ordem de implementação em fases pequenas. O código atual já tem bastante scaffolding (rotas de auth/exams/profile/report/settings, models, 3 adapters de IA, frontend com features separadas) — as fases abaixo assumem "terminar e estabilizar o que existe" antes de aprofundar cada área, na ordem: **fundação → polimento de MVP → IA → relatórios/visualização**.

## Fase 0 — Fundação (auth + CRUD core de ponta a ponta)
- [ ] Validar fluxo completo de registro/login/JWT (`auth.routes.js`, `auth.middleware.js`, `AuthGuard`, `AuthInterceptor`) rodando via Docker Compose.
- [ ] CRUD de exames funcionando de ponta a ponta (criar, listar, detalhar, editar, excluir) entre `exams-list`, `exam-form`, `exam-detail` e a API.
- [ ] CRUD básico de perfis (`profiles.component.ts` + `profile.routes.js`).

### Refatoração piloto: módulo `exams` seguindo ARCHITECTURE.md
Módulo escolhido como prova de conceito da arquitetura em camadas descrita em [ARCHITECTURE.md](ARCHITECTURE.md) (Controller → Service → Repository → Gateway), antes de replicar o padrão nos demais módulos.
- [ ] Resolver duplicidade `exam.routes.js` (319 linhas) vs `exams.routes.js` (35 linhas) — consolidar em um único arquivo de rotas.
- [ ] Extrair `exam.repository.js` — mover todo acesso a `BloodExam`/`ExamResult`/`ExamType` via Sequelize para lá; rota deixa de importar models diretamente.
- [ ] Extrair `exam.service.js` — mover a regra de negócio hoje inline nas rotas (filtros, orquestração de IA, emissão de eventos) para o service.
- [ ] Extrair `exam.mapper.js` — substituir os `.toJSON()`/`.toPublicJSON()` ad-hoc do model por um mapper explícito na borda.
- [ ] Mover `services/adapters/{gemini,openai,claude}.adapter.js` para `shared/gateways/ai/`, com `ai.service.js` virando a factory que escolhe o adapter; `exam.service.js` passa a chamar a gateway em vez da rota chamar `ai.service` direto.
- [ ] `exam.routes.js` final só registra rotas e delega ao controller — sem lógica, sem Sequelize, sem chamada direta a Puppeteer/Socket.IO/adapters de IA.

## Fase 1 — Polimento de MVP
- [ ] Dashboard exibindo dados reais (não placeholder) — `dashboard.component.ts`.
- [ ] Tela de Configurações completa: seleção de provedor de IA + salvar chave de API criptografada (`settings.routes.js` + `encryption.service.js`).
- [ ] Tratamento de erros consistente ponta a ponta (`error.middleware.js` no backend + feedback de erro no frontend).
- [ ] Upload de resultados de exame (`upload.middleware.js`) integrado ao formulário de exame.
- [ ] Socket.IO: definir e validar pelo menos um caso de uso real de atualização em tempo real (ex: status de processamento de IA).

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
