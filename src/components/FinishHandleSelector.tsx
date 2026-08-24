import { useMemo } from 'react';
import { useConfiguratorStore } from '../store/configuratorStore';
import { getFinishSwatch } from '../utils/finishSwatches';
import { getHandleColor } from '../utils/handleColors';

/**
 * Seleção de acabamento (cor) e puxador, ÚNICA pra toda a composição.
 *
 * 2026-08-24: a pedido do cliente, virou o padrão das lojas de roupa —
 * "bolinhas" com a cor pra clicar e trocar direto (sem botão "editar" nem
 * modal), renderizadas LOGO ABAIXO da lista de módulos (ver
 * `ModulePanel.tsx`, que é quem monta este componente). Cada bolinha de
 * acabamento usa a FOTO real do material (`finishSwatches.ts`) como fundo,
 * e cada bolinha de puxador usa a cor metálica aproximada
 * (`handleColors.ts`). A bolinha selecionada ganha um anel azul-marinho.
 */
export function FinishHandleSelector() {
  const catalog = useConfiguratorStore((s) => s.catalog);
  const finish = useConfiguratorStore((s) => s.finish);
  const handle = useConfiguratorStore((s) => s.handle);
  const setFinish = useConfiguratorStore((s) => s.setFinish);
  const setHandle = useConfiguratorStore((s) => s.setHandle);

  const finishes = useMemo(
    () => [...new Set(catalog.flatMap((m) => m.availableFinishes))],
    [catalog],
  );
  const handles = useMemo(
    () => [...new Set(catalog.flatMap((m) => m.availableHandles))],
    [catalog],
  );

  if (finishes.length === 0 && handles.length === 0) return null;

  return (
    <div className="mt-2.5 space-y-2.5 border-t border-brand-silver-200 pt-2.5 md:mt-4 md:pt-4">
      {finishes.length > 0 && (
        <div>
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-brand-silver-700">
            Cor: <span className="font-bold text-brand-navy-900">{finish ?? '—'}</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {finishes.map((f) => {
              const swatch = getFinishSwatch(f);
              const selected = finish === f;
              return (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFinish(f)}
                  title={f}
                  aria-label={f}
                  aria-pressed={selected}
                  className={`h-8 w-8 shrink-0 rounded-full border bg-cover bg-center transition ${
                    selected
                      ? 'border-white ring-2 ring-brand-navy-800 ring-offset-1'
                      : 'border-brand-silver-300 hover:ring-2 hover:ring-brand-silver-400 hover:ring-offset-1'
                  }`}
                  style={
                    swatch
                      ? { backgroundImage: `url(${swatch})` }
                      : { backgroundColor: '#d9d4c9' }
                  }
                />
              );
            })}
          </div>
        </div>
      )}

      {handles.length > 0 && (
        <div>
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-brand-silver-700">
            Puxador: <span className="font-bold text-brand-navy-900">{handle ?? '—'}</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {handles.map((h) => {
              const color = getHandleColor(h);
              const selected = handle === h;
              return (
                <button
                  key={h}
                  type="button"
                  onClick={() => setHandle(h)}
                  title={h}
                  aria-label={h}
                  aria-pressed={selected}
                  className={`flex h-8 items-center gap-1.5 rounded-full border pl-1 pr-2.5 transition ${
                    selected
                      ? 'border-brand-navy-800 bg-brand-navy-50'
                      : 'border-brand-silver-300 hover:border-brand-silver-400'
                  }`}
                >
                  <span
                    className="h-6 w-6 shrink-0 rounded-full border border-black/10"
                    style={{ backgroundColor: color?.fill ?? '#c7cbce' }}
                  />
                  <span className="text-[11px] font-medium text-brand-navy-800">{h}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
