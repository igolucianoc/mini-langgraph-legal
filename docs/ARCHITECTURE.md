# Arquitetura — Mini Legal Graph

> Documento de arquitetura da etapa 01. Descreve o workflow LangGraph, o estado
> tipado, os nós, as edges condicionais, os contratos de providers e a estratégia
> para evidência insuficiente. Projeto **educacional**: não oferece aconselhamento
> jurídico e não usa dados reais.

## 1. Visão geral

O Mini Legal Graph é um assistente de **triagem jurídica educacional**. Ele recebe
uma pergunta em linguagem natural, classifica a intenção, decide se precisa
pesquisar numa base documental fictícia, recupera evidências via busca vetorial
(pgvector), avalia se as evidências são suficientes, gera uma análise apoiada
nessas evidências, verifica se a resposta não inventou fontes e finaliza com uma
orientação estruturada e citações rastreáveis.

O ponto central é demonstrar o **LangGraph como orquestrador de um workflow com
estado compartilhado e decisões condicionais** — não como um wrapper de uma única
chamada de LLM.

```text
Pergunta
   ↓
classifyQuestion
   ↓
decideResearch ──(direct_answer)──────────────→ finalize
   │
   (research)
   ↓
retrieveEvidence
   ↓
evaluateEvidence ──(insufficient)─────────────→ finalize
   │
   (sufficient)
   ↓
generateAnalysis
   ↓
verifyAnswer ──(accept)───────────────────────→ finalize
   │
   (retry, se dentro do limite de tentativas)
   └──→ retrieveEvidence
```

## 2. Estado do grafo (`LegalResearchState`)

Estado compartilhado e tipado, atualizado incrementalmente por cada nó. Sem `any`.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `question` | `string` | Pergunta original do usuário (imutável). |
| `intent` | `LegalIntent \| null` | Intenção classificada (ex.: `explain_concept`, `procedure`, `rights_obligations`). |
| `category` | `LegalCategory \| null` | Área jurídica aproximada (contratos, inadimplemento, responsabilidade civil, processo civil, consumidor). |
| `needsResearch` | `boolean \| null` | Decisão do nó `decideResearch`. |
| `evidence` | `Evidence[]` | Trechos recuperados da base, com score e origem. |
| `analysis` | `AnalysisResult \| null` | Análise estruturada gerada a partir das evidências. |
| `citations` | `Citation[]` | Citações validadas contra a base. |
| `confidence` | `number \| null` | Confiança agregada (0–1). |
| `attempt` | `number` | Contador de tentativas do ciclo retrieve→verify (inicia em 0). |
| `maxAttempts` | `number` | Limite explícito de tentativas (padrão 2). |
| `status` | `ExecutionStatus` | `started \| classifying \| retrieving \| evidence_evaluated \| generating \| verifying \| completed \| failed`. |
| `outcome` | `ResearchOutcome \| null` | Resultado final: `answered`, `insufficient_evidence`, `direct_answer` ou `failed`. |
| `error` | `string \| null` | Mensagem de erro segura (sem stack/secret) quando `status = failed`. |
| `correlationId` | `string` | Id de correlação para observabilidade. |

O estado usa **reducers** do LangGraph apenas onde há acumulação (ex.: `evidence`);
os demais campos são substituídos pelo último valor escrito.

## 3. Nós (pequenos e determinísticos)

Cada nó tem uma responsabilidade única, recebe o estado e devolve um patch parcial.
Nenhum nó concentra toda a regra de negócio; a lógica de decisão vive nas funções
de routing.

1. **`classifyQuestion`** — usa o `LlmProvider` (atrás de contrato) para classificar
   intenção e categoria. Saída validada com Zod. Define `status = classifying`.
2. **`decideResearch`** — decide `needsResearch` a partir da intenção/categoria.
   Perguntas puramente conceituais e seguras podem seguir para `finalize` como
   `direct_answer`; o restante segue para retrieval.
3. **`retrieveEvidence`** — consulta o `RetrievalProvider` (pgvector) com top-k,
   threshold e filtro por categoria. Incrementa `attempt`. Define `status = retrieving`.
4. **`evaluateEvidence`** — aplica a regra de suficiência (quantidade mínima de
   evidências acima do threshold e cobertura da categoria). Define
   `status = evidence_evaluated`.
5. **`generateAnalysis`** — gera a análise estruturada com o `LlmProvider`, sempre
   ancorada nas evidências recuperadas. Saída validada com Zod. `status = generating`.
6. **`verifyAnswer`** — verifica que toda citação existe na base (anti-alucinação),
   que a análise está apoiada pelas evidências e calcula `confidence`.
   `status = verifying`.
