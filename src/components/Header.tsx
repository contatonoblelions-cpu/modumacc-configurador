import { useConfiguratorStore } from '../store/configuratorStore';
import { formatMeters } from '../utils/layout';

/**
 * Cabeçalho de marca. Logo real extraída de Logo Modumacc 2.psd
 * (public/brand/modumacc-logo.png) — ver README > "Identidade visual".
 */
export function Header() {
  const step = useConfiguratorStore((s) => s.step);
  const room = useConfiguratorStore((s) => s.room);
  const backToRoomStep = useConfiguratorStore((s) => s.backToRoomStep);
  const backToBuildStep = useConfiguratorStore((s) => s.backToBuildStep);

  return (
    <header className="border-b border-brand-silver-200/70 bg-white/70 px-4 py-2.5 backdrop-blur-md sm:px-6 sm:py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src="/brand/modumacc-logo.png" alt="Modumacc" className="h-8 w-auto" />
          <span className="hidden text-sm text-brand-silver-700 sm:inline">
            Monte sua cozinha
          </span>
        </div>
        {step === 'build' && (
          <button
            onClick={backToRoomStep}
            className="rounded-lg bg-brand-navy-800 px-3 py-1.5 text-sm font-medium text-white shadow-sm transition hover:bg-brand-navy-900"
          >
            ← Alterar medidas
          </button>
        )}
        {step === 'review' && (
          <button
            onClick={backToBuildStep}
            className="rounded-lg bg-brand-navy-800 px-3 py-1.5 text-sm font-medium text-white shadow-sm transition hover:bg-brand-navy-900"
          >
            ← Voltar aos módulos
          </button>
        )}
      </div>
      {/*
        Título + medida do espaço, só no mobile (no desktop a área de
        montagem já mostra isso, ver `BuildCanvas.tsx`) — dá contexto rápido
        no topo, já que no celular a tela fica bem mais enxuta.
      */}
      {room && (step === 'build' || step === 'review') && (
        <div className="mt-1.5 md:hidden">
          <p className="text-sm font-semibold text-brand-navy-900">Monte sua cozinha</p>
          <p className="text-xs text-brand-silver-600">
            Espaço informado: {formatMeters(room.widthCm)} x {formatMeters(room.heightCm)}
          </p>
        </div>
      )}
    </header>
  );
}
