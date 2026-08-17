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

/**
 * Resolve a posição (X, Y) LIVRE de um módulo dentro do quadrante inteiro —
 * a pessoa pode soltar em QUALQUER ponto do espaço (canto, meio, em cima,
 * embaixo, do lado — como montar uma planta 2D peça por peça, sem nenhuma
 * fileira ou categoria fixa). As únicas duas regras físicas que continuam
 * valendo: não sair dos limites do espaço informado, e não ficar em cima de
 * outro módulo já colocado. Se o ponto pedido colide com algo, procura o
 * ponto livre mais próximo (busca em espiral) em vez de recusar o drop.
 */
export function resolvePositionCm(
  others: PlacedRect[],
  desired: Point,
  size: { widthCm: number; heightCm: number },
  room: RoomDimensions,
  fallback: Point,
): Point {
  const maxX = Math.max(0, room.widthCm - size.widthCm);
  const maxY = Math.max(0, room.heightCm - size.heightCm);
  const clamp = (x: number, y: number): Point => ({
    x: Math.min(maxX, Math.max(0, x)),
    y: Math.min(maxY, Math.max(0, y)),
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

/** Posição padrão (canto superior esquerdo livre) quando não há um ponto específico — usado pelo botão "+ Adicionar". */
export function packedPositionCm(
  others: PlacedRect[],
  size: { widthCm: number; heightCm: number },
  room: RoomDimensions,
): Point {
  return resolvePositionCm(others, { x: 0, y: 0 }, size, room, { x: 0, y: 0 });
}

