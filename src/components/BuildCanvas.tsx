import { useEffect, useRef, useState } from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { useConfiguratorStore } from '../store/configuratorStore';
import { formatBRL } from '../api/parseAttributes';
import { ModuleSchematic } from './ModuleSchematic';
import { ModulePhoto, hasModulePhoto } from './ModulePhoto';
import { SinkFixture } from './SinkFixture';
import { getFinishSwatch } from '../utils/finishSwatches';
import { getHandleColor } from '../utils/handleColors';
import type { PlacedModule, SinkFixture as SinkFixtureData, FridgeFixture as FridgeFixtureData, StoveFixture as StoveFixtureData } from '../types/composition';
import { getCountertopRatio } from '../utils/bands';
import { FRIDGE_PHOTO } from '../utils/fridge';
import { STOVE_PHOTO } from '../utils/stove';

/**
 * Pia arrastável -- só na horizontal (encostada na linha da bancada,
 * `top` fixo), a pessoa arrasta pra qualquer ponto ao longo do balcão (ver
 * `moveSink`/`computeSinkX` em `App.tsx`/`configuratorStore.ts`). Não
 * colide com módulos, é só um desenho por cima (ver `SinkFixture.tsx`).
 *
 * z-index: em repouso a pia fica em `z-0` (abaixo dos módulos colocados,
 * que ficam em `z-10`/`z-20`/`z-30` conforme o estado) -- se um módulo for
 * arrastado pra cima da pia, o módulo tem que aparecer NA FRENTE, nunca a
 * pia por cima do módulo (bug relatado pelo cliente). Só durante o
 * arrasto da própria pia ela sobe pra `z-30`, pra ficar visível acima de
 * tudo enquanto está sendo posicionada.
 */
function DraggableSink({ sink, scale, canvasHeight, counterRatio }: { sink: SinkFixtureData; scale: number; canvasHeight: number; counterRatio: number }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: 'sink',
    data: { type: 'sink' },
  });
  const sizePx = sink.widthCm * scale;
  const topPx = canvasHeight * counterRatio - sizePx * 0.42;

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{ left: sink.offsetXCm * scale, top: topPx, width: sizePx, height: sizePx * 0.6 }}
      className={`absolute z-0 touch-none cursor-grab transition active:cursor-grabbing ${
        isDragging ? 'z-30 opacity-60' : ''
      }`}
      title="Arraste para posicionar a pia"
    >
      <SinkFixture className="h-full w-full drop-shadow-md" />
    </div>
  );
}

/**
 * Geladeira arrastável -- elemento SÓ VISUAL/referência (não é produto
 * vendável, não tem preço, não colide com os módulos, ver `FridgeFixture`
 * em `types/composition.ts`), mesma ideia da `DraggableSink`: só se move na
 * horizontal, sempre encostada no chão (`topPx` fixo pela altura real da
 * geladeira em cm x escala). Renderiza uma FOTO (não um SVG desenhado
 * como a pia), recortada do catálogo do cliente em `public/modules/geladeira.jpg`.
 */
function DraggableFridge({
  fridge,
  scale,
  canvasHeight,
}: {
  fridge: FridgeFixtureData;
  scale: number;
  canvasHeight: number;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: 'fridge',
    data: { type: 'fridge' },
  });
  const widthPx = fridge.widthCm * scale;
  const heightPx = fridge.heightCm * scale;
  const topPx = canvasHeight - heightPx;

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{ left: fridge.offsetXCm * scale, top: topPx, width: widthPx, height: heightPx }}
      className={`absolute z-0 touch-none cursor-grab transition active:cursor-grabbing ${
        isDragging ? 'z-30 opacity-60' : ''
      }`}
      title="Arraste para posicionar a geladeira (referência visual)"
    >
      <img src={FRIDGE_PHOTO} alt="Geladeira (referência)" className="h-full w-full object-fill drop-shadow-md" />
    </div>
  );
}

/**
 * Fogão arrastável -- elemento SÓ VISUAL/referência (igual `DraggableFridge`):
 * só se move na horizontal, sempre encostado no chão. Renderiza a FOTO em
 * `public/modules/fogao.jpg`.
 */
