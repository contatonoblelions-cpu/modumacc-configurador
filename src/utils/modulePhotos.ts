/**
 * Fotos reais (geradas com IA, em cinza neutro fosco) de cada FORMATO de
 * módulo — ver `components/ModulePhoto.tsx` pra como isso se combina com a
 * cor do acabamento (`finishSwatches.ts`). Diferente do antigo
 * `ModuleSchematic.tsx` (desenho vetorial), aqui é uma foto de catálogo de
 * verdade, fotografada isolada, igual uma foto de produto de e-commerce.
 *
 * Só existe 1 foto por FORMATO (não por cor) — a cor entra depois, por cima,
 * via mistura (`mix-blend-mode: multiply`) com a foto de acabamento. Isso
 * evita ter que gerar uma foto por formato × cor (9 formatos × 5 cores = 45
 * fotos): com só 9 fotos neutras, qualquer uma das 5 cores reais pode ser
 * aplicada por cima, sempre ancorada nas mesmas 5 fotos de acabamento já
 * existentes.
 *
 * As chaves batem com `getModuleShapeKey()` logo abaixo — módulos "porta"
 * têm formato bem diferente conforme ficam na parede (armário suspenso,
 * mais raso) ou no chão (armário de piso, com tampo e rodapé), por isso
 * "-superior" (parede) vs. "-base" (chão). Gavetas só existem na versão de
 * chão no catálogo atual.
 */
export const MODULE_PHOTOS: Record<string, string> = {
  // Leva de 19/08 — base branca (não mais cinza), com o puxador "gola" real
  // da Modumacc (friso de alumínio embutido, nunca saliente): horizontal na
  // borda de BAIXO da porta nos módulos de parede (superior), e horizontal
  // na borda de CIMA da porta/gaveta nos módulos de piso (base) — validado
  // módulo a módulo com o cliente, incluindo proporção (largura x altura)
  // batendo com as fotos reais do site.
  nicho:
    'https://d8j0ntlcm91z4.cloudfront.net/user_3E52ySviMYzw9Voe0FY1klAS1eM/hf_20260819_131318_eef8ba60-dcfc-4fb3-9e62-e4dcc6d2026f.png',
  microondas:
    'https://d8j0ntlcm91z4.cloudfront.net/user_3E52ySviMYzw9Voe0FY1klAS1eM/hf_20260819_130058_f935533e-471a-41f7-85d5-51dc8f9faa6a.png',
  basculante:
    'https://d8j0ntlcm91z4.cloudfront.net/user_3E52ySviMYzw9Voe0FY1klAS1eM/hf_20260819_131318_935d2b92-a52c-4dbc-bd43-12c645456fcb.png',
  'porta-1-superior':
    'https://d8j0ntlcm91z4.cloudfront.net/user_3E52ySviMYzw9Voe0FY1klAS1eM/hf_20260819_140415_6146a02f-fe4a-406c-a70a-0f3d5ccc6ae4.png',
  'porta-2-superior':
    'https://d8j0ntlcm91z4.cloudfront.net/user_3E52ySviMYzw9Voe0FY1klAS1eM/hf_20260819_131318_e83154e8-3d67-4522-a773-2d451628ad56.png',
  'porta-1-base':
    'https://d8j0ntlcm91z4.cloudfront.net/user_3E52ySviMYzw9Voe0FY1klAS1eM/hf_20260819_131420_a1adccb0-c8ec-4d3b-8311-237e223b0069.png',
  'porta-2-base':
    'https://d8j0ntlcm91z4.cloudfront.net/user_3E52ySviMYzw9Voe0FY1klAS1eM/hf_20260819_132633_5769f41c-d780-45ad-85f3-8785bc0a294a.png',
  'gaveta-2':
    'https://d8j0ntlcm91z4.cloudfront.net/user_3E52ySviMYzw9Voe0FY1klAS1eM/hf_20260819_133103_5772a0d6-a3ed-4932-b624-5e07b6273057.png',
  'gaveta-3':
    'https://d8j0ntlcm91z4.cloudfront.net/user_3E52ySviMYzw9Voe0FY1klAS1eM/hf_20260819_125242_21e0aa3c-9990-4420-bdb3-62f55d2fd1ba.png',
};

/** Calcula a chave de formato (pra bater com `MODULE_PHOTOS`) a partir do nome do produto. */
export function getModuleShapeKey(name: string): string | null {
  const normalized = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

  if (normalized.includes('microondas')) return 'microondas';
  if (normalized.includes('basculante')) return 'basculante';
  if (normalized.includes('nicho')) return 'nicho';

  const isSuperior = normalized.includes('superior');

  const gavetaMatch = normalized.match(/(\d+)\s*gavetas?/);
  if (gavetaMatch) {
    const key = `gaveta-${gavetaMatch[1]}`;
    return key in MODULE_PHOTOS ? key : null;
  }

  const portaMatch = normalized.match(/(\d+)\s*portas?/);
  if (portaMatch) {
    const key = `porta-${portaMatch[1]}-${isSuperior ? 'superior' : 'base'}`;
    return key in MODULE_PHOTOS ? key : null;
  }

  return null;
}

/** Devolve a URL da foto neutra do formato, ou `null` se não existir uma pra esse produto (fallback pro desenho esquemático). */
export function getModulePhoto(name: string): string | null {
  const key = getModuleShapeKey(name);
  return key ? (MODULE_PHOTOS[key] ?? null) : null;
}
