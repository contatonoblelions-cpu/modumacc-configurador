import { Fragment, useEffect, useRef, useState } from 'react';
import { useDraggable, useDroppable, useDndContext } from '@dnd-kit/core';
import { useConfiguratorStore } from '../store/configuratorStore';
import { checkSpace } from '../utils/layout';
import { ROW_ORDER, ROW_LABELS, inferRowKey } from '../utils/rows';
import type { RowKey, PlacedModule } from '../types/composition';
import { formatBRL } from '../api/parseAttributes';
import { ModuleSchematic } from './ModuleSchematic';

const CANVAS_MAX_PX = 760;

/**
 * Zona fina de "soltar aqui" entre dois módulos (ou nas pontas) de uma
 * fileira. É isso que dá o efeito de posição livre: em vez de só poder
 * jogar o módulo no final, dá pra soltar exatamente entre dois módulos
 * quaisquer. Alarga e destaca quando algo compatível está sendo arrastado
 * por cima (ver `isOver`).
 */
function InsertSlot({ id, disabled }: { id: string; disabled: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id, disabled });
  return (
    <div
      ref={setNodeRef}
      className={`self-stretch shrink-0 rounded transition-all ${
        isOver ? 'w-9 bg-brand-navy-100' : disabled ? 'w-1' : 'w-2.5'
      }`}
    />
  );
}

interface PlacedModuleBoxProps {
  m: PlacedModule;
  i: number;
  rowLength: number;
  scale: number;
  onReorder: (instanceId: string, direction: 'left' | 'right') => void;
  onRemove: (instanceId: string) => void;
}

/** Um módulo já colocado na parede — também é arrastável, pra reposicionar dentro da própria fileira. */
function PlacedModuleBox({ m, i, rowLength, scale, onReorder, onRemove }: PlacedModuleBoxProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `placed-${m.instanceId}`,
    data: { type: 'placed-module', instanceId: m.instanceId, row: m.row },
  });

  return (
    <div
      ref={setNodeRef}
      style={{ width: m.widthCm * scale }}
      className={`group relative shrink-0 bg-brand-bg transition ${isDragging ? 'opacity-30' : ''}`}
    >
      <div {...listeners} {...attributes} className="touch-none cursor-grab active:cursor-grabbing">
        <ModuleSchematic name={m.moduleName} className="h-32 w-full" />
        <div className="px-1 pb-1 text-center">
          <p className="truncate text-[11px] text-brand-silver-700">{m.moduleName}</p>
          <p className="text-[11px] font-medium text-brand-navy-800">{m.widthCm}cm</p>
          <p className="text-[11px] text-brand-silver-600">
            {formatBRL(m.resolvedPriceCents ?? m.basePriceCents)}
          </p>
        </div>
      </div>
      {/*
        Sempre visíveis no celular (não existe "hover" no toque), e some
        suavemente no desktop até passar o mouse por cima. As setas ainda
        servem pra ajuste fino, além de arrastar.
      */}
      <div className="absolute right-1 top-1 flex gap-1 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100">
        {i > 0 && (
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => onReorder(m.instanceId, 'left')}
            className="flex h-7 w-7 items-center justify-center rounded bg-white/95 text-sm shadow"
            title="Mover pra esquerda"
          >
            ←
          </button>
        )}
        {i < rowLength - 1 && (
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => onReorder(m.instanceId, 'right')}
            className="flex h-7 w-7 items-center justify-center rounded bg-white/95 text-sm shadow"
            title="Mover pra direita"
          >
            →
          </button>
        )}
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => onRemove(m.instanceId)}
          className="flex h-7 w-7 items-center justify-center rounded bg-white/95 text-sm text-red-600 shadow"
          title="Remover"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

/**
 * Área de montagem: uma "parede" em 2D dividida em fileiras (superior,
 * inferior, torre/coluna...) — a mesma lógica que o time de montagem usa
 * pra ler o projeto depois.
 *
 * A fileira de cada módulo é sempre a do produto (decidida pelo nome, ver
 * `utils/rows.ts`) — isso não muda. O que é livre é A POSIÇÃO dentro da
 * fileira: dá pra arrastar um módulo do painel (ou um módulo já colocado)
 * e soltar exatamente entre dois módulos quaisquer, usando os "slots" finos
 * que aparecem entre eles (`InsertSlot`). Pra quem preferir não arrastar, o
 * botão "+ Adicionar" no painel joga direto pro final da fileira, e as
 * setas ←/→ continuam disponíveis pra ajuste fino.
 *
 * Fileiras "possíveis" (que têm pelo menos um produto no catálogo, mesmo
 * que ainda vazias na composição) aparecem sempre, pra servir de alvo de
 * soltar — sem isso não teria como começar uma fileira nova.
 */
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

  // Fileira que está sendo arrastada agora (se houver) — usado pra desabilitar
  // os slots das OUTRAS fileiras, já que um módulo só pode entrar na fileira
  // do próprio produto (evita soltar um "Superior" na fileira "Inferior").
  const activeData = active?.data.current as
    | { type: 'catalog-module'; moduleId: number; widthCm: number }
    | { type: 'placed-module'; instanceId: string; row: RowKey }
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

  return (
    <div ref={wrapperRef} className="flex-1 overflow-auto p-4 md:p-6">
      <div className="mb-3 text-sm text-brand-silver-700">
        Espaço: {room.widthCm}cm × {room.heightCm}cm
      </div>

      {modules.length === 0 && (
        <p className="mb-3 text-sm text-brand-silver-600">
          Arraste um módulo até a fileira certa (ou toque em "+ Adicionar" no painel) pra começar a montar sua parede.
        </p>
      )}

      <div className="flex flex-col gap-4">
        {rows.map(({ row, modules: rowModules }) => {
          const space = checkSpace(room, rowModules);
          const rowDisabled = draggingRow !== null && draggingRow !== row;
          return (
            <div key={row}>
              <div className="mb-1 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                <span className="text-xs font-semibold uppercase tracking-wide text-brand-silver-700">
                  {ROW_LABELS[row]}
                </span>
                <span className="text-xs text-brand-silver-600">
                  Usado: {space.usedCm}cm
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

              <div
                style={{ width: canvasWidth }}
                className={`flex min-h-32 items-end gap-0 rounded-lg border-2 border-dashed bg-white p-2 transition ${
                  space.overflow ? 'border-red-400' : rowDisabled ? 'border-brand-silver-200' : 'border-brand-silver-400'
                } ${rowDisabled ? 'opacity-50' : ''}`}
              >
                <InsertSlot id={`slot::${row}::0`} disabled={rowDisabled} />
                {rowModules.map((m, i) => (
                  <Fragment key={m.instanceId}>
                    <PlacedModuleBox
                      m={m}
                      i={i}
                      rowLength={rowModules.length}
                      scale={scale}
                      onReorder={reorderModules}
                      onRemove={removeModule}
                    />
                    <InsertSlot id={`slot::${row}::${i + 1}`} disabled={rowDisabled} />
                  </Fragment>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
