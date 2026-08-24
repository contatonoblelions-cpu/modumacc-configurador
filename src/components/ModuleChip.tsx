import { useDraggable } from '@dnd-kit/core';
import type { CatalogModule } from '../types/catalog';
import { useConfiguratorStore } from '../store/configuratorStore';
import { ModulePhoto, hasModulePhoto } from './ModulePhoto';

interface Props {
  module: CatalogModule;
}

/**
 * Versão compacta do card de módulo, só pro mobile. Chip pequeno com foto +
 * nome + largura; entra na parede com um toque ou arrasto. O rótulo (nome +
 * largura) fica em azul-escuro sobre um degradê CLARO no rodapé do chip, pra
 * leitura fácil (pedido do cliente — antes era branco sobre fundo escuro).
 */
export function ModuleChip({ module }: Props) {
  const addModule = useConfiguratorStore((s) => s.addModule);
  const finish = useConfiguratorStore((s) => s.finish);
  const handle = useConfiguratorStore((s) => s.handle);
  const widthCm = module.availableWidths[0] ?? 0;
  const hasPhoto = hasModulePhoto(module.name);

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `catalog-mobile-${module.id}-${widthCm}`,
    data: { type: 'catalog-module', moduleId: module.id, moduleName: module.name, widthCm, heightCm: module.heightCm },
  });

  return (
    <div className="relative shrink-0 md:hidden">
      <button
        type="button"
        ref={setNodeRef}
        {...listeners}
        {...attributes}
        onClick={() => addModule(module, widthCm)}
        className={`relative flex h-[72px] w-[76px] flex-col items-center justify-end gap-0.5 overflow-hidden rounded-lg px-1.5 pb-1 text-center shadow-sm transition active:scale-95 ${
          hasPhoto ? '' : 'bg-brand-navy-800'
        } ${isDragging ? 'opacity-40' : ''}`}
        title={`Adicionar ${module.name}`}
      >
        {hasPhoto && (
          <ModulePhoto name={module.name} finish={finish} handle={handle} className="absolute inset-0 h-full w-full" />
        )}
        {hasPhoto && (
          <div
            aria-hidden="true"
            className="absolute inset-0"
            style={{
              backgroundImage: 'linear-gradient(180deg, rgba(255,255,255,0) 30%, rgba(255,255,255,0.96) 78%)',
            }}
          />
        )}
        <span className={`relative z-10 line-clamp-2 text-[11px] font-semibold leading-tight ${hasPhoto ? 'text-brand-navy-900' : 'text-white'}`}>
          {module.name}
        </span>
        <span className={`relative z-10 text-[10px] font-medium ${hasPhoto ? 'text-brand-navy-700' : 'text-brand-silver-200'}`}>{widthCm}cm</span>
      </button>
    </div>
  );
}
