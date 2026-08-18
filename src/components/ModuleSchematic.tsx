import { useId } from 'react';
import { parseModuleVisual } from '../utils/schematic';

interface Props {
  name: string;
  className?: string;
  /**
   * URL da foto do acabamento selecionado (ver `utils/finishSwatches.ts`) —
   * quando presente, vira o preenchimento (`fill`) das portas/gavetas/nicho
   * do desenho via `<pattern>`, mostrando o material real (cor/textura da
   * Modumacc) em vez do cinza genérico. `undefined`/`null` mantém o visual
   * antigo (cinza), então isso é sempre opcional.
   */
  finishImageUrl?: string | null;
}

/**
 * Desenho esquematico da peca (portas, gavetas, nicho, microondas,
 * basculante...) em vez da foto real do produto (ver `utils/schematic.ts`
 * pra entender por que: a foto no site mostra a cozinha inteira montada,
 * nao so a peca isolada, o que confunde na hora de montar a parede). O
 * FORMATO da peça continua sendo esse desenho vetorial — só a COR/textura
 * de dentro dele é que agora pode vir de uma foto real de acabamento, via
 * `finishImageUrl` (ver `utils/finishSwatches.ts`).
 *
 * `preserveAspectRatio="none"` de proposito: o desenho estica pra preencher
 * a caixa (que ja reflete a largura real em cm via `scale`, ver
 * `BuildCanvas.tsx`), entao a propria proporcao do desenho ja comunica se e
 * uma peca larga ou estreita.
 */
export function ModuleSchematic({ name, className, finishImageUrl }: Props) {
  const { type, count } = parseModuleVisual(name);
  const patternId = useId();
  const fill = finishImageUrl ? `url(#${patternId})` : '#F5F7F7';

  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className={className} aria-hidden="true">
      {finishImageUrl && (
        <defs>
          <pattern id={patternId} patternUnits="objectBoundingBox" width="1" height="1">
            <image href={finishImageUrl} x="0" y="0" width="100" height="100" preserveAspectRatio="xMidYMid slice" />
          </pattern>
        </defs>
      )}
      <rect x="0" y="0" width="100" height="100" fill="#F5F7F7" />
      {type === 'porta' && <Portas count={count} fill={fill} />}
      {type === 'gaveta' && <Gavetas count={count} fill={fill} />}
      {type === 'nicho' && <Nicho fill={fill} />}
      {type === 'microondas' && <Microondas fill={fill} />}
      {type === 'basculante' && <Basculante fill={fill} />}
      {type === 'generic' && <Generic fill={fill} />}
    </svg>
  );
}

function Portas({ count, fill }: { count: number; fill: string }) {
  const n = Math.max(1, count);
  const panelWidth = 96 / n;
  return (
    <>
      {Array.from({ length: n }, (_, i) => {
        const x = 2 + i * panelWidth;
        // Puxador sempre perto da junta central (perto da borda interna de
        // cada porta) — dobradiça implícita do lado de fora.
        const handleNearRight = n === 1 || i === 0;
        const handleX = handleNearRight ? x + panelWidth - 10 : x + 7;
        return (
          <g key={i}>
            <rect x={x} y={2} width={panelWidth - 1} height={96} fill={fill} stroke="#2E5A79" strokeWidth={2.5} />
            <rect x={handleX} y={46} width={3} height={10} rx={1.5} fill="#1A3F61" />
          </g>
        );
      })}
    </>
  );
}

function Gavetas({ count, fill }: { count: number; fill: string }) {
  const n = Math.max(1, count);
  const panelHeight = 96 / n;
  return (
    <>
      {Array.from({ length: n }, (_, i) => {
        const y = 2 + i * panelHeight;
        return (
          <g key={i}>
            <rect x={2} y={y} width={96} height={panelHeight - 1} fill={fill} stroke="#2E5A79" strokeWidth={2.5} />
            <rect x={40} y={y + panelHeight / 2 - 1.5} width={20} height={3} rx={1.5} fill="#1A3F61" />
          </g>
        );
      })}
    </>
  );
}

function Nicho({ fill }: { fill: string }) {
  return (
    <>
      <rect x="2" y="2" width="96" height="96" fill={fill} stroke="#2E5A79" strokeWidth={2.5} strokeDasharray="5 3" />
      <line x1="2" y1="52" x2="98" y2="52" stroke="#6B8285" strokeWidth={2} />
    </>
  );
}

function Microondas({ fill }: { fill: string }) {
  return (
    <>
      <rect x="2" y="2" width="96" height="96" fill={fill} stroke="#2E5A79" strokeWidth={2.5} />
      <rect x="16" y="28" width="68" height="44" rx="3" fill="#DCE3E4" stroke="#3D6D8F" strokeWidth={2} />
      <rect x="22" y="34" width="42" height="32" fill="#B4C2C4" />
      <circle cx="74" cy="50" r="4" fill="#1A3F61" />
    </>
  );
}

function Basculante({ fill }: { fill: string }) {
  return (
    <>
      <rect x="2" y="2" width="96" height="96" fill={fill} stroke="#2E5A79" strokeWidth={2.5} />
      <rect x="2" y="2" width="96" height="6" fill="#1A3F61" />
      <path d="M 28 94 L 50 76 L 72 94" fill="none" stroke="#6B8285" strokeWidth={2.5} strokeDasharray="4 3" />
    </>
  );
}

function Generic({ fill }: { fill: string }) {
  return <rect x="2" y="2" width="96" height="96" fill={fill} stroke="#2E5A79" strokeWidth={2.5} />;
}
