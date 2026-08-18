import { useState } from 'react';
import { useConfiguratorStore } from '../store/configuratorStore';
import { PhotoCollage } from './PhotoCollage';

type Tab = 'collage' | 'ai';

/**
 * Botão "Ver visualização" + modal com DUAS formas de ver a composição em
 * cima da foto do ambiente:
 * 1. "Colagem" (aba padrão, `PhotoCollage.tsx`) — cola as fotos reais dos
 *    módulos direto na foto, na posição exata montada. Instantâneo, sem
 *    custo de IA, sem "reinvenção" — é o que foi montado, ponto.
 * 2. "Com IA" (aba antiga, única versão que existia antes) — manda tudo pro
 *    Gemini (`generateAiRender` na store) recriar a cena com luz/sombra
 *    realista. Mais bonito, mas a IA só tenta imitar a posição/proporção
 *    exata, não garante — por isso agora é o refinamento OPCIONAL em cima
 *    da colagem precisa, não o único jeito de ver o resultado.
 */
export function AiVisualization() {
  const roomPhoto = useConfiguratorStore((s) => s.roomPhoto);
  const modules = useConfiguratorStore((s) => s.modules);
  const aiRender = useConfiguratorStore((s) => s.aiRender);
  const generateAiRender = useConfiguratorStore((s) => s.generateAiRender);

  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('collage');

  const canOpen = Boolean(roomPhoto) && modules.length > 0;

  function openModal() {
    setTab('collage');
    setOpen(true);
  }

  function closeModal() {
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        disabled={!canOpen}
        title={
          !roomPhoto
            ? 'Envie uma foto do ambiente na tela de medidas pra usar essa função'
            : undefined
        }
        className="w-full rounded-lg border border-brand-navy-800 px-4 py-3 font-medium text-brand-navy-800 transition hover:bg-brand-navy-800 hover:text-white disabled:cursor-not-allowed disabled:border-brand-silver-400 disabled:text-brand-silver-400 disabled:hover:bg-transparent sm:w-auto"
      >
        Ver visualização
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={closeModal}
        >
          <div
            className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-xl bg-white p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-brand-navy-900">Visualização</h2>
              <button
                type="button"
                onClick={closeModal}
                className="text-brand-silver-600 hover:text-brand-navy-900"
              >
                Fechar
              </button>
            </div>

            <div className="mb-4 flex gap-1 rounded-lg bg-brand-silver-100 p-1 text-sm">
              <button
                type="button"
                onClick={() => setTab('collage')}
                className={`flex-1 rounded-md py-1.5 font-medium transition ${
                  tab === 'collage' ? 'bg-white text-brand-navy-900 shadow-sm' : 'text-brand-silver-600'
                }`}
              >
                Colagem
              </button>
              <button
                type="button"
                onClick={() => setTab('ai')}
                className={`flex-1 rounded-md py-1.5 font-medium transition ${
                  tab === 'ai' ? 'bg-white text-brand-navy-900 shadow-sm' : 'text-brand-silver-600'
                }`}
              >
                Com IA
              </button>
            </div>

            {tab === 'collage' && (
              <div>
                <PhotoCollage />
                <button
                  type="button"
                  onClick={() => {
                    setTab('ai');
                    if (!aiRender.imageDataUrl && !aiRender.loading) void generateAiRender();
                  }}
                  className="mt-3 w-full rounded-lg border border-brand-navy-800 px-4 py-2.5 text-sm font-medium text-brand-navy-800 transition hover:bg-brand-navy-800 hover:text-white"
                >
                  Refinar com IA →
                </button>
              </div>
            )}

            {tab === 'ai' && (
              <div>
                {!aiRender.loading && !aiRender.imageDataUrl && !aiRender.error && (
                  <div className="flex flex-col items-center gap-3 py-10 text-center">
                    <p className="text-sm text-brand-silver-600">
                      Gera uma versão realista, com luz e sombra, recriada por IA a partir da sua foto.
                    </p>
                    <button
                      type="button"
                      onClick={() => void generateAiRender()}
                      className="rounded-lg bg-brand-navy-800 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brand-navy-900"
                    >
                      Gerar com IA
                    </button>
                  </div>
                )}

                {aiRender.loading && (
                  <div className="flex flex-col items-center justify-center gap-3 py-16">
                    <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-silver-200 border-t-brand-navy-800" />
                    <p className="text-sm text-brand-silver-600">
                      Gerando a visualização do seu ambiente com os móveis escolhidos...
                    </p>
                  </div>
                )}

                {aiRender.error && (
                  <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">{aiRender.error}</div>
                )}

                {aiRender.imageDataUrl && (
                  <img
                    src={aiRender.imageDataUrl}
                    alt="Visualização gerada com IA do ambiente com os móveis escolhidos"
                    className="w-full rounded-lg"
                  />
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
