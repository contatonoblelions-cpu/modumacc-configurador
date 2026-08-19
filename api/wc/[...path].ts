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
 * navegador do cliente final só fala com `/api/wc/...`, que é same-origin
 * (mesmo domínio do app), e essa função repassa a resposta.
 *
 * Rota dinâmica "catch-all" do Vercel: `/api/wc/products` -> busca
 * `{WOO_SITE_URL}/wp-json/wc/store/v1/products`, preservando querystring.
 * `/api/wc/products/123` -> `.../products/123`, etc.
 */

const WOO_SITE_URL = (process.env.WOO_SITE_URL || 'https://modumacc.com.br').replace(/\/$/, '');

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const pathParam = req.query.path;
  const pathSegments = Array.isArray(pathParam) ? pathParam : pathParam ? [pathParam] : [];
  const subPath = pathSegments.map(encodeURIComponent).join('/');

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
    // Alguns WAFs (ex.: bloqueio por padrão de User-Agent "genérico" de
    // servidor) tratam requisições sem cara de navegador como suspeitas e
    // devolvem um 404 genérico do WordPress em vez do bloqueio de verdade —
    // por isso mandamos um User-Agent realista aqui, imitando um navegador.
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
