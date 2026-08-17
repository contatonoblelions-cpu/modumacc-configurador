import { Fragment, useEffect, useRef, useState, type CSSProperties } from 'react';
import { useDraggable, useDroppable, useDndContext } from '@dnd-kit/core';
import { useConfiguratorStore } from '../store/configuratorStore';
import { checkSpace, formatMeters, mobileRowHeightPx } from '../utils/layout';
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
function InsertSlot({
  id,
  disabled,
  trailingLabel,
}: {
  id: string;
  disabled: boolean;
  /**
   * Só o último slot de cada fileira recebe isso — no mobile ele vira uma
   * caixa tracejada "+ arraste aqui" (em vez da barrinha fina normal),
   * igual ao mockup, pra deixar claro onde soltar. No desktop continua
   * sendo a barrinha discreta de sempre.
   */
  trailingLabel?: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id, disabled });

  // No mobile, o último slot de cada fileira vira uma caixa tracejada
  // "+ arraste aqui" (igual ao mockup) em vez da barrinha fina — mais fácil
  // de mirar no toque e deixa claro onde soltar. No desktop continua sendo
  // a barrinha discreta de sempre (mesmo elemento, só muda via classes
  // responsivas, já que o `useDroppable` só aceita um nó por slot).
  if (trailingLabel) {
    const desktopWidth = isOver ? 'md:w-9' : disabled ? 'md:w-1' : 'md:w-2.5';
    const tone = isOver
      ? 'border-brand-navy-400 bg-brand-navy-100 text-brand-navy-700'
      : disabled
        ? 'border-brand-silver-200 text-brand-silver-300'
        : 'border-brand-silver-400 text-brand-silver-500';
    return (
      <div
        ref={setNodeRef}
        className={`flex w-11 shrink-0 items-center justify-center self-stretch rounded-md border border-dashed text-center text-[9px] leading-tight transition-all md:h-auto md:rounded md:border-0 ${desktopWidth} ${tone}`}
      >
        <span className="md:hidden">+ arraste aqui</span>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      className={`self-stretch shrink-0 rounded transition-all ${
        isOver ? 'w-10 bg-brand-navy-100' : disabled ? 'w-1' : 'w-3.5'
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
      className={`group relative h-full min-w-14 shrink-0 bg-brand-bg transition md:h-auto md:min-w-0 ${isDragging ? 'opacity-30' : ''}`}
    >
      <div
        {...listeners}
        {...attributes}
        className="h-full touch-none cursor-grab active:cursor-grabbing md:h-auto"
      >
        {/*
          Mobile: caixa de texto simples (nome + largura), sem desenho — bate
          com o mockup de referência e cabe na fileira compacta. Desktop:
          mantém o esquema em SVG (ver `ModuleSchematic.tsx`), sem mudança.
        */}
        <div className="flex h-full flex-col items-center justify-center gap-0.5 rounded-md border border-brand-silver-300 bg-white px-1 text-center md:hidden">
          <span className="line-clamp-2 text-[10px] font-medium leading-tight text-brand-navy-800">
            {m.moduleName}
          </span>
          <span className="text-[9px] text-brand-silver-600">{m.widthCm}cm</span>
        </div>
        <div className="hidden md:block">
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
      {/*
        No mobile só o X de remover fica visível (pequeno, no canto), pra
        não pesar o chip — as setas ←/→ continuam só no desktop, já que
        arrastar já cobre a reordenação. No desktop tudo some suavemente até
        passar o mouse por cima, igual antes.
      */}
      <div className="absolute right-0.5 top-0.5 flex gap-1 opacity-100 transition-opacity md:right-1 md:top-1 md:opacity-0 md:group-hover:opacity-100">
        {i > 0 && (
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => onReorder(m.instanceId, 'left')}
            className="hidden h-7 w-7 items-center justify-center rounded bg-white/95 text-sm shadow md:flex"
            title="Mover pra esquerda"
          >
            ←
          </button>
        )}
        {i < rowLength - 1 && (
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => onReorder(m.instanceId, 'right')}
            className="hidden h-7 w-7 items-center justify-center rounded bg-white/95 text-sm shadow md:flex"
            title="Mover pra direita"
          >
            →
          </button>
        )}
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

  // Altura (px) de cada fileira no mobile, proporcional à altura real do
  // ambiente — ver `utils/layout.ts`. Vira uma CSS custom property porque a
  // classe Tailwind (`h-[var(--row-h)]`) precisa ser um texto estático no
  // código pra ser detectada em build; só o VALOR muda dinamicamente.
  const rowHeightVar = { ['--row-h' as string]: `${mobileRowHeightPx(room.heightCm)}px` } as CSSProperties;

  return (
    <div
      ref={wrapperRef}
      className="order-1 flex-1 overflow-auto p-3 md:order-none md:p-6"
    >
      {/*
        No mobile essa é a "área de montagem" fixa em cima, em escala real —
        a medida do ambiente já aparece no Header.tsx no mobile, então aqui
        só repete no desktop (pra não gastar uma linha à toa no celular).
      */}
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
          Arraste um módulo até a fileira certa (ou toque nele) pra começar a montar sua parede.
        </p>
      )}

      {/*
        No mobile, um único cartão compacto envolve todas as fileiras (sem
        rótulo/medida por fileira — só o essencial pra economizar altura,
        ver aviso de estouro abaixo). No desktop esse wrapper é transparente
        e cada fileira mantém sua própria caixa tracejada, igual antes.
      */}
      <div className="rounded-xl border border-brand-silver-300 bg-white p-2 md:rounded-none md:border-0 md:bg-transparent md:p-0">
        <div className="flex flex-col gap-1 md:gap-4">
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

                <div
                  style={{ ...rowHeightVar, maxWidth: canvasWidth }}
                  className={`flex h-[var(--row-h)] w-full items-stretch gap-1 overflow-hidden p-0 transition md:h-auto md:min-h-32 md:items-end md:gap-0 md:overflow-visible md:rounded-lg md:border-2 md:border-dashed md:bg-white md:p-2 ${
                    space.overflow
                      ? 'md:border-red-400'
                      : rowDisabled
                        ? 'md:border-brand-silver-200'
                        : 'md:border-brand-silver-400'
                  } ${rowDisabled ? 'opacity-50' : ''}`}
                >
                  <InsertSlot
                    id={`slot::${row}::0`}
                    disabled={rowDisabled}
                    trailingLabel={rowModules.length === 0}
                  />
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
                      <InsertSlot
                        id={`slot::${row}::${i + 1}`}
                        disabled={rowDisabled}
                        trailingLabel={i === rowModules.length - 1}
                      />
                    </Fragment>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
