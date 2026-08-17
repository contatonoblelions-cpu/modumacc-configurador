import type { PlacedModule, RoomDimensions } from '../types/composition';
import { groupByRow } from './rows';

export interface SpaceCheck {
  usedCm: number;
  remainingCm: number;
  /** true se passou da largura informada (não deveria poder finalizar). */
  overflow: boolean;
  /** true se sobrou espaço (avisa mas permite finalizar — decisão de produto do MVP). */
  hasGap: boolean;
}

/**
 * Soma as larguras dos módulos colocados e compara com a largura do ambiente.
 * Regra do MVP (confirmar depois com o cliente, ver README > "Pendências"):
 * sobra de espaço -> avisa mas permite finalizar. Estouro de largura -> bloqueia.
 */
export function checkSpace(room: RoomDimensions | null, modules: PlacedModule[]): SpaceCheck {
  const usedCm = modules.reduce((sum, m) => sum + m.widthCm, 0);
  const totalCm = room?.widthCm ?? 0;
  const remainingCm = Math.round((totalCm - usedCm) * 10) / 10;
  return {
    usedCm: Math.round(usedCm * 10) / 10,
    remainingCm,
    overflow: remainingCm < -0.5, // pequena tolerância pra arredondamento
    hasGap: remainingCm > 0.5,
  };
}

/** "2,30m" — usado no resumo mobile (ver `SummaryBar.tsx`/`Header.tsx`), medida sempre em metros com vírgula. */
export function formatMeters(cm: number): string {
  return `${(cm / 100).toFixed(2).replace('.', ',')}m`;
}

/**
 * Altura (em px) de uma fileira na área de montagem mobile, proporcional à
 * altura real informada pelo cliente — em vez de uma caixa genérica grande
 * e vazia. Limitado entre um mínimo (pra caber o texto) e um máximo (pra
 * não estourar a tela em ambientes muito altos).
 */
export function mobileRowHeightPx(heightCm: number): number {
  return Math.round(Math.max(56, Math.min(92, heightCm * 1.1)));
}

export function totalPriceCents(modules: PlacedModule[]): number {
  return modules.reduce(
    (sum, m) => sum + (m.resolvedPriceCents ?? m.basePriceCents),
    0,
  );
}

/**
 * Cada fileira da parede ocupa a largura inteira do ambiente informado —
 * por isso o "cabe ou não cabe" é checado fileira por fileira, e não
 * somando a largura de todos os módulos juntos (senão uma parede com
 * fileira superior + inferior sempre pareceria "estourada").
 */
export function hasAnyRowOverflow(room: RoomDimensions | null, modules: PlacedModule[]): boolean {
  return groupByRow(modules).some((group) => checkSpace(room, group.modules).overflow);
}
