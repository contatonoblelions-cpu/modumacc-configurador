/** Estado da composição que o cliente está montando. */

export interface RoomDimensions {
  widthCm: number;
  heightCm: number;
}

/**
 * Fileira da parede em que o módulo entra — decidido automaticamente pelo
 * nome do produto (ver `utils/rows.ts`), pra montagem ficar igual a uma
 * parede de verdade: módulos superiores em cima, inferiores embaixo, etc.
 */
export type RowKey = 'superior' | 'torre' | 'geral' | 'inferior';

/** Um módulo colocado na bancada de montagem, numa posição (ordem) específica. */
export interface PlacedModule {
  /** ID único da instância na composição (não é o ID do produto — o mesmo módulo pode repetir). */
  instanceId: string;
  moduleId: number;
  moduleName: string;
  thumbnail: string;
  /** Largura escolhida para essa instância (um módulo pode ter várias larguras disponíveis). */
  widthCm: number;
  heightCm: number;
  /** Fileira da parede em que esse módulo está (superior, inferior, torre...). */
  row: RowKey;
  /**
   * Posição horizontal LIVRE dentro da própria fileira, em cm a partir da
   * borda esquerda (0 = encostado na esquerda). Não precisa mais estar
   * grudado no vizinho — pode ter espaço vazio de qualquer tamanho antes ou
   * depois. Sempre resolvida (arredondada e sem sobrepor outro módulo da
   * mesma fileira) por `resolveOffsetCm` em `utils/rows.ts`.
   */
  offsetCm: number;
  /** Preço base (sem considerar acabamento específico) usado antes de resolver a variação exata. */
  basePriceCents: number;
  /** Preenchido depois de resolver contra acabamento/puxador globais da composição. */
  resolvedVariationId?: number;
  resolvedPriceCents?: number;
  resolvedAddToCartUrl?: string;
}

export interface CompositionState {
  room: RoomDimensions | null;
  modules: PlacedModule[];
  finish: string | null;
  handle: string | null;
}
