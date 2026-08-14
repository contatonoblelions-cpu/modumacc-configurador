import { useDroppable } from '@dnd-kit/core';
import { useConfiguratorStore } from '../store/configuratorStore';
import { checkSpace } from '../utils/layout';
import { formatBRL } from '../api/parseAttributes';

const CANVAS_MAX_PX = 760;

/**
 * Área de montagem 2D (vista frontal / "elevação"). Os módulos são exibidos
 * lado a lado, com largura proporcional à largura real do ambiente informado.
 *
 * Limitação de propósito do MVP (2D, sem empilhamento vertical): módulos
 * superiores e inferiores aparecem numa única fileira, na ordem em que foram
 * arrastados — não há ainda uma "linha de bancada" separando superior/inferior.
 * Fica registrado como melhoria natural pro v2 (ver README > "Próximos passos").
 */
export function BuildCanvas() {
  const room = useConfiguratorStore((s) => s.room);
  const modules = useConfiguratorStore((s) => s.modules);
  const removeModule = useConfiguratorStore((s) => s.removeModule);
  const reorderModules = useConfiguratorStore((s) => s.reorderModules);

  const { setNodeRef, isOver } = useDroppable({ id: 'build-canvas' });

  if (!room) return null;

  const scale = CANVAS_MAX_PX / room.widthCm;
  const space = checkSpace(room, modules);

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="mb-3 flex items-center justify-between text-sm text-brand-silver-700">
        <span>
          Espaço: {room.widthCm}cm × {room.heightCm}cm
        </span>
        <span>
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
        ref={setNodeRef}
        style={{ width: CANVAS_MAX_PX }}
        className={`flex min-h-48 items-end gap-0 rounded-lg border-2 border-dashed p-2 transition ${
          isOver ? 'border-brand-navy-700 bg-brand-silver-200/40' : 'border-brand-silver-400 bg-white'
        } ${space.overflow ? 'border-red-400' : ''}`}
      >
        {modules.length === 0 && (
          <p className="m-auto text-sm text-brand-silver-600">
            Arraste módulos do painel à esquerda pra começar a montar.
          </p>
        )}
        {modules.map((m, i) => (
          <div
            key={m.instanceId}
            style={{ width: m.widthCm * scale }}
            className="group relative shrink-0 border-r border-brand-silver-200 bg-brand-bg last:border-r-0"
          >
            <img src={m.thumbnail} alt={m.moduleName} className="h-32 w-full object-contain" draggable={false} />
            <div className="px-1 pb-1 text-center">
              <p className="truncate text-[11px] text-brand-silver-700">{m.moduleName}</p>
              <p className="text-[11px] font-medium text-brand-navy-800">{m.widthCm}cm</p>
              <p className="text-[11px] text-brand-silver-600">
                {formatBRL(m.resolvedPriceCents ?? m.basePriceCents)}
              </p>
            </div>
            <div className="absolute right-1 top-1 hidden gap-1 group-hover:flex">
              {i > 0 && (
                <button
                  onClick={() => reorderModules(i, i - 1)}
                  className="rounded bg-white/90 px-1 text-xs shadow"
                  title="Mover pra esquerda"
                >
                  ←
                </button>
              )}
              {i < modules.length - 1 && (
                <button
                  onClick={() => reorderModules(i, i + 1)}
                  className="rounded bg-white/90 px-1 text-xs shadow"
                  title="Mover pra direita"
                >
                  →
                </button>
              )}
              <button
                onClick={() => removeModule(m.instanceId)}
                className="rounded bg-white/90 px-1 text-xs text-red-600 shadow"
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
}
