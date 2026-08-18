import type { RoomDimensions } from '../types/composition';

export type ModuleBand = 'superior' | 'base';

/**
 * Onde fica a linha da bancada (contando de cima pra baixo, em % da altura
 * do espaço) — separa a faixa de módulos de PAREDE (acima, "superior") da
 * faixa de módulos de CHÃO (abaixo, "base"), igual num corte humanizado de
 * projeto de cozinha: armário aéreo em cima, bancada no meio, armário de
 * chão embaixo. Usado tanto pra restringir onde cada tipo pode ser solto
 * quanto pra desenhar a bancada/backsplash no fundo do quadrante (ver
 * `BuildCanvas.tsx`).
 */
export const COUNTERTOP_RATIO = 0.55;

/**
 * Deriva a FAIXA (parede/"superior" ou chão/"base") a partir do nome do
 * produto — mesma lógica de `isSuperior` em `utils/modulePhotos.ts`.
 */
export function getModuleBand(name: string): ModuleBand {
  const normalized = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  return normalized.includes('superior') ? 'superior' : 'base';
}

/**
 * Limites de Y (em cm) que um módulo dessa faixa pode ocupar — continua
 * TOTALMENTE livre em X e dentro desses limites em Y (a pessoa arrasta pra
 * onde quiser dentro da própria faixa), só não pode cruzar pro lado errado
 * da bancada: módulo de parede não desce além da linha da bancada, módulo de
 * chão não sobe acima dela. Sem empacotamento automático — cada módulo
 * guarda a posição exata de onde foi solto (ver `utils/placement.ts`).
 */
export function getBandYRange(
  band: ModuleBand,
  room: RoomDimensions,
  moduleHeightCm: number,
): { minY: number; maxY: number } {
  const splitY = room.heightCm * COUNTERTOP_RATIO;
  const maxPossibleY = Math.max(0, room.heightCm - moduleHeightCm);

  if (band === 'superior') {
    const maxY = Math.max(0, Math.min(maxPossibleY, splitY - moduleHeightCm));
    return { minY: 0, maxY };
  }

  const minY = Math.min(maxPossibleY, splitY);
  const maxY = Math.max(minY, maxPossibleY);
  return { minY, maxY };
}

