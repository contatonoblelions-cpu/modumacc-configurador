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
  nicho:
    'https://d8j0ntlcm91z4.cloudfront.net/user_3E52ySviMYzw9Voe0FY1klAS1eM/hf_20260818_015844_7ce9a363-1b74-4e28-9384-1d2b5192ae76.png',
  microondas:
    'https://d8j0ntlcm91z4.cloudfront.net/user_3E52ySviMYzw9Voe0FY1klAS1eM/hf_20260818_015844_4852ecc3-366c-4c33-ae87-773f5c40ccaf.png',
  basculante:
    'https://d8j0ntlcm91z4.cloudfront.net/user_3E52ySviMYzw9Voe0FY1klAS1eM/hf_20260818_015844_ae9f499f-e0a2-4c02-b05d-e3cf0c17dc45.png',
  'porta-1-superior':
    'https://d8j0ntlcm91z4.cloudfront.net/user_3E52ySviMYzw9Voe0FY1klAS1eM/hf_20260818_015844_fbf0fe6d-5756-464b-a020-1942ba67f25b.png',
  'porta-2-superior':
    'https://d8j0ntlcm91z4.cloudfront.net/user_3E52ySviMYzw9Voe0FY1klAS1eM/hf_20260818_015844_1915bbe9-61ee-4c39-adec-7b4edcdcd4a9.png',
  'porta-1-base':
    'https://d8j0ntlcm91z4.cloudfront.net/user_3E52ySviMYzw9Voe0FY1klAS1eM/hf_20260818_015844_b8222324-1dc2-413b-849e-c9c5cd2b21ea.png',
  'porta-2-base':
    'https://d8j0ntlcm91z4.cloudfront.net/user_3E52ySviMYzw9Voe0FY1klAS1eM/hf_20260818_015844_ffba4498-7c24-4a78-aa07-94d163c4a1c0.png',
  'gaveta-2':
    'https://d8j0ntlcm91z4.cloudfront.net/user_3E52ySviMYzw9Voe0FY1klAS1eM/hf_20260818_015844_7e46760f-5f67-4a9a-9fa0-d77176edf7cf.png',
  'gaveta-3':
    'https://d8j0ntlcm91z4.cloudfront.net/user_3E52ySviMYzw9Voe0FY1klAS1eM/hf_20260818_015844_c11ac0f2-bac6-412b-a518-210740718322.png',
};

/** Calcula a chave de formato (pra bater com `MODULE_PHOTOS`) a partir do nome do produto. */
export function getModuleShapeKey(name: string): string | null {
  const normalized = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
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

