import { useEffect, useRef, useState } from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { useConfiguratorStore } from '../store/configuratorStore';
import { formatBRL } from '../api/parseAttributes';
import { ModuleSchematic } from './ModuleSchematic';
import { ModulePhoto, hasModulePhoto } from './ModulePhoto';
import { IsoBevel } from './IsoBevel';
import { getFinishSwatch } from '../utils/finishSwatches';
import { getHandleColor } from '../utils/handleColors';
import type { PlacedModule } from '../types/composition';
import { COUNTERTOP_RATIO } from '../utils/bands';

const CANVAS_MAX_PX = 760;
/** Altura mínima/máxima do quadrante em px, só pra não ficar minúsculo ou gigante em ambientes muito baixos/altos. */
const CANVAS_MIN_H_PX = 220;
const CANVAS_MAX_H_PX = 560;

/** ID único do quadrante inteiro — não existem mais fileiras separadas, é UM só droppable pra parede toda. */
export const WALL_DROPPABLE_ID = 'wall';

interface PlacedModuleBoxProps {
  m: PlacedModule;
  scale: number;
  finish: string | null;
  finishImageUrl: string | null;
  handleColor: { fill: string; stroke: string } | null;
  onRemove: (instanceId: string) => void;
}

/**
 * Um módulo já colocado na parede — posição TOTALMENTE livre em X e Y
 * (`left`/`top` vêm direto de `m.offsetXCm/offsetYCm * scale`). Também é
 * arrastável, pra reposicionar em qualquer ponto do quadrante sem precisar
 * remover e adicionar de novo — como mover uma peça de lego pelo tabuleiro.
 *
 * Visual "painel contínuo" (pedido do cliente, referência "Corte 01 |
 * Humanizado"): a foto real do módulo preenche a caixa INTEIRA, sem borda
 * branca nem cantos arredondados — os módulos ficam colados uns nos outros
 * como armários de verdade instalados lado a lado, em vez de "cards"
 * separados. Nome, largura e preço ficam escondidos por padrão e só
 * aparecem num overlay ao passar o mouse/tocar (igual o botão de remover já
 * funcionava), pra não poluir a parede.
 *
 * Cara de "caixa 3D" (pedido do cliente, referência "Modular Kitchen
 * Designer"): chanfro de topo+lateral via `IsoBevel` por cima do painel —
 * por isso o `overflow-hidden` que recorta a foto foi movido pro wrapper
 * INTERNO (`.relative.h-full...overflow-hidden` logo abaixo), deixando o
 * contêiner externo (que tem o `ref` do drag) com overflow visível só pra
 * essas duas tirinhas decorativas conseguirem "vazar" por cima/pela direita.
 */
