/**
 * Configuracao da integracao com o site WooCommerce da Modumacc.
 * Tudo aqui e publico (sem credenciais) - ver README > "Seguranca e credenciais".
 */

/**
 * Le uma env var do Vite tratando string vazia como "nao configurada".
 * IMPORTANTE: hosts como a Vercel podem criar a variavel com valor vazio
 * so por terem "detectado" o nome dela num .env.example - nesse caso
 * import.meta.env.X vem "", nao undefined, e ?? sozinho NAO pega
 * esse caso (so pega null/undefined), deixando passar um valor vazio que
 * quebra a Store API (ex.: category= vira category=0 no Number()).
 * Descoberto rodando o deploy de verdade na Vercel - ver README.
 */
function readEnv(value: string | undefined): string | undefined {
    return value ? value : undefined;
}

/** URL base do site (sem barra final). Sobrescreva via .env com VITE_WOO_SITE_URL. */
export const WOO_SITE_URL: string =
    readEnv(import.meta.env.VITE_WOO_SITE_URL as string | undefined)?.replace(/\/$/, '') ??
    'https://modumacc.com.br';

export const STORE_API_BASE = `${WOO_SITE_URL}/wp-json/wc/store/v1`;

/**
 * ID da categoria "Cozinha", confirmado inspecionando
 * GET /wp-json/wc/store/v1/products/categories em modumacc.com.br (2026-08-13): id 23.
 * Se o cliente reorganizar categorias, ajuste aqui ou via VITE_WOO_CATEGORY_ID.
 */
export const KITCHEN_CATEGORY_ID: number = Number(
    readEnv(import.meta.env.VITE_WOO_CATEGORY_ID as string | undefined) ?? 23,
  );

/** Nomes exatos dos atributos, como cadastrados no WooCommerce (confirmados na API real). */
export const ATTR_NAMES = {
    finish: 'Cor',
    handle: 'Acabamento do puxador',
    dimensions: 'Medidas: Largura x Altura x Profundidade',
} as const;

export const NO_HANDLE_VALUE = 'Nao se aplica';
