import { useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import type { CatalogModule } from '../types/catalog';
import { formatBRL } from '../api/parseAttributes';
import { useConfiguratorStore } from '../store/configuratorStore';
import { ModuleSchematic } from './ModuleSchematic';

interface Props {
  module: CatalogModule;
}

/**
 * Card de um módulo do catálogo, com seletor de largura quando há mais de
 * uma opção. Duas formas de colocar na parede:
 * 1. Arrastar (pega pela imagem/nome) até a posição exata que quiser dentro
 *    da fileira certa — a fileira em si é sempre a do produto (superior,
 *    inferior, torre... decidida pelo nome, ver `utils/rows.ts`), só a
 *    posição dentro dela é livre.
 * 2. Tocar em "+ Adicionar", que joga o módulo direto pro final da fileira
 *    — atalho mais rápido quando a posição exata não importa.
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
        title="Arraste até a parede, na posição que quiser"
      >
        <ModuleSchematic name={module.name} className="mb-2 h-24 w-full rounded-lg" />
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
