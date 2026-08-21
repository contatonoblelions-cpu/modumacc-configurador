import { getModulePhoto, getModuleShapeKey } from '../utils/modulePhotos';
import { getFinishSwatch } from '../utils/finishSwatches';

interface Props {
      name: string;
      finish?: string | null;
      className?: string;
}

/**
 * Imagem 2D CHAPADA (desenho plano, sem perspectiva/sombra) do formato do
 * modulo -- ver `utils/modulePhotos.ts`.
 *
 * `finish` agora TINGE o desenho usando a FOTO REAL do acabamento (ver
 * `utils/finishSwatches.ts` -- as mesmas 5 fotos de material, com textura
 * de madeira quando o acabamento tem veio, ja confirmadas com o cliente),
 * sobreposta com `mix-blend-mode: multiply`. Antes usava uma cor solida
 * (hex) aproximada; agora usa a foto real do MDF pra ficar fiel a cor E a
 * textura de verdade, nao so um tom parecido.
 *
 * Excecoes que NAO recebem tingimento:
 * - Acabamento "Branco" (ou nenhum selecionado): o desenho ja e branco.
 * - Modulo "microondas": e um NICHO ABERTO pra encaixar o eletrodomestico
 *   do cliente (nao vem com porta) -- a foto e quase toda o proprio
 *   micro-ondas (metal/vidro), entao tingir pintaria o eletrodomestico
 *   junto, o que nao faz sentido. Fica sempre neutro.
 *
 * Como sao desenhos planos (e nao fotos com margem de fundo), a imagem
 * ESTICA pra preencher a caixa inteira do modulo (`object-fill`, sem zoom
 * nem corte) -- assim os modulos ficam colados uns nos outros como um painel
 * continuo, sem sobra branca nem borda cortada.
 *
 * Devolve `null` quando nao existe imagem pra esse formato -- quem chama cai
 * no `ModuleSchematic.tsx` nesse caso.
 */
export function ModulePhoto({ name, finish, className }: Props) {
      const photoUrl = getModulePhoto(name);
      if (!photoUrl) return null;

  const shapeKey = getModuleShapeKey(name);
      const tintUrl =
              finish && finish !== 'Branco' && shapeKey !== 'microondas' ? getFinishSwatch(finish) : null;

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
          </div>
        );
}

/** Se existe imagem 2D pra esse modulo (usado pra decidir entre `ModulePhoto` e `ModuleSchematic`). */
export function hasModulePhoto(name: string): boolean {
      return getModulePhoto(name) !== null;
}
