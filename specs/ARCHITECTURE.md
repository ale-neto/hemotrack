# Architecture

Este documento é a constituição arquitetural do HemoTrack: como o código deve ser organizado e por quê. Ele complementa [mission.md](mission.md), [tech-stack.md](tech-stack.md) e [roadmap.md](roadmap.md) — a stack já está fixada, este documento define **como estruturar** o código dentro dela. É um documento de **referência** (o padrão a seguir daqui pra frente); o plano concreto de aplicar isso no código existente vive no [roadmap.md](roadmap.md).

Alinhado ao princípio de [mission.md](mission.md) de que "qualidade de código é parte do produto", mas também ao não-objetivo de escalar prematuramente: as decisões abaixo favorecem uma arquitetura limpa e desacoplada **sem** overengineering para um projeto pequeno (YAGNI).

## Princípios gerais

Toda decisão de código deve priorizar, nesta ordem de importância prática:

| Princípio | O que significa aqui |
|---|---|
| **Single Responsibility** | Cada arquivo/classe/função tem um único motivo para mudar. |
| **Separation of Concerns** | HTTP, regra de negócio, acesso a dados e integrações externas nunca se misturam no mesmo arquivo. |
| **Dependency Inversion / DI** | Camadas internas dependem de interfaces/contratos, não de implementações concretas; nada é instanciado com `new` dentro de regra de negócio quando houver alternativa via injeção. |
| **Open/Closed** | Extensão via novas implementações (ex: novo adapter de IA), não editando código existente. |
| **Composition over Inheritance** | Prefira injetar comportamento a criar hierarquias de classes. |
| **DRY** | Uma única fonte de verdade por regra de negócio — nunca duplicar validação/lógica entre rotas. |
| **KISS / YAGNI** | Não criar camada, abstração ou pasta para um cenário que ainda não existe — ver decisão sobre profundidade de camadas abaixo. |
| **Clean Architecture** | Dependências sempre apontam para dentro (rota/controller → service → repository), nunca o inverso. Sem dependências circulares. |

Regras rígidas, sem exceção:
- **Regra de negócio nunca vive em Controllers, Components ou Rotas.**
- **Nenhum arquivo deveria passar de ~250 linhas.** Se passar, é sinal de que está fazendo mais de uma coisa — quebrar.
- **Toda integração externa (IA, PDF, storage, realtime, criptografia) fica atrás de uma abstração (Gateway/Adapter).** Regra de negócio nunca importa a biblioteca externa diretamente.
- **Nunca expor entidades internas/models do ORM direto para o Front-End** — sempre um Mapper na borda (Controller/Presenter), mesmo sem uma camada de DTO formal.

## Decisão: tipagem no backend — JavaScript + JSDoc (não TypeScript)

O backend já é 100% JavaScript (CommonJS, `require`). Decisão explícita: **não migrar para TypeScript agora** — o custo de reescrever tudo não se paga no estágio atual do projeto (YAGNI/KISS).

Em vez disso:
- Tipar funções/módulos públicos com **JSDoc** (`@param`, `@returns`, `@typedef`).
- Ativar `// @ts-check` nos arquivos novos/refatorados quando fizer sentido, para ganhar checagem de tipos do editor sem precisar de build step.
- Evitar objetos "shape livre" passando entre camadas — usar `@typedef` para os formatos de DTO/resposta.
- O frontend Angular **continua em TypeScript estrito** (já é o padrão do Angular CLI) — essa decisão é só sobre o backend.

## Backend (`hemotrack-backend`) — camadas simplificadas

Sem camada de Use Case/Domain separada (isso seria overengineering para o tamanho atual do projeto). Três camadas, bem separadas:

```
Controller → Service → Repository → Database
```

- **Controller (rota):** só traduz HTTP ⇄ chamada de service. Recebe `req`, valida formato básico, chama o service, devolve resposta. Não sabe o que é Sequelize.
- **Service:** contém a regra de negócio do módulo (ex: `ExamService.createExam(...)`, `ExamService.getTrend(...)`). Orquestra repositories e gateways. É a única camada que "pensa".
- **Repository:** único lugar onde Sequelize/SQL aparece. Métodos como `ExamRepository.findByProfile(profileId)`.
- **Gateway:** abstrai qualquer integração externa (IA, PDF, upload, realtime, criptografia) — vive fora do fluxo Controller→Service→Repository, injetado nos Services que precisam dela.

### Estrutura alvo por módulo

