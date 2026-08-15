import { useEffect, useRef, useState } from 'react';
import { useConfiguratorStore } from '../store/configuratorStore';
import { checkSpace } from '../utils/layout';
import { groupByRow, ROW_LABELS } from '../utils/rows';
import { formatBRL } from '../api/parseAttributes';

const CANVAS_MAX_PX = 760;

/**
 * Área de montagem: uma "parede" em 2D dividida em fileiras (superior,
 * inferior, torre/coluna...) — a mesma lógica que o time de montagem usa
 * pra ler o projeto depois (módulos superiores numa linha, inferiores
 * embaixo, lado a lado dentro de cada fileira).
 *
 * Cada módulo entra sozinho na fileira certa (decidida pelo nome do
 * produto, ver `utils/rows.ts`) ao tocar em "+ Adicionar" no painel — não
 * existe mais arrastar-e-soltar (era frágil no toque do celular e confuso
 * pra montar uma parede com várias fileiras). Dentro da fileira, a ordem
 * lado a lado se ajusta com as setas ←/→.
 *
 * Cada fileira tem sua própria checagem de espaço contra a largura do
 * ambiente, porque cada fileira ocupa a parede inteira (ver
 * `utils/layout.ts` > `hasAnyRowOverflow`).
 */
export function BuildCanvas() {
  const room = useConfiguratorStore((s) => s.room);
  const modules = useConfiguratorStore((s) => s.modules);
  const removeModule = useConfiguratorStore((s) => s.removeModule);
  const reorderModules = useConfiguratorStore((s) => s.reorderModules);

  // Largura do canvas acompanha o espaço disponível na tela (celular, tablet,
  // desktop) em vez de ficar travada em 760px.
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
  const rows = groupByRow(modules);

  return (
    <div ref={wrapperRef} className="flex-1 overflow-auto p-4 md:p-6">
      <div className="mb-3 text-sm text-brand-silver-700">
        Espaço: {room.widthCm}cm × {room.heightCm}cm
      </div>

      {rows.length === 0 && (
        <div
          style={{ width: canvasWidth }}
          className="flex min-h-48 items-center justify-center rounded-lg border-2 border-dashed border-brand-silver-400 bg-white p-2"
        >
          <p className="m-auto px-2 text-center text-sm text-brand-silver-600">
            Toque em "+ Adicionar" num módulo do painel pra começar a montar sua parede.
          </p>
        </div>
      )}

      <div className="flex flex-col gap-4">
        {rows.map(({ row, modules: rowModules }) => {
          const space = checkSpace(room, rowModules);
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
                  space.overflow ? 'border-red-400' : 'border-brand-silver-400'
                }`}
              >
                {rowModules.map((m, i) => (
                  <div
                    key={m.instanceId}
                    style={{ width: m.widthCm * scale }}
                    className="group relative shrink-0 border-r border-brand-silver-200 bg-brand-bg last:border-r-0"
                  >
                    <img
                      src={m.thumbnail}
                      alt={m.moduleName}
                      className="h-32 w-full object-contain"
                      draggable={false}
                    />
                    <div className="px-1 pb-1 text-center">
                      <p className="truncate text-[11px] text-brand-silver-700">{m.moduleName}</p>
                      <p className="text-[11px] font-medium text-brand-navy-800">{m.widthCm}cm</p>
                      <p className="text-[11px] text-brand-silver-600">
                        {formatBRL(m.resolvedPriceCents ?? m.basePriceCents)}
                      </p>
                    </div>
                    {/*
                      Sempre visíveis no celular (não existe "hover" no toque), e
                      some suavemente no desktop até passar o mouse por cima.
                    */}
                    <div className="absolute right-1 top-1 flex gap-1 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100">
                      {i > 0 && (
                        <button
                          onClick={() => reorderModules(m.instanceId, 'left')}
                          className="flex h-7 w-7 items-center justify-center rounded bg-white/95 text-sm shadow"
                          title="Mover pra esquerda"
                        >
                          ←
                        </button>
                      )}
                      {i < rowModules.length - 1 && (
                        <button
                          onClick={() => reorderModules(m.instanceId, 'right')}
                          className="flex h-7 w-7 items-center justify-center rounded bg-white/95 text-sm shadow"
                          title="Mover pra direita"
                        >
                          →
                        </button>
                      )}
                      <button
                        onClick={() => removeModule(m.instanceId)}
                        className="flex h-7 w-7 items-center justify-center rounded bg-white/95 text-sm text-red-600 shadow"
                        title="Remover"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
