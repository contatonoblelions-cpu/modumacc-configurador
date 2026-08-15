import { useState } from 'react';
import { useConfiguratorStore } from '../store/configuratorStore';
import { hasAnyRowOverflow, totalPriceCents } from '../utils/layout';
import { formatBRL } from '../api/parseAttributes';
import { addAllToCartAndRedirect } from '../utils/cartUrl';
import { AiVisualization } from './AiVisualization';

/** Resumo fixo no rodapé: preço total em tempo real + botão de finalizar. */
export function SummaryBar() {
  const room = useConfiguratorStore((s) => s.room);
  const modules = useConfiguratorStore((s) => s.modules);
  const resolving = useConfiguratorStore((s) => s.resolving);
  const [redirecting, setRedirecting] = useState(false);

  const total = totalPriceCents(modules);
  const allResolved = modules.every((m) => m.resolvedAddToCartUrl);
  // Cada fileira da parede é checada contra a largura do ambiente separadamente
  // (ver utils/layout.ts) — não dá pra finalizar se alguma fileira estourou.
  const overflow = hasAnyRowOverflow(room, modules);
  const canFinish = modules.length > 0 && !overflow && allResolved && !resolving;

  async function handleFinish() {
    setRedirecting(true);
    try {
      await addAllToCartAndRedirect(modules);
    } finally {
      setRedirecting(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 border-t border-brand-silver-200/70 bg-white/80 px-4 py-3 backdrop-blur-md sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-4">
      <div>
        <p className="text-xs text-brand-silver-600">
          {modules.length} {modules.length === 1 ? 'módulo' : 'módulos'}
          {resolving && ' · atualizando preços...'}
        </p>
        <p className="text-xl font-semibold text-brand-navy-900">{formatBRL(total)}</p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        <AiVisualization />
        <button
          onClick={handleFinish}
          disabled={!canFinish || redirecting}
          className="w-full rounded-lg bg-brand-navy-800 px-6 py-3 font-medium text-white transition hover:bg-brand-navy-900 disabled:cursor-not-allowed disabled:bg-brand-silver-400 sm:w-auto"
        >
          {redirecting ? 'Enviando pro carrinho...' : 'Adicionar tudo ao carrinho'}
        </button>
      </div>
    </div>
  );
}
