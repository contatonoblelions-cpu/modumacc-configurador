import { useConfiguratorStore } from '../store/configuratorStore';
import { ModuleCard } from './ModuleCard';

/** Painel lateral com os módulos disponíveis da linha Cozinha, vindos da Store API. */
export function ModulePanel() {
  const catalog = useConfiguratorStore((s) => s.catalog);
  const loading = useConfiguratorStore((s) => s.catalogLoading);
  const error = useConfiguratorStore((s) => s.catalogError);

  return (
    <aside className="w-full shrink-0 border-b border-brand-silver-200 bg-brand-bg p-3 md:w-72 md:overflow-y-auto md:border-b-0 md:border-r md:p-4">
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-brand-silver-700 md:mb-3">
        Módulos disponíveis
      </h2>

      {loading && <p className="text-sm text-brand-silver-600">Carregando catálogo...</p>}
      {error && (
        <p className="text-sm text-red-600">
          Não foi possível carregar o catálogo agora. ({error})
        </p>
      )}

      {/*
        No celular vira uma "prateleira" horizontal com scroll (cada card com
        largura fixa, ver `ModuleCard.tsx`) — no desktop volta a ser a lista
        vertical original.
      */}
      <div className="-mx-3 flex gap-3 overflow-x-auto px-3 pb-1 md:mx-0 md:grid md:grid-cols-1 md:overflow-visible md:px-0 md:pb-0">
        {catalog.map((mod) => (
          <ModuleCard key={mod.id} module={mod} />
        ))}
      </div>
    </aside>
  );
}