```
src/
  modules/
    auth/
      auth.controller.js
      auth.service.js
      auth.repository.js
      auth.routes.js
      auth.validators.js
    exams/
      exam.controller.js       # só HTTP
      exam.service.js          # regra de negócio (única fonte de verdade)
      exam.repository.js       # único lugar com BloodExam.findAll/Sequelize
      exam.routes.js           # registra as rotas, delega ao controller
      exam.validators.js       # express-validator
      exam.mapper.js           # model -> resposta pública (substitui toPublicJSON() no model)
    profiles/
    reports/
    settings/
  shared/
    gateways/
      ai/                      # IAiGateway (contrato JSDoc) + implementações
        ai-gateway.factory.js  # escolhe adapter conforme configuração do usuário
        gemini.adapter.js
        openai.adapter.js
        claude.adapter.js
      pdf/                     # PuppeteerPdfGateway — Puppeteer nunca chamado fora daqui
      storage/                 # StorageGateway — multer nunca chamado fora daqui
      realtime/                # RealtimeGateway — Socket.IO nunca chamado fora das rotas/services via essa gateway
      crypto/                  # CryptoGateway (hoje já é encryption.service.js — só mover/renomear conceitualmente)
```

Gateways a formalizar (nenhum é 100% novo — a maioria já existe, falta a interface/contrato explícito):

| Gateway | Hoje | Ajuste necessário |
|---|---|---|
| `ai` gateway | `services/adapters/*.adapter.js` chamados direto da rota via `ai.service.js` | Mover para `shared/gateways/ai/`; `ai.service.js` vira só a factory que escolhe o adapter; Service do módulo chama a gateway, não a rota |
| `pdf` gateway | Puppeteer chamado direto em `report.routes.js` | Extrair para `shared/gateways/pdf/puppeteer-pdf.gateway.js` |
| `storage` gateway | `multer` direto em `upload.middleware.js` | Manter o middleware, mas regra de negócio (service) nunca importa `multer` — só recebe o caminho do arquivo já salvo |
| `realtime` gateway | `socketServer.js` importado direto nas rotas (`emitExtractionProgress`, etc.) | Service chama `realtimeGateway.emit(...)`; rota não conhece Socket.IO |
| `crypto` gateway | `encryption.service.js` | Já está isolado — só garantir que só é consumido via injeção, nunca instanciado ad-hoc |

## Frontend (`hemotrack-frontend`) — organização por feature, Signals-first

Já é o padrão do projeto (standalone components, sem NgModule) — manter e reforçar:

```
src/app/
  core/            # guards, interceptors, models e services verdadeiramente globais
  shared/          # components/pipes/directives reutilizáveis entre features
  features/
    auth/
    dashboard/
    exams/
      pages/            # ExamsListPage, ExamDetailPage (smart components)
      components/       # ExamCard, ExamForm (dumb components)
      facades/          # ExamsFacade — única porta de entrada para pages/components
      services/         # ExamsApiService — só HTTP (RxJS fica contido aqui)
      models/ interfaces/
      mappers/          # DTO da API -> model de UI
      validators/
      routing/
    profiles/
    reports/
    settings/
```

Regras:
- **Não criar todas as subpastas de antemão** — só existem quando há conteúdo real (YAGNI). Um feature pequeno (ex: `settings`) pode ter só `pages/` + `services/`.
- **Smart vs Dumb components:** pages/containers buscam dados (via facade); components apenas recebem `@Input()`/emitem `@Output()`.
- **Signals-first:** Facades expõem **Signals** (`signal()`, `computed()`) para os components consumirem — não Observables. RxJS/`HttpClient` ficam confinados aos `*Api.service.ts`, que convertem o resultado em signal dentro da Facade (ex: via `toSignal()`).
- Components nunca chamam `HttpClient` diretamente e nunca conhecem RxJS — só leem signals da facade.
- **Lazy loading** por feature (`loadChildren`/`loadComponent`), guards e interceptors já existentes (`auth.guard.ts`, `auth.interceptor.ts`) continuam no `core/`.

## Estado atual vs. alvo (gap real do código hoje)

Levantamento feito no código existente:

1. **`routes/exam.routes.js` (319 linhas) mistura tudo numa camada só:** validação inline, query builder Sequelize direto (`BloodExam.findAll`), chamada a `ai.service`, emissão de eventos Socket.IO — tudo dentro do handler da rota. É o exemplo mais claro de violação de Separation of Concerns no projeto hoje.
2. **Duplicidade `exam.routes.js` vs `exams.routes.js`** (319 vs 35 linhas) — precisa ser resolvida antes de aplicar a arquitetura em camadas nesse módulo.
3. **Adapters de IA já existem** (`services/adapters/gemini|openai|claude.adapter.js`) — é o ponto do backend mais próximo do padrão Gateway hoje. Falta apenas mover para `shared/gateways/ai/` e garantir que só a Service do módulo os chama (nunca a rota diretamente).
4. **Não existe camada de Repository** — os models Sequelize são acessados diretamente pelas rotas. Não existe Mapper — respostas usam `.toJSON()`/`.toPublicJSON()` ad-hoc definidos no próprio model.

O plano concreto de correção destes pontos (módulo piloto, ordem de execução) está no [roadmap.md](roadmap.md), Fase 0.
