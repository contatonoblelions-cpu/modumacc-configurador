import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useDraggable, useDroppable, useDndContext } from '@dnd-kit/core';
import { useConfiguratorStore } from '../store/configuratorStore';
import { checkSpace, formatMeters, mobileRowHeightPx } from '../utils/layout';
import { ROW_ORDER, ROW_LABELS, inferRowKey } from '../utils/rows';
import type { RowKey, PlacedModule } from '../types/composition';
import { formatBRL } from '../api/parseAttributes';
import { ModuleSchematic } from './ModuleSchematic';

const CANVAS_MAX_PX = 760;

interface PlacedModuleBoxProps {
  m: PlacedModule;
  scale: number;
  onReorder: (instanceId: string, direction: 'left' | 'right') => void;
  onRemove: (instanceId: string) => void;
}

function PlacedModuleBox({ m, scale, onReorder, onRemove }: PlacedModuleBoxProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `placed-${m.instanceId}`,
    data: { type: 'placed-module', instanceId: m.instanceId, row: m.row, widthCm: m.widthCm },
  });

  return (
    <div
      ref={setNodeRef}
      style={{ left: m.offsetCm * scale, width: m.widthCm * scale }}
      className={`group absolute inset-y-0 bg-brand-bg transition ${isDragging ? 'opacity-30' : ''}`}
    >
      <div
        {...listeners}
        {...attributes}
        className="h-full touch-none cursor-grab active:cursor-grabbing"
      >
        <div className="flex h-full flex-col items-center justify-center gap-0.5 rounded-md border border-brand-silver-300 bg-white px-1 text-center md:hidden">
          <span className="line-clamp-2 text-[10px] font-medium leading-tight text-brand-navy-800">
            {m.moduleName}
          </span>
          <span className="text-[9px] text-brand-silver-600">{m.widthCm}cm</span>
        </div>
        <div className="hidden h-full md:block">
          <ModuleSchematic name={m.moduleName} className="h-32 w-full" />
          <div className="px-1 pb-1 text-center">
            <p className="truncate text-[11px] text-brand-silver-700">{m.moduleName}</p>
            <p className="text-[11px] font-medium text-brand-navy-800">{m.widthCm}cm</p>
            <p className="text-[11px] text-brand-silver-600">
              {formatBRL(m.resolvedPriceCents ?? m.basePriceCents)}
            </p>
          </div>
        </div>
      </div>
      <div className="absolute right-0.5 top-0.5 flex gap-1 opacity-100 transition-opacity md:right-1 md:top-1 md:opacity-0 md:group-hover:opacity-100">
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => onReorder(m.instanceId, 'left')}
          className="hidden h-7 w-7 items-center justify-center rounded bg-white/95 text-sm shadow md:flex"
          title="Mover 10cm pra esquerda"
        >
          ←
        </button>
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => onReorder(m.instanceId, 'right')}
          className="hidden h-7 w-7 items-center justify-center rounded bg-white/95 text-sm shadow md:flex"
          title="Mover 10cm pra direita"
        >
          →
        </button>
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => onRemove(m.instanceId)}
          className="flex h-4 w-4 items-center justify-center rounded-full bg-white/95 text-[9px] text-red-600 shadow md:h-7 md:w-7 md:text-sm"
          title="Remover"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

interface RowCanvasProps {
  row: RowKey;
  rowModules: PlacedModule[];
  scale: number;
  canvasWidth: number;
  rowHeightVar: CSSProperties;
  disabled: boolean;
  overflow: boolean;
  onReorder: (instanceId: string, direction: 'left' | 'right') => void;
  onRemove: (instanceId: string) => void;
}

function RowCanvas({
  row, rowModules, scale, canvasWidth, rowHeightVar, disabled, overflow, onReorder, onRemove,
}: RowCanvasProps) {
  const { setNodeRef } = useDroppable({ id: `row::${row}`, disabled });
  const dragPreview = useConfiguratorStore((s) => s.dragPreview);
  const showPreview = dragPreview?.row === row;

  return (
    <div
      ref={setNodeRef}
      style={{ ...rowHeightVar, maxWidth: canvasWidth }}
      className={`relative h-[var(--row-h)] w-full overflow-hidden rounded-xl border border-brand-silver-200 bg-white transition md:h-40 md:rounded-lg md:border-2 md:border-dashed ${
        overflow ? 'md:border-red-400' : disabled ? 'md:border-brand-silver-200 opacity-50' : 'md:border-brand-silver-400'
      }`}
    >
      {rowModules.length === 0 && !showPreview && (
        <p className="pointer-events-none absolute inset-0 flex items-center justify-center text-center text-[10px] text-brand-silver-400 md:text-xs">
          + arraste aqui, em qualquer ponto
        </p>
      )}

      {rowModules.map((m) => (
        <PlacedModuleBox key={m.instanceId} m={m} scale={scale} onReorder={onReorder} onRemove={onRemove} />
      ))}

      {showPreview && dragPreview && (
        <div
          className="pointer-events-none absolute inset-y-0 rounded-md border-2 border-dashed border-brand-navy-400 bg-brand-navy-100/70"
          style={{ left: dragPreview.offsetCm * scale, width: dragPreview.widthCm * scale }}
        />
      )}
    </div>
  );
}

