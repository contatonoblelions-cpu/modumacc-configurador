import { getModulePhoto } from '../utils/modulePhotos';
import { getFinishSwatch } from '../utils/finishSwatches';

interface Props {
  name: string;
  finish?: string | null;
  className?: string;
}

/**
 * Foto REAL (não desenho) do formato do módulo — ver `utils/modulePhotos.ts`.
 * Fotografada neutra/cinza, e a cor do acabamento entra por cima via mistura
 * (`mix-blend-mode: multiply`) com a foto de acabamento (`finishSwatches.ts`)
 * quando o cliente já escolheu uma cor. Sem cor escolhida ainda, mostra a
 * foto neutra como veio — é a "foto real, como o produto é vendido" que
 * aparece de cara no catálogo, em vez de uma caixa genérica ou desenho.
 *
 * Duas camadas em vez de um único `background-image` porque `filter`
 * (usado pra dessaturar a base antes de misturar a cor) se aplica ao
 * elemento inteiro DEPOIS de qualquer blend — não dá pra dessaturar só a
 * camada de baixo com CSS puro num único elemento.
 *
 * Devolve `null` quando não existe foto pra esse formato ainda (módulos
 * fora dos 9 formatos mapeados) — quem chama deve cair no
 * `ModuleSchematic.tsx` (desenho) nesse caso.
 */
export function ModulePhoto({ name, finish, className }: Props) {
  const photoUrl = getModulePhoto(name);
  if (!photoUrl) return null;

  const finishImageUrl = getFinishSwatch(finish);

  return (
    <div className={`relative overflow-hidden ${className ?? ''}`}>
      <img
        src={photoUrl}
        alt={name}
        className="h-full w-full object-cover"
        style={finishImageUrl ? { filter: 'grayscale(1) brightness(1.2) contrast(0.9)' } : undefined}
      />
      {finishImageUrl && (
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            backgroundImage: `url(${finishImageUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            mixBlendMode: 'multiply',
          }}
        />
      )}
    </div>
  );
}

/** Se existe foto real pra esse módulo (usado pra decidir entre `ModulePhoto` e `ModuleSchematic`). */
export function hasModulePhoto(name: string): boolean {
  return getModulePhoto(name) !== null;
}

