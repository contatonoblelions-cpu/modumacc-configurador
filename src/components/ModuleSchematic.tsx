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
  /**
   * Cor do puxador selecionado (ver `utils/handleColors.ts`) — quando
   * presente, colore o puxador desenhado (o traço/retângulo pequeno que
   * representa a alça) com um tom aproximado do metal real (Alumínio
   * prateado, Bronze dourado-escuro). `undefined`/`null` mantém a cor
   * padrão antiga (azul-marinho escuro).
   */
  handleColor?: { fill: string; stroke: string } | null;
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
export function ModuleSchematic({ name, className, finishImageUrl, handleColor }: Props) {
  const { type, count } = parseModuleVisual(name);
  const patternId = useId();
  const fill = finishImageUrl ? `url(#${patternId})` : '#F5F7F7';
  const handleFill = handleColor?.fill ?? '#1A3F61';
  const handleStroke = handleColor?.stroke;

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
      {type === 'porta' && <Portas count={count} fill={fill} handleFill={handleFill} handleStroke={handleStroke} />}
      {type === 'gaveta' && <Gavetas count={count} fill={fill} handleFill={handleFill} handleStroke={handleStroke} />}
      {type === 'nicho' && <Nicho fill={fill} handleFill={handleFill} handleStroke={handleStroke} />}
      {type === 'microondas' && <Microondas fill={fill} handleFill={handleFill} handleStroke={handleStroke} />}
      {type === 'basculante' && <Basculante fill={fill} />}
      {type === 'generic' && <Generic fill={fill} />}
    </svg>
  );
}

interface HandleProps {
  handleFill: string;
  handleStroke?: string;
}

function Portas({ count, fill, handleFill, handleStroke }: { count: number; fill: string } & HandleProps) {
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
            <rect
              x={handleX}
              y={46}
              width={3}
              height={10}
              rx={1.5}
              fill={handleFill}
              stroke={handleStroke}
              strokeWidth={handleStroke ? 0.5 : 0}
            />
          </g>
        );
      })}
    </>
  );
}

function Gavetas({ count, fill, handleFill, handleStroke }: { count: number; fill: string } & HandleProps) {
  const n = Math.max(1, count);
  const panelHeight = 96 / n;
  return (
    <>
      {Array.from({ length: n }, (_, i) => {
        const y = 2 + i * panelHeight;
        return (
          <g key={i}>
            <rect x={2} y={y} width={96} height={panelHeight - 1} fill={fill} stroke="#2E5A79" strokeWidth={2.5} />
            <rect
              x={40}
              y={y + panelHeight / 2 - 1.5}
              width={20}
              height={3}
              rx={1.5}
              fill={handleFill}
              stroke={handleStroke}
              strokeWidth={handleStroke ? 0.5 : 0}
            />
          </g>
        );
      })}
    </>
  );
}

function Nicho({ fill, handleFill, handleStroke }: { fill: string } & HandleProps) {
  // Apesar do nome "Nichos" no catalogo, a peca real e um armario fechado
  // com porta e puxador (ver foto do produto) - nao um nicho aberto/vazado.
  // Por isso o desenho e o mesmo de uma porta unica, sem linha de prateleira
  // nem borda tracejada (que antes dava a impressao errada de vao aberto).
  return (
    <>
      <rect x="2" y="2" width="96" height="96" fill={fill} stroke="#2E5A79" strokeWidth={2.5} />
      <rect
        x={8}
        y={46}
        width={3}
        height={10}
        rx={1.5}
        fill={handleFill}
        stroke={handleStroke}
        strokeWidth={handleStroke ? 0.5 : 0}
      />
    </>
  );
}

function Microondas({ fill, handleFill, handleStroke }: { fill: string } & HandleProps) {
  return (
    <>
      <rect x="2" y="2" width="96" height="96" fill={fill} stroke="#2E5A79" strokeWidth={2.5} />
      <rect x="16" y="28" width="68" height="44" rx="3" fill="#DCE3E4" stroke="#3D6D8F" strokeWidth={2} />
      <rect x="22" y="34" width="42" height="32" fill="#B4C2C4" />
      <circle cx="74" cy="50" r="4" fill={handleFill} stroke={handleStroke} strokeWidth={handleStroke ? 0.5 : 0} />
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
