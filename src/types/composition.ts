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
/** Estado da composição que o cliente está montando. */

export interface RoomDimensions {
    widthCm: number;
    heightCm: number;
    /** Largura da pia (cm), opcional -- informada na tela de medidas. Sem isso, nenhuma pia aparece na bancada. */
  sinkWidthCm?: number;
    /** Se o cliente marcou "incluir geladeira" na tela de medidas -- ver `FridgeFixture`. */
  includeFridge?: boolean;
}

/**
 * Pia com torneira, desenhada sobre a linha da bancada (ver
 * `COUNTERTOP_RATIO` em `utils/bands.ts`) -- a pessoa pode arrastar
 * SOMENTE na horizontal pra qualquer ponto dentro da largura do espaço,
 * pra escolher onde a pia fica ao longo do balcão. Não interage com os
 * módulos (não colide, não bloqueia arrasto de módulo por baixo) -- é só
 * um desenho posicionado por cima, ver `SinkFixture.tsx`.
 */
export interface SinkFixture {
    widthCm: number;
    /** Posição X (cm a partir da borda esquerda do espaço) da borda esquerda da pia. */
  offsetXCm: number;
}

/**
 * Geladeira -- elemento SÓ VISUAL/referência (2026-08-22, a pedido do
 * cliente): não é um produto vendável, não tem preço, não entra no carrinho
 * e não participa da colisão/banda dos módulos (ver `utils/placement.ts`,
 * `utils/bands.ts`). Fica encostada no chão (base do espaço) e a pessoa só
 * pode arrastá-la na horizontal, igual a pia (ver `DraggableFridge` em
 * `BuildCanvas.tsx`). Dimensões fixas em `utils/fridge.ts`, na proporção de
 * uma geladeira comum (largura x altura).
 */
export interface FridgeFixture {
    /** Posição X (cm a partir da borda esquerda do espaço) da borda esquerda da geladeira. */
  offsetXCm: number;
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
    /**
     * Rotação livre do módulo (graus, 0-359), só visual — gira a FOTO/desenho
     * dentro da caixa, sem alterar o retângulo ocupado na parede (largura x
     * altura continuam as mesmas pra colisão/posicionamento em
     * `utils/placement.ts`). Dá liberdade de girar o módulo pra qualquer
     * ângulo (ex.: virar a porta pro outro lado, alinhar um módulo de canto),
     * sem precisar remontar o motor de posicionamento pra retângulos
     * rotacionados. Padrão 0 (sem rotação) quando o módulo é adicionado.
     */
  rotationDeg: number;
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
