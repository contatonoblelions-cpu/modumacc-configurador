import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Função serverless (roda na Vercel, não no navegador do cliente) que gera a
 * visualização "foto do ambiente + móvel escolhido" via Google Gemini
 * (`gemini-2.5-flash-image`, também chamado "nano banana" — suporta receber
 * várias imagens de referência + um texto e devolver uma imagem nova).
 *
 * POR QUE ISSO PRECISA SER UM BACKEND (e não uma chamada direta do
 * navegador, como o resto do app): a API do Gemini exige uma chave de API
 * paga por uso. Se essa chamada fosse feita direto do front-end, a chave
 * ficaria visível no código-fonte do navegador pra qualquer pessoa copiar e
 * usar por conta própria (e gerar custo pra nós). Por isso ela mora só aqui,
 * na variável de ambiente `GEMINI_API_KEY` do projeto na Vercel — ver
 * README > "Visualização com IA" pra como configurar isso.
 *
 * Este endpoint É same-origin com o app (ambos em modumacc-configurador.vercel.app,
 * ou no domínio final) — diferente da Store API do WooCommerce, aqui não há
 * nenhum problema de CORS a resolver.
 */

/**
 * Tempo maximo da funcao serverless na Vercel. A geracao de imagem do Gemini
 * pode levar dezenas de segundos; sem isto a Vercel pode cortar cedo. 60s da
 * folga; se o plano permitir menos, a Vercel limita ao maximo do plano.
 */
export const maxDuration = 60;

const GEMINI_MODEL = 'gemini-2.5-flash-image';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

interface RenderModuleInput {
  name: string;
  imageUrl: string;
  widthCm: number;
  heightCm: number;
}

interface GenerateRenderBody {
  roomPhotoBase64: string;
  roomPhotoMimeType: string;
  roomWidthCm: number;
  roomHeightCm: number;
  finish: string | null;
  handle: string | null;
  modules: RenderModuleInput[];
  collageBase64?: string;
  collageMimeType?: string;
}

interface InlineImagePart {
  inlineData: { mimeType: string; data: string };
}

/**
 * Busca uma imagem de produto (URL pública em modumacc.com.br) e converte
 * pra base64 — feito no servidor pra evitar problema de CORS/canvas
 * "tainted" que teríamos tentando ler os bytes dessas imagens no navegador.
 */
async function fetchImageAsBase64(url: string): Promise<InlineImagePart | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const mimeType = res.headers.get('content-type') ?? 'image/jpeg';
    const buffer = Buffer.from(await res.arrayBuffer());
    return { inlineData: { mimeType, data: buffer.toString('base64') } };
  } catch {
    return null;
  }
}

function buildPrompt(body: GenerateRenderBody): string {
  const lista = body.modules
    .map((m, i) => `${i + 1}. ${m.name} — largura ${m.widthCm}cm, altura ${m.heightCm}cm`)
    .join('\n');

  return [
    'Você é um visualizador de ambientes para uma loja de móveis planejados.',
    'A primeira imagem é uma foto real do ambiente/parede do cliente, tirada por ele.',
    'As imagens seguintes são fotos de referência dos produtos de marcenaria que o cliente escolheu, na ordem em que devem ficar posicionados lado a lado, da esquerda para a direita, encostados na mesma parede da foto.',
    '',
    `Espaço disponível informado pelo cliente: ${body.roomWidthCm}cm de largura por ${body.roomHeightCm}cm de altura.`,
    body.finish ? `Acabamento/cor escolhido para todos os módulos: ${body.finish}.` : '',
    body.handle ? `Acabamento do puxador: ${body.handle}.` : '',
    '',
    'Módulos, em ordem da esquerda para a direita:',
    lista,
    '',
    'Gere uma imagem fotorrealista mostrando esse ambiente real do cliente com essa composição de móveis já instalada na parede, na escala correta em relação às medidas do espaço, no acabamento e cor indicados. Mantenha o resto do ambiente (parede, piso, iluminação, perspectiva) o mais fiel possível à foto original enviada — só adicione os móveis, não altere o resto do cômodo.',
    '',
    'Padrão de qualidade da renderização: foto de arquitetura/catálogo de marcenaria profissional, nítida e bem iluminada com luz natural, ângulo frontal e reto (não em perspectiva forçada), como as fotos de portfólio da Modumacc. Os móveis devem ter acabamento fosco fiel à cor indicada, com veios de madeira visíveis quando o acabamento for de madeira, dobradiças e puxadores discretos e bem definidos, e sombras suaves e realistas de contato com a parede/piso — sem parecer um render 3D genérico ou colagem, e sim uma fotografia real do ambiente já pronto.',
  ]
    .filter(Boolean)
    .join('\n');
}

/**
 * Prompt ESTRITO usado quando o front manda a colagem pronta (a foto do
 * ambiente com os módulos já posicionados exatamente onde o cliente montou).
 * Aqui a IA NÃO recria a cena — ela só transforma a colagem numa foto
 * realista, sem mudar posição, cor, quantidade ou inventar nada.
 */
