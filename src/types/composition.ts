/** Estado da composição que o cliente está montando. */

export interface RoomDimensions {
  widthCm: number;
  heightCm: number;
}

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
