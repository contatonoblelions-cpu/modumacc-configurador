import { useConfiguratorStore } from '../store/configuratorStore';
import { ModulePhoto, hasModulePhoto } from './ModulePhoto';
import { ModuleSchematic } from './ModuleSchematic';
import { getFinishSwatch } from '../utils/finishSwatches';
import { getHandleColor } from '../utils/handleColors';

/**
 * Colagem PRECISA — cola as fotos reais dos módulos (já na cor certa,
 * `ModulePhoto.tsx`) direto em cima da foto do ambiente que o cliente
 * enviou, na posição e proporção exatas da composição que ele montou.
 *
 * Diferente do botão "Gerar com IA" (`generateAiRender` na store, que manda
 * tudo pro Gemini RECRIAR a cena do zero) — aqui não tem IA nenhuma, é um
 * recorte-e-cola de verdade: instantâneo, sem custo, e garantidamente fiel
 * ao que foi montado (mesma posição/proporção, sem "imaginação" da IA).
 * Compensação: como não sabemos onde fica a parede de verdade na foto (não
 * tem detecção de perspectiva), o quadro fica centralizado por cima da foto
 * — é uma aproximação da posição, não um encaixe perspectivamente correto
 * como seria com visão computacional. Por isso a legenda avisando disso, e
 * o botão "Refinar com IA" logo ao lado pra quem quiser o acabamento
 * realista (luz/sombra) por cima.
 */
export function PhotoCollage() {
  const roomPhoto = useConfiguratorStore((s) => s.roomPhoto);
  const room = useConfiguratorStore((s) => s.room);
  const modules = useConfiguratorStore((s) => s.modules);
  const finish = useConfiguratorStore((s) => s.finish);
  const finishImageUrl = getFinishSwatch(finish);
  const handle = useConfiguratorStore((s) => s.handle);
  const handleColor = getHandleColor(handle);

  if (!roomPhoto || !room) return null;

  return (
    <div>
      <div className="relative w-full overflow-hidden rounded-lg bg-brand-silver-100">
        <img src={roomPhoto.previewUrl} alt="Foto do ambiente enviada" className="block w-full" />

        {/*
          Quadro com a composição montada, centralizado por cima da foto na
          proporção real do espaço informado (largura x altura). Cada módulo
          usa a MESMA posição (offsetXCm/offsetYCm) e tamanho (widthCm/
          heightCm) de `BuildCanvas.tsx`, só que em % relativo a esse quadro
          em vez de px — daí "precisa": é a montagem exata, só reposicionada
          pra caber em cima de qualquer foto.
        */}
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{
            width: '72%',
            aspectRatio: `${room.widthCm} / ${room.heightCm}`,
          }}
        >
          <div className="relative h-full w-full drop-shadow-[0_4px_12px_rgba(0,0,0,0.35)]">
            {modules.map((m) => {
              const left = (m.offsetXCm / room.widthCm) * 100;
              const top = (m.offsetYCm / room.heightCm) * 100;
              const width = (m.widthCm / room.widthCm) * 100;
              const height = (m.heightCm / room.heightCm) * 100;
              const hasPhoto = hasModulePhoto(m.moduleName);

              return (
                <div
                  key={m.instanceId}
                  className="absolute overflow-hidden rounded-[2px] ring-1 ring-black/10"
                  style={{
                    left: `${left}%`,
                    top: `${top}%`,
                    width: `${width}%`,
                    height: `${height}%`,
                  }}
                >
                  {hasPhoto ? (
                                  <ModulePhoto name={m.moduleName} finish={finish} handle={handle} className="h-full w-full" />
                  ) : (
                    <ModuleSchematic
                      name={m.moduleName}
                      finishImageUrl={finishImageUrl}
                      handleColor={handleColor}
                      className="h-full w-full"
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <p className="mt-2 text-xs text-brand-silver-600">
        Posição aproximada, centralizada sobre a foto — sem IA, é a colagem exata do que você montou.
        Pra um render realista com luz e sombra, use "Refinar com IA" abaixo.
      </p>
    </div>
  );
}

