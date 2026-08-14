# Configurador Visual de Móveis — Modumacc

MVP de um configurador 2D onde o cliente final monta a composição da cozinha
arrastando módulos do catálogo real da Modumacc (modumacc.com.br), escolhe
acabamento e puxador, e envia tudo pro carrinho do WooCommerce existente pra
finalizar a compra normalmente.

Projeto separado (repo e deploy próprios) — não é um plugin de WordPress.
O checkout, pagamento e frete continuam 100% no WooCommerce do cliente.

## Stack

- React 19 + TypeScript + Vite
- Tailwind CSS v4
- Zustand (estado)
- @dnd-kit (drag and drop)

## Como rodar localmente

```bash
npm install
cp .env.example .env   # ajuste se necessário
npm run dev
```

Abre em `http://localhost:5173`. Não precisa de nenhuma credencial — a leitura
do catálogo e a montagem do carrinho usam só endpoints públicos do
WooCommerce (ver "Segurança e credenciais" abaixo).

### Verificar o catálogo direto na API real

```bash
npm run check:catalog
```

Bate na Store API de produção e imprime um resumo dos módulos da linha
Cozinha (larguras, acabamentos, variações, preços) usando o mesmo código de
produção. Útil pra detectar rapidamente se o cliente mudou algo no catálogo
(nome de atributo, categoria, produto novo) sem abrir o app inteiro.

## Segurança e credenciais

**Nenhuma chave, senha ou token do cliente é necessária.**

- **Leitura do catálogo** (produtos, variações, preços, larguras, imagens):
  `GET /wp-json/wc/store/v1/products` — a WooCommerce Store API pública, a
  mesma que o próprio site usa por trás dos panos pra renderizar a loja. Não
  exige autenticação.
- **Escrita no carrinho** (adicionar os módulos escolhidos): URL nativa de
  "add to cart" do WooCommerce (`?add-to-cart=<id>&variation_id=...`), que
  usa a sessão do próprio navegador do cliente final. Também sem
  autenticação — é o mesmo link que qualquer botão "Adicionar ao carrinho"
  do site usa.

Único ponto técnico a confirmar com o cliente: se a Store API está habilitada
(é o padrão em qualquer instalação WooCommerce moderna — **já confirmamos que
está**, ver "Notas técnicas" abaixo).

## Notas técnicas (descobertas inspecionando a API real de modumacc.com.br)

Fetch feito em 2026-08-13 diretamente contra `modumacc.com.br`:

- `GET /wp-json/wc/store/v1/products/categories` → categoria **Cozinha = id
  23**, slug `cozinha`, 9 produtos publicados.
- Os produtos são WooCommerce "variable products". Cada variação tem 3
  atributos **locais** (não são atributos globais/taxonomia — `taxonomy`
  vem `null` na resposta):
  1. `Cor` → acabamento do módulo (Amazônia, Belline, Branco, Louro Freijó,
     Manhattan).
  2. `Acabamento do puxador` → `Alumínio` | `Bronze` | `Não se aplica`
     (alguns módulos, como nichos, não têm puxador).
  3. `Medidas: Largura x Altura x Profundidade` → **uma única string**, ex.
     `"60,00 x 35,00 x 37,60"`. **A largura não é um atributo isolado** —
     fica embutida nessa string. O parsing disso é feito em
     `src/api/parseAttributes.ts`.
- O endpoint de listagem (`/products?category=23`) traz nome, imagens, faixa
  de preço (`price_range`) e a lista de variações (id + atributos), mas
  **não** traz o preço nem a URL de compra de cada variação individual.
- Pra pegar preço exato e a URL de "add to cart" de uma variação específica,
  é preciso buscar `/products/{variationId}` (variações são "produtos" tipo
  `variation` na Store API). Essa resposta já vem com `add_to_cart.url`
  **pronta e corretamente formatada/encodada pelo próprio WooCommerce** —
  reaproveitamos essa URL ao invés de remontar a query string na mão, pra
  não arriscar montar o slug do atributo errado. Ver `resolveVariation()`
  em `src/api/storeApi.ts`.
