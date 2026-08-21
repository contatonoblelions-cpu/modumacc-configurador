/**
 * Imagens 2D CHAPADAS de cada formato de módulo (desenhos planos, sem
 * perspectiva/sombra) — a pedido do cliente, TODOS os módulos usam essas
 * imagens no lugar das fotos. Os arquivos ficam em `public/modules/` e são
 * servidos na raiz do site (ex.: `/modules/nicho.jpg`). Um `Record` mapeia
 * cada formato do catálogo pra uma das imagens e `getModulePhoto` resolve
 * pelo nome do produto.
 *
 * 2026-08-20: o cliente mandou o recorte REAL de cada um dos 9 produtos
 * (tirado direto do catálogo da loja), então cada formato agora tem sua
 * própria foto -- antes 5 imagens eram reaproveitadas entre formatos
 * parecidos (ex.: 1 porta e 2 portas usavam a mesma imagem), o que deixava
 * a cor/puxador inconsistente entre módulos. Todas as 9 fotos foram
 * corrigidas por código pra baterem exatamente com o tom de branco da
 * referência que o cliente indicou (a foto do módulo "2 Gavetas").
 */

const NICHO = '/modules/nicho.jpg';
/**
 * Módulo "Nichos Superior" (2025-08-20): a imagem original mostrava DOIS
 * corpos empilhados - um armario fechado em cima e um nicho ABERTO/vazado
 * embaixo (prateleira sem porta). O produto real da Modumacc e so o
 * armario fechado (a parte vazada nao existe fisicamente, confundia o
 * cliente). `NICHO` agora e SO o recorte de cima (fechado); a imagem
 * original completa (com o nicho aberto) foi preservada como
 * `MICROONDAS`, que e realmente um nicho aberto pra encaixar o
 * eletrodomestico.
 */
const MICROONDAS = '/modules/microondas.jpg';
const BASCULANTE = '/modules/basculante.jpg';
const PORTA_1_SUPERIOR = '/modules/porta-1-superior.jpg';
const PORTA_2_SUPERIOR = '/modules/porta-2-superior.jpg';
const PORTA_1_BASE = '/modules/porta-1-base.jpg';
const PORTA_2_BASE = '/modules/porta-2-base.jpg';
const GAVETA_2 = '/modules/gaveta-2.jpg';
const GAVETA_3 = '/modules/gaveta-3.jpg';

/** Cada formato do catálogo -> imagem 2D correspondente (foto real e própria de cada produto). */
const MODULE_PHOTOS: Record<string, string> = {
  nicho: NICHO,
  microondas: MICROONDAS,
  basculante: BASCULANTE,
  'porta-1-superior': PORTA_1_SUPERIOR,
  'porta-2-superior': PORTA_2_SUPERIOR,
  'porta-1-base': PORTA_1_BASE,
  'porta-2-base': PORTA_2_BASE,
  'gaveta-2': GAVETA_2,
  'gaveta-3': GAVETA_3,
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
  if (gavetaMatch || normalized.includes('gaveta')) {
    const key = `gaveta-${gavetaMatch ? gavetaMatch[1] : '3'}`;
    return key in MODULE_PHOTOS ? key : 'gaveta-3';
  }

  const portaMatch = normalized.match(/(\d+)\s*portas?/);
  if (portaMatch || normalized.includes('porta')) {
    const n = portaMatch ? portaMatch[1] : '1';
    const key = `porta-${n}-${isSuperior ? 'superior' : 'base'}`;
    if (key in MODULE_PHOTOS) return key;
    return isSuperior ? 'porta-1-superior' : 'porta-1-base';
  }

  return null;
}

/** Devolve a imagem 2D do módulo, ou `null` se o formato não for reconhecido. */
export function getModulePhoto(name: string): string | null {
  const key = getModuleShapeKey(name);
  return key ? MODULE_PHOTOS[key] ?? null : null;
}
