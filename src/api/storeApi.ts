import { STORE_API_BASE, KITCHEN_CATEGORY_ID, ATTR_NAMES, NO_HANDLE_VALUE } from './config';
import { parseDimensions, parsePriceCents } from './parseAttributes';
import type { WooProduct, WooCategory } from '../types/wooStoreApi';
import type { CatalogModule, ModuleVariation } from '../types/catalog';

/**
 * Cliente da WooCommerce Store API publica. Sem autenticacao - ver README.
 *
 * Estrategia de carregamento (evita N+1 chamadas por variacao, que explodiriam
 * para modulos com 5 acabamentos x 2 puxadores x 3 larguras = 30 variacoes):
 *   1. fetchKitchenModules() busca a listagem em /products?category=...,
 *      que ja traz nome, imagens, faixa de preco e a LISTA de variacoes
 *      (id + atributos), mas SEM preco/URL individual por variacao.
 *   2. Preco e add_to_cart.url exatos de uma variacao so sao resolvidos
 *      sob demanda, quando o usuario efetivamente escolhe aquela combinacao
 *      (largura ja vem do modulo arrastado; acabamento/puxador da selecao
 *      global) - via resolveVariation(), com cache em memoria.
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
    // Fallback: produto "simple" ou sem atributo de medidas -> usa dimensions do proprio produto.
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
 * Busca todos os modulos da linha Cozinha (so produtos ativos/compraveis).
 *
 * per_page=50, nao 100: testado direto contra o site em producao e
 * per_page=100 trava (timeout total, >180s) enquanto 50 e 9 respondem
 * rapido - parece um limite de performance especifico do servidor/plugin
 * nessa faixa, nao um problema do nosso codigo. A linha Cozinha tem 9
 * produtos hoje; 50 da bastante margem pro catalogo crescer. Se um dia
 * passar de ~50 modulos numa categoria so, isso precisa virar paginacao
 * de verdade (ver README > "Notas tecnicas").
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
 * Resolve preco + URL de add-to-cart exatos de uma variacao especifica,
 * buscando /products/{variationId} (variacoes sao produtos tipo "variation").
 * A resposta ja traz add_to_cart.url pronta e corretamente encodada pelo
 * proprio WooCommerce - nao remontamos essa URL manualmente (ver utils/cartUrl.ts).
 */
export async function resolveVariation(variationId: number): Promise<ModuleVariation> {
    const cached = variationCache.get(variationId);
    if (cached && cached.priceCents !== undefined) return cached;

  const v = await fetchJson<WooProduct>(`${STORE_API_BASE}/products/${variationId}`);
    // A largura NAO vem confiavel em v.dimensions (ver nota no tipo WooProduct) -
  // extraimos da string variation, que traz "Medidas: ...: <largura>,<altura>,<profundidade>".
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
        addToCartUrl: v.add_to_cart.url,
        inStock: v.is_in_stock,
  };
    variationCache.set(variationId, resolved);
    return resolved;
}
