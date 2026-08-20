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

/**
 * Tolerância (cm) pra "imã" entre bordas de módulos vizinhos (ou paredes do
 * espaço) — se a borda do módulo ficar a até `SNAP_CM` de distância de uma
 * borda alinhável, gruda nela (fica exatamente encostada, distância 0),
 * eliminando aquele vãozinho de 1-2cm que sobra mesmo quando a pessoa tenta
 * alinhar "na mão" (pedido do cliente: "as vezes fica um pequeno vão mesmo
 * alinhando ele certo").
 */
export const SNAP_CM = 12;

const EPS = 0.01;

/**
 * "Imã" de alinhamento: a partir de uma posição já resolvida (sem
 * sobreposição, ver `resolvePositionCm`), procura a borda mais próxima de um
 * módulo vizinho (ou da parede) dentro de `SNAP_CM` e, se achar, ajusta X
 * e/ou Y pra encostar exatamente nela (distância 0, sem vão) — sem nunca
 * criar uma sobreposição nova. Roda em X e Y de forma independente (um eixo
 * pode "imantar" enquanto o outro fica livre, ex.: encostar lateralmente em
 * outro módulo mas continuar solto verticalmente).
 */
export function snapPositionCm(
  others: PlacedRect[],
  pos: Point,
  size: { widthCm: number; heightCm: number },
  room: RoomDimensions,
  yBounds?: YBounds,
): Point {
  const maxX = Math.max(0, room.widthCm - size.widthCm);
  const minY = yBounds ? yBounds.minY : 0;
  const maxY = yBounds ? yBounds.maxY : Math.max(0, room.heightCm - size.heightCm);

  const overlapsAt = (x: number, y: number) =>
    others.some(
      (o) =>
        x < o.x + o.widthCm - EPS &&
        x + size.widthCm > o.x + EPS &&
        y < o.y + o.heightCm - EPS &&
        y + size.heightCm > o.y + EPS,
    );

  // Só considera "vizinho alinhável" no eixo X quem tem alguma sobreposição
  // vertical com o módulo (senão qualquer módulo longe verticalmente
  // "imantaria" horizontalmente sem fazer sentido visual), e vice-versa
  // pro eixo Y.
  const verticallyOverlaps = (o: PlacedRect) =>
    pos.y < o.y + o.heightCm && pos.y + size.heightCm > o.y;
  const horizontallyOverlaps = (o: PlacedRect) =>
    pos.x < o.x + o.widthCm && pos.x + size.widthCm > o.x;

  function snapAxis(
    value: number,
    min: number,
    max: number,
    candidates: number[],
  ): number {
    let best = value;
    let bestDist = SNAP_CM;
    for (const c of candidates) {
      if (c < min - EPS || c > max + EPS) continue;
      const dist = Math.abs(c - value);
      if (dist <= bestDist) {
        bestDist = dist;
        best = c;
      }
    }
    return Math.min(max, Math.max(min, best));
  }

  const xCandidates: number[] = [0, maxX];
  const yCandidates: number[] = [minY, maxY];
  for (const o of others) {
    if (verticallyOverlaps(o)) {
      xCandidates.push(o.x + o.widthCm); // encostar à direita do vizinho
      xCandidates.push(o.x - size.widthCm); // encostar à esquerda do vizinho
    }
    if (horizontallyOverlaps(o)) {
      yCandidates.push(o.y + o.heightCm); // encostar embaixo do vizinho
      yCandidates.push(o.y - size.heightCm); // encostar em cima do vizinho
    }
  }

  const snappedX = snapAxis(pos.x, 0, maxX, xCandidates);
  const snappedY = snapAxis(pos.y, minY, maxY, yCandidates);

  // Aplica cada eixo só se não criar sobreposição nova — tenta os dois
  // juntos primeiro (caso comum: encaixar num canto entre dois vizinhos),
  // depois cada um isolado, senão mantém a posição original.
  if (!overlapsAt(snappedX, snappedY)) return { x: snappedX, y: snappedY };
  if (!overlapsAt(snappedX, pos.y)) return { x: snappedX, y: pos.y };
  if (!overlapsAt(pos.x, snappedY)) return { x: pos.x, y: snappedY };
  return pos;
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
