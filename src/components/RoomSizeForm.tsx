import { useState, type ChangeEvent, type FormEvent } from 'react';
import { useConfiguratorStore } from '../store/configuratorStore';
import { resizeImageToBase64 } from '../utils/imageResize';

/**
 * Tela de entrada: o cliente informa a largura e a altura do espaço disponível
 * antes de começar a montar a composição, e opcionalmente sobe uma foto do
 * ambiente — usada depois, na tela de montagem, pra gerar uma visualização
 * com IA mostrando os móveis já instalados no espaço real (ver
 * `generateAiRender` em `store/configuratorStore.ts`).
 */
export function RoomSizeForm() {
  const setRoom = useConfiguratorStore((s) => s.setRoom);
  const setRoomPhoto = useConfiguratorStore((s) => s.setRoomPhoto);
  const roomPhoto = useConfiguratorStore((s) => s.roomPhoto);
  const [width, setWidth] = useState('');
  const [height, setHeight] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [processingPhoto, setProcessingPhoto] = useState(false);

  async function handlePhotoChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoError(null);
    setProcessingPhoto(true);
    try {
      const { base64, mimeType } = await resizeImageToBase64(file);
      setRoomPhoto({ base64, mimeType, previewUrl: `data:${mimeType};base64,${base64}` });
    } catch {
      setPhotoError('Não foi possível processar essa imagem. Tente outra foto.');
    } finally {
      setProcessingPhoto(false);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const widthCm = parseFloat(width.replace(',', '.'));
    const heightCm = parseFloat(height.replace(',', '.'));
    if (!widthCm || !heightCm || widthCm <= 0 || heightCm <= 0) {
      setError('Informe largura e altura válidas, em centímetros.');
      return;
    }
    setError(null);
    setRoom({ widthCm, heightCm });
  }

  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-md flex-1 flex-col justify-center px-4">
      <div className="rounded-2xl border border-white/60 bg-white/70 p-8 shadow-xl shadow-brand-navy-900/5 backdrop-blur-xl">
      <h1 className="mb-2 text-2xl font-semibold text-brand-navy-900">Monte sua cozinha</h1>
      <p className="mb-8 text-brand-silver-700">
        Informe as medidas do espaço disponível. Você vai montar a parede
        tocando nos módulos que quiser — cada um entra sozinho na fileira
        certa (superior, inferior...), dentro dessa largura.
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-brand-navy-800">
            Largura do espaço (cm)
          </label>
          <input
            type="text"
            inputMode="decimal"
            value={width}
            onChange={(e) => setWidth(e.target.value)}
            placeholder="Ex: 320"
            className="w-full rounded-lg border border-brand-silver-400 px-3 py-2 focus:border-brand-navy-700 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-brand-navy-800">
            Altura do espaço (cm)
          </label>
          <input
            type="text"
            inputMode="decimal"
            value={height}
            onChange={(e) => setHeight(e.target.value)}
            placeholder="Ex: 240"
            className="w-full rounded-lg border border-brand-silver-400 px-3 py-2 focus:border-brand-navy-700 focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-brand-navy-800">
            Foto do ambiente (opcional)
          </label>
          <p className="mb-2 text-xs text-brand-silver-600">
            Envie uma foto do espaço onde vai colocar o móvel. Depois de montar
            a composição, você pode gerar uma visualização com IA mostrando os
            móveis já instalados nessa foto.
          </p>
          {roomPhoto ? (
            <div className="flex items-center gap-3">
              <img
                src={roomPhoto.previewUrl}
                alt="Prévia do ambiente"
                className="h-16 w-16 rounded-lg object-cover"
              />
              <button
                type="button"
                onClick={() => setRoomPhoto(null)}
                className="text-sm text-brand-navy-700 underline"
              >
                Remover foto
              </button>
            </div>
          ) : (
            <input
              type="file"
              accept="image/*"
              onChange={handlePhotoChange}
              disabled={processingPhoto}
              className="w-full text-sm text-brand-silver-700 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-navy-800 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-brand-navy-900"
            />
          )}
          {processingPhoto && <p className="mt-1 text-xs text-brand-silver-600">Processando foto...</p>}
          {photoError && <p className="mt-1 text-sm text-red-600">{photoError}</p>}
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          className="w-full rounded-lg bg-brand-navy-800 px-4 py-3 font-medium text-white transition hover:bg-brand-navy-900"
        >
          Começar a montar
        </button>
      </form>
      </div>
    </div>
  );
}
