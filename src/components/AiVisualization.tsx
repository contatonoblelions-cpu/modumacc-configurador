import { useConfiguratorStore } from '../store/configuratorStore';

/**
  * Botão "Gerar visualização com IA" + modal com o resultado.
  *
  * Só fica habilitado se o cliente enviou uma foto do ambiente (tela de
  * medidas) E já colocou pelo menos um módulo na composição — ver
* `generateAiRender()` em `store/configuratorStore.ts`, que monta o pedido
* pra `/api/generate-render` (função serverless que chama o Gemini).
*/
export function AiVisualization() {
  const roomPhoto = useConfiguratorStore((s) => s.roomPhoto);
const modules = useConfiguratorStore((s) => s.modules);
const aiRender = useConfiguratorStore((s) => s.aiRender);
const generateAiRender = useConfiguratorStore((s) => s.generateAiRender);

const canGenerate = Boolean(roomPhoto) && modules.length > 0 && !aiRender.loading;
const showModal = aiRender.loading || aiRender.imageDataUrl || aiRender.error;

function closeModal() {
  useConfiguratorStore.setState({ aiRender: { loading: false, imageDataUrl: null, error: null } });
}

return (
  <>
  <button
  type="button"
  onClick={() => void generateAiRender()}
disabled={!canGenerate}
  title={
  !roomPhoto
  ? 'Envie uma foto do ambiente na tela de medidas pra usar essa função'
  : undefined
  }
  className="rounded-lg border border-brand-navy-800 px-4 py-3 font-medium text-brand-navy-800 transition hover:bg-brand-navy-800 hover:text-white disabled:cursor-not-allowed disabled:border-brand-silver-400 disabled:text-brand-silver-400 disabled:hover:bg-transparent"
  >
  {aiRender.loading ? 'Gerando visualização...' : 'Gerar visualização com IA'}
</button>

  {showModal && (
  <div
  className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
  onClick={closeModal}
>
  <div
  className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-xl bg-white p-6"
  onClick={(e) => e.stopPropagation()}
>
<div className="mb-4 flex items-center justify-between">
<h2 className="text-lg font-semibold text-brand-navy-900">
Visualização com IA
</h2>
<button
type="button"
onClick={closeModal}
className="text-brand-silver-600 hover:text-brand-navy-900"
>
Fechar
</button>
</div>

{aiRender.loading && (
<div className="flex flex-col items-center justify-center gap-3 py-16">
<div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-silver-200 border-t-brand-navy-800" />
<p className="text-sm text-brand-silver-600">
Gerando a visualização do seu ambiente com os móveis escolhidos...
</p>
</div>
)}

{aiRender.error && (
<div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
{aiRender.error}
</div>
)}

{aiRender.imageDataUrl && (
<img
src={aiRender.imageDataUrl}
alt="Visualização gerada com IA do ambiente com os móveis escolhidos"
className="w-full rounded-lg"
/>
)}
</div>
</div>
)}
</>
);
}