function DraggableStove({
  stove,
  scale,
  canvasHeight,
}: {
  stove: StoveFixtureData;
  scale: number;
  canvasHeight: number;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: 'stove',
    data: { type: 'stove' },
  });
  const widthPx = stove.widthCm * scale;
  const heightPx = stove.heightCm * scale;
  const topPx = canvasHeight - heightPx;

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{ left: stove.offsetXCm * scale, top: topPx, width: widthPx, height: heightPx }}
      className={`absolute z-0 touch-none cursor-grab transition active:cursor-grabbing ${
        isDragging ? 'z-30 opacity-60' : ''
      }`}
      title="Arraste para posicionar o fogão (referência visual)"
    >
      <img src={STOVE_PHOTO} alt="Fogão (referência)" className="h-full w-full object-fill drop-shadow-md" />
    </div>
  );
}

/**
 * Passo (em cm) das marcações da régua — quanto maior o ambiente, mais
 * espaçadas as marcas, pra não virar uma sopa de números.
 */
function rulerStep(totalCm: number): number {
  if (totalCm <= 200) return 25;
  if (totalCm <= 400) return 50;
  return 100;
}

function rulerTicks(totalCm: number): number[] {
  const step = rulerStep(totalCm);
  const ticks: number[] = [];
  for (let cm = 0; cm <= totalCm; cm += step) ticks.push(cm);
  if (ticks[ticks.length - 1] !== totalCm) ticks.push(totalCm);
  return ticks;
}

/**
 * Régua horizontal (topo) com as medidas de largura que a pessoa configurou
 * na tela de entrada — mesma escala (`scale`) usada pra posicionar os
 * módulos, então as marcas sempre batem com o quadriculado por baixo.
 */
function RulerHorizontal({ widthCm, scale }: { widthCm: number; scale: number }) {
  return (
    <div className="relative mb-1 h-4 select-none md:h-5" style={{ width: widthCm * scale }}>
      {rulerTicks(widthCm).map((cm) => (
        <div key={cm} className="absolute top-0 flex -translate-x-1/2 flex-col items-center" style={{ left: cm * scale }}>
          <span className="text-[8px] leading-none text-brand-silver-600 md:text-[9px]">{cm}</span>
          <div className="mt-0.5 h-1.5 w-px bg-brand-silver-400" />
        </div>
      ))}
    </div>
  );
}

/**
 * Régua vertical (lateral) com as medidas de altura configuradas — mesma
 * ideia da horizontal, só que de cima pra baixo.
 */
function RulerVertical({ heightCm, scale }: { heightCm: number; scale: number }) {
  return (
    <div className="relative mr-1 w-6 shrink-0 select-none md:w-7" style={{ height: heightCm * scale }}>
      {rulerTicks(heightCm).map((cm) => (
        <div key={cm} className="absolute right-0 flex -translate-y-1/2 items-center gap-0.5" style={{ top: cm * scale }}>
          <span className="text-[8px] leading-none text-brand-silver-600 md:text-[9px]">{cm}</span>
          <div className="h-px w-1.5 bg-brand-silver-400" />
        </div>
      ))}
    </div>
  );
}

/**
 * Linhas de cota (estilo CAD/planta técnica, referência que o cliente
 * mandou) mostrando a distância do módulo sendo arrastado até as paredes
 * mais próximas (esquerda/direita/topo/base) em tempo real, igual um
 * software de projeto 3D. Só aparece durante o arrasto (`dragPreview`).
 */
function DragDimensionLines({
  preview,
  roomWidthCm,
  roomHeightCm,
  scale,
}: {
  preview: { x: number; y: number; widthCm: number; heightCm: number };
  roomWidthCm: number;
  roomHeightCm: number;
  scale: number;
}) {
  const leftCm = Math.max(0, preview.x);
  const rightCm = Math.max(0, roomWidthCm - (preview.x + preview.widthCm));
  const topCm = Math.max(0, preview.y);
  const bottomCm = Math.max(0, roomHeightCm - (preview.y + preview.heightCm));

  const midY = (preview.y + preview.heightCm / 2) * scale;
  const midX = (preview.x + preview.widthCm / 2) * scale;

  return (
    <>
      {leftCm > 0.5 && (
        <DimLineH x1={0} x2={preview.x * scale} y={midY} label={`${Math.round(leftCm)}cm`} />
      )}
      {rightCm > 0.5 && (
        <DimLineH
          x1={(preview.x + preview.widthCm) * scale}
          x2={roomWidthCm * scale}
          y={midY}
          label={`${Math.round(rightCm)}cm`}
        />
      )}
      {topCm > 0.5 && (
        <DimLineV y1={0} y2={preview.y * scale} x={midX} label={`${Math.round(topCm)}cm`} />
      )}
      {bottomCm > 0.5 && (
        <DimLineV
          y1={(preview.y + preview.heightCm) * scale}
          y2={roomHeightCm * scale}
          x={midX}
          label={`${Math.round(bottomCm)}cm`}
        />
      )}
    </>
  );
}

