/**
 * So a TORNEIRA (a cuba/tanque nao e mais desenhada -- 2026-08-25 a pedido do
 * cliente). Vista de frente, coluna reta com bica em L. A "pia" em si passou
 * a ser representada por um segmento escuro da linha da bancada, desenhado em
 * `DraggableSink` (BuildCanvas.tsx), do tamanho (largura) informado e que
 * desliza pela linha que divide os modulos superiores dos inferiores.
 */
interface SinkFixtureProps {
    className?: string;
}

export function SinkFixture({ className }: SinkFixtureProps) {
    return (
          <svg
                  viewBox="0 0 40 84"
                  className={className}
                  preserveAspectRatio="xMidYMax meet"
                  aria-label="Torneira"
                >
            <rect x="13" y="2" width="14" height="7" rx="2.5" fill="#6b787f" />
                <rect x="16" y="6" width="8" height="3" rx="1.5" fill="#57636a" />
                <rect x="16.5" y="9" width="7" height="46" rx="2" fill="#7c8a91" />
                <path
                          d="M20 52 L20 60 C20 66 26 66 31 66 L36 66 C39 66 39 70 39 73"
                          stroke="#7c8a91"
                          strokeWidth="7"
                          fill="none"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
          </svg>
        );
}
