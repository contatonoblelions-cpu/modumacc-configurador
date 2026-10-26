import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

/**
 * Guarda "link avulso": o configurador foi FEITO pra rodar embutido via
 * <iframe> dentro de uma pagina do proprio modumacc.com.br (ver
 * utils/cartUrl.ts pro porque). Aberto solto no dominio do vercel.app, os
 * iframes de add-to-cart apontando pro site viram "de terceiros" e o
 * navegador bloqueia o cookie de sessao do WooCommerce -> carrinho com 2+
 * itens chega vazio (o famoso "no segundo da erro"). Com 1 item funciona
 * so porque e uma navegacao direta de primeira-parte.
 *
 * Por isso: se a pagina for aberta como documento de TOPO (NAO embutida)
 * num host *.vercel.app, mandamos a pessoa pro configurador de verdade no
 * site, onde o embed deixa os cookies como primeira-parte e o carrinho
 * funciona. O que NAO e afetado:
 *  - o embed no site (window.top !== window.self) -> nunca redireciona;
 *  - o dev local (localhost / 127.0.0.1) -> host nao e vercel.app;
 *  - testes: ?noredir=1 pula o redirect.
 * Sem risco de loop: no site o app roda em iframe, entao a condicao de topo
 * nunca bate la.
 */
function redirectStandaloneToSite() {
  try {
    if (window.top !== window.self) return // embutido no site: ok, nao mexe
    const host = window.location.hostname
    if (!host.endsWith('.vercel.app')) return // dev local / site: nao mexe
    const params = new URLSearchParams(window.location.search)
    if (params.get('noredir') === '1') return // escape pra testes
    const target =
      'https://modumacc.com.br/configurador/' +
      window.location.search +
      window.location.hash
    window.location.replace(target)
  } catch {
    /* qualquer erro aqui: segue a vida e renderiza normal */
  }
}

redirectStandaloneToSite()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
