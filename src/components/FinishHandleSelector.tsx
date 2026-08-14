import { useMemo } from 'react';
import { useConfiguratorStore } from '../store/configuratorStore';

/**
 * Seleção de acabamento e cor de puxador, ÚNICA pra toda a composição
 * (decisão de MVP — ver README > "Pendências a confirmar com o cliente"
 * pra trocar depois pra seleção por módulo, se o cliente preferir).
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
    <div className="flex flex-wrap items-center gap-6 border-b border-brand-silver-200 bg-white px-6 py-3">
      {finishes.length > 0 && (
        <div>
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-brand-silver-700">
            Acabamento
          </p>
          <div className="flex gap-2">
            {finishes.map((f) => (
              <button
                key={f}
                onClick={() => setFinish(f)}
                title={f}
                className={`rounded-full border-2 px-3 py-1 text-xs transition ${
                  finish === f
                    ? 'border-brand-navy-800 bg-brand-navy-800 text-white'
                    : 'border-brand-silver-400 text-brand-navy-800 hover:border-brand-navy-700'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      )}

      {handles.length > 0 && (
        <div>
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-brand-silver-700">
            Puxador
          </p>
          <div className="flex gap-2">
            {handles.map((h) => (
              <button
                key={h}
                onClick={() => setHandle(h)}
                className={`rounded-full border-2 px-3 py-1 text-xs transition ${
                  handle === h
                    ? 'border-brand-navy-800 bg-brand-navy-800 text-white'
                    : 'border-brand-silver-400 text-brand-navy-800 hover:border-brand-navy-700'
                }`}
              >
                {h}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