function PlacedModuleBox({ m, scale, finish, finishImageUrl, handleColor, onRemove }: PlacedModuleBoxProps) {
  const hasPhoto = hasModulePhoto(m.moduleName);
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `placed-${m.instanceId}`,
    data: {
      type: 'placed-module',
      instanceId: m.instanceId,
      moduleName: m.moduleName,
      widthCm: m.widthCm,
      heightCm: m.heightCm,
    },
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
      className={`group absolute ring-1 ring-black/10 transition ${isDragging ? 'z-20 opacity-30 ring-2 ring-brand-navy-400' : ''}`}
    >
      <IsoBevel />
      <div className="relative h-full w-full overflow-hidden">
        <div
          {...listeners}
          {...attributes}
          className="relative h-full w-full touch-none cursor-grab active:cursor-grabbing"
        >
          {hasPhoto ? (
            <ModulePhoto name={m.moduleName} finish={finish} className="absolute inset-0 h-full w-full" />
          ) : (
            <ModuleSchematic
              name={m.moduleName}
              finishImageUrl={finishImageUrl}
              handleColor={handleColor}
              className="absolute inset-0 h-full w-full"
            />
          )}

          {/* Rótulo (nome + largura + preço) escondido por padrão, só aparece no hover/toque — mantém a parede limpa, igual a referência. */}
          <div
            className="pointer-events-none absolute inset-0 flex flex-col items-center justify-end gap-0.5 px-1 pb-1 text-center opacity-0 transition-opacity group-hover:opacity-100 group-active:opacity-100"
            style={{ backgroundImage: 'linear-gradient(180deg, rgba(15,30,45,0) 55%, rgba(10,20,32,0.75) 100%)' }}
          >
            <span className="line-clamp-2 text-[10px] font-medium leading-tight text-white drop-shadow-sm md:text-[11px]">
              {m.moduleName}
            </span>
            <span className="text-[9px] text-brand-silver-200 drop-shadow-sm md:text-[10px]">
              {m.widthCm}cm · {formatBRL(m.resolvedPriceCents ?? m.basePriceCents)}
            </span>
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
        style={{
          maxWidth: canvasWidth,
          height: canvasHeight,
          backgroundImage: 'linear-gradient(180deg, #fbf9f6 0%, #f4efe6 88%, #ece2cf 100%)',
        }}
        className="relative w-full overflow-hidden rounded-xl border border-brand-silver-200 md:rounded-lg md:border-2 md:border-dashed md:border-brand-silver-300"
      >
        {/*
          Rodateto/moldura de gesso no topo — friso fino com sombra, igual
          ao acabamento de forro na referência do cliente ("Corte 01 |
          Humanizado"). 100% decorativo.
        */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0"
          style={{
            height: '1.5%',
            backgroundColor: '#e8e2d4',
            boxShadow: '0 2px 3px rgba(0,0,0,0.12)',
          }}
        />

        {/*
          "Piso" decorativo — faixa de madeira no rodapé do quadrante, só
          pra dar contexto de parede+chão de cozinha de verdade (pedido do
          cliente, referência tipo planta humanizada do Revit), em vez do
          retângulo branco vazio de antes. 100% visual via CSS (sem imagem),
          não mexe na posição livre dos módulos — o cliente escolheu manter
          o arrasto livre em X/Y, só queria o CONTEXTO visual.
        */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0"
          style={{
            height: '7%',
            backgroundImage:
              'repeating-linear-gradient(90deg, #c9a06d 0px, #c9a06d 26px, #bb9560 27px, #bb9560 28px), linear-gradient(180deg, rgba(0,0,0,0.1), rgba(0,0,0,0))',
            boxShadow: 'inset 0 3px 4px rgba(0,0,0,0.14)',
          }}
        />

        {/*
          Sombra do rodapé/rodabase dos módulos de chão — friso escuro bem
          fino logo acima do piso, dando a profundidade do "recuo" da base
          dos armários (igual ao sombreado escuro na base dos módulos verdes
          da referência). 100% decorativo.
        */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0"
          style={{
            bottom: '7%',
            height: '2%',
            backgroundImage: 'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.28) 100%)',
          }}
        />

        {/*
          Backsplash + bancada — a linha divisória entre a faixa de módulos
          de PAREDE (em cima) e a faixa de módulos de CHÃO (embaixo, ver
          `utils/bands.ts` > `COUNTERTOP_RATIO`), desenhada como um corte
          humanizado de verdade: um friso de azulejo sutil logo acima da
          bancada, e a própria bancada como uma faixa mais escura com
          sombra, igual um tampo de granito/quartzo visto de frente. 100%
          decorativo — não interfere na posição livre dos módulos, só dá o
          contexto visual da referência que o cliente mandou.
        */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0"
          style={{
            top: `${Math.max(0, COUNTERTOP_RATIO * 100 - 10.6)}%`,
            height: '0.6%',
            backgroundImage: 'linear-gradient(180deg, rgba(255,214,140,0.55) 0%, rgba(255,214,140,0) 100%)',
          }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0"
          style={{
            top: `${Math.max(0, COUNTERTOP_RATIO * 100 - 10)}%`,
            height: '10%',
            backgroundImage:
              'repeating-linear-gradient(90deg, rgba(255,255,255,0.5) 0px, rgba(255,255,255,0.5) 1px, transparent 1px, transparent 34px), repeating-linear-gradient(0deg, rgba(255,255,255,0.5) 0px, rgba(255,255,255,0.5) 1px, transparent 1px, transparent 34px)',
            backgroundColor: '#efe9dd',
          }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0"
          style={{
            top: `${COUNTERTOP_RATIO * 100}%`,
            height: '3%',
            backgroundImage: 'linear-gradient(180deg, #4a5a63 0%, #33414a 100%)',
            boxShadow: '0 2px 4px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.15)',
          }}
        />

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
            finish={finish}
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
