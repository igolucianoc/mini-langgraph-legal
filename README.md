# Mini Legal Graph

> Assistente de **triagem jurídica educacional** que demonstra o **LangGraph** como
> orquestrador de um workflow com estado tipado, decisões condicionais, ciclos
> controlados e verificação anti-alucinação — não como um simples wrapper de uma
> chamada de LLM.

> **Aviso:** projeto **educacional** e de portfólio. **Não** oferece aconselhamento
> jurídico profissional, não usa dados pessoais nem casos reais, e a base
> documental é **fictícia**.

---

## Problema

Chamar um LLM diretamente para responder uma pergunta jurídica é arriscado: o
modelo pode inventar fontes, responder sem base e esconder a ausência de evidência
atrás de um texto convincente. Além disso, uma única chamada não deixa visível
*como* a decisão foi tomada.

## Objetivo

Construir um fluxo pequeno, porém realista, que:

1. classifica a intenção e a área jurídica da pergunta;
2. decide se precisa pesquisar numa base documental;
3. recupera evidências por **busca vetorial** (pgvector);
4. avalia se a evidência é **suficiente**;
5. gera uma análise **ancorada nas evidências**;
6. **verifica** que nenhuma fonte foi inventada;
7. finaliza com uma orientação estruturada e citações rastreáveis.

## Por que LangGraph?

O LangGraph torna o workflow **explícito e testável**: há um estado compartilhado
e tipado, nós pequenos e determinísticos, *conditional edges* que roteiam com base
no estado e um ciclo de *retry* com **limite explícito**. Cada decisão do fluxo é
uma função pura, testável sem chamar o LLM. Isso é exatamente o que uma chamada
solta de LLM não oferece.

---

## Arquitetura

```text
mini-langgraph-legal/
├── api/                      # Backend NestJS + LangGraph
│   ├── src/
│   │   ├── config/           # Env tipado (Zod) + AppConfigService
│   │   ├── prisma/           # PrismaService/Module
│   │   ├── shared/           # Embedding determinístico, observabilidade, pipe Zod
│   │   └── modules/
│   │       ├── auth/         # JWT + refresh rotativo (argon2, reuse detection)
│   │       └── legal-research/
│   │           ├── domain/        # Tipos, contratos, política de evidência, verificador
│   │           ├── graph/         # StateGraph: state, nós, routing
│   │           ├── infrastructure/# Adapters HF, pgvector, fakes
│   │           ├── presentation/  # Controller SSE, eventos
│   │           └── schemas/       # Zod (entrada + saída do LLM)
│   └── prisma/               # schema, migration, seed determinístico
├── web/                      # Frontend Next.js 15 (App Router)
│   └── src/
│       ├── app/              # layout + página (gate login/pesquisa)
│       ├── components/       # UI seguindo DESIGN.md
│       ├── features/         # auth + research (SSE, indicador do grafo)
│       └── lib/              # API client + tipos compartilhados
└── docker-compose.yml        # postgres (pgvector) + api + web
```

Princípios: **Clean Architecture + Vertical Slices + SOLID**, sem overengineering.
O domínio depende de **contratos** (`LlmProvider`, `EmbeddingsProvider`,
`RetrievalProvider`, `AnswerVerifier`), nunca do SDK. Detalhes em
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) e nos ADRs em [`docs/adr/`](docs/adr).

### Diagrama do grafo

```text
Pergunta
   ↓
classify
   ↓
decide ──(direct_answer)──────────────────────────→ finalize → END
   │
   (research)
   ↓
retrieve  ◀───────────────────────┐
   ↓                               │ (retry, se attempt < maxAttempts)
evaluate ──(insufficient)──────────┼──────────────→ finalize → END
   │                               │
   (sufficient)                    │
   ↓                               │
generate                           │
   ↓                               │
verify ──(accept)──────────────────┼──────────────→ finalize → END
        └──(retry)─────────────────┘
        └──(insufficient, limite atingido)────────→ finalize → END
```

### Estado (tipado)

`question`, `correlationId`, `intent`, `category`, `needsResearch`, `evidence[]`,
`analysis`, `citations[]`, `confidence`, `attempt`, `maxAttempts`, `status`,
`outcome`, `error`. Definido com `Annotation.Root` do LangGraph.

