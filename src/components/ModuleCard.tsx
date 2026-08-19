import { useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import type { CatalogModule } from '../types/catalog';
import { formatBRL } from '../api/parseAttributes';
import { useConfiguratorStore } from '../store/configuratorStore';
import { ModuleSchematic } from './ModuleSchematic';
import { ModulePhoto, hasModulePhoto } from './ModulePhoto';
import { getFinishSwatch } from '../utils/finishSwatches';
import { getHandleColor } from '../utils/handleColors';

interface Props {
  module: CatalogModule;
}

/**
 * Card completo de um módulo do catálogo — só aparece no DESKTOP
 * (`hidden md:block`; no mobile quem aparece é o `ModuleChip.tsx`, mais
 * compacto, renderizado ao lado deste em `ModulePanel.tsx`). Tem seletor de
 * largura quando há mais de uma opção. Duas formas de colocar na parede:
 * 1. Arrastar (pega pela imagem/nome) até QUALQUER ponto do quadrante —
 *    posição totalmente livre em X e Y, sem fileira ou categoria fixa (ver
 *    `utils/placement.ts`).
 * 2. Tocar em "+ Adicionar", que joga o módulo no primeiro canto livre —
 *    atalho mais rápido quando a posição exata não importa.
 */
export function ModuleCard({ module }: Props) {
  const [widthCm, setWidthCm] = useState(module.availableWidths[0] ?? 0);
  const addModule = useConfiguratorStore((s) => s.addModule);
  const finish = useConfiguratorStore((s) => s.finish);
  const finishImageUrl = getFinishSwatch(finish);
  const handle = useConfiguratorStore((s) => s.handle);
  const handleColor = getHandleColor(handle);

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `catalog-${module.id}-${widthCm}`,
    data: { type: 'catalog-module', moduleId: module.id, moduleName: module.name, widthCm, heightCm: module.heightCm },
  });

  return (
    <div
      ref={setNodeRef}
      className={`hidden shrink-0 rounded-xl border border-brand-silver-200 bg-white p-3 shadow-sm transition md:block ${
        isDragging ? 'opacity-40' : ''
      }`}
    >
      <div
        {...listeners}
        {...attributes}
        className="touch-none cursor-grab active:cursor-grabbing"
        title="Arraste até a parede, na posição que quiser"
      >
        {/* Miniatura plana da imagem do módulo (só a frente, sem profundidade 3D). */}
        <div className="relative mb-2 h-24 w-full">
          {hasModulePhoto(module.name) ? (
            <ModulePhoto name={module.name} finish={finish} className="h-full w-full rounded-lg" />
          ) : (
            <ModuleSchematic
              name={module.name}
              finishImageUrl={finishImageUrl}
              handleColor={handleColor}
              className="h-full w-full rounded-lg"
            />
          )}
        </div>
        <p className="text-sm font-medium text-brand-navy-800">{module.name}</p>
      </div>

      <div className="mt-2 flex items-center justify-between gap-2">
        {module.availableWidths.length > 1 ? (
          <select
            value={widthCm}
            onChange={(e) => setWidthCm(Number(e.target.value))}
            onPointerDown={(e) => e.stopPropagation()}
            className="rounded border border-brand-silver-400 px-1.5 py-1 text-xs"
          >
            {module.availableWidths.map((w) => (
              <option key={w} value={w}>
                {w}cm
              </option>
            ))}
          </select>
        ) : (
          <span className="text-xs text-brand-silver-600">{widthCm}cm</span>
        )}
        <span className="text-sm font-semibold text-brand-navy-900">
          {formatBRL(module.minPriceCents)}
        </span>
      </div>

      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={() => addModule(module, widthCm)}
        className="mt-2 flex w-full items-center justify-center gap-1 rounded-lg border border-brand-navy-800 py-1.5 text-sm font-medium text-brand-navy-800 transition hover:bg-brand-navy-800 hover:text-white"
        title="Adicionar ao final da fileira"
      >
        + Adicionar
      </button>
    </div>
  );
}
