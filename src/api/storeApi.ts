import { STORE_API_BASE, KITCHEN_CATEGORY_ID, ATTR_NAMES, NO_HANDLE_VALUE } from './config';
import { parseDimensions, parsePriceCents } from './parseAttributes';
import type { WooProduct, WooCategory } from '../types/wooStoreApi';
import type { CatalogModule, ModuleVariation } from '../types/catalog';

/**
 * Cliente da WooCommerce Store API pública. Sem autenticação — ver README.
 *
 * Estratégia de carregamento (evita N+1 chamadas por variação, que explodiriam
 * para módulos com 5 acabamentos x 2 puxadores x 3 larguras = 30 variações):
 *   1. `fetchKitchenModules()` busca a listagem em `/products?category=...`,
 *      que já traz nome, imagens, faixa de preço e a LISTA de variações
 *      (id + atributos), mas SEM preço/URL individual por variação.
 *   2. Preço e `add_to_cart.url` exatos de uma variação só são resolvidos
 *      sob demanda, quando o usuário efetivamente escolhe aquela combinação
 *      (largura já vem do módulo arrastado; acabamento/puxador da seleção
 *      global) — via `resolveVariation()`, com cache em memória.
 */

async function fetchJson<T>(url: string): Promise<T> {
      const res = await fetch(url, { headers: { Accept: 'application/json' } });
      if (!res.ok) {
              throw new Error(`Store API respondeu ${res.status} em ${url}`);
      }
      return res.json() as Promise<T>;
}

export async function fetchCategories(): Promise<WooCategory[]> {
      return fetchJson<WooCategory[]>(`${STORE_API_BASE}/products/categories`);
}

function mapProductToModule(p: WooProduct): CatalogModule {
      const finishAttr = p.attributes.find((a) => a.name === ATTR_NAMES.finish);
      const handleAttr = p.attributes.find((a) => a.name === ATTR_NAMES.handle);
      const dimsAttr = p.attributes.find((a) => a.name === ATTR_NAMES.dimensions);

  const availableFinishes = finishAttr?.terms.map((t) => t.name) ?? [];
      const availableHandles = (handleAttr?.terms.map((t) => t.name) ?? []).filter(
              (h) => h !== NO_HANDLE_VALUE,
            );
      const hasHandle = availableHandles.length > 0;

  const widths = new Set<number>();
      let heightCm = 0;
      let depthCm = 0;
      for (const term of dimsAttr?.terms ?? []) {
              const parsed = parseDimensions(term.name);
              widths.add(parsed.widthCm);
              heightCm = parsed.heightCm;
              depthCm = parsed.depthCm;
      }
      // Fallback: produto "simple" ou sem atributo de medidas -> usa dimensions do próprio produto.
  if (widths.size === 0 && p.dimensions?.width) {
          widths.add(parseFloat(p.dimensions.width.replace(',', '.')) || 0);
          heightCm = parseFloat(p.dimensions.height?.replace(',', '.') || '0');
  }

  const variations: ModuleVariation[] = p.variations.map((v) => {
          const byName = Object.fromEntries(v.attributes.map((a) => [a.name, a.value]));
          const dims = parseDimensions(byName[ATTR_NAMES.dimensions] ?? '');
          return {
                    variationId: v.id,
                    parentId: p.id,
                    finish: byName[ATTR_NAMES.finish] ?? '',
                    handle: byName[ATTR_NAMES.handle] ?? NO_HANDLE_VALUE,
                    widthCm: dims.widthCm || [...widths][0] || 0,
                    heightCm: dims.heightCm || heightCm,
                    depthCm: dims.depthCm || depthCm,
          };
  });

  return {
          id: p.id,
          name: p.name,
          slug: p.slug,
          sku: p.sku,
          permalink: p.permalink,
          description: p.description.replace(/<[^>]+>/g, '').trim(),
          images: p.images.map((img) => ({ id: img.id, src: img.src, thumbnail: img.thumbnail, alt: img.alt || p.name })),
          minPriceCents: parsePriceCents(p.prices.price_range?.min_amount ?? p.prices.price),
          maxPriceCents: parsePriceCents(p.prices.price_range?.max_amount ?? p.prices.price),
          availableWidths: [...widths].sort((a, b) => a - b),
          hasHandle,
          availableFinishes,
          availableHandles,
          variations,
          heightCm,
          depthCm,
  };
}

