export type SchematicType = 'porta' | 'gaveta' | 'nicho' | 'microondas' | 'basculante' | 'generic';

/**
 * Em vez de usar a foto do produto (que no site mostra a cozinha inteira ja
 * montada, com todos os modulos juntos - confuso pra representar uma peca
 * isolada dentro da parede 2D), a gente desenha um esquema simples da peca
 * a partir do nome do produto: numero de portas, de gavetas, nicho aberto,
 * eletrodomestico etc. Mesma logica de `utils/rows.ts` > `inferRowKey` -
 * string do nome, sem acento, minuscula.
 */
export function parseModuleVisual(name: string): { type: SchematicType; count: number } {
  const normalized = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  if (normalized.includes('microondas')) return { type: 'microondas', count: 1 };
  if (normalized.includes('basculante')) return { type: 'basculante', count: 1 };
  if (normalized.includes('nicho')) return { type: 'nicho', count: 1 };

  const gavetaMatch = normalized.match(/(\d+)\s*gavetas?/);
  if (gavetaMatch || normalized.includes('gaveta')) {
    return { type: 'gaveta', count: gavetaMatch ? parseInt(gavetaMatch[1], 10) : 1 };
  }

  const portaMatch = normalized.match(/(\d+)\s*portas?/);
  if (portaMatch || normalized.includes('porta')) {
    return { type: 'porta', count: portaMatch ? parseInt(portaMatch[1], 10) : 1 };
  }

  return { type: 'generic', count: 1 };
}