- O campo nativo `dimensions` (`length`/`width`/`height`) do WooCommerce
  **não é confiável pra largura** nessa loja — ele vem fixo (ex.: sempre
  `35 × 37,6`) independente de qual variação de largura (60/70/80cm) é
  consultada. A largura real e confiável só vem do atributo "Medidas..." ou
  da string `variation` da resposta da variação individual.
- Página de carrinho confirmada: `https://modumacc.com.br/carrinho/`.

Preços observados na API: de ~R$ 220 (nichos) a ~R$ 435 (módulo basculante,
variação mais cara), dentro da faixa de R$ 238–R$ 1.099 mencionada no
briefing pra linha Cozinha completa.

## Arquitetura da composição

- `src/types/` — tipos do catálogo (`catalog.ts`), da resposta crua da Store
  API (`wooStoreApi.ts`) e do estado da composição (`composition.ts`).
- `src/api/storeApi.ts` — cliente HTTP da Store API. Carrega o catálogo
  inteiro de uma vez (evita N+1) e resolve preço/URL de cada variação **sob
  demanda**, só quando o cliente efetivamente escolhe aquela combinação de
  largura + acabamento + puxador.
- `src/store/configuratorStore.ts` — estado global (zustand): catálogo,
  ambiente informado, módulos colocados, acabamento/puxador selecionados.
  Reresolve preço e URL de cada módulo colocado sempre que acabamento ou
  puxador mudam.
- `src/components/` — UI: `RoomSizeForm` (medidas), `ModulePanel` +
  `ModuleCard` (catálogo arrastável), `BuildCanvas` (área de montagem 2D,
  droppable), `FinishHandleSelector` (acabamento/puxador globais),
  `SummaryBar` (preço total + botão final).
- `src/utils/layout.ts` — soma de larguras vs. largura do ambiente, cálculo
  de preço total.
- `src/utils/cartUrl.ts` — envio da composição pro carrinho real (ver seção
  abaixo, é a parte mais delicada do projeto).

## Como a composição vai pro carrinho (leia isto antes de mexer)

O WooCommerce tem uma URL nativa de "add to cart" que não exige login nem
nonce, pensada pra links simples tipo "compre agora" — mas ela só adiciona
**um produto por requisição**. O núcleo do WooCommerce não tem uma URL nativa
pra adicionar vários itens de uma vez sem plugin.

**Solução adotada (zero mudança no WordPress do cliente):** ao clicar em
"Adicionar tudo ao carrinho", o app carrega a URL de add-to-cart de cada
módulo, em sequência, dentro de um `<iframe>` escondido — esperando cada uma
terminar antes de disparar a próxima — e só então redireciona a aba de
verdade pra página de carrinho (`/carrinho/`). Cada carregamento do iframe é,
do ponto de vista do WooCommerce, uma visita normal, que seta o cookie de
sessão/carrinho do site.

**Armadilha real: bloqueio de cookies de terceiros.** Se este app for aberto
como um **link externo** (navegação pra fora de modumacc.com.br, domínio
diferente), os iframes escondidos apontando de volta pra modumacc.com.br são
"terceiros" do ponto de vista do navegador, e Safari/Firefox (e cada vez mais
o Chrome) podem bloquear esses cookies — o item pareceria adicionado, mas o
carrinho chegaria vazio no checkout.

**Por isso a recomendação de arquitetura é embutir o configurador via
`<iframe>` DENTRO de uma página do próprio modumacc.com.br**, não como link
pra fora. Nesse caso, o iframe interno de add-to-cart tem a mesma origem do
site que está no topo da aba — a maioria dos navegadores trata isso como
primeira-parte mesmo estando aninhado dentro do nosso app, o que deixa o
fluxo confiável.

Se o cliente preferir um link simples pra fora mesmo assim, a evolução
recomendada pós-MVP é usar a Store API de carrinho
(`/wc/store/v1/cart/add-item`), que aceita chamadas de outra origem — fica
registrado em "Próximos passos", não implementado agora pra não adicionar
complexidade sem necessidade.

Com **1 módulo só**, o app pula o iframe e faz um redirect direto — caminho
mais simples e mais confiável possível.

