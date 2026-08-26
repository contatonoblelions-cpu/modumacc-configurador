import { useConfiguratorStore } from '../store/configuratorStore';
import { ModulePhoto, hasModulePhoto } from './ModulePhoto';
import { ModuleSchematic } from './ModuleSchematic';
import { getFinishSwatch } from '../utils/finishSwatches';
import { getHandleColor } from '../utils/handleColors';
import { getCountertopRatio } from '../utils/bands';
import { FRIDGE_PHOTO } from '../utils/fridge';
import { STOVE_PHOTO } from '../utils/stove';

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
  const sink = useConfiguratorStore((s) => s.sink);
  const fridge = useConfiguratorStore((s) => s.fridge);
  const stove = useConfiguratorStore((s) => s.stove);

  if (!room) return null;
  const counterRatio = getCountertopRatio(room);
  const hasPhoto = Boolean(roomPhoto);

  return (
    <div>
      <div className="relative w-full overflow-hidden rounded-lg bg-brand-silver-100">
        {hasPhoto ? (
          <img src={roomPhoto!.previewUrl} alt="Foto do ambiente enviada" className="block w-full" />
        ) : (
          <div
            className="w-full"
            style={{
              aspectRatio: `${room.widthCm} / ${room.heightCm}`,
              backgroundImage:
                'linear-gradient(180deg, #eff2f3 0%, #dde3e5 88%, #cdbca0 88%, #cdbca0 100%)',
            }}
          />
        )}

        {/*
          Quadro com a composição montada, centralizado por cima da foto na
          proporção real do espaço informado (largura x altura). Cada módulo
          usa a MESMA posição (offsetXCm/offsetYCm) e tamanho (widthCm/
          heightCm) de `BuildCanvas.tsx`, só que em % relativo a esse quadro
          em vez de px — daí "precisa": é a montagem exata, só reposicionada
          pra caber em cima de qualquer foto.
        */}
        <div
          className={
            hasPhoto
              ? 'absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2'
              : 'absolute inset-0'
          }
          style={hasPhoto ? { width: '72%', aspectRatio: `${room.widthCm} / ${room.heightCm}` } : undefined}
        >
          <div className="relative h-full w-full drop-shadow-[0_4px_12px_rgba(0,0,0,0.35)]">
            {fridge && (
              <img
                src={FRIDGE_PHOTO}
                alt="Geladeira (referência)"
                className="absolute z-0 object-fill"
                style={{
                  left: `${(fridge.offsetXCm / room.widthCm) * 100}%`,
                  bottom: 0,
                  width: `${(fridge.widthCm / room.widthCm) * 100}%`,
                  height: `${(fridge.heightCm / room.heightCm) * 100}%`,
                }}
              />
            )}
            {stove && (
              <img
                src={STOVE_PHOTO}
                alt="Fogão (referência)"
                className="absolute z-0 object-fill"
                style={{
                  left: `${(stove.offsetXCm / room.widthCm) * 100}%`,
                  bottom: 0,
                  width: `${(stove.widthCm / room.widthCm) * 100}%`,
                  height: `${(stove.heightCm / room.heightCm) * 100}%`,
                }}
              />
            )}
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
            {sink && (
              <div
                className="absolute z-30"
                style={{
                  left: `${(sink.offsetXCm / room.widthCm) * 100}%`,
                  top: `${counterRatio * 100}%`,
                  width: `${(sink.widthCm / room.widthCm) * 100}%`,
                  height: '9%',
                }}
              >
                <div
                  className="absolute"
                  style={{
                    left: '46%',
                    bottom: '55%',
                    width: '6%',
                    height: '85%',
                    background: 'linear-gradient(90deg, #8a929a, #c8cfd5, #7d858c)',
                    borderRadius: 2,
                  }}
                />
                <div
                  className="absolute inset-x-0"
                  style={{
                    top: '55%',
                    height: '30%',
                    background: 'linear-gradient(180deg, #3a3f44 0%, #23272b 55%, #15181b 100%)',
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18)',
                    borderRadius: 2,
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <p className="mt-2 text-xs text-brand-silver-600">
        {hasPhoto
          ? 'Posição aproximada, centralizada sobre a foto — sem IA, é a colagem exata do que você montou.'
          : 'Prévia da composição num cenário neutro — sem IA, é a colagem exata do que você montou.'}{' '}
        Pra um render realista com luz e sombra, use "Refinar com IA" abaixo.
      </p>
    </div>
  );
}

