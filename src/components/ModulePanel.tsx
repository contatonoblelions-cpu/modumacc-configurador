import { useConfiguratorStore } from '../store/configuratorStore';
import { ModuleCard } from './ModuleCard';

/** Painel lateral com os módulos disponíveis da linha Cozinha, vindos da Store API. */
export function ModulePanel() {
  const catalog = useConfiguratorStore((s) => s.catalog);
  const loading = useConfiguratorStore((s) => s.catalogLoading);
  const error = useConfiguratorStore((s) => s.catalogError);

  return (
    <aside className="w-72 shrink-0 overflow-y-auto border-r border-brand-silver-200 bg-brand-bg p-4">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-brand-silver-700">
        Módulos disponíveis
      </h2>

      {loading && <p className="text-sm text-brand-silver-600">Carregando catálogo...</p>}
      {error && (
        <p className="text-sm text-red-600">
          Não foi possível carregar o catálogo agora. ({error})
        </p>
      )}

      <div className="grid grid-cols-1 gap-3">
        {catalog.map((mod) => (
          <ModuleCard key={mod.id} module={mod} />
        ))}
      </div>
    </aside>
  );
}
