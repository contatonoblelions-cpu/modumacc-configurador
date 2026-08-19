import { getModulePhoto } from '../utils/modulePhotos';

interface Props {
  name: string;
  finish?: string | null;
  className?: string;
}

/**
 * Imagem 2D CHAPADA (desenho plano, sem perspectiva/sombra) do formato do
 * módulo — ver `utils/modulePhotos.ts`. A pedido do cliente, TODOS os
 * módulos usam essas 5 imagens planas embutidas (base64), no lugar das
 * fotos. `finish` continua recebido por compatibilidade, mas não altera a
 * imagem (os desenhos são sempre brancos).
 *
 * Como são desenhos planos (e não fotos com margem de fundo), a imagem
 * ESTICA pra preencher a caixa inteira do módulo (`object-fill`, sem zoom
 * nem corte) — assim os módulos ficam colados uns nos outros como um painel
 * contínuo, sem sobra branca nem borda cortada.
 *
 * Devolve `null` quando não existe imagem pra esse formato — quem chama cai
 * no `ModuleSchematic.tsx` nesse caso.
 */
export function ModulePhoto({ name, className }: Props) {
  const photoUrl = getModulePhoto(name);
  if (!photoUrl) return null;

  return (
    <div className={`relative overflow-hidden ${className ?? ''}`}>
      <img src={photoUrl} alt={name} className="h-full w-full object-fill" />
    </div>
  );
}

/** Se existe imagem 2D pra esse módulo (usado pra decidir entre `ModulePhoto` e `ModuleSchematic`). */
export function hasModulePhoto(name: string): boolean {
  return getModulePhoto(name) !== null;
}
