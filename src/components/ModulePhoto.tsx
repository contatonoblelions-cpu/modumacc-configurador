import { getModulePhoto, getModuleShapeKey } from '../utils/modulePhotos';
import { getFinishSwatch } from '../utils/finishSwatches';
import { getHandleColor } from '../utils/handleColors';

interface Props {
        name: string;
        finish?: string | null;
        handle?: string | null;
        className?: string;
}

/**
 * Faixas da "gola" (friso metalico usado como puxador) em cada foto real,
 * como fracao (0-100) da altura da peca -- modulos de PAREDE (superior,
 * nicho) tem a gola na borda de BAIXO da porta (alcance de cima pra baixo),
 * modulos de CHAO (base) tem na borda de CIMA (alcance de baixo pra cima).
 * Gavetas tem uma gola na borda de baixo de CADA gaveta. Microondas e
 * basculante nao tem puxador de gola de verdade (nao editavel por cor).
 */
const STRIP_HEIGHT_PCT = 8;

function getHandleStrips(shapeKey: string): { top: number; height: number }[] {
        switch (shapeKey) {
              case 'porta-1-superior':
              case 'porta-2-superior':
              case 'nicho':
                          return [{ top: 100 - STRIP_HEIGHT_PCT, height: STRIP_HEIGHT_PCT }];
              case 'porta-1-base':
              case 'porta-2-base':
                          return [{ top: 0, height: STRIP_HEIGHT_PCT }];
              case 'gaveta-2':
                          return [0, 1].map((i) => ({ top: (i + 1) * 50 - STRIP_HEIGHT_PCT, height: STRIP_HEIGHT_PCT }));
              case 'gaveta-3':
                          return [0, 1, 2].map((i) => ({
                                        top: (i + 1) * (100 / 3) - STRIP_HEIGHT_PCT,
                                        height: STRIP_HEIGHT_PCT,
                          }));
              default:
                          return [];
        }
}

/**
 * Imagem 2D CHAPADA (desenho plano, sem perspectiva/sombra) do formato do
 * modulo -- ver `utils/modulePhotos.ts`.
 *
 * `finish` tinge o desenho usando a FOTO REAL do acabamento (ver
 * `utils/finishSwatches.ts`), sobreposta com `mix-blend-mode: multiply`.
 *
 * `handle` tinge só a faixa da "gola" (friso do puxador) quando for
 * "Bronze" -- Aluminio ja e a cor padrao que sai nas fotos reais, entao so
 * precisamos sobrepor cor quando o cliente escolhe Bronze.
 *
 * Excecoes que NAO recebem tingimento:
 * - Acabamento "Branco" (ou nenhum selecionado): o desenho ja e branco.
 * - Modulo "microondas": e um NICHO ABERTO pra encaixar o eletrodomestico
 *   do cliente (nao vem com porta) -- a foto e quase toda o proprio
 *   micro-ondas (metal/vidro), entao tingir pintaria o eletrodomestico
 *   junto, o que nao faz sentido. Fica sempre neutro (cor e puxador).
 * - Modulo "basculante": nao tem puxador de gola (so a dobradica/aba).
 *
 * Como sao desenhos planos (e nao fotos com margem de fundo), a imagem
 * ESTICA pra preencher a caixa inteira do modulo (`object-fill`, sem zoom
 * nem corte) -- assim os modulos ficam colados uns nos outros como um painel
 * continuo, sem sobra branca nem borda cortada.
 *
 * Devolve `null` quando nao existe imagem pra esse formato -- quem chama cai
 * no `ModuleSchematic.tsx` nesse caso.
 */
export function ModulePhoto({ name, finish, handle, className }: Props) {
        const photoUrl = getModulePhoto(name);
        if (!photoUrl) return null;

  const shapeKey = getModuleShapeKey(name);
        const tintUrl =
                  finish && finish !== 'Branco' && shapeKey !== 'microondas' ? getFinishSwatch(finish) : null;

  const handleColor =
            handle === 'Bronze' && shapeKey !== 'microondas' && shapeKey !== 'basculante'
            ? getHandleColor(handle)
              : null;
        const strips = handleColor ? getHandleStrips(shapeKey) : [];

  return (
            <div className={`relative overflow-hidden ${className ?? ''}`}>
                        <img src={photoUrl} alt={name} className="h-full w-full object-fill" />
                  {tintUrl && (
                          <img
                                          aria-hidden="true"
                                          src={tintUrl}
                                          alt=""
                                          className="absolute inset-0 h-full w-full object-cover"
                                          style={{ mixBlendMode: 'multiply' }}
                                        />
                        )}
                  {handleColor &&
                                strips.map((strip, i) => (
                                                <div
                                                                  key={i}
                                                                  aria-hidden="true"
                                                                  className="absolute inset-x-0"
                                                                  style={{
                                                                                      top: `${strip.top}%`,
                                                                                      height: `${strip.height}%`,
                                                                                      backgroundColor: handleColor.fill,
                                                                                      mixBlendMode: 'multiply',
                                                                  }}
                                                                />
                                              ))}
            </div>
          );
}

export function hasModulePhoto(name: string): boolean {
        return getModulePhoto(name) !== null;
}
