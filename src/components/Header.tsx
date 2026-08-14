import { useConfiguratorStore } from '../store/configuratorStore';

/**
 * Cabeçalho de marca. Logo real extraída de Logo Modumacc 2.psd
 * (public/brand/modumacc-logo.png) — ver README > "Identidade visual".
 */
export function Header() {
  const step = useConfiguratorStore((s) => s.step);
  const setStep = useConfiguratorStore((s) => s.backToRoomStep);

  return (
    <header className="flex items-center justify-between border-b border-brand-silver-200/70 bg-white/70 px-6 py-3 backdrop-blur-md">
      <div className="flex items-center gap-3">
        <img src="/brand/modumacc-logo.png" alt="Modumacc" className="h-8 w-auto" />
        <span className="hidden text-sm text-brand-silver-700 sm:inline">
          Monte sua cozinha
        </span>
      </div>
      {step === 'build' && (
        <button
          onClick={setStep}
          className="text-sm font-medium text-brand-navy-700 hover:text-brand-navy-900"
        >
          ← Alterar medidas
        </button>
      )}
    </header>
  );
}
