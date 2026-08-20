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
 * Base da Store API — passa pelo proxy same-origin `/api/wc` (ver
 * `api/wc.ts`), NÃO chama `modumacc.com.br` direto do navegador.
 * `modumacc.com.br` não devolve headers de CORS pra Store API pública, então
 * um `fetch()` direto do navegador (que é como isso funcionava antes) é
 * bloqueado pelo próprio navegador com "Failed to fetch" — sem sequer chegar
 * a sair da máquina do cliente. O proxy roda no servidor da Vercel, então a
 * chamada pra `modumacc.com.br` acontece servidor-a-servidor (sem CORS
 * envolvido), e o navegador só fala com nosso próprio domínio.
 */
export const STORE_API_BASE = '/api/wc';

/**
 * Monta a URL do proxy pra um sub-caminho da Store API (ex.: "products",
 * "products/categories", "products/123?extra=1"). O sub-caminho vai como
 * query string (`?path=...`), NÃO como segmento de URL — porque a rota
 * dinâmica "catch-all" da Vercel (`api/wc/[...path].ts`, a versão antiga
 * desse proxy) só casava com UM segmento de path e devolvia 404 da própria
 * plataforma Vercel pra qualquer path com 2+ segmentos, confirmado testando
 * ao vivo contra o deploy de produção. Usando query string, o sub-caminho
 * sempre chega intacto em `req.query.path`, sem depender de como a Vercel
 * resolve pastas com colchetes.
 */
export function wcUrl(pathAndQuery: string): string {
  const [path, query] = pathAndQuery.split('?');
  const params = new URLSearchParams(query);
  params.set('path', path);
  return `${STORE_API_BASE}?${params.toString()}`;
}

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

/**
 * Produtos escondidos do configurador (o produto continua existindo no
 * WooCommerce/modumacc.com.br -- nunca mexemos no site, so filtramos aqui no
 * app, ver README). Motivos confirmados com o cliente em 2026-08-20:
 * - 1147 "Modulo 2 Portas Superior": a foto nao mostra a divisao no meio
 *   (fica parecendo uma porta unica, mas e vendido como 2 portas).
 * - 921 "Modulo 2 Gavetas": ficou duplicado na pratica com outro modulo de
 *   gavetas (mesmas larguras 40/50/60), pedido remover a repeticao.
 * - 868 "Modulo 1 Porta Inferior": proporcao errada no desenho/foto.
 */
export const HIDDEN_PRODUCT_IDS: number[] = [1147, 921, 868];

/**
 * Larguras escondidas de um produto especifico que continua existindo com
 * as outras larguras. Motivo confirmado com o cliente em 2026-08-20:
 * - 1282 "Modulo Nichos Superior": esconder so a largura de 15cm
 *   (proporcao errada nessa largura especifica); a de 20cm continua normal.
 */
export const HIDDEN_WIDTHS_BY_PRODUCT: Record<number, number[]> = {
  1282: [15],
};