7. **`finalize`** — consolida `outcome`, `confidence` e citações. `status = completed`
   (ou `failed` em erro capturado).

## 4. Edges e conditional edges

- `START → classifyQuestion`
- `classifyQuestion → decideResearch`
- `decideResearch` **(conditional)**:
  - `direct_answer` → `finalize`
  - `research` → `retrieveEvidence`
- `retrieveEvidence → evaluateEvidence`
- `evaluateEvidence` **(conditional)**:
  - `insufficient` → `finalize` (outcome `insufficient_evidence`)
  - `sufficient` → `generateAnalysis`
- `generateAnalysis → verifyAnswer`
- `verifyAnswer` **(conditional)**:
  - `accept` → `finalize`
  - `retry` → `retrieveEvidence` (somente se `attempt < maxAttempts`)
  - se `retry` requisitado mas `attempt >= maxAttempts` → `finalize` com
    `insufficient_evidence` (nunca loop infinito)
- `finalize → END`

## 5. Limite de iterações

O ciclo `retrieveEvidence → evaluateEvidence → generateAnalysis → verifyAnswer`
pode repetir, mas o routing de `verifyAnswer` só retorna `retry` enquanto
`attempt < maxAttempts` (padrão 2). Atingido o limite, o fluxo é forçado a
`finalize`. Além disso o grafo é compilado com um `recursionLimit` defensivo.

## 6. Contratos de providers (domínio desacoplado do SDK)

O domínio depende apenas destes contratos; adapters concretos (Hugging Face,
pgvector/Prisma) implementam-nos na camada de infraestrutura. Testes usam fakes.

### 6.1 `LlmProvider`

```ts
interface LlmProvider {
  classify(input: ClassifyInput): Promise<ClassifyOutput>;   // intent + category + needsResearch hint
  analyze(input: AnalyzeInput): Promise<AnalyzeOutput>;      // análise estruturada ancorada em evidências
}
```

- Configurável por env (`HF_API_TOKEN`, `HF_MODEL`), com timeout e tratamento de erro.
- Nunca loga segredos nem o token.
- Toda saída é validada com Zod antes de virar estado.

### 6.2 `EmbeddingsProvider`

```ts
interface EmbeddingsProvider {
  embed(texts: string[]): Promise<number[][]>;
}
```

- Adapter isolado; contrato independente do SDK.

### 6.3 `RetrievalProvider`

```ts
interface RetrievalProvider {
  search(query: RetrievalQuery): Promise<Evidence[]>;
}

interface RetrievalQuery {
  embedding: number[];
  category?: LegalCategory;
  topK: number;
  threshold: number;
}
```

- Consulta apenas documentos existentes na base (pgvector, similaridade coseno).

### 6.4 `AnswerVerifier`

```ts
interface AnswerVerifier {
  verify(input: VerifyInput): VerifyResult; // determinístico, sem LLM
}
```

- Confere que cada citação aponta para um `chunkId`/documento existente entre as
  evidências recuperadas; marca fontes inexistentes como violação.

## 7. Formato das citações

```ts
interface Citation {
  documentId: string;
  chunkId: string;
  title: string;
  category: LegalCategory;
  snippet: string;   // trecho literal presente na evidência
  score: number;     // similaridade do retrieval
}
```

Uma citação só é válida se o `chunkId` estiver entre as evidências recuperadas na
execução. O verificador rejeita qualquer fonte que o modelo tente inventar.

## 8. Estratégia para evidência insuficiente

Se `evaluateEvidence` concluir que não há evidência suficiente (poucos trechos
acima do threshold ou baixa cobertura), o fluxo vai direto a `finalize` com
`outcome = insufficient_evidence`. A resposta ao usuário é **explícita**: informa
que não há base documental suficiente para uma orientação e não inventa conteúdo.
O mesmo vale quando o `retry` esgota o `maxAttempts`.

## 9. Observabilidade

Cada execução registra `correlationId`, nó atual, duração por nó, modelo usado,
tokens (quando disponíveis), tamanho do retrieval, tentativas, outcome e erro.
Segredos, tokens e conteúdo sensível nunca são logados. Detalhes na etapa 10.

## 10. Fronteiras de camada

- **application/graph**: estado, nós, routing, service. Depende só de contratos.
- **infrastructure**: adapters HF (LLM/embeddings), retrieval pgvector/Prisma.
- **presentation**: controller HTTP + SSE.
- **schemas**: Zod para entrada/saída e validação das respostas do LLM.

O frontend consome o backend por HTTP/SSE e não replica regra de negócio.
