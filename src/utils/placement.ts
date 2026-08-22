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

export interface YBounds {
  minY: number;
  maxY: number;
}

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

export const SNAP_CM = 12;

const EPS = 0.01;

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
      xCandidates.push(o.x + o.widthCm);
      xCandidates.push(o.x - size.widthCm);
    }
    if (horizontallyOverlaps(o)) {
      yCandidates.push(o.y + o.heightCm);
      yCandidates.push(o.y - size.heightCm);
    }
  }

  const snappedX = snapAxis(pos.x, 0, maxX, xCandidates);
  const snappedY = snapAxis(pos.y, minY, maxY, yCandidates);

  if (!overlapsAt(snappedX, snappedY)) return { x: snappedX, y: snappedY };
  if (!overlapsAt(snappedX, pos.y)) return { x: snappedX, y: pos.y };
  if (!overlapsAt(pos.x, snappedY)) return { x: pos.x, y: snappedY };
  return pos;
}

export function packedPositionCm(
  others: PlacedRect[],
  size: { widthCm: number; heightCm: number },
  room: RoomDimensions,
  yBounds?: YBounds,
  anchor: 'top' | 'bottom' = 'top',
): Point {
  const y = yBounds ? (anchor === 'bottom' ? yBounds.maxY : yBounds.minY) : 0;
  const start = { x: 0, y };
  return resolvePositionCm(others, start, size, room, start, yBounds);
}
