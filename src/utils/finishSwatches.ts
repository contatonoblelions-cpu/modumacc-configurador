/**
 * Fotos de acabamento (uma por cor) usadas pra colorir os módulos com o
 * material real em vez de um retângulo azul/cinza genérico. Geradas com IA,
 * mas ANCORADAS nas 5 cores reais que a Modumacc vende — nunca uma cor
 * "inventada": o mapa abaixo é a única fonte de imagem por acabamento, então
 * só existe imagem pras cores que realmente aparecem no seletor do
 * configurador.
 *
 * A primeira leva dessas fotos (18/08 01:12) usava uma pesquisa sobre a
 * linha Sudati que errou a cor da Amazônia (gerou terracota). Essa segunda
 * leva (18/08 01:33–01:38) foi regenerada usando como referência visual o
 * próprio seletor "Cor" do site da Modumacc: Amazônia é verde oliva escuro
 * (não terracota), Belline é bege claro amadeirado, Branco é branco,
 * Louro Freijó é marrom dourado com veio de madeira, e Manhattan é cinza
 * chumbo escuro.
 */
export const FINISH_SWATCHES: Record<string, string> = {
  Amazônia:
    'https://d8j0ntlcm91z4.cloudfront.net/user_3E52ySviMYzw9Voe0FY1klAS1eM/hf_20260818_013742_4f485619-dbc7-4b7d-ab9c-df5ea6d73357.png',
  Belline:
    'https://d8j0ntlcm91z4.cloudfront.net/user_3E52ySviMYzw9Voe0FY1klAS1eM/hf_20260818_013337_f8b5f388-8457-4230-8a13-1932972f031e.png',
  Branco:
    'https://d8j0ntlcm91z4.cloudfront.net/user_3E52ySviMYzw9Voe0FY1klAS1eM/hf_20260818_013337_327622f3-fb1a-4590-889b-3d28269308e6.png',
  'Louro Freijó':
    'https://d8j0ntlcm91z4.cloudfront.net/user_3E52ySviMYzw9Voe0FY1klAS1eM/hf_20260818_013337_99cbfb0f-9223-415d-a94e-95cc82b1c8e6.png',
  Manhattan:
    'https://d8j0ntlcm91z4.cloudfront.net/user_3E52ySviMYzw9Voe0FY1klAS1eM/hf_20260818_013807_b8fdd2bb-4086-45eb-b480-f7c477de47d7.png',
};

/** Devolve a foto do acabamento, ou `null` se a cor não estiver no mapa (fallback pro visual antigo). */
export function getFinishSwatch(finish: string | null | undefined): string | null {
  if (!finish) return null;
  return FINISH_SWATCHES[finish] ?? null;
}
