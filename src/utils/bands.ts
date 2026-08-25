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
 * Altura REAL da bancada a partir do chão, em cm (padrão de cozinha ≈ 92cm).
 * A linha da bancada passa a ser medida em cm do chão (e não numa proporção
 * fixa), pra a pia e os armários ficarem na altura real. `COUNTERTOP_RATIO`
 * acima fica só como fallback caso o ambiente seja mais baixo que a bancada.
 */
export const COUNTERTOP_HEIGHT_CM = 92;

/**
 * Proporção (de cima pra baixo) onde fica a linha da bancada para um dado
 * ambiente, derivada de `COUNTERTOP_HEIGHT_CM` (92cm do chão). Ex.: num
 * ambiente de 240cm, 92cm do chão = 148cm do topo = 0,617.
 */
export function getCountertopRatio(room: RoomDimensions): number {
  if (!room.heightCm || room.heightCm <= COUNTERTOP_HEIGHT_CM) return COUNTERTOP_RATIO;
  return (room.heightCm - COUNTERTOP_HEIGHT_CM) / room.heightCm;
}

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
  name?: string,
): { minY: number; maxY: number } {
  const splitY =
    room.heightCm > COUNTERTOP_HEIGHT_CM
      ? room.heightCm - COUNTERTOP_HEIGHT_CM
      : room.heightCm * COUNTERTOP_RATIO;
  const maxPossibleY = Math.max(0, room.heightCm - moduleHeightCm);

  if (band === 'superior') {
    const maxY = Math.max(0, Math.min(maxPossibleY, splitY - moduleHeightCm));
    // Modulo de parede e LIVRE em Y dentro da faixa aerea (topo ate a bancada).
    // O ima de alinhamento (snapPositionCm) e quem junta e alinha os topos.
    void name;
    return { minY: 0, maxY };
  }

  // Modulo de CHAO: o topo nao pode ficar por baixo/atras da faixa da pia.
  // A faixa da pia comeca na linha da bancada (splitY) e desce por ~3% da
  // altura do ambiente (bate com `bandH = canvasHeight * 0.03` no BuildCanvas).
  // Entao o limite de cima do modulo e a BASE dessa faixa: splitY + bandCm.
  const bandCm = room.heightCm * 0.03;
  const minY = Math.min(maxPossibleY, splitY + bandCm);
  const maxY = Math.max(minY, maxPossibleY);
  return { minY, maxY };
}
