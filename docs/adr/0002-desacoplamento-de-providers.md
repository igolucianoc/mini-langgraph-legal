# ADR 0002 — Desacoplamento de providers (LLM, embeddings, retrieval)

## Status
Aceito

## Contexto
O projeto usa Hugging Face para LLM/embeddings e pgvector para busca vetorial.
Acoplar o domínio ao SDK de um provider dificultaria testes (exigiriam rede) e
prenderia a arquitetura a um fornecedor. As regras do projeto proíbem chamadas
reais de LLM nos testes.

## Decisão
Definir contratos no domínio (`LlmProvider`, `EmbeddingsProvider`,
`RetrievalProvider`, `AnswerVerifier`). Os adapters concretos vivem em
`infrastructure/` e são injetados via DI do NestJS. Nos testes usamos **fake
providers determinísticos**.

## Consequências
- Positivas: testes rápidos e sem rede; troca de provider sem tocar no grafo;
  fronteiras claras (Clean Architecture).
- Negativas: uma camada de indireção a mais (contratos + adapters), justificada
  pela testabilidade e pelas regras do projeto.
