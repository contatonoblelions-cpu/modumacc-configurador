import { useConfiguratorStore } from '../store/configuratorStore';
import { ModuleCard } from './ModuleCard';
import { ModuleChip } from './ModuleChip';
import { FinishHandleSelector } from './FinishHandleSelector';

/**
 * Painel com os módulos disponíveis da linha Cozinha, vindos da Store API.
 *
 * Desktop e mobile têm interações bem diferentes aqui (card completo com
 * seletor de largura vs. chip pequeno de toque rápido), então cada módulo
 * do catálogo renderiza os DOIS componentes — `ModuleCard` (escondido no
 * mobile) e `ModuleChip` (escondido no desktop) — e o CSS decide qual
 * aparece. Cada um tem seu próprio id de drag, então não há conflito.
 */
export function ModulePanel() {
  const catalog = useConfiguratorStore((s) => s.catalog);
  const loading = useConfiguratorStore((s) => s.catalogLoading);
  const error = useConfiguratorStore((s) => s.catalogError);

  return (
    <aside className="order-2 max-h-[42vh] w-full shrink-0 overflow-y-auto border-t border-brand-silver-200 bg-brand-bg p-2.5 md:order-none md:max-h-none md:w-72 md:border-t-0 md:border-b-0 md:border-r md:p-4">
      <h2 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-brand-silver-700 md:mb-3 md:text-sm">
        <span className="md:hidden">Módulos disponíveis — role e arraste para cima</span>
        <span className="hidden md:inline">Módulos disponíveis</span>
      </h2>

      {loading && <p className="text-sm text-brand-silver-600">Carregando catálogo...</p>}
      {error && (
        <p className="text-sm text-red-600">
          Não foi possível carregar o catálogo agora. ({error})
        </p>
      )}

      {/*
        No celular vira uma faixa horizontal de chips pequenos e escuros
        (`ModuleChip.tsx`, toque rápido pra adicionar) — no desktop volta a
        ser a lista vertical de cards completos (`ModuleCard.tsx`).
      */}
      <div className="-mx-2.5 flex gap-1.5 overflow-x-auto px-2.5 pb-1 md:mx-0 md:grid md:grid-cols-1 md:gap-3 md:overflow-visible md:px-0 md:pb-0">
        {catalog.map((mod) => (
          <ModuleChip key={mod.id} module={mod} />
        ))}
        {catalog.map((mod) => (
          <ModuleCard key={mod.id} module={mod} />
        ))}
      </div>

      {catalog.length > 1 && (
        <p className="mt-1 text-center text-[10px] text-brand-silver-500 md:hidden">
          ‹ deslize a faixa para o lado para ver mais ›
        </p>
      )}

      {/* Seletor de cor + puxador em "bolinhas", logo abaixo dos módulos (pedido do cliente, padrão das lojas de roupa). */}
      <FinishHandleSelector />
    </aside>
  );
}
