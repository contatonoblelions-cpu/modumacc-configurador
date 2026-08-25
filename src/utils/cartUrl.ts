import { WOO_SITE_URL } from '../api/config';
import type { PlacedModule } from '../types/composition';

/**
 * Envio da composição pro carrinho do WooCommerce — SEM credenciais, só navegação.
 *
 * !! LEIA ANTES DE MEXER AQUI — decisão técnica não-óbvia, documentada também no README !!
 *
 * O WooCommerce tem uma URL nativa de "add to cart" (`?add-to-cart=<id>&variation_id=...`)
 * que não exige login nem nonce — é pensada pra links simples tipo "compre agora".
 * O problema: essa URL só adiciona UM produto por requisição. Nossa composição tem
 * vários módulos, e o WooCommerce núcleo não tem uma URL nativa pra "adicionar N
 * itens de uma vez" sem plugin.
 *
 * Solução adotada (sem exigir NENHUMA mudança no WordPress do cliente):
 * carregar cada URL de add-to-cart, em sequência, dentro de um <iframe> escondido,
 * esperando cada uma terminar antes de disparar a próxima — e só então redirecionar
 * a aba de verdade pra página de carrinho. Isso funciona porque cada carregamento
 * do iframe é, do ponto de vista do WooCommerce, uma visita normal que seta o cookie
 * de sessão/carrinho do site dele.
 *
 * ARMADILHA A EVITAR: bloqueio de cookies de terceiros. Se este app estiver hospedado
 * num domínio DIFERENTE do site (ex: configurador.vercel.app) e for aberto como link
 * externo (não embutido), os iframes escondidos apontando pra modumacc.com.br são
 * "terceiros" pro navegador e safari/chrome/firefox podem bloquear os cookies —
 * o item pareceria adicionado mas o carrinho chegaria vazio no checkout.
 *
 * POR ISSO a recomendação de arquitetura (ver README) é EMBUTIR o configurador via
 * <iframe> DENTRO de uma página do próprio modumacc.com.br (não como link pra fora).
 * Nesse caso, o iframe de add-to-cart tem a MESMA origem do site que está no topo da
 * aba do navegador — o que a maioria dos navegadores trata como primeira-parte,
 * mesmo esse iframe estando aninhado dentro do nosso app. Isso deixa o fluxo confiável.
 *
 * Se o cliente preferir um link simples pra fora mesmo assim, o modo mais seguro é
 * reduzir pra 1 requisição: usar a Store API de carrinho (`/wc/store/v1/cart/add-item`,
 * que aceita chamadas de outra origem) pra montar o carrinho ANTES do redirect final —
 * fica como evolução pós-MVP, não implementado agora pra não adicionar complexidade
 * sem necessidade (ver README > "Próximos passos").
 */

export interface CartRedirectPlan {
  itemUrls: string[];
  checkoutPageUrl: string;
}

export function buildCartRedirectPlan(modules: PlacedModule[]): CartRedirectPlan {
  const itemUrls = modules
    .map((m) => m.resolvedAddToCartUrl)
    .filter((url): url is string => Boolean(url));
  return {
    itemUrls,
    // Cai direto no CHECKOUT (não no carrinho) com tudo já somado — pedido do cliente.
    // Slug PT-BR do WooCommerce confirmado em modumacc.com.br: /finalizar-compra/.
    checkoutPageUrl: `${WOO_SITE_URL}/finalizar-compra/`,
  };
}

function loadHiddenIframe(url: string, timeoutMs = 8000): Promise<void> {
  return new Promise((resolve) => {
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = url;

    const cleanup = () => {
      clearTimeout(timer);
      iframe.remove();
      resolve();
    };
    const timer = setTimeout(cleanup, timeoutMs);
    iframe.onload = cleanup;
    iframe.onerror = cleanup;
    document.body.appendChild(iframe);
  });
}

/**
 * Adiciona todos os módulos ao carrinho real do WooCommerce e redireciona
 * a aba (`window.top`, pra funcionar mesmo se este app estiver num iframe)
 * pra tela de CHECKOUT do site, com todos os itens já somados.
 *
 * Por que iframe também no caso de 1 módulo só: antes, com 1 item a gente
 * navegava direto pra URL de add-to-cart, mas isso DEIXAVA o cliente parado
 * na página do produto (não ia pro carrinho/checkout). Agora todo item é
 * adicionado via iframe escondido e, no fim, a aba inteira vai pro checkout —
 * assim o comportamento é o mesmo pra 1 ou N módulos: cai no checkout com tudo.
 * (Funciona em primeira-parte porque o app roda embutido num iframe DENTRO do
 * modumacc.com.br — ver nota grande no topo deste arquivo e o README.)
 */
export async function addAllToCartAndRedirect(modules: PlacedModule[]): Promise<void> {
  const { itemUrls, checkoutPageUrl } = buildCartRedirectPlan(modules);
  if (itemUrls.length === 0) return;

  const target = window.top ?? window;

  for (const url of itemUrls) {
    await loadHiddenIframe(url);
  }
  target.location.href = checkoutPageUrl;
}
