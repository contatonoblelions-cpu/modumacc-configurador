/**
 * Parsing dos atributos do WooCommerce, que vêm em formato de texto livre (pt-BR).
 */

/**
 * Converte "60,00 x 35,00 x 37,60" -> { widthCm: 60, heightCm: 35, depthCm: 37.6 }.
 * Formato confirmado na API real: separador decimal vírgula, separador de campo " x ".
 */
export function parseDimensions(raw: string): {
  widthCm: number;
  heightCm: number;
  depthCm: number;
} {
  const parts = raw.split('x').map((p) => p.trim().replace(',', '.'));
  const [widthCm, heightCm, depthCm] = parts.map((p) => parseFloat(p) || 0);
  return { widthCm, heightCm, depthCm };
}

/** "22012" (centavos, string) -> 22012 (número). */
export function parsePriceCents(raw: string): number {
  return parseInt(raw, 10) || 0;
}

export function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}