## Decisões de MVP (default enquanto não confirma com o cliente)

- **Acabamento e puxador são únicos pra composição toda**, não por módulo
  individual. Mais simples de usar e alinhado ao que configuradores como o
  Mooble costumam fazer. Trocar pra seleção por módulo é uma mudança
  localizada em `FinishHandleSelector.tsx` + `configuratorStore.ts`.
- **Sobra de espaço**: se a soma dos módulos não fechar exatamente a largura
  informada, o app **avisa mas permite finalizar** (evita perder venda por
  trava rígida). Se a soma **ultrapassar** a largura, o botão final fica
  bloqueado. Lógica em `src/utils/layout.ts` (`checkSpace`).

## Pendências a confirmar com o cliente

- Confirmar se acabamento/puxador devem mesmo ser únicos pra composição toda, ou se o cliente quer seleção por módulo desde o MVP.
- Confirmar a regra de sobra de espaço acima (avisar-mas-permitir vs. travar).
- Decidir a forma de embutir no site: iframe (recomendado, ver seção acima) vs. link simples pra fora.
- Validar em ambiente de teste (não produção) que o fluxo de "add-to-cart em sequência via iframe" realmente popula o carrinho — ainda não testado ponta a ponta num navegador real contra o site ao vivo, só a API de leitura foi validada.
- **BLOQUEIO ATIVO — Store API rejeita chamadas de outra origem (CORS/WAF)**: testado direto contra a Vercel publicada em 2026-08-13. `GET /wp-json/wc/store/v1/products` em `modumacc.com.br` funciona (200, JSON completo) em navegação direta ou em `fetch()` disparado do próprio `modumacc.com.br` (mesma origem), mas retorna **503** quando o mesmo `fetch()` é disparado a partir de `modumacc-configurador.vercel.app` (outra origem) — exatamente o caso do app publicado, e por isso o catálogo nunca carrega em produção. **Não é limite de `per_page`** (chute anterior, já descartado — o código ficou em `per_page=50` mas isso não é a causa nem a correção). É bloqueio de CORS/WAF do lado do servidor/hospedagem WordPress, que precisa liberar a origem `https://modumacc-configurador.vercel.app` (e o domínio final, se for outro) pra rota `/wp-json/wc/store/v1/*` — seja habilitando CORS no WordPress (normalmente via plugin ou snippet em `functions.php`, já que o WP core só libera CORS pra chamadas same-site por padrão), seja adicionando uma exceção/allowlist no firewall ou plugin de segurança (Wordfence, Sucuri, etc.), dependendo de onde exatamente está o bloqueio — precisa de quem administra o WordPress/hospedagem do cliente pra investigar e ajustar. **Sem isso resolvido, o app publicado não funciona** — este é o item mais urgente da lista de pendências.

## Limitações conhecidas do MVP (2D, escopo combinado)

- É uma vista frontal única (elevação), sem empilhamento vertical
  separando módulos superiores/inferiores — todos ficam numa fileira só,
  na ordem em que foram arrastados. Empilhamento em duas fileiras
  (superior/inferior) é uma evolução natural de v2.
- Só a linha Cozinha está coberta (única linha com produtos lançados no
  catálogo no momento).
- Reordenar módulos já colocados usa botões (←/→), não drag-and-drop
  completo dentro da própria bancada — reduz risco de bug pro MVP; dá pra
  evoluir pra sortable completo com `@dnd-kit/sortable` depois.

## Identidade visual

Extraída da logo real da Modumacc (`Documentos/Clientes/Modumacc/imagens/Logo
Modumacc 2.psd`, fornecida pelo cliente), via amostragem de pixel do render
em alta resolução (2381×1709px, CMYK convertido pra sRGB). Os arquivos `.ai`
e `.cdr.zip` também fornecidos não renderizaram (o `.ai`, apesar da extensão,
é um export de compatibilidade PDF do CorelDRAW, e veio com bounding box
zerado — provavelmente algum problema de color space na exportação; o
`.cdr.zip` só trouxe uma prévia em baixa resolução). O PSD foi suficiente
como fonte confiável de cor e forma.

