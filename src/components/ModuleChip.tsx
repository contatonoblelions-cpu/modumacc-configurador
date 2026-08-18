import { useDraggable } from '@dnd-kit/core';
import type { CatalogModule } from '../types/catalog';
import { useConfiguratorStore } from '../store/configuratorStore';
import { ModulePhoto, hasModulePhoto } from './ModulePhoto';
import { IsoBevel } from './IsoBevel';

interface Props {
  module: CatalogModule;
}

/**
 * Versão compacta do card de módulo, só pro mobile (ver `ModulePanel.tsx`,
 * que renderiza este componente escondido no desktop e o `ModuleCard.tsx`
 * completo escondido no mobile — os dois ficam montados ao mesmo tempo,
 * cada um com seu próprio `id` de drag, e o CSS decide qual aparece).
 *
 * Sem preço, sem seletor de largura, sem botão separado: um chip pequeno
 * com foto + nome + largura, que já entra na parede com um toque (usa a
 * primeira largura disponível) ou com um arrasto — igual ao mockup de
 * referência. Trocar a largura depois de já colocado fica pra uma iteração
 * futura, se for necessário.
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
 * Fundo: foto REAL do formato da peça (ver `utils/modulePhotos.ts` e
 * `ModulePhoto.tsx`) — já de cara mostra como o produto é montado/vendido,
 * mesmo antes do cliente escolher um acabamento. Depois que ele escolhe a
 * cor, a mesma foto já aparece na cor certa (ver `ModulePhoto.tsx`). Pra
 * módulos sem foto mapeada ainda, cai de volta pro azul-marinho
 * (`bg-brand-navy-800`) como fallback.
 */
export function ModuleChip({ module }: Props) {
  const addModule = useConfiguratorStore((s) => s.addModule);
  const finish = useConfiguratorStore((s) => s.finish);
  const widthCm = module.availableWidths[0] ?? 0;
  const hasPhoto = hasModulePhoto(module.name);

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `catalog-mobile-${module.id}-${widthCm}`,
    data: { type: 'catalog-module', moduleId: module.id, moduleName: module.name, widthCm, heightCm: module.heightCm },
  });

  return (
    // Wrapper só pra IsoBevel (chanfro 3D) vazar por cima/direita — o botão
    // em si continua com `overflow-hidden` (precisa, pra recortar a foto).
    <div className="relative shrink-0 md:hidden">
      <IsoBevel depth={5} />
      <button
        type="button"
        ref={setNodeRef}
        {...listeners}
        {...attributes}
        onClick={() => addModule(module, widthCm)}
        className={`relative flex h-[72px] w-[76px] flex-col items-center justify-end gap-0.5 overflow-hidden rounded-lg px-1.5 pb-1 text-center text-white shadow-sm transition active:scale-95 ${
          hasPhoto ? '' : 'bg-brand-navy-800'
        } ${isDragging ? 'opacity-40' : ''}`}
        title={`Adicionar ${module.name}`}
      >
        {hasPhoto && (
          <ModulePhoto name={module.name} finish={finish} className="absolute inset-0 h-full w-full" />
        )}
        {hasPhoto && (
          <div
            aria-hidden="true"
            className="absolute inset-0"
            style={{
              backgroundImage: 'linear-gradient(180deg, rgba(15,30,45,0) 45%, rgba(10,20,32,0.8) 100%)',
            }}
          />
        )}
        <span className="relative z-10 line-clamp-2 text-[11px] font-medium leading-tight drop-shadow-sm">
          {module.name}
        </span>
        <span className="relative z-10 text-[10px] text-brand-silver-300 drop-shadow-sm">{widthCm}cm</span>
      </button>
    </div>
  );
}