function buildStrictPrompt(body: GenerateRenderBody): string {
  return [
    'Você é um renderizador fotorrealista para uma loja de móveis planejados.',
    'A imagem enviada é a MONTAGEM EXATA feita pelo cliente: a foto real do ambiente dele com as fotos reais dos módulos de marcenaria já recortados e posicionados nos lugares, tamanhos e cores exatos que ele escolheu.',
    'Sua ÚNICA tarefa é transformar essa montagem numa fotografia realista e integrada: adicione iluminação natural coerente com o ambiente, sombras de contato suaves entre os móveis, a parede e o piso, e integre os móveis à cena para não parecerem colados/recortados.',
    '',
    'REGRAS OBRIGATÓRIAS — não quebre nenhuma:',
    '- NÃO mude a posição, o tamanho, a quantidade nem a ordem dos módulos. Eles devem permanecer EXATAMENTE onde estão na imagem.',
    '- NÃO troque, altere, escureça, clareie ou "corrija" as cores/acabamentos dos módulos, nem a cor do puxador. Use fielmente as cores que já estão na imagem.',
    '- NÃO adicione móveis, armários, prateleiras, objetos, plantas ou decoração que NÃO estejam na montagem. PORÉM, a montagem pode já conter uma geladeira, um fogão e uma pia com torneira sobre uma bancada de pedra — esses itens FAZEM PARTE da montagem e devem ser MANTIDOS e renderizados como aparelhos reais e fiéis (geladeira e fogão de inox/aço, bancada de pedra tipo granito/quartzo), no mesmo lugar, tamanho e proporção em que aparecem.',
    '- NÃO remova nenhum módulo presente na montagem.',
    '- NÃO altere a parede, o piso, as janelas, portas nem a perspectiva do ambiente original — apenas melhore a iluminação e a integração dos móveis já presentes.',
    '',
    body.finish ? `Acabamento/cor dos módulos (apenas para referência, já aplicado na imagem): ${body.finish}.` : '',
    body.handle ? `Acabamento do puxador (já aplicado na imagem): ${body.handle}.` : '',
    body.roomWidthCm && body.roomHeightCm ? `Espaço do cliente: ${body.roomWidthCm}cm de largura por ${body.roomHeightCm}cm de altura.` : '',
    '',
    'O resultado deve ser indistinguível de uma fotografia real da cozinha do cliente já instalada, mantendo 100% de fidelidade à montagem enviada — mesmos módulos, mesmas posições, mesmas cores.',
  ]
    .filter(Boolean)
    .join('\n');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método não permitido.' });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(500).json({
      error:
        'GEMINI_API_KEY não configurada no projeto da Vercel. Ver README > "Visualização com IA".',
    });
    return;
  }

  const body = req.body as GenerateRenderBody;
  if (!body?.modules?.length || (!body.collageBase64 && !body.roomPhotoBase64)) {
    res.status(400).json({ error: 'Faltou a foto do ambiente ou os módulos da composição.' });
    return;
  }

  try {
    let parts: Array<{ text: string } | InlineImagePart>;

    if (body.collageBase64) {
      parts = [
        { text: buildStrictPrompt(body) },
        {
          inlineData: {
            mimeType: body.collageMimeType || 'image/jpeg',
            data: body.collageBase64,
          },
        },
      ];
    } else {
      const productImageParts = (
        await Promise.all(body.modules.map((m) => fetchImageAsBase64(m.imageUrl)))
      ).filter((p): p is InlineImagePart => p !== null);

      parts = [
        { text: buildPrompt(body) },
        {
          inlineData: {
            mimeType: body.roomPhotoMimeType || 'image/jpeg',
            data: body.roomPhotoBase64,
          },
        },
        ...productImageParts,
      ];
    }

    // O Gemini as vezes devolve so texto (sem imagem) de forma intermitente.
    // Tentamos ate 3 vezes antes de desistir — isso resolve o "gerou agora e
    // depois nao gerou". Erros 4xx (prompt bloqueado etc) nao adianta repetir.
    const callGemini = async () => {
      const geminiRes = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ role: 'user', parts }] }),
      });
      if (!geminiRes.ok) {
        const errText = await geminiRes.text();
        return { retriable: geminiRes.status >= 500, error: `Gemini respondeu ${geminiRes.status}: ${errText.slice(0, 300)}`, imagePart: undefined as undefined | { inlineData?: { data?: string; mimeType?: string } } };
      }
      const data = await geminiRes.json();
      const imagePart = data?.candidates?.[0]?.content?.parts?.find(
        (p: { inlineData?: { data?: string } }) => p.inlineData?.data,
      ) as { inlineData?: { data?: string; mimeType?: string } } | undefined;
      return { retriable: true, error: 'O Gemini não devolveu uma imagem. Tente novamente.', imagePart };
    };

    let lastError = 'O Gemini não devolveu uma imagem. Tente novamente.';
    for (let attempt = 0; attempt < 3; attempt++) {
      const r = await callGemini();
      if (r.imagePart?.inlineData?.data) {
        res.status(200).json({
          imageBase64: r.imagePart.inlineData.data,
          mimeType: r.imagePart.inlineData.mimeType ?? 'image/png',
        });
        return;
      }
      lastError = r.error;
      if (!r.retriable) break;
    }
    res.status(502).json({ error: lastError });
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : 'Erro inesperado gerando a visualização.',
    });
  }
}
