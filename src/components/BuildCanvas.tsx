import { useEffect, useRef, useState } from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { useConfiguratorStore } from '../store/configuratorStore';
import { formatBRL } from '../api/parseAttributes';
import { ModuleSchematic } from './ModuleSchematic';
import { getFinishSwatch } from '../utils/finishSwatches';
import { getHandleColor } from '../utils/handleColors';
import type { PlacedModule } from '../types/composition';

const CANVAS_MAX_PX = 760;
/** Altura mínima/máxima do quadrante em px, só pra não ficar minúsculo ou gigante em ambientes muito baixos/altos. */
const CANVAS_MIN_H_PX = 220;
const CANVAS_MAX_H_PX = 560;

/** ID único do quadrante inteiro — não existem mais fileiras separadas, é UM só droppable pra parede toda. */
export const WALL_DROPPABLE_ID = 'wall';

interface PlacedModuleBoxProps {
  m: PlacedModule;
  scale: number;
  finishImageUrl: string | null;
  handleColor: { fill: string; stroke: string } | null;
  onRemove: (instanceId: string) => void;
}

/**
 * Um módulo já colocado na parede — posição TOTALMENTE livre em X e Y
 * (`left`/`top` vêm direto de `m.offsetXCm/offsetYCm * scale`). Também é
 * arrastável, pra reposicionar em qualquer ponto do quadrante sem precisar
 * remover e adicionar de novo — como mover uma peça de lego pelo tabuleiro.
 */
function PlacedModuleBox({ m, scale, finishImageUrl, handleColor, onRemove }: PlacedModuleBoxProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `placed-${m.instanceId}`,
    data: { type: 'placed-module', instanceId: m.instanceId, widthCm: m.widthCm, heightCm: m.heightCm },
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        left: m.offsetXCm * scale,
        top: m.offsetYCm * scale,
        width: m.widthCm * scale,
        height: m.heightCm * scale,
      }}
      className={`group absolute bg-brand-bg transition ${isDragging ? 'opacity-30' : ''}`}
    >
      <div
        {...listeners}
        {...attributes}
        className="h-full w-full touch-none cursor-grab active:cursor-grabbing"
      >
        {/*
          Mobile: caixa com a foto do acabamento de fundo (ver
          `utils/finishSwatches.ts`) + nome/largura por cima — bate com o
          mockup de referência e cabe em módulos pequenos. Desktop: mantém
          o esquema em SVG (ver `ModuleSchematic.tsx`), agora colorido com a
          mesma foto via `finishImageUrl`.
        */}
        <div
          style={
            finishImageUrl
              ? {
                  backgroundImage: `linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.75) 100%), url(${finishImageUrl})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }
              : undefined
          }
          className="flex h-full w-full flex-col items-center justify-center gap-0.5 overflow-hidden rounded-md border border-brand-silver-300 bg-white px-1 text-center md:hidden"
        >
          <span className="line-clamp-2 text-[10px] font-medium leading-tight text-brand-navy-800">
            {m.moduleName}
          </span>
          <span className="text-[9px] text-brand-silver-600">{m.widthCm}cm</span>
        </div>
        <div className="hidden h-full w-full overflow-hidden rounded-md border border-brand-silver-300 bg-white md:block">
          <ModuleSchematic
            name={m.moduleName}
            finishImageUrl={finishImageUrl}
            handleColor={handleColor}
            className="h-2/3 w-full"
          />
          <div className="px-1 text-center">
            <p className="truncate text-[11px] text-brand-silver-700">{m.moduleName}</p>
            <p className="text-[11px] font-medium text-brand-navy-800">{m.widthCm}cm</p>
            <p className="truncate text-[11px] text-brand-silver-600">
              {formatBRL(m.resolvedPriceCents ?? m.basePriceCents)}
            </p>
          </div>
        </div>
      </div>
      <button
        onPointerDown={(e) => e.stopPropagation()}
        onClick={() => onRemove(m.instanceId)}
        className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-white/95 text-[9px] text-red-600 opacity-100 shadow transition-opacity md:right-1 md:top-1 md:h-6 md:w-6 md:text-sm md:opacity-0 md:group-hover:opacity-100"
        title="Remover"
      >
        ✕
      </button>
    </div>
  );
}

/**
 * Área de montagem: UM ÚNICO quadrante branco representando a parede
 * inteira (largura x altura do ambiente, à escala) — a pessoa está de
 * frente pra parede e decide livremente onde cada módulo entra, em
 * qualquer ponto, começando por onde quiser (canto, meio, em cima, embaixo,
 * do lado), sem nenhuma fileira ou categoria pré-definida. É o mesmo
 * princípio de um planejador de planta 2D: arrasta a peça e solta onde
 * quiser, só não pode sair do espaço nem ficar em cima de outra peça (ver
 * `utils/placement.ts`).
 */
export function BuildCanvas() {
  const room = useConfiguratorStore((s) => s.room);
  const modules = useConfiguratorStore((s) => s.modules);
  const removeModule = useConfiguratorStore((s) => s.removeModule);
  const dragPreview = useConfiguratorStore((s) => s.dragPreview);
  const finish = useConfiguratorStore((s) => s.finish);
  const finishImageUrl = getFinishSwatch(finish);
  const handle = useConfiguratorStore((s) => s.handle);
  const handleColor = getHandleColor(handle);

  const { setNodeRef } = useDroppable({ id: WALL_DROPPABLE_ID });

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
  // A altura do quadrante usa a MESMA escala da largura, pra não distorcer
  // a proporção real do espaço — é literalmente "ver a parede de frente".
  const canvasHeight = Math.round(Math.min(CANVAS_MAX_H_PX, Math.max(CANVAS_MIN_H_PX, room.heightCm * scale)));

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
          Arraste um módulo até a parede e solte onde quiser — em qualquer ponto, do jeito que preferir montar.
        </p>
      )}

      {/*
        UM ÚNICO quadrante — a parede inteira, sem divisão nenhuma. O
        droppable cobre o quadrante todo (`WALL_DROPPABLE_ID`); o ponto exato
        (X, Y) de onde soltar é calculado em `App.tsx` a partir do retângulo
        do drag.
      */}
      <div
        ref={setNodeRef}
        style={{ maxWidth: canvasWidth, height: canvasHeight }}
        className="relative w-full overflow-hidden rounded-xl border border-brand-silver-200 bg-white md:rounded-lg md:border-2 md:border-dashed md:border-brand-silver-300"
      >
        {modules.length === 0 && (
          <p className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center text-center text-[10px] text-brand-silver-400 md:text-xs">
            + arraste aqui, em qualquer lugar da parede
          </p>
        )}

        {modules.map((m) => (
          <PlacedModuleBox
            key={m.instanceId}
            m={m}
            scale={scale}
            finishImageUrl={finishImageUrl}
            handleColor={handleColor}
            onRemove={removeModule}
          />
        ))}

        {/*
          Indicador "fantasma" — mostra ENQUANTO ainda está arrastando (antes
          de soltar) exatamente onde o módulo vai encaixar (X e Y), pra dar a
          sensação de desenhar a parede ao vivo em vez de só ver o resultado
          depois de soltar (ver `App.tsx` > `handleDragMove` e `dragPreview`
          na store).
        */}
        {dragPreview && (
          <div
            className="pointer-events-none absolute rounded-md border-2 border-dashed border-brand-navy-400 bg-brand-navy-100/70"
            style={{
              left: dragPreview.x * scale,
              top: dragPreview.y * scale,
              width: dragPreview.widthCm * scale,
              height: dragPreview.heightCm * scale,
            }}
          />
        )}
      </div>
    </div>
  );
}
