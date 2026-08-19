import { getModulePhoto } from '../utils/modulePhotos';

interface Props {
  name: string;
  finish?: string | null;
  className?: string;
}

/**
 * Foto REAL (não desenho) do formato do módulo — ver `utils/modulePhotos.ts`.
 *
 * Essas fotos vieram diretamente do cliente (acabamento Branco) e, por
 * pedido dele, viram a foto-base pra QUALQUER acabamento selecionado — sem
 * mistura de cor por cima (`mix-blend-mode`) como na leva anterior gerada
 * por IA. `finish` continua recebido (quem chama ainda escolhe a cor em
 * outros lugares da tela, tipo o seletor de acabamento) mas não afeta mais
 * a foto em si, até termos fotos reais por cor de novo.
 *
 * Devolve `null` quando não existe foto pra esse formato ainda (módulos
 * fora dos formatos mapeados) — quem chama deve cair no
 * `ModuleSchematic.tsx` (desenho) nesse caso.
 *
 * `PHOTO_ZOOM` dá um zoom extra por CIMA do `object-cover` padrão, cortando
 * a margem de fundo branco ao redor do móvel nas fotos — pedido do
 * cliente: painel contínuo, sem sobra visível quando os módulos ficam
 * colados uns nos outros na parede.
 */
const PHOTO_ZOOM = 1.15;

export function ModulePhoto({ name, className }: Props) {
  const photoUrl = getModulePhoto(name);
  if (!photoUrl) return null;

  return (
    <div className={`relative overflow-hidden ${className ?? ''}`}>
      <img
        src={photoUrl}
        alt={name}
        className="h-full w-full object-cover"
        style={{ transform: `scale(${PHOTO_ZOOM})` }}
      />
    </div>
  );
}

/** Se existe foto real pra esse módulo (usado pra decidir entre `ModulePhoto` e `ModuleSchematic`). */
export function hasModulePhoto(name: string): boolean {
  return getModulePhoto(name) !== null;
}
