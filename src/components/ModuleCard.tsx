import { useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import type { CatalogModule } from '../types/catalog';
import { formatBRL } from '../api/parseAttributes';

interface Props {
  module: CatalogModule;
}

/** Card arrastável de um módulo do catálogo, com seletor de largura quando há mais de uma opção. */
export function ModuleCard({ module }: Props) {
  const [widthCm, setWidthCm] = useState(module.availableWidths[0] ?? 0);

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `catalog-${module.id}-${widthCm}`,
    data: { type: 'catalog-module', moduleId: module.id, widthCm },
  });

  return (
    <div
      ref={setNodeRef}
      className={`rounded-xl border border-brand-silver-200 bg-white p-3 shadow-sm transition ${
        isDragging ? 'opacity-40' : ''
      }`}
    >
      <div
        {...listeners}
        {...attributes}
        className="cursor-grab active:cursor-grabbing"
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
    </div>
  );
}
