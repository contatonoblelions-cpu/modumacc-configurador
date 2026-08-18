import type { PlacedModule, RoomDimensions } from '../types/composition';

export type ModuleBand = 'superior' | 'base';

/**
 * Deriva a FILEIRA (parede/"superior" ou chão/"base") a partir do nome do
 * produto — mesma lógica de `isSuperior` em `utils/modulePhotos.ts`. É essa
 * fileira que decide a altura (Y) fixa do módulo: parede sempre gruda no
 * topo do quadrante, chão sempre gruda no piso — pra ficar com cara de
 * corte/elevação de projeto de verdade (pedido do cliente, referência tipo
 * planta humanizada), em vez de módulos soltos flutuando em qualquer Y.
 */
export function getModuleBand(name: string): ModuleBand {
  const normalized = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  return normalized.includes('superior') ? 'superior' : 'base';
}

/**
 * Recalcula offsetXCm/offsetYCm de TODOS os módulos: agrupa por fileira e
 * cola um do lado do outro (sem espaço nenhum entre eles) na ORDEM em que
 * aparecem no array — é essa ordem que dá o "encaixe automático" pedido: ao
 * adicionar/remover/reordenar um módulo, todo mundo da mesma fileira desliza
 * pra fechar o buraco, igual um tampo contínuo de cozinha de verdade.
 *
 * Y é sempre fixo pela fileira (não é mais livre): "superior" gruda no topo
 * (Y=0, junto do teto), "base" gruda no piso (Y = altura do espaço menos a
 * altura do módulo, pra encostar embaixo). X continua variável, mas colado
 * (sem gaps) em vez de livre — dá pra reordenar arrastando (ver
 * `reorderInBand`), só não dá mais pra "flutuar" solto no meio do nada.
 */
export function repackBands(modules: PlacedModule[], room: RoomDimensions): PlacedModule[] {
  const cursors: Record<ModuleBand, number> = { superior: 0, base: 0 };
  return modules.map((m) => {
    const band = getModuleBand(m.moduleName);
    const x = cursors[band];
    cursors[band] += m.widthCm;
    const y = band === 'superior' ? 0 : Math.max(0, room.heightCm - m.heightCm);
    return { ...m, offsetXCm: x, offsetYCm: y };
  });
}

/**
 * Reordena um módulo já colocado DENTRO DA PRÓPRIA fileira (parede continua
 * parede, chão continua chão — um módulo não muda de tipo arrastando), pro
 * índice mais próximo de onde ele foi solto (`dropXCm`, comparado com o
 * CENTRO de cada módulo já colado ali). Devolve só a nova ORDEM do array —
 * quem chama (`moveModule` na store) roda `repackBands` em seguida pra
 * recalcular X/Y de verdade a partir dessa ordem.
 */
export function reorderInBand(modules: PlacedModule[], instanceId: string, dropXCm: number): PlacedModule[] {
  const moved = modules.find((m) => m.instanceId === instanceId);
  if (!moved) return modules;

  const band = getModuleBand(moved.moduleName);
  const rest = modules.filter((m) => m.instanceId !== instanceId);
  const bandItems = rest.filter((m) => getModuleBand(m.moduleName) === band);
  const others = rest.filter((m) => getModuleBand(m.moduleName) !== band);

  let insertAt = bandItems.length;
  let cursor = 0;
  for (let i = 0; i < bandItems.length; i++) {
    const center = cursor + bandItems[i].widthCm / 2;
    if (dropXCm < center) {
      insertAt = i;
      break;
    }
    cursor += bandItems[i].widthCm;
  }
  bandItems.splice(insertAt, 0, moved);

  // Só existem 2 fileiras — a ordem ENTRE fileiras diferentes não afeta o
  // layout (cada uma tem seu próprio cursor em `repackBands`), só a ordem
  // DENTRO da mesma fileira importa.
  return band === 'superior' ? [...bandItems, ...others] : [...others, ...bandItems];
}

