import { useMemo, useState } from 'react';
import { useConfiguratorStore } from '../store/configuratorStore';

/**
 * Seleção de acabamento e cor de puxador, ÚNICA pra toda a composição
 * (decisão de MVP — ver README > "Pendências a confirmar com o cliente"
 * pra trocar depois pra seleção por módulo, se o cliente preferir).
 *
 * No desktop fica sempre visível, igual antes. No mobile isso tomava a
 * tela inteira antes mesmo de mostrar a bancada — agora vira um botão
 * pequeno de uma linha que abre um modal com as mesmas opções, deixando a
 * tela principal só com o essencial (área de montagem + módulos + preço).
 */
export function FinishHandleSelector() {
  const catalog = useConfiguratorStore((s) => s.catalog);
  const finish = useConfiguratorStore((s) => s.finish);
  const handle = useConfiguratorStore((s) => s.handle);
  const setFinish = useConfiguratorStore((s) => s.setFinish);
  const setHandle = useConfiguratorStore((s) => s.setHandle);
  const [mobileOpen, setMobileOpen] = useState(false);

  const finishes = useMemo(
    () => [...new Set(catalog.flatMap((m) => m.availableFinishes))],
    [catalog],
  );
  const handles = useMemo(
    () => [...new Set(catalog.flatMap((m) => m.availableHandles))],
    [catalog],
  );

  if (finishes.length === 0 && handles.length === 0) return null;

  const options = (
    <>
      {finishes.length > 0 && (
        <div>
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-brand-silver-700">
            Acabamento
          </p>
          <div className="flex flex-wrap gap-2">
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
          <div className="flex flex-wrap gap-2">
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
    </>
  );

  return (
    <>
      {/* Desktop: linha sempre visível, igual antes — nada mudou aqui. */}
      <div className="hidden flex-wrap items-center gap-6 border-b border-brand-silver-200 bg-white px-6 py-3 md:flex">
        {options}
      </div>

      {/* Mobile: botão de uma linha que abre um modal com as mesmas opções. */}
      <div className="border-b border-brand-silver-200 bg-white px-4 py-1.5 md:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="flex w-full items-center justify-between text-xs font-medium text-brand-navy-800"
        >
          <span>
            Acabamento: <span className="font-semibold">{finish ?? '—'}</span>
            {handles.length > 0 && (
              <>
                {' '}
                · Puxador: <span className="font-semibold">{handle ?? '—'}</span>
              </>
            )}
          </span>
          <span className="text-brand-silver-500">editar ›</span>
        </button>
      </div>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 md:hidden"
          onClick={() => setMobileOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-t-2xl bg-white p-4 pb-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-brand-navy-900">
                Acabamento e puxador
              </h2>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="text-sm text-brand-silver-600"
              >
                Fechar
              </button>
            </div>
            <div className="flex flex-col gap-4">{options}</div>
          </div>
        </div>
      )}
    </>
  );
}
