import { useState, type FormEvent } from 'react';
import { useConfiguratorStore } from '../store/configuratorStore';

/**
 * Tela de entrada: o cliente informa a largura e a altura do espaço disponível
 * antes de começar a montar a composição.
 */
export function RoomSizeForm() {
  const setRoom = useConfiguratorStore((s) => s.setRoom);
  const [width, setWidth] = useState('');
  const [height, setHeight] = useState('');
  const [error, setError] = useState<string | null>(null);

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
      <h1 className="mb-2 text-2xl font-semibold text-brand-navy-900">Monte sua cozinha</h1>
      <p className="mb-8 text-brand-silver-700">
        Informe as medidas do espaço disponível. Você vai montar a composição
        arrastando os módulos dentro dessa largura.
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
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          className="w-full rounded-lg bg-brand-navy-800 px-4 py-3 font-medium text-white transition hover:bg-brand-navy-900"
        >
          Começar a montar
        </button>
      </form>
    </div>
  );
}
