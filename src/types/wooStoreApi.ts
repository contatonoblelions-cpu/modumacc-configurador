/**
 * Tipos crus (shape exato) das respostas da WooCommerce Store API pública.
 * Endpoint base: https://<site>/wp-json/wc/store/v1
 *
 * Só tipamos os campos que usamos. A API devolve muito mais coisa (srcset,
 * tags, brands, extensions, etc.) que ignoramos de propósito.
 */

export interface WooPrices {
  price: string; // em centavos, como string. Ex: "22012" = R$ 220,12
  regular_price: string;
  sale_price: string;
  price_range: { min_amount: string; max_amount: string } | null;
  currency_minor_unit: number;
}

export interface WooImage {
  id: number;
  src: string;
  thumbnail: string;
  name: string;
  alt: string;
}

export interface WooAttributeTerm {
  id: number;
  name: string;
  slug: string;
}

export interface WooAttribute {
  id: number;
  name: string;
  taxonomy: string | null;
  has_variations: boolean;
  terms: WooAttributeTerm[];
}

export interface WooVariationRef {
  id: number;
  attributes: { name: string; value: string }[];
}

export interface WooAddToCart {
  text: string;
  description: string;
  url: string;
  single_text: string;
  minimum: number;
  maximum: number;
}

export interface WooCategory {
  id: number;
  name: string;
  slug: string;
  description: string;
  parent: number;
  count: number;
}

/** Um item de `/products` (produto pai, tipo "variable") ou `/products/{id}` (variação, tipo "variation"). */
export interface WooProduct {
  id: number;
  name: string;
  slug: string;
  parent: number;
  type: 'simple' | 'variable' | 'variation';
  /**
   * Só existe em itens tipo "variation". String legível tipo:
   * "Cor: Amazônia, Acabamento do puxador: Alumínio, Medidas: Largura x Altura x Profundidade: 60,00 x 35,00 x 37,60"
   * ATENÇÃO: o campo nativo `dimensions` do WooCommerce (abaixo) NÃO contém a largura
   * real do módulo nessa loja — ele fica fixo em altura/profundidade independente da
   * variação. A largura confiável vem só daqui ou do atributo "Medidas..." (ver parseAttributes.ts).
   */
  variation?: string;
  permalink: string;
  sku: string;
  description: string;
  prices: WooPrices;
  images: WooImage[];
  categories: { id: number; name: string; slug: string }[];
  attributes: WooAttribute[];
  variations: WooVariationRef[];
  dimensions: { length: string; width: string; height: string };
  is_purchasable: boolean;
  is_in_stock: boolean;
  add_to_cart: WooAddToCart;
}
