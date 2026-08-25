import { WOO_SITE_URL } from '../api/config';
import type { PlacedModule } from '../types/composition';

/**
 * Envio da composição pro carrinho do WooCommerce — SEM credenciais, só navegação.
 *
 * !! LEIA ANTES DE MEXER AQUI — decisão técnica não-óbvia, documentada também no README !!
 *
 * PROBLEMA que essa abordagem resolve (descoberto testando ao vivo em 2026-08-25):
 * a versão antiga adicionava cada módulo carregando a URL nativa de add-to-cart do
 * WooCommerce dentro de <iframe> escondidos. Isso FALHA quando o app está hospedado
 * num domínio diferente do site (aqui: modumacc-configurador.vercel.app). Mesmo
 * embutido via <iframe> DENTRO do modumacc.com.br, o "pai" imediato desses iframes
 * de add-to-cart é o app (vercel.app) — outro site — então o navegador trata os
 * cookies como de TERCEIROS e os bloqueia (padrão do Chrome moderno). Resultado: o
 * item parecia adicionado, mas o carrinho chegava vazio no checkout.
 *
 * SOLUÇÃO ATUAL (confiável em qualquer cenário — embutido OU link direto):
 * navegar a ABA INTEIRA (`window.top`) pra uma URL de PRIMEIRA-PARTE no próprio
 * modumacc.com.br: `https://modumacc.com.br/?modumacc_cart=<varId>:<qtd>,...`.
 * Um pequeno trecho de PHP no WordPress (ver README / snippet entregue ao cliente)
 * lê esse parâmetro, adiciona cada variação ao carrinho NO SERVIDOR (sessão/cookie
 * setados em primeira-parte, sem depender de JS nem de cookies de terceiros) e
 * redireciona pro checkout (`/finalizar-compra/`). Como é navegação top-level pro
 * próprio domínio do site, o cookie de carrinho é sempre primeira-parte.
 *
 * Contrato da URL: `?modumacc_cart=2375:1,2380:2` = variação 2375 (qtd 1) + 2380 (qtd 2).
 * Mandamos só o ID da variação; o PHP descobre o produto-pai e os atributos sozinho.
 */

/** Extrai o `variation_id` de uma URL de add-to-cart já resolvida (decodificada). */
function variationIdFromUrl(url: string): string | null {
  try {
    return new URL(url).searchParams.get('variation_id');
  } catch {
    return null;
  }
}

/**
 * Monta a URL de primeira-parte que adiciona todos os módulos e cai no checkout.
 * Agrega quantidades por variação (ex.: 4 módulos iguais viram `id:4`).
 * Retorna `null` se não houver nenhuma variação resolvida.
 */
export function buildCheckoutUrl(modules: PlacedModule[]): string | null {
  const counts = new Map<string, number>();
  for (const m of modules) {
    if (!m.resolvedAddToCartUrl) continue;
    const vid = variationIdFromUrl(m.resolvedAddToCartUrl);
    if (!vid) continue;
    counts.set(vid, (counts.get(vid) ?? 0) + 1);
  }
  if (counts.size === 0) return null;
  const parts = [...counts.entries()].map(([id, qty]) => `${id}:${qty}`);
  return `${WOO_SITE_URL}/?modumacc_cart=${parts.join(',')}`;
}

/**
 * Adiciona todos os módulos ao carrinho real do WooCommerce e leva o cliente
 * direto pro checkout, com tudo já somado.
 *
 * Navega a aba inteira (`window.top`, pra funcionar mesmo embutido num iframe)
 * pra uma URL de PRIMEIRA-PARTE no modumacc.com.br, onde o PHP faz o add-to-cart
 * no servidor e redireciona pro checkout. Ver a nota grande no topo deste arquivo.
 */
export async function addAllToCartAndRedirect(modules: PlacedModule[]): Promise<void> {
  const url = buildCheckoutUrl(modules);
  if (!url) return;
  const target = window.top ?? window;
  target.location.href = url;
}
