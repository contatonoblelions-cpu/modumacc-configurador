/**
 * Desenho plano (sem profundidade/sombra), vista de FRENTE (elevação),
 * igual ao resto do desenho da bancada/módulos -- NÃO é uma cuba vista de
 * cima (era esse o problema antes: a cuba antiga era desenhada olhando
 * pra dentro dela, de cima, enquanto tudo mais no BuildCanvas é desenhado
 * de frente). Aqui a pia aparece como a frente do tanque encaixado na
 * bancada (a faixa escura, ver `COUNTERTOP_RATIO` em `BuildCanvas.tsx`) e
 * a torneira em pé por cima, os dois vistos de frente.
 *
 * O viewBox e a proporção acima/abaixo da linha da bancada são combinados
 * com o posicionamento em `DraggableSink` (`BuildCanvas.tsx`): ~70% da
 * altura fica acima da linha da bancada (torneira) e ~30% abaixo (frente
 * do tanque).
 */
interface SinkFixtureProps {
  className?: string;
}

export function SinkFixture({ className }: SinkFixtureProps) {
  return (
    <svg
      viewBox="0 0 200 120"
      className={className}
      preserveAspectRatio="xMidYMid meet"
      aria-label="Pia com torneira"
    >
      {/* Torneira, vista de frente: coluna + bica curva, centralizada */}
      <rect x="93" y="18" width="14" height="50" rx="4" fill="#7c8a91" />
      <path d="M93 26 C 68 26, 62 40, 62 54" stroke="#7c8a91" strokeWidth="11" fill="none" strokeLinecap="round" />
      <circle cx="62" cy="54" r="5.5" fill="#5f6b71" />
      {/* Registro/manípulo */}
      <rect x="107" y="30" width="16" height="6" rx="3" fill="#8a969c" />

      {/* Frente do tanque, encaixado na bancada -- vista de frente, não de cima */}
      <rect x="14" y="82" width="172" height="34" rx="5" fill="#dbe2e6" stroke="#9aa7ae" strokeWidth="2.5" />
      {/* Friso do rebordo, logo abaixo da linha da bancada */}
      <rect x="14" y="82" width="172" height="6" fill="#c2ccd1" />
      {/* Sombra leve na base da frente do tanque, mesma linguagem visual do rodapé dos módulos */}
      <rect x="14" y="104" width="172" height="12" rx="5" fill="url(#sinkFrontShadow)" />
      <defs>
        <linearGradient id="sinkFrontShadow" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#000000" stopOpacity="0" />
          <stop offset="1" stopColor="#000000" stopOpacity="0.18" />
        </linearGradient>
      </defs>
    </svg>
  );
}
