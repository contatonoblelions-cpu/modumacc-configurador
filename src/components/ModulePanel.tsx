import { useConfiguratorStore } from '../store/configuratorStore';
import { ModuleCard } from './ModuleCard';

/** Painel lateral com os módulos disponíveis da linha Cozinha, vindos da Store API. */
export function ModulePanel() {
  const catalog = useConfiguratorStore((s) => s.catalog);
  const loading = useConfiguratorStore((s) => s.catalogLoading);
  const error = useConfiguratorStore((s) => s.catalogError);

  return (
    <aside className="order-2 w-full shrink-0 border-t border-brand-silver-200 bg-brand-bg p-3 md:order-none md:w-72 md:overflow-y-auto md:border-t-0 md:border-b-0 md:border-r md:p-4">
      <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-brand-silver-700 md:mb-3">
        Módulos disponíveis
      </h2>
      <p className="mb-2 text-xs text-brand-silver-600 md:hidden">role e arraste para cima</p>

      {loading && <p className="text-sm text-brand-silver-600">Carregando catálogo...</p>}
      {error && (
        <p className="text-sm text-red-600">
          Não foi possível carregar o catálogo agora. ({error})
        </p>
      )}

      {/*
        No celular vira uma "prateleira" horizontal com scroll (cada card com
        largura fixa e mais compacta, ver `ModuleCard.tsx`) — no desktop
        volta a ser a lista vertical original.
      */}
      <div className="-mx-3 flex gap-2 overflow-x-auto px-3 pb-1 md:mx-0 md:grid md:grid-cols-1 md:gap-3 md:overflow-visible md:px-0 md:pb-0">
        {catalog.map((mod) => (
          <ModuleCard key={mod.id} module={mod} />
        ))}
      </div>

      {catalog.length > 1 && (
        <p className="mt-1 text-center text-[11px] text-brand-silver-500 md:hidden">
          ‹ deslize a faixa para o lado para ver mais ›
        </p>
      )}
    </aside>
  );
}
