import { useMemo, useState } from 'react';
import { useConfiguratorStore } from '../store/configuratorStore';
import { PhotoCollage } from './PhotoCollage';
import { getFinishSwatch } from '../utils/finishSwatches';
import { getHandleColor } from '../utils/handleColors';

type Tab = 'collage' | 'ai';

/**
 * Botão "Visualizar em 3D" + modal com DUAS formas de ver a composição em
 * cima da foto do ambiente:
 * 1. "Com IA" (aba padrão ao abrir, é o ponto principal do botão) — manda
 *    tudo pro Gemini (`generateAiRender` na store: acabamento/madeira, cor
 *    do puxador, e nome+medidas de cada módulo colocado — ver
 *    `api/generateRender.ts` e `api/generate-render.ts` no backend) recriar
 *    a cena com luz/sombra realista, como se fosse a cozinha já pronta.
 *    Clicar no botão já dispara a geração automaticamente, sem passo extra.
 * 2. "Colagem" (aba secundária, `PhotoCollage.tsx`) — cola as fotos reais
 *    dos módulos direto na foto, na posição exata montada. Instantâneo, sem
 *    custo de IA — útil como conferência rápida antes/depois de gerar a
 *    versão com IA, ou caso a IA demore/erre.
 */
export function AiVisualization() {
  const modules = useConfiguratorStore((s) => s.modules);
  const aiRender = useConfiguratorStore((s) => s.aiRender);
  const generateAiRender = useConfiguratorStore((s) => s.generateAiRender);
  const catalog = useConfiguratorStore((s) => s.catalog);
  const finish = useConfiguratorStore((s) => s.finish);
  const handle = useConfiguratorStore((s) => s.handle);
  const setFinish = useConfiguratorStore((s) => s.setFinish);
  const setHandle = useConfiguratorStore((s) => s.setHandle);

  const finishes = useMemo(() => [...new Set(catalog.flatMap((m) => m.availableFinishes))], [catalog]);
  const handles = useMemo(() => [...new Set(catalog.flatMap((m) => m.availableHandles))], [catalog]);

  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('ai');

  // A foto do ambiente e OPCIONAL — basta ter ao menos um modulo montado.
  const canOpen = modules.length > 0;

  function openModal() {
    setTab('ai');
    setOpen(true);
    // Já dispara a geração com IA na hora de abrir — o botão "Visualizar em
    // 3D" é pra ser um único clique até o resultado, sem passo intermediário.
    if (!aiRender.imageDataUrl && !aiRender.loading) void generateAiRender();
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
        Visualizar em 3D
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
              <h2 className="text-lg font-semibold text-brand-navy-900">Visualização em 3D</h2>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg bg-brand-navy-800 px-3 py-1.5 text-sm font-medium text-white shadow-sm transition hover:bg-brand-navy-900"
              >
                Fechar
              </button>
            </div>

            <div className="mb-4 flex gap-1 rounded-lg bg-brand-silver-100 p-1 text-sm">
              <button
                type="button"
                onClick={() => setTab('ai')}
                className={`flex-1 rounded-md py-1.5 font-medium transition ${
                  tab === 'ai' ? 'bg-white text-brand-accent-700 shadow-sm' : 'text-brand-silver-600'
                }`}
              >
                Com IA (3D)
              </button>
              <button
                type="button"
                onClick={() => setTab('collage')}
                className={`flex-1 rounded-md py-1.5 font-medium transition ${
                  tab === 'collage' ? 'bg-white text-brand-navy-900 shadow-sm' : 'text-brand-silver-600'
                }`}
              >
                Colagem
              </button>
            </div>

            {tab === 'collage' && (
              <div>
                <PhotoCollage />
                <button
                  type="button"
                  onClick={() => {
                    setTab('ai');
                    if (!aiRender.loading) void generateAiRender();
                  }}
                  className="mt-3 w-full rounded-lg bg-brand-accent-700 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brand-accent-800"
                >
                  Ver em 3D com IA →
                </button>
              </div>
            )}

            {tab === 'ai' && (
              <div>
                {!aiRender.loading && !aiRender.imageDataUrl && !aiRender.error && (
                  <div className="flex flex-col items-center gap-3 py-10 text-center">
                    <p className="text-sm text-brand-silver-600">
                      Gera uma versão realista, com luz e sombra, usando o acabamento, o puxador e os
                      módulos exatos que você escolheu. Se você enviou uma foto do ambiente, a IA usa
                      ela de fundo; se não, monta a cozinha num cenário limpo.
                    </p>
                    <button
                      type="button"
                      onClick={() => void generateAiRender()}
                      className="rounded-lg bg-brand-accent-700 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brand-accent-800"
                    >
                      Gerar visualização em 3D
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
                  <div>
                    {(finishes.length > 0 || handles.length > 0) && (
                      <div className="mb-3 space-y-2 rounded-lg bg-brand-silver-100 p-3">
                        <p className="text-xs font-medium text-brand-navy-900">
                          Trocar cor ou puxador e gerar na hora:
                        </p>
                        {finishes.length > 0 && (
                          <div>
                            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-brand-silver-700">
                              Cor: <span className="font-bold text-brand-navy-900">{finish ?? '—'}</span>
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {finishes.map((f) => {
                                const swatch = getFinishSwatch(f);
                                const selected = finish === f;
                                return (
                                  <button
                                    key={f}
                                    type="button"
                                    title={f}
                                    aria-label={f}
                                    aria-pressed={selected}
                                    disabled={aiRender.loading}
                                    onClick={() => {
                                      setFinish(f);
                                      void generateAiRender();
                                    }}
                                    className={`h-8 w-8 shrink-0 rounded-full border bg-cover bg-center transition disabled:opacity-50 ${
                                      selected
                                        ? 'border-white ring-2 ring-brand-navy-800 ring-offset-1'
                                        : 'border-brand-silver-300 hover:ring-2 hover:ring-brand-silver-400 hover:ring-offset-1'
                                    }`}
                                    style={swatch ? { backgroundImage: `url(${swatch})` } : { backgroundColor: '#d9d4c9' }}
                                  />
                                );
                              })}
                            </div>
                          </div>
                        )}
                        {handles.length > 0 && (
                          <div>
                            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-brand-silver-700">
                              Puxador: <span className="font-bold text-brand-navy-900">{handle ?? '—'}</span>
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {handles.map((h) => {
                                const color = getHandleColor(h);
                                const selected = handle === h;
                                return (
                                  <button
                                    key={h}
                                    type="button"
                                    title={h}
                                    aria-label={h}
                                    aria-pressed={selected}
                                    disabled={aiRender.loading}
                                    onClick={() => {
                                      setHandle(h);
                                      void generateAiRender();
                                    }}
                                    className={`flex h-8 items-center gap-1.5 rounded-full border pl-1 pr-2.5 transition disabled:opacity-50 ${
                                      selected ? 'border-brand-navy-800 bg-white' : 'border-brand-silver-300 hover:border-brand-silver-400'
                                    }`}
                                  >
                                    <span
                                      className="h-6 w-6 shrink-0 rounded-full border border-black/10"
                                      style={{ backgroundColor: color?.fill ?? '#c7cbce' }}
                                    />
                                    <span className="text-[11px] font-medium text-brand-navy-800">{h}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    <img
                      src={aiRender.imageDataUrl}
                      alt="Visualização gerada com IA do ambiente com os móveis escolhidos"
                      className="w-full rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => void generateAiRender()}
                      className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-brand-navy-800 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-brand-navy-900"
                    >
                      <span aria-hidden="true">↻</span> Gerar novamente
                    </button>
                    <p className="mt-1.5 text-center text-xs text-brand-silver-600">
                      Mudou a montagem? Clique aqui pra gerar um novo 3D do zero.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
