import { useState } from 'react';
import type { CatalogModule } from '../types/catalog';
import { formatBRL } from '../api/parseAttributes';
import { useConfiguratorStore } from '../store/configuratorStore';

interface Props {
  module: CatalogModule;
}

/**
 * Card de um módulo do catálogo, com seletor de largura quando há mais de
 * uma opção. Pra adicionar à parede é só tocar em "+ Adicionar" — o módulo
 * entra sozinho na fileira certa (superior/inferior/torre, decidido pelo
 * nome do produto, ver `utils/rows.ts`), na próxima posição livre daquela
 * fileira. Não existe mais arrastar-e-soltar: era frágil no toque do
 * celular e não fazia sentido pra montar uma parede organizada em fileiras.
 */
export function ModuleCard({ module }: Props) {
  const [widthCm, setWidthCm] = useState(module.availableWidths[0] ?? 0);
  const addModule = useConfiguratorStore((s) => s.addModule);

  return (
    <div className="w-40 shrink-0 rounded-xl border border-brand-silver-200 bg-white p-3 shadow-sm md:w-auto">
      <img
        src={module.images[0]?.thumbnail}
        alt={module.name}
        className="mb-2 h-24 w-full rounded-lg bg-brand-bg object-contain"
        draggable={false}
      />
      <p className="text-sm font-medium text-brand-navy-800">{module.name}</p>

      <div className="mt-2 flex items-center justify-between gap-2">
        {module.availableWidths.length > 1 ? (
          <select
            value={widthCm}
            onChange={(e) => setWidthCm(Number(e.target.value))}
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
        onClick={() => addModule(module, widthCm)}
        className="mt-2 flex w-full items-center justify-center gap-1 rounded-lg border border-brand-navy-800 py-1.5 text-sm font-medium text-brand-navy-800 transition hover:bg-brand-navy-800 hover:text-white"
        title="Adicionar à parede"
      >
        + Adicionar
      </button>
    </div>
  );
}