/**
 * Busca todos os módulos da linha Cozinha (só produtos ativos/comprávels).
 *
 * `per_page=50` é só uma margem confortável (a linha Cozinha tem 9 produtos
 * hoje) — NÃO é a causa nem a correção do bug de carregamento em produção.
 * O bug real é que `modumacc.com.br` bloqueia (503) chamadas dessa API vindas
 * de outra origem (CORS/WAF) — ver README > "Pendências a confirmar com o
 * cliente" pro diagnóstico completo e o que precisa ser ajustado no
 * WordPress/hospedagem do cliente pra isso funcionar em produção.
 */
export async function fetchKitchenModules(): Promise<CatalogModule[]> {
      const products = await fetchJson<WooProduct[]>(
              `${STORE_API_BASE}/products?category=${KITCHEN_CATEGORY_ID}&per_page=50&status=publish`,
            );
      return products
        .filter((p) => p.type === 'variable' || p.type === 'simple')
        .map(mapProductToModule);
}

const variationCache = new Map<number, ModuleVariation>();

/**
 * BUG REAL encontrado testando o fluxo de carrinho ao vivo (2026-08-14): o
 * WooCommerce devolve `add_to_cart.url` com o `&` entre parâmetros já
 * HTML-escapado como `&#038;` (ele usa a mesma função de escape que usaria
 * pra ecoar a URL dentro de um `<a href>`, mesmo respondendo JSON). Se
 * navegamos direto pra essa URL sem decodificar, o navegador lê `#038;...`
 * como INÍCIO DE FRAGMENTO (`#`), não como separador de query string — então
 * só o primeiro parâmetro (`attribute_cor=...`) é de fato enviado ao
 * servidor, e `add-to-cart=<id>` nunca chega lá. O item nunca entra no
 * carrinho, mas o app não recebe nenhum erro (é só um redirect "bem
 * sucedido" pra a página do produto). Decodificamos aqui antes de guardar a
 * URL, na fonte única de verdade — ver `resolveVariation()` abaixo.
 */
function decodeHtmlEntities(url: string): string {
        return url
          .replace(/&#0?38;/g, '&')
          .replace(/&amp;/g, '&');
}

/**
 * Resolve preço + URL de add-to-cart exatos de uma variação específica,
 * buscando `/products/{variationId}` (variações são produtos tipo "variation").
 * A resposta traz `add_to_cart.url`, mas HTML-escapada (ver `decodeHtmlEntities`
 * acima) — não remontamos a URL manualmente, só decodificamos os entities.
 */
export async function resolveVariation(variationId: number): Promise<ModuleVariation> {
        const cached = variationCache.get(variationId);
        if (cached && cached.priceCents !== undefined) return cached;

  const v = await fetchJson<WooProduct>(`${STORE_API_BASE}/products/${variationId}`);
          // A largura NÃO vem confiável em `v.dimensions` (ver nota no tipo WooProduct) —
  // extraímos da string `variation`, que traz "Medidas: ...: <largura>,<altura>,<profundidade>".
  const dimsMatch = v.variation?.match(/Medidas:[^:]*:\s*([\d.,]+\s*x\s*[\d.,]+\s*x\s*[\d.,]+)/);
  const dims = dimsMatch ? parseDimensions(dimsMatch[1]) : { widthCm: 0, heightCm: 0, depthCm: 0 };
      
  const resolved: ModuleVariation = {
            variationId: v.id,
            parentId: v.parent,
            finish: v.variation?.match(/Cor:\s*([^,]+)/)?.[1]?.trim() ?? '',
            handle: v.variation?.match(/Acabamento do puxador:\s*([^,]+)/)?.[1]?.trim() ?? NO_HANDLE_VALUE,
            widthCm: dims.widthCm,
            heightCm: dims.heightCm,
            depthCm: dims.depthCm,
            priceCents: parsePriceCents(v.prices.price),
            addToCartUrl: decodeHtmlEntities(v.add_to_cart.url),
            inStock: v.is_in_stock,
  };
        variationCache.set(variationId, resolved);
        return resolved;
}
