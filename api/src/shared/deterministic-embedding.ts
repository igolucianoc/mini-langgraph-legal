/**
 * Embedding determinístico e local (sem rede, sem LLM).
 *
 * Gera um vetor de dimensão fixa a partir do texto usando um "hashing trick"
 * sobre tokens, normalizado (L2). É estável entre execuções, o que torna o seed
 * e os testes reproduzíveis. Não é semanticamente rico como um modelo real, mas
 * é suficiente para exercitar a busca vetorial (pgvector) de forma determinística.
 */
export const EMBEDDING_DIMENSION = 384;

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 1);
}

/** Hash FNV-1a de 32 bits, determinístico. */
function fnv1a(token: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < token.length; i += 1) {
    hash ^= token.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** Gera um embedding determinístico normalizado (L2) para um texto. */
export function embedText(
  text: string,
  dimension: number = EMBEDDING_DIMENSION,
): number[] {
  const vector = new Array<number>(dimension).fill(0);
  const tokens = tokenize(text);

  for (const token of tokens) {
    const hash = fnv1a(token);
    const index = hash % dimension;
    // Sinal derivado de um bit alto do hash, para variar a direção.
    const sign = (hash & 0x80000000) !== 0 ? -1 : 1;
    vector[index] += sign;
  }

  let norm = 0;
  for (const value of vector) {
    norm += value * value;
  }
  norm = Math.sqrt(norm);

  if (norm === 0) {
    return vector;
  }

  return vector.map((value) => value / norm);
}

/** Serializa um vetor no formato aceito pelo pgvector: `[v1,v2,...]`. */
export function toPgVector(vector: readonly number[]): string {
  return `[${vector.join(',')}]`;
}
