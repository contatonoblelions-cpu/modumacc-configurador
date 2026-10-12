import { useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import type { CatalogModule } from '../types/catalog';
import { useConfiguratorStore } from '../store/configuratorStore';
import { ModulePhoto, hasModulePhoto } from './ModulePhoto';

interface Props {
  module: CatalogModule;
}

/**
 * Versão compacta do card de módulo, só pro mobile. Chip pequeno com foto +
 * nome; entra na parede com um toque (ou arrasto do módulo já colocado). Quando
 * o módulo tem MAIS DE UMA medida (largura em cm), mostra um seletor logo abaixo
 * — mesma função do card do desktop (`ModuleCard.tsx`), pedido do cliente pra
 * ter paridade mobile/desktop. O rótulo fica em azul sobre degradê claro.
 */
export function ModuleChip({ module }: Props) {
  const addModule = useConfiguratorStore((s) => s.addModule);
  const finish = useConfiguratorStore((s) => s.finish);
  const handle = useConfiguratorStore((s) => s.handle);
  const [widthCm, setWidthCm] = useState(module.availableWidths[0] ?? 0);
  const hasPhoto = hasModulePhoto(module.name);
  const multiWidth = module.availableWidths.length > 1;

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    // O id inclui a largura escolhida pra o dnd-kit tratar cada medida como um
    // arrastável distinto (igual no card do desktop).
    id: `catalog-mobile-${module.id}-${widthCm}`,
    data: { type: 'catalog-module', moduleId: module.id, moduleName: module.name, widthCm, heightCm: module.heightCm },
  });

  return (
    <div className="relative flex w-[108px] shrink-0 flex-col gap-1 md:hidden">
      <button
        type="button"
        ref={setNodeRef}
        {...listeners}
        {...attributes}
        onClick={() => addModule(module, widthCm)}
        className={`relative flex h-[72px] w-full flex-col items-center justify-end gap-0.5 overflow-hidden rounded-lg px-1.5 pb-1 text-center shadow-sm transition active:scale-95 ${
          hasPhoto ? '' : 'bg-brand-navy-800'
        } ${isDragging ? 'opacity-40' : ''}`}
        title={`Adicionar ${module.name}`}
      >
        {hasPhoto && (
          <ModulePhoto name={module.name} finish={finish} handle={handle} className="absolute inset-0 h-full w-full" />
        )}
        {!hasPhoto && (
          <span className="relative z-10 line-clamp-2 px-0.5 text-[11px] font-semibold leading-tight text-white">
            {module.name}
          </span>
        )}
      </button>

      {/* Nome LEGIVEL embaixo da foto (nao sobreposto) + medida clara. */}
      <span className="line-clamp-2 min-h-[26px] text-center text-[11px] font-semibold leading-tight text-brand-navy-900">
        {module.name}
      </span>
      {!multiWidth && (
        <span className="text-center text-[10px] font-medium text-brand-silver-600">{widthCm}cm</span>
      )}

      {multiWidth && (
        <select
          value={widthCm}
          onChange={(e) => setWidthCm(Number(e.target.value))}
          onPointerDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          className="w-full rounded border border-brand-silver-400 bg-white px-1 py-0.5 text-[11px] font-medium text-brand-navy-800"
          title="Escolha a medida (largura)"
        >
          {module.availableWidths.map((w) => (
            <option key={w} value={w}>
              {w}cm
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
