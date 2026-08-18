import { useState } from 'react';
import { useConfiguratorStore } from '../store/configuratorStore';
import { totalPriceCents, formatMeters } from '../utils/layout';
import { formatBRL } from '../api/parseAttributes';
import { addAllToCartAndRedirect } from '../utils/cartUrl';
import { AiVisualization } from './AiVisualization';

/**
 * Resumo fixo no rodapé: preço total em tempo real, e o botão muda com a
 * etapa — na montagem é "Próximo passo" (leva pra revisão, ver
 * `store/configuratorStore.ts` > `goToReview`), na revisão é o finalizar
 * de verdade (visualização com IA + ir pro carrinho).
 */
export function SummaryBar() {
  const step = useConfiguratorStore((s) => s.step);
  const room = useConfiguratorStore((s) => s.room);
  const modules = useConfiguratorStore((s) => s.modules);
  const resolving = useConfiguratorStore((s) => s.resolving);
  const goToReview = useConfiguratorStore((s) => s.goToReview);
  const [redirecting, setRedirecting] = useState(false);

  const total = totalPriceCents(modules);
  // Soma bruta de todos os módulos — só um resumo informativo pro mobile
  // (ver mockup: "2,30m de 3,00m ocupados"). Não há mais checagem de
  // "estouro": a posição livre em X/Y (ver `utils/placement.ts`) já nunca
  // deixa um módulo sair dos limites do espaço informado, então não existe
  // mais um estado de "não cabe" pra bloquear aqui.
  const usedCmTotal = modules.reduce((sum, m) => sum + m.widthCm, 0);
  const allResolved = modules.every((m) => m.resolvedAddToCartUrl);
  const canProceed = modules.length > 0;
  const canFinish = canProceed && allResolved && !resolving;

  async function handleFinish() {
    setRedirecting(true);
    try {
      await addAllToCartAndRedirect(modules);
    } finally {
      setRedirecting(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 border-t border-brand-silver-200/70 bg-white/80 px-4 py-2.5 backdrop-blur-md sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-6 sm:py-4">
      <div className="flex items-center justify-between gap-2 md:block">
        <div>
          <p className="text-xs text-brand-silver-600">
            {modules.length} {modules.length === 1 ? 'módulo' : 'módulos'}
            {resolving && ' · atualizando preços...'}
          </p>
          <p className="text-xl font-semibold text-brand-navy-900">{formatBRL(total)}</p>
          {room && step !== 'room' && (
            <p className="text-[11px] text-brand-silver-500 md:hidden">
              {formatMeters(usedCmTotal)} de {formatMeters(room.widthCm)} ocupados
            </p>
          )}
        </div>
        {/* Ícone de carrinho, só decorativo, só no mobile — reforça o botão abaixo. */}
        <svg
          viewBox="0 0 24 24"
          className="h-6 w-6 shrink-0 text-brand-navy-700 md:hidden"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          aria-hidden="true"
        >
          <circle cx="9" cy="20" r="1.4" fill="currentColor" stroke="none" />
          <circle cx="18" cy="20" r="1.4" fill="currentColor" stroke="none" />
          <path
            d="M2.5 3h2l2.2 11.4a1.8 1.8 0 0 0 1.8 1.5h8.6a1.8 1.8 0 0 0 1.77-1.47L20.9 7.5H6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      {step === 'build' ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          {/*
            Botão "Visualizar em 3D" já aparece aqui, durante a montagem —
            não só depois de "Próximo passo" — porque o pedido do cliente foi
            justamente esse: ver o resultado com IA a qualquer momento
            enquanto está montando, sem precisar avançar de etapa primeiro.
          */}
          <AiVisualization />
          <button
            onClick={goToReview}
            disabled={!canProceed}
            className="w-full rounded-lg bg-brand-navy-800 px-6 py-3 font-medium text-white transition hover:bg-brand-navy-900 disabled:cursor-not-allowed disabled:bg-brand-silver-400 sm:w-auto"
          >
            Próximo passo →
          </button>
        </div>
      ) : (
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
      )}
    </div>
  );
}
