/** Estado da composição que o cliente está montando. */

export interface RoomDimensions {
    widthCm: number;
    heightCm: number;
    /** Largura da pia (cm), opcional. */
  sinkWidthCm?: number;
    /** Se o cliente marcou "incluir geladeira" na tela de medidas. */
  includeFridge?: boolean;
  /** Largura da geladeira (cm), informada quando `includeFridge`. */
  fridgeWidthCm?: number;
  /** Altura da geladeira (cm), informada quando `includeFridge`. */
  fridgeHeightCm?: number;
    /** Se o cliente marcou "incluir fogão" na tela de medidas. */
  includeStove?: boolean;
  /** Largura do fogão (cm), informada quando `includeStove`. */
  stoveWidthCm?: number;
  /** Altura do fogão (cm), informada quando `includeStove`. */
  stoveHeightCm?: number;
}

export interface SinkFixture {
    widthCm: number;
    /** Posição X (cm) da borda esquerda da pia. */
  offsetXCm: number;
}

/**
 * Geladeira -- elemento SÓ VISUAL/referência. Dimensões informadas pelo
 * cliente (ou padrão de `utils/fridge.ts`).
 */
export interface FridgeFixture {
    /** Posição X (cm) da borda esquerda da geladeira. */
  offsetXCm: number;
    /** Largura real da geladeira (cm). */
  widthCm: number;
    /** Altura real da geladeira (cm). */
  heightCm: number;
}

/** Fogão -- elemento SÓ VISUAL/referência (igual `FridgeFixture`). */
export interface StoveFixture {
  offsetXCm: number;
  widthCm: number;
  heightCm: number;
}

/** Um módulo colocado na parede — posição livre em X e Y. */
export interface PlacedModule {
    instanceId: string;
    moduleId: number;
    moduleName: string;
    thumbnail: string;
    widthCm: number;
    heightCm: number;
    offsetXCm: number;
    offsetYCm: number;
    basePriceCents: number;
    rotationDeg: number;
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