### Nós

`classifyQuestion` · `decideResearch` · `retrieveEvidence` · `evaluateEvidence` ·
`generateAnalysis` · `verifyAnswer` · `finalize`. Cada nó é pequeno, devolve um
patch parcial e não concentra a regra de negócio (que vive no domínio e no routing).

### Conditional edges

- **decide**: `direct_answer` → finalize | `research` → retrieve
- **evaluate**: `insufficient` → finalize | `sufficient` → generate
- **verify**: `accept` → finalize | `retry` → retrieve | `insufficient` → finalize

### Estratégia de retry

O ciclo `retrieve → evaluate → generate → verify` pode repetir, mas o routing só
retorna `retry` enquanto `attempt < maxAttempts` (padrão **2**). O grafo também é
compilado com um `recursionLimit` defensivo. **Não há ciclo infinito.**

### Retrieval, evidências e citações

- Busca vetorial por **similaridade coseno** no pgvector (`<=>`), com `top-k`,
  `threshold` e filtro por categoria.
- **Evidência suficiente** = mínimo de trechos acima do threshold + cobertura da
  categoria. Caso contrário, o resultado é `INSUFFICIENT_EVIDENCE` — explícito.
- **Anti-alucinação:** o `verifyAnswer` confere que **toda** citação aponta para um
  `chunkId` presente nas evidências recuperadas. Fonte inexistente = rejeição.

### Streaming (SSE)

A execução é transmitida via **Server-Sent Events** (sem WebSocket). Eventos:
`started → classifying → retrieving → evidence_evaluated → generating → verifying →
completed | failed`. O frontend usa isso para mostrar o grafo executando passo a
passo.

---

## Stack

Backend NestJS + TypeScript strict · LangGraph · Prisma + PostgreSQL + pgvector ·
Zod · Vitest · SSE. Frontend Next.js 15 (App Router) + React + TypeScript strict ·
Vitest. Infra Docker Compose. LLM/embeddings: Hugging Face (atrás de adapters),
com **fallback determinístico** para rodar sem token.

---

## Setup

### Requisitos

- Docker + Docker Compose
- (Opcional, para dev fora do container) Node.js 20+

### Subir tudo com Docker

```bash
cp .env.example .env        # ajuste se quiser
docker compose up --build
```

- Frontend: http://localhost:3000
- API: http://localhost:3001 (health em `/health`)
- PostgreSQL + pgvector: porta 5432

Na primeira subida, aplique migration e seed (a API já espera o banco saudável):

```bash
docker compose exec api npx prisma migrate deploy
docker compose exec api npm run db:seed
```

### Rodar em modo desenvolvimento

```bash
# Banco
docker compose up -d postgres

# API
cd api
npm install
echo 'DATABASE_URL=postgresql://postgres:postgres@localhost:5432/mini_langgraph_legal' > .env
npx prisma migrate deploy
npm run db:seed
npm run start:dev

# Frontend (outro terminal)
cd web
npm install
npm run dev
```

### Seed

O seed (`api/prisma/seed.ts`) é **idempotente**: recria a base documental fictícia
(7 documentos, 21 trechos). Ele respeita `AI_PROVIDER` para gerar os embeddings:
com `fake` usa o embedding **determinístico local** (sem rede); com `huggingface`
gera os embeddings pela mesma Hugging Face usada em runtime.

> **Importante:** documentos e perguntas precisam usar o **mesmo** modelo de
> embeddings. Ao alternar `AI_PROVIDER` entre `fake` e `huggingface`, rode
> `npm run db:seed` novamente para reindexar — caso contrário a busca vetorial
> não encontra evidências e toda pergunta cai em "evidência insuficiente".

---

## Variáveis de ambiente

Veja [`.env.example`](.env.example). Principais:

| Variável | Descrição | Padrão |
|----------|-----------|--------|
| `DATABASE_URL` | Conexão Postgres | `postgresql://postgres:postgres@postgres:5432/mini_langgraph_legal` |
| `AI_PROVIDER` | `fake` (determinístico, sem rede) ou `huggingface` | `fake` |
| `HF_API_TOKEN` | Token da Hugging Face (só para `huggingface`) | vazio |
| `HF_MODEL` | Modelo de chat | `meta-llama/Llama-3.1-8B-Instruct` |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | Segredos JWT | dev-only |
| `RETRIEVAL_TOP_K` / `RETRIEVAL_THRESHOLD` | Parâmetros de retrieval | `5` / `0.35` |

