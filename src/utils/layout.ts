import type { PlacedModule } from '../types/composition';

/** "2,30m" — usado no resumo mobile (ver `SummaryBar.tsx`/`Header.tsx`), medida sempre em metros com vírgula. */
export function formatMeters(cm: number): string {
  return `${(cm / 100).toFixed(2).replace('.', ',')}m`;
}

export function totalPriceCents(modules: PlacedModule[]): number {
  return modules.reduce(
    (sum, m) => sum + (m.resolvedPriceCents ?? m.basePriceCents),
    0,
  );
}
