/**
 * Imagens 2D CHAPADAS de cada formato de módulo (desenhos planos, sem
 * perspectiva/sombra) — a pedido do cliente, TODOS os módulos usam essas 5
 * imagens no lugar das fotos. Os arquivos ficam em `public/modules/` e são
 * servidos na raiz do site (ex.: `/modules/nicho.jpg`). Um `Record` mapeia
 * cada formato do catálogo pra uma das imagens e `getModulePhoto` resolve
 * pelo nome do produto.
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
const PORTA_SUPERIOR = '/modules/porta-superior.jpg';
const PORTAS_INFERIOR = '/modules/portas-inferior.jpg';
const GAVETAS = '/modules/gavetas.jpg';

/** Cada formato do catálogo -> imagem 2D correspondente. */
const MODULE_PHOTOS: Record<string, string> = {
  nicho: NICHO,
  microondas: MICROONDAS,
  basculante: BASCULANTE,
  'porta-1-superior': PORTA_SUPERIOR,
  'porta-2-superior': PORTA_SUPERIOR,
  'porta-1-base': PORTAS_INFERIOR,
  'porta-2-base': PORTAS_INFERIOR,
  'gaveta-2': GAVETAS,
  'gaveta-3': GAVETAS,
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
