/**
 * Cor do puxador desenhado no `ModuleSchematic.tsx` — igual ao
 * `finishSwatches.ts`, mas pro puxador em vez do acabamento da porta/gaveta.
 * Aqui não precisa de foto (o puxador é um detalhe pequeno no desenho), só
 * um tom metálico aproximado de cada opção real vendida (Alumínio/Bronze),
 * com um `stroke` mais escuro pra dar uma sugestão de brilho/relevo.
 */
export const HANDLE_COLORS: Record<string, { fill: string; stroke: string }> = {
  Alumínio: { fill: '#C7CBCE', stroke: '#8A9096' },
  Bronze: { fill: '#9C7238', stroke: '#5E4023' },
};

/** Devolve a cor do puxador, ou `null` se não estiver no mapa (fallback pro visual antigo). */
export function getHandleColor(
  handle: string | null | undefined,
): { fill: string; stroke: string } | null {
  if (!handle) return null;
  return HANDLE_COLORS[handle] ?? null;
}

