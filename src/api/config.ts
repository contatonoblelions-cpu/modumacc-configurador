/**
 * Configuração da integração com o site WooCommerce da Modumacc.
 * Tudo aqui é público (sem credenciais) — ver README > "Segurança e credenciais".
 */

/**
 * Lê uma env var do Vite tratando string vazia como "não configurada".
 * IMPORTANTE: hosts como a Vercel podem criar a variável com valor vazio
 * só por terem "detectado" o nome dela num .env.example — nesse caso
 * `import.meta.env.X` vem `""`, não `undefined`, e `??` sozinho NÃO pega
 * esse caso (só pega null/undefined), deixando passar um valor vazio que
 * quebra a Store API (ex.: `category=` vira `category=0` no Number()).
 * Descoberto rodando o deploy de verdade na Vercel — ver README.
 */
function readEnv(value: string | undefined): string | undefined {
  return value ? value : undefined;
}

/** URL base do site (sem barra final). Sobrescreva via .env com VITE_WOO_SITE_URL. */
export const WOO_SITE_URL: string =
  readEnv(import.meta.env.VITE_WOO_SITE_URL as string | undefined)?.replace(/\/$/, '') ??
  'https://modumacc.com.br';

/**
 * Base da Store API — passa pelo proxy same-origin `/api/wc/...` (ver
 * `api/wc/[...path].ts`), NÃO chama `modumacc.com.br` direto do navegador.
 * `modumacc.com.br` não devolve headers de CORS pra Store API pública, então
 * um `fetch()` direto do navegador (que é como isso funcionava antes) é
 * bloqueado pelo próprio navegador com "Failed to fetch" — sem sequer chegar
 * a sair da máquina do cliente. O proxy roda no servidor da Vercel, então a
 * chamada pra `modumacc.com.br` acontece servidor-a-servidor (sem CORS
 * envolvido), e o navegador só fala com nosso próprio domínio.
 */
export const STORE_API_BASE = '/api/wc';

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

export const NO_HANDLE_VALUE = 'Não se aplica';
