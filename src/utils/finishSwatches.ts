/**
 * Fotos de acabamento (uma por cor) usadas pra colorir os módulos com o
 * material real em vez de um retângulo azul/cinza genérico. Geradas com IA,
 * mas ANCORADAS nas 5 cores reais que a Modumacc vende (linhas Sudati
 * Unicolores/Naturally) — nunca uma cor "inventada": o mapa abaixo é a única
 * fonte de imagem por acabamento, então só existe imagem pras cores que
 * realmente aparecem no seletor de acabamento do configurador.
 *
 * Amazônia e Manhattan são cores sólidas (linha Unicolores); Belline e Louro
 * Freijó são veios de madeira clara/mel (linha Naturally); Branco é o
 * acabamento branco liso.
 */
export const FINISH_SWATCHES: Record<string, string> = {
  Amazônia:
    'https://d8j0ntlcm91z4.cloudfront.net/user_3E52ySviMYzw9Voe0FY1klAS1eM/hf_20260818_011241_cc6ec334-4b40-4bc9-bb84-1741cdf3e73e.png',
  Belline:
    'https://d8j0ntlcm91z4.cloudfront.net/user_3E52ySviMYzw9Voe0FY1klAS1eM/hf_20260818_011241_a72474d0-723b-487e-8a9d-26784d62edbc.png',
  Branco:
    'https://d8j0ntlcm91z4.cloudfront.net/user_3E52ySviMYzw9Voe0FY1klAS1eM/hf_20260818_011241_379f647c-afc6-4108-9c0a-50f2957a2009.png',
  'Louro Freijó':
    'https://d8j0ntlcm91z4.cloudfront.net/user_3E52ySviMYzw9Voe0FY1klAS1eM/hf_20260818_011241_781fa978-c8c0-456c-83e2-e4b53e8f92bc.png',
  Manhattan:
    'https://d8j0ntlcm91z4.cloudfront.net/user_3E52ySviMYzw9Voe0FY1klAS1eM/hf_20260818_011241_7bbb362d-0de7-447e-baa8-f482d97d3397.png',
};

/** Devolve a foto do acabamento, ou `null` se a cor não estiver no mapa (fallback pro visual antigo). */
export function getFinishSwatch(finish: string | null | undefined): string | null {
  if (!finish) return null;
  return FINISH_SWATCHES[finish] ?? null;
}