function DimLineH({ x1, x2, y, label }: { x1: number; x2: number; y: number; label: string }) {
  return (
    <div className="pointer-events-none absolute z-30" style={{ left: x1, top: y - 8, width: Math.max(0, x2 - x1), height: 16 }}>
      <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-emerald-500/80" />
      <div className="absolute left-0 top-0 h-full w-px bg-emerald-500/80" />
      <div className="absolute right-0 top-0 h-full w-px bg-emerald-500/80" />
      <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-[140%] whitespace-nowrap rounded bg-white/90 px-1 text-[9px] font-semibold text-emerald-700 shadow-sm">
        {label}
      </span>
    </div>
  );
}

function DimLineV({ y1, y2, x, label }: { y1: number; y2: number; x: number; label: string }) {
  return (
    <div className="pointer-events-none absolute z-30" style={{ top: y1, left: x - 8, height: Math.max(0, y2 - y1), width: 16 }}>
      <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-emerald-500/80" />
      <div className="absolute left-0 top-0 h-px w-full bg-emerald-500/80" />
      <div className="absolute bottom-0 left-0 h-px w-full bg-emerald-500/80" />
      <span className="absolute left-1/2 top-1/2 -translate-y-1/2 translate-x-2 whitespace-nowrap rounded bg-white/90 px-1 text-[9px] font-semibold text-emerald-700 shadow-sm">
        {label}
      </span>
    </div>
  );
}

const CANVAS_MAX_PX = 1600;
/** Altura mínima/máxima do quadrante em px, só pra não ficar minúsculo ou gigante em ambientes muito baixos/altos. */

/** ID único do quadrante inteiro — não existem mais fileiras separadas, é UM só droppable pra parede toda. */
export const WALL_DROPPABLE_ID = 'wall';

interface PlacedModuleBoxProps {
  m: PlacedModule;
  scale: number;
  finish: string | null;
    handle: string | null;
  finishImageUrl: string | null;
  handleColor: { fill: string; stroke: string } | null;
  selected: boolean;
  onSelect: (instanceId: string) => void;
  onRemove: (instanceId: string) => void;
  onRotate: (instanceId: string, deltaDeg: number) => void;
}

/** Passo de cada toque no botão de girar — 8 posições ao redor do círculo (0°, 45°, 90°...) dão liberdade de ângulo sem precisar de um gesto de arrastar separado (que conflitaria com o arrasto de reposicionar já existente). */
const ROTATE_STEP_DEG = 45;

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
 * contâiner externo (que tem o `ref` do drag) com overflow visível só pra
 * essas duas tirinhas decorativas conseguirem "vazar" por cima/pela direita.
 *
 * Seleção com barra de ações flutuante (pedido do cliente, referência de um
 * editor 3D com ícones circulares ao redor do objeto selecionado): em vez de
 * botõezinhos fixos sempre no canto do módulo, um TOQUE no módulo o
 * seleciona (`onSelect`) e abre uma barrinha flutuante logo ACIMA dele com
 * as ações (girar, remover) — mais parecido com editor de verdade, e não
 * polui a parede quando nada está selecionado. Tocar em outro lugar do
 * quadrante (`BuildCanvas` > clique no fundo) fecha a barra.
 */
