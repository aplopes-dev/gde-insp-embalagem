/**
 * Calcula quantas peças pendentes recriar após uma quebra de caixa.
 *
 * A caixa quebrada já está packed localmente e, em regra, ainda não foi
 * apontada no JERP — logo `jerpRemaining` ainda inclui essas peças.
 *
 * - Se `jerpRemaining >= currentBoxPacked`: desconta a caixa atual.
 * - Se `jerpRemaining < currentBoxPacked`: assume que o JERP já descontou
 *   esta caixa (ou o restante já é só o pós-quebra) → usa o restante direto.
 * - Se JERP indisponível: fallback para o pendente local.
 */
export function resolveBreakPendingQuantity(params: {
  localPending: number;
  jerpRemaining: number | null;
  currentBoxPacked: number;
}): number {
  const { localPending, jerpRemaining, currentBoxPacked } = params;

  if (jerpRemaining == null) {
    return Math.max(0, localPending);
  }

  const remaining = Math.max(0, jerpRemaining);

  if (remaining >= currentBoxPacked) {
    return Math.max(0, remaining - currentBoxPacked);
  }

  return remaining;
}
