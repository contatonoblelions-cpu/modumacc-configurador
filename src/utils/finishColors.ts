/**
 * Cor aproximada (hex) de cada acabamento real vendido pela Modumacc, usada
 * pra tingir (via `mix-blend-mode: multiply`) os desenhos 2D brancos dos
 * modulos (`utils/modulePhotos.ts`) na hora que o cliente escolhe uma cor
 * em "Acabamento" -- sem precisar de uma foto nova por combinacao
 * modulo x cor. `Branco` nao precisa de tingimento (os desenhos ja sao
 * brancos), entao devolve `null` (sem overlay). Cores baseadas na mesma
 * referencia do `finishSwatches.ts`: Amazonia e verde oliva escuro,
 * Belline e bege claro amadeirado, Louro Freijo e marrom dourado, e
 * Manhattan e cinza chumbo escuro.
 */
const FINISH_COLORS: Record<string, string> = {
    Branco: '#ffffff',
    'Amazônia': '#4b5738',
    Belline: '#d9c7a1',
    'Louro Freijó': '#8b5e34',
    Manhattan: '#3a3d40',
};

/** Devolve a cor do acabamento pra tingir o desenho, ou `null` pra nao tingir (Branco ou acabamento desconhecido). */
export function getFinishColor(finish: string | null | undefined): string | null {
    if (!finish) return null;
    const color = FINISH_COLORS[finish];
    if (!color || color === '#ffffff') return null;
    return color;
}
