/**
 * Desenho plano (sem profundidade/sombra), vista de FRENTE (elevacao),
 * igual ao resto do desenho da bancada/modulos -- NAO e uma cuba vista de
 * cima. Torneira de perfil alto/vertical (coluna reta com bica em L que
 * desce e curva de volta pra dentro da cuba) e pia retangular com cantos
 * bem arredondados e uma aba central de ralo na frente, conforme as fotos
 * de referencia do cliente (2026-08-21).
 *
 * O viewBox e a proporcao acima/abaixo da linha da bancada sao combinados
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
            {/* Torneira alta: capa no topo, coluna reta e bica em L com curva final */}
                <rect x="84" y="2" width="24" height="10" rx="2" fill="#6b787f" />
                <rect x="88.5" y="4.5" width="15" height="3" rx="1.5" fill="#57636a" />
                <rect x="91.5" y="10" width="9" height="52" rx="1.5" fill="#7c8a91" />
                <path
                          d="M96 58 L96 66 C96 70 100 70 105 70 L119 70 C123 70 123 74 123 78 C123 82 121 84 118 84"
                          stroke="#7c8a91"
                          strokeWidth="9"
                          fill="none"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
          
            {/* Frente do tanque, cantos bem arredondados, encaixado na bancada */}
                <rect x="14" y="82" width="172" height="34" rx="10" fill="#dbe2e6" stroke="#9aa7ae" strokeWidth="2.5" />
            {/* orelhas de fixacao nos cantos superiores, como na referencia */}
                <path d="M17 84 L8 77 L18 80 Z" fill="#9aa7ae" />
                <path d="M183 84 L192 77 L182 80 Z" fill="#9aa7ae" />
            {/* Friso do rebordo, logo abaixo da linha da bancada */}
                <rect x="14" y="82" width="172" height="6" fill="#c2ccd1" />
            {/* Aba do ralo, centralizada na frente do tanque */}
                <rect x="90" y="110" width="20" height="7" rx="3" fill="#9aa7ae" />
            {/* Sombra leve na base da frente do tanque, mesma linguagem visual do rodape dos modulos */}
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
</svg>
