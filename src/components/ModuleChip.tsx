import { useDraggable } from '@dnd-kit/core';
import type { CatalogModule } from '../types/catalog';
import { useConfiguratorStore } from '../store/configuratorStore';
import { getFinishSwatch } from '../utils/finishSwatches';

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
 * chip pequeno com nome + largura, que já entra na parede com um
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
 *
 * Fundo: foto do acabamento selecionado (ver `utils/finishSwatches.ts`) —
 * o chip mostra o material de verdade (cor/textura), não mais uma caixa
 * azul-marinho genérica. Sem acabamento resolvido ainda, cai de volta pro
 * azul-marinho (`bg-brand-navy-800`) como fallback.
 */
export function ModuleChip({ module }: Props) {
  const addModule = useConfiguratorStore((s) => s.addModule);
  const finish = useConfiguratorStore((s) => s.finish);
  const widthCm = module.availableWidths[0] ?? 0;
  const finishImageUrl = getFinishSwatch(finish);

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
      style={
        finishImageUrl
          ? {
              backgroundImage: `linear-gradient(180deg, rgba(15,30,45,0.15) 0%, rgba(10,20,32,0.75) 100%), url(${finishImageUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }
          : undefined
      }
      className={`flex h-[72px] w-[76px] shrink-0 flex-col items-center justify-center gap-0.5 rounded-lg px-1.5 text-center text-white shadow-sm transition active:scale-95 md:hidden ${
        finishImageUrl ? '' : 'bg-brand-navy-800'
      } ${isDragging ? 'opacity-40' : ''}`}
      title={`Adicionar ${module.name}`}
    >
      <span className="line-clamp-2 text-[11px] font-medium leading-tight drop-shadow-sm">{module.name}</span>
      <span className="text-[10px] text-brand-silver-300 drop-shadow-sm">{widthCm}cm</span>
    </button>
  );
}
