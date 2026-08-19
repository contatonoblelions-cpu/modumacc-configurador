import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Proxy same-origin pra WooCommerce Store API do site da Modumacc.
 *
 * POR QUE ISSO EXISTE: `modumacc.com.br` não devolve os headers
 * `Access-Control-Allow-Origin` na Store API pública, então o navegador
 * bloqueia (CORS) qualquer `fetch()` direto feito a partir do domínio do
 * configurador (`app.modumacc.com.br` / `*.vercel.app`) — o pedido nem chega
 * a sair de verdade, o browser recusa antes ("Failed to fetch"). Esse
 * comportamento já tinha sido diagnosticado antes (ver README), mas nunca
 * corrigido porque a correção "óbvia" seria mexer no WordPress do cliente —
 * e isso está fora do escopo permitido aqui (só o app/repo do configurador
 * pode ser alterado, nunca o site modumacc.com.br).
 *
 * A correção que FICA dentro do nosso escopo: esta função serverless roda
 * NO SERVIDOR da Vercel (não no navegador do cliente), então ela mesma
 * busca a Store API — requisição servidor-a-servidor não passa pela política
 * de CORS do navegador (CORS só existe pra proteger o navegador). O
 * navegador do cliente final só fala com `/api/wc`, que é same-origin
 * (mesmo domínio do app), e essa função repassa a resposta.
 *
 * IMPORTANTE — por que isso é `api/wc.ts` (arquivo único, sem pasta
 * dinâmica) e não mais `api/wc/[...path].ts` (rota "catch-all"): na Vercel,
 * a rota catch-all só estava casando com UM segmento de path
 * (`/api/wc/products` funcionava) e devolvia 404 da própria plataforma
 * Vercel (não da função) pra qualquer path com 2+ segmentos
 * (`/api/wc/products/categories`, `/api/wc/products/123`) — confirmado
 * testando ao vivo contra o deploy de produção. Pra não depender desse
 * comportamento de roteamento dinâmico da Vercel, o sub-caminho da Store API
 * agora vai como QUERY STRING normal (`?path=products/categories`), que
 * sempre chega intacto em `req.query.path` sem depender de como a Vercel
 * resolve pastas com colchetes.
 */

const WOO_SITE_URL = (process.env.WOO_SITE_URL || 'https://modumacc.com.br').replace(/\/$/, '');

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const pathParam = req.query.path;
  const subPath = Array.isArray(pathParam) ? pathParam.join('/') : pathParam || '';

  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(req.query)) {
    if (key === 'path') continue;
    if (Array.isArray(value)) {
      for (const v of value) search.append(key, v);
    } else if (value !== undefined) {
      search.append(key, value);
    }
  }

  const targetUrl = `${WOO_SITE_URL}/wp-json/wc/store/v1/${subPath}${
    search.toString() ? `?${search.toString()}` : ''
  }`;

  try {
    const upstream = await fetch(targetUrl, {
      headers: {
        Accept: 'application/json',
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
      },
    });
    const body = await upstream.text();
    res.status(upstream.status);
    res.setHeader('Content-Type', upstream.headers.get('content-type') ?? 'application/json');
    // Cache curto na borda da Vercel — o catálogo muda raramente, isso evita
    // bater na Store API do WooCommerce a cada carregamento do configurador.
    res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=600');
    res.send(body);
  } catch (error) {
    res.status(502).json({
      error: 'catalog_proxy_failed',
      message: error instanceof Error ? error.message : String(error),
      targetUrl,
    });
  }
}
