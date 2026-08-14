import { useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import type { CatalogModule } from '../types/catalog';
import { formatBRL } from '../api/parseAttributes';
import { useConfiguratorStore } from '../store/configuratorStore';

interface Props {
  module: CatalogModule;
}

/**
 * Card de um módulo do catálogo, com seletor de largura quando há mais de
 * uma opção. Pode ser arrastado pra área de montagem (desktop e celular) ou
 * adicionado tocando no botão "+" — essa segunda opção existe porque
 * arrastar com o dedo em telas pequenas é menos preciso, então é bom ter um
 * jeito de adicionar com um toque só, sem depender de acertar o drag.
 */
export function ModuleCard({ module }: Props) {
  const [widthCm, setWidthCm] = useState(module.availableWidths[0] ?? 0);
  const addModule = useConfiguratorStore((s) => s.addModule);

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `catalog-${module.id}-${widthCm}`,
    data: { type: 'catalog-module', moduleId: module.id, widthCm },
  });

  return (
    <div
      ref={setNodeRef}
      className={`w-40 shrink-0 rounded-xl border border-brand-silver-200 bg-white p-3 shadow-sm transition md:w-auto ${
        isDragging ? 'opacity-40' : ''
      }`}
    >
      <div
        {...listeners}
        {...attributes}
        className="touch-none cursor-grab active:cursor-grabbing"
        title="Arraste para a área de montagem"
      >
        <img
          src={module.images[0]?.thumbnail}
          alt={module.name}
          className="mb-2 h-24 w-full rounded-lg bg-brand-bg object-contain"
          draggable={false}
        />
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
        onClick={() => addModule(module, widthCm)}
        className="mt-2 flex w-full items-center justify-center gap-1 rounded-lg border border-brand-navy-800 py-1.5 text-sm font-medium text-brand-navy-800 transition hover:bg-brand-navy-800 hover:text-white"
        title="Adicionar à composição"
      >
        + Adicionar
      </button>
    </div>
  );
}
