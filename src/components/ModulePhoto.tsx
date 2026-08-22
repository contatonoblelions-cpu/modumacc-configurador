import { getModulePhoto } from '../utils/modulePhotos';

interface Props {
          name: string;
          finish?: string | null;
          handle?: string | null;
          className?: string;
}

/**
 * Foto EXATA do módulo, já na cor/puxador escolhidos -- ver
 * `utils/modulePhotos.ts`.
 *
 * 2026-08-22: antes essa foto era sempre neutra e a cor/puxador eram
 * simulados por CSS (`mix-blend-mode: multiply` + faixas coloridas por
 * cima). Agora usamos a foto REAL de cada uma das 10 combinações de
 * acabamento x puxador, recortada do catálogo que o cliente enviou -- não
 * tem mais tingimento nenhum, só troca a imagem.
 *
 * Como sao fotos planas (sem margem de fundo), a imagem ESTICA pra
 * preencher a caixa inteira do modulo (`object-fill`, sem zoom nem corte)
 * -- assim os modulos ficam colados uns nos outros como um painel
 * continuo, sem sobra branca nem borda cortada.
 *
 * Devolve `null` quando nao existe imagem pra esse formato -- quem chama
 * cai no `ModuleSchematic.tsx` nesse caso.
 */
export function ModulePhoto({ name, finish, handle, className }: Props) {
          const photoUrl = getModulePhoto(name, finish, handle);
          if (!photoUrl) return null;

  return (
              <div className={`relative overflow-hidden ${className ?? ''}`}>
                            <img src={photoUrl} alt={name} className="h-full w-full object-fill" />
              </div>
            );
}

export function hasModulePhoto(name: string): boolean {
          return getModulePhoto(name) !== null;
}
