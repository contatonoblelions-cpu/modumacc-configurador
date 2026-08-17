/** Estado da composição que o cliente está montando. */

export interface RoomDimensions {
  widthCm: number;
  heightCm: number;
}

/**
 * Um módulo colocado na parede — posição TOTALMENTE livre em X e Y, como
 * montar um projeto 2D peça por peça (igual a ferramentas de planta de
 * cozinha de verdade): a pessoa decide sozinha onde cada módulo vai, sem
 * nenhuma categoria ou fileira automática. Só duas regras físicas continuam
 * valendo (ver `utils/placement.ts`): não pode sair dos limites do espaço
 * informado, e não pode ficar em cima de outro módulo já colocado.
 */
export interface PlacedModule {
  /** ID único da instância na composição (não é o ID do produto — o mesmo módulo pode repetir). */
  instanceId: string;
  moduleId: number;
  moduleName: string;
  thumbnail: string;
  /** Largura escolhida para essa instância (um módulo pode ter várias larguras disponíveis). */
  widthCm: number;
  heightCm: number;
  /** Posição X livre (cm a partir da borda ESQUERDA do espaço, 0 = encostado na esquerda). */
  offsetXCm: number;
  /** Posição Y livre (cm a partir da borda DE CIMA do espaço, 0 = encostado no topo/teto). */
  offsetYCm: number;
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
