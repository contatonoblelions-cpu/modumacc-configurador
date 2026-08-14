import { useState } from 'react';
import { useConfiguratorStore } from '../store/configuratorStore';
import { checkSpace, totalPriceCents } from '../utils/layout';
import { formatBRL } from '../api/parseAttributes';
import { addAllToCartAndRedirect } from '../utils/cartUrl';

/** Resumo fixo no rodapé: preço total em tempo real + botão de finalizar. */
export function SummaryBar() {
  const room = useConfiguratorStore((s) => s.room);
  const modules = useConfiguratorStore((s) => s.modules);
  const resolving = useConfiguratorStore((s) => s.resolving);
  const [redirecting, setRedirecting] = useState(false);

  const space = checkSpace(room, modules);
  const total = totalPriceCents(modules);
  const allResolved = modules.every((m) => m.resolvedAddToCartUrl);
  const canFinish = modules.length > 0 && !space.overflow && allResolved && !resolving;

  async function handleFinish() {
    setRedirecting(true);
    try {
      await addAllToCartAndRedirect(modules);
    } finally {
      setRedirecting(false);
    }
  }

  return (
    <div className="flex items-center justify-between border-t border-brand-silver-200 bg-white px-6 py-4">
      <div>
        <p className="text-xs text-brand-silver-600">
          {modules.length} {modules.length === 1 ? 'módulo' : 'módulos'}
          {resolving && ' · atualizando preços...'}
        </p>
        <p className="text-xl font-semibold text-brand-navy-900">{formatBRL(total)}</p>
      </div>
      <div className="flex items-center gap-3">
      <AiVisualization />
      </div>
      <button
        onClick={handleFinish}
        disabled={!canFinish || redirecting}
        className="rounded-lg bg-brand-navy-800 px-6 py-3 font-medium text-white transition hover:bg-brand-navy-900 disabled:cursor-not-allowed disabled:bg-brand-silver-400"
      >
        {redirecting ? 'Enviando pro carrinho...' : 'Adicionar tudo ao carrinho'}
      </button>
    </div>
  );
}
