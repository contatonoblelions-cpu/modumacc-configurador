/**
 * Fotos EXATAS de cada módulo, em cada combinação de acabamento x puxador.
 *
 * 2026-08-22: o cliente mandou o catálogo completo em PDF
 * ("ModuMacc em perspectiva paralela frontal com puxadores.pdf") com os 8
 * formatos de módulo + a geladeira, renderizados nas 5 cores de acabamento
 * (Amazônia, Belline, Branco, Louro Freijó, Manhattan) x 2 puxadores
 * (Alumínio, Bronze) = 10 combinações. Em vez de tingir uma foto neutra por
 * CSS (sistema antigo), agora cada módulo usa a foto REAL e EXATA da sua
 * combinação de cor/puxador, recortada diretamente do PDF do cliente.
 *
 * Os arquivos ficam em `public/modules/` com o padrão de nome
 * `{formato}--{acabamento}--{puxador}.jpg` (ex.: `nicho--branco--aluminio.jpg`).
 * `microondas` e `geladeira` não mudam de cor (o eletrodoméstico é sempre o
 * mesmo), então têm uma foto fixa única.
 */

const FINISH_SLUGS: Record<string, string> = {
    Amazônia: 'amazonia',
    Belline: 'belline',
    Branco: 'branco',
    'Louro Freijó': 'louro-freijo',
    Manhattan: 'manhattan',
};

const HANDLE_SLUGS: Record<string, string> = {
    Alumínio: 'aluminio',
    Bronze: 'bronze',
};

const DEFAULT_FINISH_SLUG = 'branco';
const DEFAULT_HANDLE_SLUG = 'aluminio';

/**
 * Modulo "Nichos": nichos ABERTOS (vaos/prateleiras) em branco, sem porta
 * nem puxador -- desenho vetorial (SVG data-URL) em vez de foto, sempre o
 * mesmo independente de acabamento/puxador (ver print de referencia do
 * cliente). Usado tanto na parede 2D quanto na colagem/render.
 */
const NICHO_OPEN_SVG =
  'data:image/svg+xml,' +
  encodeURIComponent(
    "<svg xmlns='http://www.w3.org/2000/svg' width='120' height='360' viewBox='0 0 120 360' preserveAspectRatio='none'>" +
    "<rect width='120' height='360' fill='#f7f7f5'/>" +
    "<g fill='#edf0f1'><rect x='10' y='8' width='100' height='36'/><rect x='10' y='58' width='100' height='86'/><rect x='10' y='160' width='100' height='86'/><rect x='10' y='262' width='100' height='88'/></g>" +
    "<g fill='rgba(0,0,0,0.10)'><rect x='10' y='8' width='100' height='11'/><rect x='10' y='58' width='100' height='12'/><rect x='10' y='160' width='100' height='12'/><rect x='10' y='262' width='100' height='12'/></g>" +
    "<g stroke='#c4c8ca' stroke-width='2' fill='none'><rect x='2' y='2' width='116' height='356'/><line x1='2' y1='50' x2='118' y2='50'/><line x1='2' y1='152' x2='118' y2='152'/><line x1='2' y1='254' x2='118' y2='254'/></g>" +
    "</svg>"
  );

/** Formatos que têm foto exata em cada uma das 10 combinações de cor/puxador. */
const COLOR_DEPENDENT_SHAPES = new Set([
    'nicho',
    'basculante', // reaproveita as fotos do "nicho" (armário fechado, visualmente igual em foto de frente)
    'porta-1-superior',
    'porta-2-superior',
    'porta-1-base',
    'porta-2-base',
    'gaveta-2',
    'gaveta-3',
  ]);

/** Calcula a chave de formato a partir do nome do produto. */
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
    if (gavetaMatch || normalized.includes('gaveta')) {
          const n = gavetaMatch ? gavetaMatch[1] : '3';
          return n === '2' ? 'gaveta-2' : 'gaveta-3';
    }

  const portaMatch = normalized.match(/(\d+)\s*portas?/);
    if (portaMatch || normalized.includes('porta')) {
          const n = portaMatch ? portaMatch[1] : '1';
          const key = `porta-${n}-${isSuperior ? 'superior' : 'base'}`;
          if (
                  key === 'porta-1-superior' ||
                  key === 'porta-2-superior' ||
                  key === 'porta-1-base' ||
                  key === 'porta-2-base'
                ) {
                  return key;
          }
          return isSuperior ? 'porta-1-superior' : 'porta-1-base';
    }

  return null;
}

/**
 * Devolve a foto exata do módulo pra combinação de acabamento/puxador dada,
 * ou `null` se o formato não for reconhecido. Quando `finish`/`handle` não
 * são passados (ex.: antes do cliente escolher cor), cai no padrão
 * Branco/Alumínio.
 */
export function getModulePhoto(
    name: string,
    finish?: string | null,
    handle?: string | null,
  ): string | null {
    const key = getModuleShapeKey(name);
    if (!key) return null;

  if (key === 'microondas') return '/modules/microondas.jpg';

  // Nichos = nichos abertos em branco (desenho vetorial fixo, sem cor/puxador).
  if (key === 'nicho') return NICHO_OPEN_SVG;

  if (!COLOR_DEPENDENT_SHAPES.has(key)) return null;

  const shape = key === 'basculante' ? 'nicho' : key;
    const finishSlug = (finish && FINISH_SLUGS[finish]) || DEFAULT_FINISH_SLUG;
    const handleSlug = (handle && HANDLE_SLUGS[handle]) || DEFAULT_HANDLE_SLUG;

  return `/modules/${shape}--${finishSlug}--${handleSlug}.jpg`;
}
