import { useState, type ChangeEvent, type FormEvent } from 'react';
import { useConfiguratorStore } from '../store/configuratorStore';
import { resizeImageToBase64 } from '../utils/imageResize';

/**
 * Tela de entrada: o cliente informa a largura e a altura do espaço disponível
 * antes de começar a montar a composição, e opcionalmente sobe uma foto do
 * ambiente — usada depois pra gerar uma visualização com IA.
 */
export function RoomSizeForm() {
  const setRoom = useConfiguratorStore((s) => s.setRoom);
  const setRoomPhoto = useConfiguratorStore((s) => s.setRoomPhoto);
  const roomPhoto = useConfiguratorStore((s) => s.roomPhoto);
  const [width, setWidth] = useState('');
  const [height, setHeight] = useState('');
  const [sinkWidth, setSinkWidth] = useState('');
  const [includeFridge, setIncludeFridge] = useState(false);
  const [fridgeWidth, setFridgeWidth] = useState('');
  const [fridgeHeight, setFridgeHeight] = useState('');
  const [includeStove, setIncludeStove] = useState(false);
  const [stoveWidth, setStoveWidth] = useState('');
  const [stoveHeight, setStoveHeight] = useState('');
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
    let sinkWidthCm: number | undefined;
    if (sinkWidth.trim() !== '') {
      const parsedSink = parseFloat(sinkWidth.replace(',', '.'));
      if (!parsedSink || parsedSink <= 0) {
        setError('Informe uma largura de pia válida, em centímetros.');
        return;
      }
      if (parsedSink > widthCm) {
        setError('A largura da pia não pode ser maior que a largura do espaço.');
        return;
      }
      sinkWidthCm = parsedSink;
    }
    let fridgeWidthCm: number | undefined;
    let fridgeHeightCm: number | undefined;
    if (includeFridge) {
      if (fridgeWidth.trim() !== '') {
        const fw = parseFloat(fridgeWidth.replace(',', '.'));
        if (!fw || fw <= 0) {
          setError('Informe uma largura de geladeira válida, em centímetros.');
          return;
        }
        if (fw > widthCm) {
          setError('A largura da geladeira não pode ser maior que a largura do espaço.');
          return;
        }
        fridgeWidthCm = fw;
      }
      if (fridgeHeight.trim() !== '') {
        const fh = parseFloat(fridgeHeight.replace(',', '.'));
        if (!fh || fh <= 0) {
          setError('Informe uma altura de geladeira válida, em centímetros.');
          return;
        }
        if (fh > heightCm) {
          setError('A altura da geladeira não pode ser maior que a altura do espaço.');
          return;
        }
        fridgeHeightCm = fh;
      }
    }
    let stoveWidthCm: number | undefined;
    let stoveHeightCm: number | undefined;
    if (includeStove) {
      if (stoveWidth.trim() !== '') {
        const sw = parseFloat(stoveWidth.replace(',', '.'));
        if (!sw || sw <= 0) {
          setError('Informe uma largura de fogão válida, em centímetros.');
          return;
        }
        if (sw > widthCm) {
          setError('A largura do fogão não pode ser maior que a largura do espaço.');
          return;
        }
        stoveWidthCm = sw;
      }
      if (stoveHeight.trim() !== '') {
        const sh = parseFloat(stoveHeight.replace(',', '.'));
        if (!sh || sh <= 0) {
          setError('Informe uma altura de fogão válida, em centímetros.');
          return;
        }
        if (sh > heightCm) {
          setError('A altura do fogão não pode ser maior que a altura do espaço.');
          return;
        }
        stoveHeightCm = sh;
      }
    }
    setError(null);
    setRoom({ widthCm, heightCm, sinkWidthCm, includeFridge, fridgeWidthCm, fridgeHeightCm, includeStove, stoveWidthCm, stoveHeightCm });
  }

  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-md flex-1 flex-col justify-center px-4">
      <div className="rounded-2xl border border-white/60 bg-white/70 p-8 shadow-xl shadow-brand-navy-900/5 backdrop-blur-xl">
      <h1 className="mb-2 text-2xl font-semibold text-brand-navy-900">Monte sua cozinha</h1>
      <p className="mb-8 text-brand-silver-700">
        Informe as medidas do espaço disponível. Você vai montar a parede
        arrastando os módulos e soltando em qualquer ponto do quadrante —
        livre, do jeito que preferir montar sua cozinha — ou tocando em
        "+ Adicionar" pra ir direto pro primeiro espaço livre.
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
            Largura da pia (cm) — opcional
          </label>
          <p className="mb-2 text-xs text-brand-silver-600">
            Se informar, a pia com torneira aparece sobre a bancada e você pode arrastá-la pra qualquer ponto do balcão.
          </p>
          <input
            type="text"
            inputMode="decimal"
            value={sinkWidth}
            onChange={(e) => setSinkWidth(e.target.value)}
            placeholder="Ex: 80"
            className="w-full rounded-lg border border-brand-silver-400 px-3 py-2 focus:border-brand-navy-700 focus:outline-none"
          />
        </div>

        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-brand-navy-800">
            <input
              type="checkbox"
              checked={includeFridge}
              onChange={(e) => setIncludeFridge(e.target.checked)}
              className="h-4 w-4 rounded border-brand-silver-400 text-brand-navy-800 focus:ring-brand-navy-700"
            />
            Incluir geladeira (referência visual)
          </label>
          <p className="mt-1 text-xs text-brand-silver-600">
            Mostra uma geladeira em tamanho real na parede, só como referência
            pra planejar o espaço — não é um produto vendável, não entra no
            carrinho. Você pode arrastá-la pra qualquer ponto do balcão.
          </p>
          {includeFridge && (
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-brand-navy-800">
                  Largura da geladeira (cm)
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={fridgeWidth}
                  onChange={(e) => setFridgeWidth(e.target.value)}
                  placeholder="Ex: 70"
                  className="w-full rounded-lg border border-brand-silver-400 px-3 py-2 text-sm focus:border-brand-navy-700 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-brand-navy-800">
                  Altura da geladeira (cm)
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={fridgeHeight}
                  onChange={(e) => setFridgeHeight(e.target.value)}
                  placeholder="Ex: 180"
                  className="w-full rounded-lg border border-brand-silver-400 px-3 py-2 text-sm focus:border-brand-navy-700 focus:outline-none"
                />
              </div>
            </div>
          )}
        </div>

        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-brand-navy-800">
            <input
              type="checkbox"
              checked={includeStove}
              onChange={(e) => setIncludeStove(e.target.checked)}
              className="h-4 w-4 rounded border-brand-silver-400 text-brand-navy-800 focus:ring-brand-navy-700"
            />
            Incluir fogão (referência visual)
          </label>
          <p className="mt-1 text-xs text-brand-silver-600">
            Mostra um fogão em tamanho real na parede, só como referência —
            não é um produto vendável, não entra no carrinho. Você pode
            arrastá-lo pra qualquer ponto do balcão. Padrão: 4 bocas (52 x 90cm).
          </p>
          {includeStove && (
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-brand-navy-800">
                  Largura do fogão (cm)
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={stoveWidth}
                  onChange={(e) => setStoveWidth(e.target.value)}
                  placeholder="Ex: 52 (4b) · 76 (5/6b)"
                  className="w-full rounded-lg border border-brand-silver-400 px-3 py-2 text-sm focus:border-brand-navy-700 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-brand-navy-800">
                  Altura do fogão (cm)
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={stoveHeight}
                  onChange={(e) => setStoveHeight(e.target.value)}
                  placeholder="Ex: 90"
                  className="w-full rounded-lg border border-brand-silver-400 px-3 py-2 text-sm focus:border-brand-navy-700 focus:outline-none"
                />
              </div>
            </div>
          )}
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
          className="w-full rounded-lg bg-brand-navy-800 px-4 py-3 font-medium text-white transition hover:bg-brand-navy-900">
          Começar a montar
        </button>
      </form>
      </div>
    </div>
  );
}
