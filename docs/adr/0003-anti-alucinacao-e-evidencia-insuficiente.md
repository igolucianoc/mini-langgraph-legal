# ADR 0003 — Anti-alucinação e evidência insuficiente

## Status
Aceito

## Contexto
Por ser um assistente jurídico (ainda que educacional), respostas com fontes
inventadas seriam graves. As regras exigem que toda citação exibida exista na base
e que evidência insuficiente seja marcada explicitamente, nunca mascarada por uma
resposta plausível.

## Decisão
- Um nó de verificação (`verifyAnswer`) determinístico confere que cada citação
  aponta para um `chunkId`/documento presente nas evidências recuperadas.
- O nó `evaluateEvidence` aplica regra de suficiência (mínimo de trechos acima do
  threshold + cobertura de categoria). Sem suficiência → `outcome = insufficient_evidence`.
- Toda saída crítica do LLM é validada com Zod antes de virar estado.
- O ciclo de retry tem limite explícito (`maxAttempts`), evitando loops infinitos.

## Consequências
- Positivas: elimina fontes inventadas; deixa clara a fronteira entre "há base" e
  "não há base"; comportamento previsível e testável.
- Negativas: algumas perguntas legítimas podem cair em `insufficient_evidence`
  quando a base fictícia não cobre o tema — aceitável e honesto para o escopo.