export function BuildCanvas() {
  const room = useConfiguratorStore((s) => s.room);
  const modules = useConfiguratorStore((s) => s.modules);
  const catalog = useConfiguratorStore((s) => s.catalog);
  const removeModule = useConfiguratorStore((s) => s.removeModule);
  const reorderModules = useConfiguratorStore((s) => s.reorderModules);

  const { active } = useDndContext();

  const wrapperRef = useRef<HTMLDivElement>(null);
  const [canvasWidth, setCanvasWidth] = useState(CANVAS_MAX_PX);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w) setCanvasWidth(Math.min(CANVAS_MAX_PX, w));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  if (!room) return null;

  const scale = canvasWidth / room.widthCm;

  const activeData = active?.data.current as
    | { type: 'catalog-module'; moduleId: number; widthCm: number }
    | { type: 'placed-module'; instanceId: string; row: RowKey; widthCm: number }
    | undefined;
  let draggingRow: RowKey | null = null;
  if (activeData?.type === 'placed-module') {
    draggingRow = activeData.row;
  } else if (activeData?.type === 'catalog-module') {
    const mod = catalog.find((c) => c.id === activeData.moduleId);
    if (mod) draggingRow = inferRowKey(mod.name);
  }

  const possibleRows = new Set<RowKey>();
  catalog.forEach((c) => possibleRows.add(inferRowKey(c.name)));
  modules.forEach((m) => possibleRows.add(m.row));
  const rows = ROW_ORDER.filter((r) => possibleRows.has(r)).map((row) => ({
    row,
    modules: modules.filter((m) => m.row === row),
  }));

  const rowHeightVar = { ['--row-h' as string]: `${mobileRowHeightPx(room.heightCm)}px` } as CSSProperties;

  return (
    <div ref={wrapperRef} className="order-1 flex-1 overflow-auto p-3 md:order-none md:p-6">
      <div className="mb-1.5 md:mb-3">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-navy-800 md:hidden">
          Área de montagem — escala real (fixa)
        </p>
        <p className="hidden text-sm text-brand-silver-700 md:block">
          Espaço: {room.widthCm}cm × {room.heightCm}cm
        </p>
      </div>

      {modules.length === 0 && (
        <p className="mb-2 text-[11px] text-brand-silver-600 md:mb-3 md:text-sm">
          Arraste um módulo até a fileira certa, em qualquer ponto, pra começar a montar sua parede.
        </p>
      )}

      <div className="flex flex-col gap-1.5 md:gap-4">
        {rows.map(({ row, modules: rowModules }) => {
          const space = checkSpace(room, rowModules);
          const rowDisabled = draggingRow !== null && draggingRow !== row;
          return (
            <div key={row}>
              <div className="mb-1 hidden flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 md:flex">
                <span className="text-xs font-semibold uppercase tracking-wide text-brand-silver-700">
                  {ROW_LABELS[row]}
                </span>
                <span className="text-xs text-brand-silver-600">
                  Usado: {formatMeters(space.usedCm)}
                  {space.hasGap && !space.overflow && (
                    <span className="ml-2 text-amber-600">· sobram {space.remainingCm}cm</span>
                  )}
                  {space.overflow && (
                    <span className="ml-2 font-medium text-red-600">
                      · passou {Math.abs(space.remainingCm)}cm da largura informada
                    </span>
                  )}
                </span>
              </div>
              {space.overflow && (
                <p className="mb-0.5 text-[10px] font-medium text-red-600 md:hidden">
                  {ROW_LABELS[row]}: passou {Math.abs(space.remainingCm)}cm da largura informada
                </p>
              )}

              <RowCanvas
                row={row}
                rowModules={rowModules}
                scale={scale}
                canvasWidth={canvasWidth}
                rowHeightVar={rowHeightVar}
                disabled={rowDisabled}
                overflow={space.overflow}
                onReorder={reorderModules}
                onRemove={removeModule}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
