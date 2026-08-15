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

