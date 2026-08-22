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

  if (!COLOR_DEPENDENT_SHAPES.has(key)) return null;

  const shape = key === 'basculante' ? 'nicho' : key;
    const finishSlug = (finish && FINISH_SLUGS[finish]) || DEFAULT_FINISH_SLUG;
    const handleSlug = (handle && HANDLE_SLUGS[handle]) || DEFAULT_HANDLE_SLUG;

  return `/modules/${shape}--${finishSlug}--${handleSlug}.jpg`;
}