- **Navy** (ícone escuro + texto "Modu"): `#1A3F61` (base), `#2E5A79`
  (tom claro do gradiente), `#122A41` (hover/escuro).
- **Silver** (ícone claro + texto "macc"): `#8CA1A4` (base),
  `#B4C2C4` / `#C3CED0` (tons claros do gradiente).

Tokens em `src/index.css` (bloco `@theme`, Tailwind v4) como
`brand-navy-{600..900}` e `brand-silver-{200..700}`, usados em toda a UI
(`Header`, botões, seleção de acabamento/puxador, cards de módulo).

Assets de marca em `public/brand/`:
- `modumacc-logo.png` — logo com fundo removido (transparência via
  color-key, já que o PSD original não trouxe canal alpha), usada no
  `Header`.
- `modumacc-icon.png` — só o ícone (sem o texto), usado como base do favicon.

Favicon (`public/favicon.ico`) gerado a partir do ícone, em 16/32/48/64px.

**Pendência**: os hex acima vieram de amostragem de pixel do raster, não dos
valores exatos de fill do vetor original (não consegui extrair isso do `.ai`
nem do `.cdr` com as ferramentas disponíveis aqui). Pra manual de marca
oficial, vale confirmar os valores exatos com quem tem o CorelDRAW/Illustrator
aberto — a chance de diferença é pequena (a amostragem bateu de forma muito
consistente em milhares de pixels), mas não é garantia de precisão de design
system formal.

## Deploy e embed

Hospede como SPA estática (Vercel, Netlify, etc.) — `npm run build` gera
`dist/`. Para embutir via `<iframe>` no site, garanta que o host de deploy
não envie um header `X-Frame-Options` restritivo nem
`Content-Security-Policy: frame-ancestors` bloqueador (a maioria dos hosts
de SPA não envia nada por padrão, o que já libera o embed).

### Subir pra Vercel via GitHub (recomendado)

O zip deste projeto já vem com um repositório git inicializado e o commit
inicial feito (`git log` mostra "Scaffold inicial..."). Falta só criar o
repositório remoto e conectar na Vercel:

1. Extraia o zip em algum lugar da sua máquina (fora do OneDrive/Google
   Drive sincronizado, se possível — evita conflito de arquivos do `.git`).
2. Crie um repositório **vazio** no GitHub (sem README, sem .gitignore —
   já temos os nossos), ex.: `modumacc-configurador`.
3. Na pasta do projeto, rode:
   ```bash
   git remote add origin https://github.com/<seu-usuario>/modumacc-configurador.git
   git push -u origin main
   ```
4. Em [vercel.com/new](https://vercel.com/new), importe esse repositório.
   A Vercel detecta automaticamente que é um projeto Vite (build command
   `npm run build`, output `dist`) — não precisa mexer em nada.
5. (Opcional) Em **Project Settings → Environment Variables**, adicione
   `VITE_WOO_SITE_URL` e `VITE_WOO_CATEGORY_ID` só se quiser sobrescrever os
   padrões (já apontam pra `modumacc.com.br` / categoria 23 — funciona sem
   configurar nada).
6. Depois de publicado, você tem uma URL tipo
   `modumacc-configurador.vercel.app` pra testar o fluxo completo num
   navegador de verdade — inclusive o comportamento de add-to-cart, que só
   dá pra validar de fato fora deste ambiente de desenvolvimento.

Não precisa de Supabase nem de nenhum backend aqui — é só um front-end
estático conversando direto com a Store API pública da Modumacc (ver
"Segurança e credenciais" acima).

## Próximos passos (pós-MVP)

- Migrar o envio pro carrinho pra Store API (`/wc/store/v1/cart/add-item`),
  removendo a dependência de iframes/cookies caso o cliente prefira um link
  externo em vez de iframe.
- Vista com empilhamento superior/inferior (duas fileiras).
- Seleção de acabamento/puxador por módulo individual, se o cliente pedir.
- Expandir pras linhas Quarto, Escritório, Banheiro e Especiais quando
  tiverem produtos cadastrados (o código já é genérico por categoria — só
  trocar `VITE_WOO_CATEGORY_ID` ou permitir múltiplas categorias).
