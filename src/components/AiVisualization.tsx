import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useConfiguratorStore } from '../store/configuratorStore';
import { PhotoCollage } from './PhotoCollage';

/**
 * Botao "Visualizar" + modal que mostra a composicao montada em cima da
 * foto do ambiente usando a COLAGEM (`PhotoCollage.tsx`): cola as fotos
 * reais dos modulos direto na foto, na posicao exata -- instantaneo e sem
 * custo.
 *
 * A geracao com IA (Gemini) foi DESATIVADA a pedido do cliente -- ficou so a
 * colagem. O codigo de IA (`generateAiRender` na store, `api/generateRender.ts`
 * e `api/generate-render.ts` no backend) continua no projeto, apenas nao e
 * mais chamado, pra ficar facil reativar depois se quiser.
 */
export function AiVisualization() {
  const modules = useConfiguratorStore((s) => s.modules);
  const [open, setOpen] = useState(false);

  // A foto do ambiente e OPCIONAL -- basta ter ao menos um modulo montado.
  const canOpen = modules.length > 0;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={!canOpen}
        title={
          modules.length === 0
            ? 'Adicione ao menos um módulo na parede pra visualizar'
            : undefined
        }
        className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-brand-accent-700 px-2.5 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-brand-accent-800 disabled:cursor-not-allowed disabled:bg-brand-silver-400 sm:flex-none sm:px-4 sm:py-3 sm:text-base"
      >
        <svg
          viewBox="0 0 24 24"
          className="h-4 w-4 shrink-0"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          aria-hidden="true"
        >
          <path
            d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M12 3v9m0 9v-9m0 0L4 7.5m8 4.5l8-4.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Visualizar combinação
      </button>

      {open && createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-xl bg-white p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-brand-navy-900">Visualização da combinação</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg bg-brand-navy-800 px-3 py-1.5 text-sm font-medium text-white shadow-sm transition hover:bg-brand-navy-900"
              >
                Fechar
              </button>
            </div>

            <PhotoCollage />
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
