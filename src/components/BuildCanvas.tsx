import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useDraggable, useDroppable, useDndContext } from '@dnd-kit/core';
import { useConfiguratorStore } from '../store/configuratorStore';
import { checkSpace, mobileRowHeightPx } from '../utils/layout';
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

/**
 * Um módulo já colocado na parede — posição LIVRE dentro da fileira
 * (`left` vem direto de `m.offsetCm * scale`, não de uma sequência de
 * índices). Também é arrastável, pra reposicionar em qualquer X da própria
 * fileira sem precisar remover e adicionar de novo.
 */
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
      {/*
        No mobile só o X de remover fica visível (pequeno, no canto), pra
        não pesar o chip — as setas ←/→ continuam só no desktop, já que
        arrastar já cobre o reposicionamento livre. No desktop tudo some
        suavemente até passar o mouse por cima, igual antes.
      */}
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

interface RowBandProps {
  row: RowKey;
  rowModules: PlacedModule[];
  scale: number;
  disabled: boolean;
  overflow: boolean;
  overflowCm: number;
  isFirst: boolean;
  onReorder: (instanceId: string, direction: 'left' | 'right') => void;
  onRemove: (instanceId: string) => void;
}

/**
 * Uma "banda" horizontal dentro do quadrante único da parede — cada fileira
 * (superior, inferior, torre...) continua sendo seu próprio droppable
 * (`row::<fileira>`) e sua própria checagem de largura, porque isso é a
 * mesma lógica física que o time de montagem usa depois (não muda). O que
 * muda é o visual: a banda NÃO tem fundo/borda própria — ela é só uma faixa
 * transparente dentro do quadrante branco compartilhado (`BuildCanvas`), com
 * uma linha bem sutil separando de sua vizinha, pra parecer UMA parede só
 * sendo vista de frente, com o rótulo da fileira discretamente no canto.
 */
function RowBand({ row, rowModules, scale, disabled, overflow, overflowCm, isFirst, onReorder, onRemove }: RowBandProps) {
  const { setNodeRef } = useDroppable({ id: `row::${row}`, disabled });
  const dragPreview = useConfiguratorStore((s) => s.dragPreview);
  const showPreview = dragPreview?.row === row;

  return (
    <div
      ref={setNodeRef}
      className={`relative h-[var(--row-h)] w-full transition md:h-40 ${isFirst ? '' : 'border-t border-brand-silver-100'} ${
        overflow ? 'bg-red-50/60' : disabled ? 'opacity-40' : ''
      }`}
    >
      {/* Rótulo discreto da fileira — sem caixa, sem fundo, só uma etiqueta pequena no canto pra orientar sem parecer um campo separado. */}
      <span className="pointer-events-none absolute left-1.5 top-1 text-[8px] font-semibold uppercase tracking-wide text-brand-silver-400 md:left-2 md:top-1.5 md:text-[10px]">
        {ROW_LABELS[row]}
      </span>

      {overflow && (
        <span className="pointer-events-none absolute right-1.5 top-1 text-[8px] font-medium text-red-500 md:right-2 md:top-1.5 md:text-[10px]">
          passou {Math.abs(overflowCm)}cm
        </span>
      )}

      {rowModules.map((m) => (
        <PlacedModuleBox key={m.instanceId} m={m} scale={scale} onReorder={onReorder} onRemove={onRemove} />
      ))}

      {/*
        Indicador "fantasma" — mostra ENQUANTO ainda está arrastando (antes
        de soltar) exatamente onde o módulo vai encaixar, pra dar a sensação
        de desenhar a parede ao vivo em vez de só ver o resultado depois de
        soltar (ver `App.tsx` > `handleDragMove` e `dragPreview` na store).
      */}
      {showPreview && dragPreview && (
        <div
          className="pointer-events-none absolute inset-y-0 rounded-md border-2 border-dashed border-brand-navy-400 bg-brand-navy-100/70"
          style={{ left: dragPreview.offsetCm * scale, width: dragPreview.widthCm * scale }}
        />
      )}
    </div>
  );
}

/**
 * Área de montagem: agora é UM ÚNICO quadrante branco representando a
 * parede inteira (largura x altura do ambiente, à escala) — como se a
 * pessoa estivesse de frente pra parede decidindo onde vai cada módulo, em
 * vez de várias caixas separadas por fileira.
 *
 * Por baixo do capô a fileira de cada módulo continua sendo a do produto
 * (decidida pelo nome, ver `utils/rows.ts`), e a checagem de largura
 * continua fileira por fileira — isso não muda, é a mesma lógica que o
 * time de montagem usa pra ler o projeto depois. O que mudou é só o
 * visual: em vez de uma caixa com borda pra cada fileira, agora é uma
 * banda transparente dentro do MESMO quadrante (ver `RowBand` acima),
 * então visualmente parece uma parede só, com os módulos entrando livres
 * em X dentro da banda certa (sem precisar encaixar numa sequência).
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

  // Fileira que está sendo arrastada agora (se houver) — usado pra apagar
  // visualmente as OUTRAS bandas, já que um módulo só pode entrar na
  // fileira do próprio produto (evita soltar um "Superior" na "Inferior").
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

  // Altura (px) de cada banda, proporcional à altura real do ambiente — ver
  // `utils/layout.ts`. Vira uma CSS custom property porque a classe
  // Tailwind (`h-[var(--row-h)]`) precisa ser um texto estático no código
  // pra ser detectada em build; só o VALOR muda dinamicamente.
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
          Arraste um módulo até a parede, em qualquer ponto, pra começar a montar.
        </p>
      )}

      {/*
        UM ÚNICO quadrante — a parede inteira. Cada fileira vira uma banda
        SEM fundo/borda própria (ver `RowBand`), separadas só por uma linha
        bem sutil, dentro deste container branco compartilhado.
      */}
      <div
        style={{ maxWidth: canvasWidth, ...rowHeightVar }}
        className="relative w-full overflow-hidden rounded-xl border border-brand-silver-200 bg-white md:rounded-lg md:border-2 md:border-dashed md:border-brand-silver-300"
      >
        {modules.length === 0 && (
          <p className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center text-center text-[10px] text-brand-silver-400 md:text-xs">
            + arraste aqui, em qualquer ponto da parede
          </p>
        )}

        {rows.map(({ row, modules: rowModules }, index) => {
          const space = checkSpace(room, rowModules);
          const rowDisabled = draggingRow !== null && draggingRow !== row;
          return (
            <RowBand
              key={row}
              row={row}
              rowModules={rowModules}
              scale={scale}
              disabled={rowDisabled}
              overflow={space.overflow}
              overflowCm={space.remainingCm}
              isFirst={index === 0}
              onReorder={reorderModules}
              onRemove={removeModule}
            />
          );
        })}
      </div>
    </div>
  );
}
