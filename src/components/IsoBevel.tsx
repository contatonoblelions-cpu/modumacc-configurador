interface Props {
  /** Profundidade do "chanfro" 3D em pixels — sutil o bastante pra não distorcer a foto real por baixo. */
  depth?: number;
}

/**
 * Duas tiras decorativas (topo + lateral direita) que dão volume/profundidade
 * isométrica a um painel retangular — usado nos módulos já colocados na
 * parede (`BuildCanvas.tsx`) e nas miniaturas do catálogo (`ModuleCard.tsx`,
 * `ModuleChip.tsx`) pra parecerem caixas 3D de verdade (com topo e lateral
 * visíveis, feito de um chanfro de luz/sombra) em vez de painéis chapados —
 * pedido do cliente pra aproximar do mockup de referência ("Modular Kitchen
 * Designer"), sem precisar de um motor 3D de verdade.
 *
 * DECORATIVO E FORA DO FLUXO NORMAL: cada tira é `position: absolute` com
 * deslocamento NEGATIVO (sai por cima/pela direita do contêiner pai), então
 * NÃO conta pro tamanho do pai no layout. Isso é o que garante que o
 * `getBoundingClientRect()` do módulo arrastável continue sendo exatamente
 * `left/top/width/height` calculado a partir de `offsetXCm/offsetYCm` (ver
 * `PlacedModuleBox` em `BuildCanvas.tsx`) — o arrasto/posicionamento em cm
 * continua 100% preciso, essas tiras são só verniz visual por cima.
 *
 * O pai precisa ter `position: relative` (ou ser o próprio elemento
 * `position: absolute` já usado pro posicionamento) e overflow VISÍVEL — se
 * o pai tiver `overflow-hidden`, essas tiras somem, por isso módulos com
 * foto usam um wrapper interno separado só pra cortar a foto (ver
 * `BuildCanvas.tsx`).
 */
export function IsoBevel({ depth = 6 }: Props) {
  return (
    <>
      {/* Topo — chanfro claro, dá a impressão da "tampa" da caixa recuando pra trás. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute"
        style={{
          left: 0,
          right: depth,
          top: -depth,
          height: depth,
          background: 'linear-gradient(135deg, rgba(255,255,255,0.7), rgba(255,255,255,0.15))',
          transform: 'skewX(-38deg)',
          transformOrigin: 'bottom left',
        }}
      />
      {/* Lateral direita — chanfro escuro, dá a impressão da lateral da caixa em sombra. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute"
        style={{
          top: 0,
          bottom: -depth,
          right: -depth,
          width: depth,
          background: 'linear-gradient(180deg, rgba(10,20,32,0.3), rgba(10,20,32,0.55))',
          transform: 'skewY(-38deg)',
          transformOrigin: 'top left',
        }}
      />
    </>
  );
}
