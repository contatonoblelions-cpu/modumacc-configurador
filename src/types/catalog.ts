/**
 * Tipos do catálogo, derivados da inspeção real da WooCommerce Store API
 * de modumacc.com.br (linha Cozinha, categoria id 23, slug "cozinha").
 *
 * Descobertas importantes ao inspecionar a API real (ver README > "Notas técnicas"):
 * - Os produtos são "variable products". Cada variação tem 3 atributos locais
 *   (não são atributos globais/taxonomia — o campo `taxonomy` vem `null`):
 *     1. "Cor"                        -> acabamento do módulo (ex: Amazônia, Belline...)
 *     2. "Acabamento do puxador"      -> "Alumínio" | "Bronze" | "Não se aplica"
 *     3. "Medidas: Largura x Altura x Profundidade" -> string única, ex: "60,00 x 35,00 x 37,60"
 *   A LARGURA não é um atributo isolado — vem embutida nessa string de medidas.
 *   Por isso normalizamos para um campo `widthCm` numérico ao carregar (ver api/parseVariation).
 * - O endpoint de listagem (`/products?category=23`) NÃO traz preço por variação,
 *   só os pares atributo/valor de cada variação e o preço em faixa (`price_range`) do produto pai.
 * - Para pegar preço + URL de add-to-cart de uma variação específica, é preciso
 *   buscar `/products/{variationId}` individualmente (variações são "produtos" tipo "variation").
 *   Essa resposta já vem com `add_to_cart.url` pronta e corretamente formatada/encodada
 *   pelo próprio WooCommerce — é a fonte de verdade que reaproveitamos (ver api/storeApi.ts).
 */

export type FinishSlug =
  | 'Amazônia'
  | 'Belline'
  | 'Branco'
  | 'Louro Freijó'
  | 'Manhattan';

export type HandleSlug = 'Alumínio' | 'Bronze' | 'Não se aplica';

export interface ProductImage {
  id: number;
  src: string;
  thumbnail: string;
  alt: string;
}

/** Uma variação específica (largura + acabamento + puxador) de um módulo. */
export interface ModuleVariation {
  /** ID da variação no WooCommerce — é o que vai em `variation_id` no add-to-cart. */
  variationId: number;
  /** ID do produto pai — é o que vai em `add-to-cart` no add-to-cart. */
  parentId: number;
  finish: string;
  handle: string;
  widthCm: number;
  heightCm: number;
  depthCm: number;
  /** Preenchido sob demanda (lazy) ao buscar `/products/{variationId}`. */
  priceCents?: number;
  /** URL de add-to-cart pronta, devolvida pela própria Store API para essa variação. */
  addToCartUrl?: string;
  inStock?: boolean;
}

/** Um módulo do catálogo (produto WooCommerce "variable"), com suas variações possíveis. */
export interface CatalogModule {
  id: number;
  name: string;
  slug: string;
  sku: string;
  permalink: string;
  description: string;
  images: ProductImage[];
  /** Preço mínimo do produto (centavos), pra exibir no painel antes de resolver a variação exata. */
  minPriceCents: number;
  maxPriceCents: number;
  /** Larguras disponíveis pra esse módulo (derivadas das variações), em cm. Ex: [60, 70, 80]. */
  availableWidths: number[];
  /** Se o módulo tem puxador (alguns "nichos" não têm — vêm como "Não se aplica"). */
  hasHandle: boolean;
  availableFinishes: string[];
  availableHandles: string[];
  /** Lista crua de variações (sem preço/url ainda — resolvidos sob demanda). */
  variations: ModuleVariation[];
  heightCm: number;
  depthCm: number;
}