> Com `AI_PROVIDER=fake` (padrão) a aplicação roda **ponta a ponta sem token**,
> usando um classificador por regras e embeddings determinísticos. Para IA real,
> defina `AI_PROVIDER=huggingface` e preencha `HF_API_TOKEN`.

---

## Segurança

- Senhas com **argon2**; refresh token **rotativo** armazenado apenas como hash
  (SHA-256), com **reuse detection** que revoga a cadeia inteira.
- Access token JWT curto, mantido **em memória** no frontend.
- **Rate limiting** nas rotas de auth (`@nestjs/throttler`).
- Segredos e tokens **nunca** aparecem em logs.
- Toda saída crítica do LLM é **validada com Zod** antes de virar estado.

---

## Testes

```bash
cd api
npm test            # unitários (nós, routing, grafo, auth, providers, SSE)
npm run test:e2e    # E2E: login → pergunta → execução → resposta (precisa do Postgres)

cd ../web
npm test            # componentes (indicador do grafo, painel de resultado)
```

Os testes **nunca** chamam a Hugging Face: usam **fake providers determinísticos**.
O E2E sobe o app Nest real com `AI_PROVIDER=fake` e consome o SSE.

---

## Exemplos de perguntas

- "Quais são os requisitos para uma cobrança judicial de uma dívida contratual?"
- "O que caracteriza o inadimplemento de uma obrigação?"
- "Quais direitos o consumidor tem diante de um vício do produto?"
- "Quais são os fundamentos da responsabilidade civil?"
- "Como funciona a fase de conhecimento no processo civil?"

Uma pergunta fora do domínio (ex.: "qual a previsão do tempo?") é classificada como
fora de escopo e **não** dispara pesquisa.

---

## O que este projeto demonstra

- **`StateGraph` do LangGraph** com estado compartilhado e tipado.
- **Nós pequenos e determinísticos**, separados das decisões de fluxo.
- **Conditional edges** e **routing baseado no estado**.
- **Ciclo controlado** com limite explícito de tentativas (sem loop infinito).
- **Separação entre workflow e providers** via contratos + adapters (LLM,
  embeddings, retrieval), permitindo trocar o provider e testar sem rede.
- **Validação das saídas do modelo** com Zod.
- **Prevenção de alucinação**: citações verificadas contra a base.
- **Evidência insuficiente tratada explicitamente**, sem inventar resposta.
- **Streaming de eventos** via SSE, tornando o grafo visível na UI.
- **Observabilidade** por `correlationId` sem vazar segredos.
- **Testes do grafo sem depender do LLM real.**

---

## Troubleshooting

- **`docker compose up` sobe mas a API não conecta ao banco:** aguarde o healthcheck
  do Postgres; a API depende de `service_healthy`. Rode a migration/seed depois.
- **`prisma migrate` acusa drift:** o banco tem estado divergente do histórico. Em
  ambiente de desenvolvimento, `docker compose down -v` recria o volume limpo.
- **Erro de extensão `vector`:** garanta a imagem `pgvector/pgvector:pg16`; a
  migration inicial cria a extensão automaticamente.
- **SSE não emite eventos no navegador:** confirme que `NEXT_PUBLIC_API_URL` aponta
  para a API e que o access token está válido (a rota SSE recebe o token por query
  param porque `EventSource` não envia cabeçalhos).
- **Sem resposta "de verdade" da IA:** com `AI_PROVIDER=fake` a análise é gerada por
  regras. Para IA real, use `AI_PROVIDER=huggingface` + `HF_API_TOKEN`.

---

## Desenvolvimento assistido por IA

Este projeto foi construído com apoio de um agente de IA (desenvolvimento assistido),
seguindo prompts incrementais e verificação (typecheck, lint, testes) ao final de
cada etapa. As decisões de arquitetura estão registradas nos ADRs em `docs/adr/`.

## Licença

MIT — uso educacional.
