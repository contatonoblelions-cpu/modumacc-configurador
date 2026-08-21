import { getModulePhoto } from '../utils/modulePhotos';
import { getFinishColor } from '../utils/finishColors';

interface Props {
    name: string;
    finish?: string | null;
    className?: string;
}

/**
 * Imagem 2D CHAPADA (desenho plano, sem perspectiva/sombra) do formato do
 * modulo -- ver `utils/modulePhotos.ts`. A pedido do cliente, TODOS os
 * modulos usam essas 5 imagens planas embutidas (base64), no lugar das
 * fotos antigas.
 *
 * `finish` agora TINGE o desenho: como as imagens sao um desenho branco
 * com linhas escuras (sem textura de madeira), aplicamos uma camada de cor
 * por cima com `mix-blend-mode: multiply` (ver `utils/finishColors.ts`) --
 * o branco vira a cor escolhida e as linhas escuras continuam escuras, sem
 * precisar de uma foto nova por combinacao modulo x cor. Acabamento
 * "Branco" (ou nenhum selecionado) nao aplica overlay nenhum.
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
    const tintColor = getFinishColor(finish);

  return (
        <div className={`relative overflow-hidden ${className ?? ''}`}>
                <img src={photoUrl} alt={name} className="h-full w-full object-fill" />
          {tintColor && (
                  <div
                              aria-hidden="true"
                              className="absolute inset-0"
                              style={{ backgroundColor: tintColor, mixBlendMode: 'multiply' }}
                            />
                )}
        </div>
      );
}

/** Se existe imagem 2D pra esse modulo (usado pra decidir entre `ModulePhoto` e `ModuleSchematic`). */
export function hasModulePhoto(name: string): boolean {
    return getModulePhoto(name) !== null;
}
