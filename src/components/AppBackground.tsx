/**
* Fundo decorativo do app: manchas de gradiente suaves nos tons da marca
* (navy/silver) flutuando bem devagar, com uma grade sutil estilo "planta
  * baixa" por trás — remete ao processo de projetar um ambiente. Fica fixo
  * atrás de todo o conteúdo (z-index negativo, sem interação, respeitando
* "prefers-reduced-motion").
  */
export function AppBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-brand-bg">
    <div className="bg-blueprint-grid absolute inset-0" />

    <div className="bg-blob-a absolute -left-40 -top-40 h-[34rem] w-[34rem] rounded-full bg-brand-navy-700/25 blur-3xl" />
    <div className="bg-blob-b absolute -right-48 top-1/4 h-[30rem] w-[30rem] rounded-full bg-brand-silver-400/45 blur-3xl" />
    <div className="bg-blob-c absolute -bottom-48 left-1/4 h-[28rem] w-[28rem] rounded-full bg-brand-navy-600/20 blur-3xl" />
    <div className="bg-blob-b absolute -bottom-20 right-0 h-72 w-72 rounded-full bg-brand-silver-600/20 blur-3xl [animation-duration:38s]" />

    <div className="absolute inset-0 bg-gradient-to-b from-white/10 via-white/30 to-white/60" />
    </div>
    );
}
