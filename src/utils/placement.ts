import type { RoomDimensions } from '../types/composition';

export interface PlacedRect {
  x: number;
  y: number;
  widthCm: number;
  heightCm: number;
}

export interface Point {
  x: number;
  y: number;
}

/** Limites verticais (cm) — usado pra restringir um módulo à própria faixa (parede ou chão), ver `utils/bands.ts`. */
export interface YBounds {
  minY: number;
  maxY: number;
}

/**
 * Resolve a posição (X, Y) LIVRE de um módulo dentro do quadrante — a pessoa
 * pode soltar em QUALQUER ponto (canto, meio, do lado — como montar uma
 * planta 2D peça por peça), sem grade nem encaixe automático. Três regras
 * físicas continuam valendo: não sair dos limites do espaço informado, não
 * ficar em cima de outro módulo já colocado, e (quando `yBounds` é
 * informado) não cruzar pra faixa errada — módulo de parede não desce até o
 * chão, módulo de chão não sobe até o teto (ver `utils/bands.ts`). Se o
 * ponto pedido colide com algo, procura o ponto livre mais próximo (busca em
 * espiral, sempre dentro da faixa) em vez de recusar o drop.
 */
export function resolvePositionCm(
  others: PlacedRect[],
  desired: Point,
  size: { widthCm: number; heightCm: number },
  room: RoomDimensions,
  fallback: Point,
  yBounds?: YBounds,
): Point {
  const maxX = Math.max(0, room.widthCm - size.widthCm);
  const minY = yBounds ? yBounds.minY : 0;
  const maxY = yBounds ? yBounds.maxY : Math.max(0, room.heightCm - size.heightCm);
  const clamp = (x: number, y: number): Point => ({
    x: Math.min(maxX, Math.max(0, x)),
    y: Math.min(maxY, Math.max(minY, y)),
  });
  const overlaps = (x: number, y: number) =>
    others.some(
      (o) =>
        x < o.x + o.widthCm &&
        x + size.widthCm > o.x &&
        y < o.y + o.heightCm &&
        y + size.heightCm > o.y,
    );

  const clamped = clamp(desired.x, desired.y);
  if (!overlaps(clamped.x, clamped.y)) return clamped;

  // Busca em espiral por um ponto livre bem próximo do desejado (passos de
  // 5cm, 15 direções por volta) — dá a sensação de "encaixar do lado"
  // quando o drop cai em cima de outro módulo, em vez de travar.
  const stepCm = 5;
  const maxRadius = Math.max(room.widthCm, room.heightCm);
  for (let radius = stepCm; radius <= maxRadius; radius += stepCm) {
    for (let angleDeg = 0; angleDeg < 360; angleDeg += 24) {
      const rad = (angleDeg * Math.PI) / 180;
      const candidate = clamp(
        clamped.x + radius * Math.cos(rad),
        clamped.y + radius * Math.sin(rad),
      );
      if (!overlaps(candidate.x, candidate.y)) return candidate;
    }
  }
  return clamp(fallback.x, fallback.y);
}

/** Posição padrão (canto superior esquerdo livre DENTRO DA FAIXA) quando não há um ponto específico — usado pelo botão "+ Adicionar". */
export function packedPositionCm(
  others: PlacedRect[],
  size: { widthCm: number; heightCm: number },
  room: RoomDimensions,
  yBounds?: YBounds,
): Point {
  const start = { x: 0, y: yBounds ? yBounds.minY : 0 };
  return resolvePositionCm(others, start, size, room, start, yBounds);
}
