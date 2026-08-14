/**
 * Configuração da integração com o site WooCommerce da Modumacc.
 * Tudo aqui é público (sem credenciais) — ver README > "Segurança e credenciais".
 */

/** URL base do site (sem barra final). Sobrescreva via .env com VITE_WOO_SITE_URL. */
export const WOO_SITE_URL: string =
  (import.meta.env.VITE_WOO_SITE_URL as string | undefined)?.replace(/\/$/, '') ??
  'https://modumacc.com.br';

export const STORE_API_BASE = `${WOO_SITE_URL}/wp-json/wc/store/v1`;

/**
 * ID da categoria "Cozinha", confirmado inspecionando
 * GET /wp-json/wc/store/v1/products/categories em modumacc.com.br (2026-08-13): id 23.
 * Se o cliente reorganizar categorias, ajuste aqui ou via VITE_WOO_CATEGORY_ID.
 */
export const KITCHEN_CATEGORY_ID: number = Number(
  import.meta.env.VITE_WOO_CATEGORY_ID ?? 23,
);

/** Nomes exatos dos atributos, como cadastrados no WooCommerce (confirmados na API real). */
export const ATTR_NAMES = {
  finish: 'Cor',
  handle: 'Acabamento do puxador',
  dimensions: 'Medidas: Largura x Altura x Profundidade',
} as const;

export const NO_HANDLE_VALUE = 'Não se aplica';