function PlacedModuleBox({
  m,
  scale,
  finish,
    handle,
  finishImageUrl,
  handleColor,
  selected,
  onSelect,
  onRemove,
  onRotate,
}: PlacedModuleBoxProps) {
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
      onClick={(e) => {
        e.stopPropagation();
        onSelect(m.instanceId);
      }}
      style={{
        left: m.offsetXCm * scale,
        top: m.offsetYCm * scale,
        width: m.widthCm * scale,
        height: m.heightCm * scale,
      }}
      className={`group absolute z-10 ring-1 transition ${
        isDragging
          ? 'z-30 opacity-30 ring-2 ring-brand-navy-400'
          : selected
            ? 'z-20 ring-2 ring-brand-navy-500'
            : 'ring-black/10'
      }`}
    >
      <div className="relative h-full w-full overflow-hidden">
        <div
          {...listeners}
          {...attributes}
          style={{ transform: `rotate(${m.rotationDeg}deg)` }}
          className="relative h-full w-full touch-none cursor-grab transition-transform active:cursor-grabbing"
        >
          {hasPhoto ? (
                        <ModulePhoto name={m.moduleName} finish={finish} handle={handle} objectFit="cover" className="absolute inset-0 h-full w-full" />
          ) : (
            <ModuleSchematic
              name={m.moduleName}
              finishImageUrl={finishImageUrl}
              handleColor={handleColor}
              className="absolute inset-0 h-full w-full"
            />
          )}

          <div
            className="pointer-events-none absolute inset-0 flex flex-col items-center justify-end gap-0.5 px-1 pb-1 text-center opacity-0 transition-opacity group-hover:opacity-100 group-active:opacity-100"
            style={{ backgroundImage: 'linear-gradient(180deg, rgba(26,63,97,0) 50%, rgba(26,63,97,0.9) 100%)' }}
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
      {selected && (
        <div
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          className="absolute left-1/2 top-0 z-30 flex -translate-x-1/2 -translate-y-[calc(100%+8px)] items-center gap-1 rounded-full bg-white p-1 shadow-lg ring-1 ring-black/10"
        >
          <button
            onClick={() => onRotate(m.instanceId, ROTATE_STEP_DEG)}
            className="flex h-8 w-8 items-center justify-center rounded-full text-base text-brand-navy-700 transition hover:bg-brand-navy-50"
            title="Girar módulo"
          >
            ↻
          </button>
          <span className="h-5 w-px bg-brand-silver-200" aria-hidden="true" />
          <button
            onClick={() => onRemove(m.instanceId)}
            className="flex h-8 w-8 items-center justify-center rounded-full text-base text-red-600 transition hover:bg-red-50"
            title="Remover"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}

export function BuildCanvas() {
  const room = useConfiguratorStore((s) => s.room);
  const modules = useConfiguratorStore((s) => s.modules);
  const sink = useConfiguratorStore((s) => s.sink);
  const fridge = useConfiguratorStore((s) => s.fridge);
  const stove = useConfiguratorStore((s) => s.stove);
  const removeModule = useConfiguratorStore((s) => s.removeModule);
  const rotateModule = useConfiguratorStore((s) => s.rotateModule);
  const dragPreview = useConfiguratorStore((s) => s.dragPreview);
  const finish = useConfiguratorStore((s) => s.finish);
  const finishImageUrl = getFinishSwatch(finish);
  const handle = useConfiguratorStore((s) => s.handle);
  const handleColor = getHandleColor(handle);

  const { setNodeRef } = useDroppable({ id: WALL_DROPPABLE_ID });

  const wrapperRef = useRef<HTMLDivElement>(null);
  const [canvasWidth, setCanvasWidth] = useState(CANVAS_MAX_PX);
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(null);
  const outerRef = useRef<HTMLDivElement>(null);
  const [availH, setAvailH] = useState(420);
  const [availW, setAvailW] = useState(760);

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

  // Mede a ALTURA realmente disponível pra montagem (o espaço que sobra
  // depois do painel de módulos e da barra de botões, ambos fixos). No
  // celular a montagem preenche exatamente esse espaço (ver `scale` abaixo),
  // ficando sempre a maior parte da tela sem depender de chutes de vh.
  useEffect(() => {
    const el = outerRef.current;
    if (!el) return;
    const obs = new ResizeObserver((entries) => {
      const h = entries[0]?.contentRect.height;
      if (h) setAvailH(h);
      const w = entries[0]?.contentRect.width;
      if (w) setAvailW(w);
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  if (!room) return null;

  // Escala base: preenche a LARGURA disponível (comportamento do desktop).
  const widthScale = canvasWidth / room.widthCm;
  // No celular (coluna estreita) a cozinha larga e baixa ficava numa faixa
  // curta, tomando pouca tela. Aqui a montagem passa a crescer pela ALTURA
  // (até preencher o espaço disponível) e, se ficar mais larga que o celular, rola pro lado.
  const isMobile = canvasWidth < 700;
  const targetBoxH = Math.max(180, availH - 64);
  const targetBoxHDesk = Math.max(260, availH - 88);
  const scale = isMobile
    ? Math.min(targetBoxH / room.heightCm, widthScale * 3)
    : Math.min((availW - 96) / room.widthCm, targetBoxHDesk / room.heightCm);
  const canvasHeight = Math.round(room.heightCm * scale);
  const canvasBoxWidth = Math.round(room.widthCm * scale);
  const counterRatio = getCountertopRatio(room);

  return (
    <div ref={outerRef} className="order-1 flex h-[48vh] shrink-0 overflow-hidden p-3 md:order-none md:h-auto md:flex-1 md:overflow-visible md:p-6">
      <div
        aria-hidden="true"
        className="hidden shrink-0 self-stretch rounded-l-lg md:block"
        style={{
          width: 26,
          backgroundImage: 'linear-gradient(100deg, #ded4bc 0%, #efe8d8 100%)',
          clipPath: 'polygon(0 6%, 100% 0, 100% 100%, 0 94%)',
        }}
      />
      <div className="min-w-0 flex-1 px-1 md:px-3">
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

      <div className="flex items-start md:justify-center">
        <RulerVertical heightCm={room.heightCm} scale={scale} />
        <div ref={wrapperRef} className="min-w-0 flex-1 overflow-x-auto md:flex-none">
          <RulerHorizontal widthCm={room.widthCm} scale={scale} />

      <div
        ref={setNodeRef}
        onClick={() => setSelectedInstanceId(null)}
        style={{
          width: canvasBoxWidth,
          height: canvasHeight,
          backgroundImage: 'linear-gradient(180deg, #fbf9f6 0%, #f4efe6 88%, #ece2cf 100%)',
        }}
        className="relative max-w-full overflow-hidden rounded-xl border border-brand-silver-200 md:rounded-lg md:border-2 md:border-dashed md:border-brand-silver-300"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              'linear-gradient(rgba(46,90,121,0.55) 1px, transparent 1px), linear-gradient(90deg, rgba(46,90,121,0.55) 1px, transparent 1px), linear-gradient(rgba(46,90,121,0.16) 1px, transparent 1px), linear-gradient(90deg, rgba(46,90,121,0.16) 1px, transparent 1px)',
            backgroundSize: `${50 * scale}px ${50 * scale}px, ${50 * scale}px ${50 * scale}px, ${10 * scale}px ${10 * scale}px, ${10 * scale}px ${10 * scale}px`,
            opacity: 0.12,
          }}
        />

        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0"
          style={{
            height: '1.5%',
            backgroundColor: '#e8e2d4',
            boxShadow: '0 2px 3px rgba(0,0,0,0.12)',
          }}
        />

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

        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0"
          style={{
            bottom: '7%',
            height: '2%',
            backgroundImage: 'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.28) 100%)',
          }}
        />

        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0"
          style={{
            top: `${Math.max(0, counterRatio * 100 - 10.6)}%`,
            height: '0.6%',
            backgroundImage: 'linear-gradient(180deg, rgba(255,214,140,0.55) 0%, rgba(255,214,140,0) 100%)',
          }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0"
          style={{
            top: `${Math.max(0, counterRatio * 100 - 10)}%`,
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
            top: `${counterRatio * 100}%`,
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
                        handle={handle}
            finishImageUrl={finishImageUrl}
            handleColor={handleColor}
            selected={selectedInstanceId === m.instanceId}
            onSelect={setSelectedInstanceId}
            onRemove={(instanceId) => {
              setSelectedInstanceId(null);
              removeModule(instanceId);
            }}
            onRotate={rotateModule}
          />
        ))}

        {dragPreview && (
          <>
            <div
              className="pointer-events-none absolute rounded-md border-2 border-dashed border-brand-navy-400 bg-brand-navy-100/70"
              style={{
                left: dragPreview.x * scale,
                top: dragPreview.y * scale,
                width: dragPreview.widthCm * scale,
                height: dragPreview.heightCm * scale,
              }}
            />
            <DragDimensionLines
              preview={dragPreview}
              roomWidthCm={room.widthCm}
              roomHeightCm={room.heightCm}
              scale={scale}
            />
          </>
        )}

        {sink && <DraggableSink sink={sink} scale={scale} canvasHeight={canvasHeight} counterRatio={counterRatio} />}
        {fridge && <DraggableFridge fridge={fridge} scale={scale} canvasHeight={canvasHeight} />}
        {stove && <DraggableStove stove={stove} scale={scale} canvasHeight={canvasHeight} />}
      </div>
        </div>
      </div>
      </div>

      <div
        aria-hidden="true"
        className="hidden shrink-0 self-stretch rounded-r-lg md:block"
        style={{
          width: 26,
          backgroundImage: 'linear-gradient(260deg, #ded4bc 0%, #efe8d8 100%)',
          clipPath: 'polygon(0 0, 100% 6%, 100% 94%, 0 100%)',
        }}
      />
    </div>
  );
}
