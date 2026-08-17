import { useDraggable } from '@dnd-kit/core';
import type { CatalogModule } from '../types/catalog';
import { useConfiguratorStore } from '../store/configuratorStore';

interface Props {
  module: CatalogModule;
}

/**
 * Versão compacta do card de módulo, só pro mobile (ver `ModulePanel.tsx`,
 * que renderiza este componente escondido no desktop e o `ModuleCard.tsx`
 * completo escondido no mobile — os dois ficam montados ao mesmo tempo,
 * cada um com seu próprio `id` de drag, e o CSS decide qual aparece).
 *
 * Sem imagem, sem preço, sem seletor de largura, sem botão separado: um
 * chip pequeno e escuro com nome + largura, que já entra na parede com um
 * toque (usa a primeira largura disponível) ou com um arrasto — igual ao
 * mockup de referência. Trocar a largura depois de já colocado fica pra uma
 * iteração futura, se for necessário.
 *
 * PROPOSITALMENTE sem `touch-action: none` aqui — a faixa (`ModulePanel.tsx`)
 * rola na horizontal, e travar o touch-action bloquearia esse deslize
 * sempre que o dedo tocasse em cima de um chip (a faixa é quase só chips
 * lado a lado, então na prática travaria o deslize quase inteiro). Em vez
 * disso, a desambiguação "deslizar rápido = rolar" vs. "segurar parado =
 * arrastar" fica só por conta do `activationConstraint` (delay + tolerance)
 * do `TouchSensor` em `App.tsx` — é o próprio dnd-kit que decide, sem
 * precisar bloquear o touch-action.
 */
export function ModuleChip({ module }: Props) {
  const addModule = useConfiguratorStore((s) => s.addModule);
  const widthCm = module.availableWidths[0] ?? 0;

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `catalog-mobile-${module.id}-${widthCm}`,
    data: { type: 'catalog-module', moduleId: module.id, widthCm, heightCm: module.heightCm },
  });

  return (
    <button
      type="button"
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={() => addModule(module, widthCm)}
      className={`flex h-[72px] w-[76px] shrink-0 flex-col items-center justify-center gap-0.5 rounded-lg bg-brand-navy-800 px-1.5 text-center text-white shadow-sm transition active:scale-95 md:hidden ${
        isDragging ? 'opacity-40' : ''
      }`}
      title={`Adicionar ${module.name}`}
    >
      <span className="line-clamp-2 text-[11px] font-medium leading-tight">{module.name}</span>
      <span className="text-[10px] text-brand-silver-300">{widthCm}cm</span>
    </button>
  );
}
