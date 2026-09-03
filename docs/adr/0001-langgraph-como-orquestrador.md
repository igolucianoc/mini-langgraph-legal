# ADR 0001 — LangGraph como orquestrador do workflow de triagem

## Status
Aceito

## Contexto
O produto precisa executar uma sequência de passos com estado compartilhado
(classificar → decidir pesquisa → recuperar → avaliar → gerar → verificar →
finalizar), com decisões condicionais e um ciclo de retry controlado. Uma simples
chamada de LLM não torna visível o fluxo de decisão nem permite testar transições
isoladas.

## Decisão
Usar **LangGraph** (`StateGraph`) com estado tipado, nós pequenos e determinísticos
e conditional edges. O routing fica em funções puras separadas dos nós, o que torna
as decisões testáveis sem chamar o LLM.

## Consequências
- Positivas: fluxo explícito e visível; nós e routing testáveis isoladamente; ciclos
  controlados por limite de tentativas; fácil de estudar em uma tarde.
- Negativas: um pouco mais de cerimônia do que uma chamada direta ao LLM, aceitável
  pelo objetivo educacional e de portfólio.
