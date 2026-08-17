import type { PlacedModule, RowKey } from '../types/composition';

/**
 * Divide a "parede" de montagem em fileiras — como o time que monta o
 * móvel de verdade enxerga: módulos superiores numa linha, inferiores
 * embaixo, torres/colunas à parte, e um catch-all ("geral") pra qualquer
 * módulo que não se encaixe num nome padronizado.
 *
 * Ordem de exibição de cima pra baixo (ver App/BuildCanvas): superior no
 * topo da parede, depois torre, depois os "gerais" (itens de bancada/avulsos,
 * ficam no meio), e inferior embaixo — igual à disposição física real.
 */
export const ROW_ORDER: RowKey[] = ['superior', 'torre', 'geral', 'inferior'];

export const ROW_LABELS: Record<RowKey, string> = {
  superior: 'Módulos superiores',
  torre: 'Torres / colunas',
  geral: 'Outros módulos',
  inferior: 'Módulos inferiores',
};

/**
 * Descobre a fileira de um módulo pelo nome do produto no WooCommerce —
 * a convenção "Módulo X Superior" / "Módulo X Inferior" já existe no
 * catálogo real (ver README > api/storeApi.ts). Quando o cliente cadastrar
 * módulos "Inferior" ou "Torre"/"Coluna", o sistema reconhece sozinho, sem
 * a pessoa ter que escolher a fileira na mão a cada módulo adicionado.
 */
export function inferRowKey(moduleName: string): RowKey {
  const normalized = moduleName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  if (normalized.includes('inferior')) return 'inferior';
  if (normalized.includes('torre') || normalized.includes('coluna')) return 'torre';
  if (normalized.includes('superior')) return 'superior';
  return 'geral';
}

/** Agrupa os módulos colocados por fileira, na ordem de exibição (`ROW_ORDER`), omitindo fileiras vazias. */
export function groupByRow(
  modules: PlacedModule[],
): Array<{ row: RowKey; modules: PlacedModule[] }> {
  return ROW_ORDER.map((row) => ({
    row,
    modules: modules.filter((m) => m.row === row),
  })).filter((group) => group.modules.length > 0);
}

/**
 * Resolve a posição horizontal (offset em cm) de um módulo dentro da
 * própria fileira: parte do X desejado (onde o dedo soltou), garante que
 * cabe dentro da largura do ambiente, e — se colidir com outro módulo já
 * colocado — "escorrega" pro ponto livre válido mais PRÓXIMO do X desejado
 * (encostado logo antes ou logo depois de quem está no caminho), em vez de
 * simplesmente recusar o drop. Isso é o que dá a sensação de "soltar onde
 * quiser": não precisa mais encaixar numa sequência, só não pode ficar por
 * cima de outro módulo da mesma fileira.
 *
 * `others` é a lista dos OUTROS módulos já colocados na mesma fileira (sem
 * incluir o que está sendo movido/adicionado agora). `fallback` é usado só
 * no caso raro de a fileira estar tão cheia que não sobra nenhum ponto
 * válido — devolve a posição anterior (ou o fim da fileira), sem travar a
 * interação.
 */
export function resolveOffsetCm(
  others: Array<{ offsetCm: number; widthCm: number }>,
  desiredOffsetCm: number,
  widthCm: number,
  roomWidthCm: number,
  fallback: number,
): number {
  const maxStart = Math.max(0, roomWidthCm - widthCm);
  const clamp = (v: number) => Math.min(maxStart, Math.max(0, v));
  const overlaps = (start: number) =>
    others.some((o) => start < o.offsetCm + o.widthCm && start + widthCm > o.offsetCm);

  const desired = clamp(desiredOffsetCm);
  if (!overlaps(desired)) return desired;

  const candidates = [0, maxStart];
  others.forEach((o) => {
    candidates.push(clamp(o.offsetCm + o.widthCm)); // encostado logo depois desse módulo
    candidates.push(clamp(o.offsetCm - widthCm)); // encostado logo antes desse módulo
  });

  const valid = candidates.filter((c) => !overlaps(c));
  if (valid.length === 0) return clamp(fallback);

  valid.sort((a, b) => Math.abs(a - desired) - Math.abs(b - desired));
  return valid[0];
}

/** Soma das larguras dos módulos de uma fileira — usado como posição padrão (final da fila) quando não há um X específico (ex.: botão "+ Adicionar", deep-link). */
export function packedEndOffsetCm(others: Array<{ widthCm: number }>): number {
  return others.reduce((sum, m) => sum + m.widthCm, 0);
}
