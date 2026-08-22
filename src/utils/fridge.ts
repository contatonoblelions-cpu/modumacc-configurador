/**
 * Geladeira -- elemento só visual/referência do configurador (2026-08-22),
 * não é um produto vendável (ver `FridgeFixture` em `types/composition.ts`).
 *
 * Medidas fixas na proporção de uma geladeira comum (largura x altura),
 * calculadas a partir do recorte real da foto no catálogo do cliente
 * (proporção largura:altura ≈ 0,40) escalada pra uma altura realista de
 * geladeira duplex (180cm) -- resultando em ~72cm de largura, medida
 * típica de geladeira frost-free de 2 portas.
 */
export const FRIDGE_WIDTH_CM = 72;
export const FRIDGE_HEIGHT_CM = 180;
export const FRIDGE_PHOTO = '/modules/geladeira.jpg';
