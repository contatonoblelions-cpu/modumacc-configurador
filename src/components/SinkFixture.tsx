/**
 * Desenho plano (sem profundidade/sombra, ver remoção do IsoBevel) de uma
 * pia de cozinha com torneira, vista de frente -- usado só como um ícone
 * visual posicionado sobre a bancada (ver `DraggableSink` em
 * `BuildCanvas.tsx`), não representa um módulo real do catálogo.
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
      {/* Cuba da pia */}
      <rect x="10" y="30" width="180" height="80" rx="10" fill="#dfe6ea" stroke="#9aa7ae" strokeWidth="3" />
      <rect x="26" y="46" width="148" height="52" rx="8" fill="#c7d2d8" stroke="#9aa7ae" strokeWidth="2" />
      {/* Ralo */}
      <circle cx="100" cy="72" r="7" fill="#8a969c" />
      {/* Torneira */}
      <rect x="92" y="6" width="16" height="30" rx="4" fill="#7c8a91" />
      <path d="M92 14 C 60 14, 55 34, 55 46" stroke="#7c8a91" strokeWidth="12" fill="none" strokeLinecap="round" />
      <circle cx="55" cy="46" r="6" fill="#5f6b71" />
    </svg>
  );
}
