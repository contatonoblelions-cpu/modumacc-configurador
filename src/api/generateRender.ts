import type { PlacedModule } from '../types/composition';

export interface RenderModuleInput {
name: string;
imageUrl: string;
widthCm: number;
heightCm: number;
}

export interface GenerateRenderRequest {
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

export interface GenerateRenderResult {
imageBase64: string;
mimeType: string;
}

export function buildRenderModules(modules: PlacedModule[]): RenderModuleInput[] {
return modules
.filter((m) => m.thumbnail)
.map((m) => ({
name: m.moduleName,
imageUrl: m.thumbnail,
widthCm: m.widthCm,
heightCm: m.heightCm,
}));
}

export async function generateRender(payload: GenerateRenderRequest): Promise<GenerateRenderResult> {
const res = await fetch('/api/generate-render', {
method: 'POST',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify(payload),
});

if (!res.ok) {
let message = `Falha ao gerar a visualização (${res.status}).`;
try {
const body = await res.json();
if (body?.error) message = body.error;
} catch {
// resposta sem JSON — mantém a mensagem genérica
}
throw new Error(message);
}

return res.json() as Promise<GenerateRenderResult>;
}

// ---------------------------------------------------------------------------
// Colagem fiel pra visualização com IA (2026-08-23)
// ---------------------------------------------------------------------------
// Em vez de mandar pro Gemini só a LISTA de módulos (nome+medidas) e deixar
// ele RECRIAR a cena do zero — o que abria margem pra IA "chutar" posição,
// cor ou inventar itens — agora montamos aqui no navegador a colagem EXATA
// (a foto real do ambiente + as fotos reais de cada módulo nas posições e
// tamanhos exatos que o cliente montou) e mandamos essa imagem pronta como
// referência principal. O backend então instrui a IA a APENAS deixar essa
// montagem realista (luz/sombra/integração), sem mudar nada. Máxima fidelidade.

import { getModulePhoto } from '../utils/modulePhotos';

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Falha ao carregar imagem: ${src}`));
    img.src = src;
  });
}

export interface CollageModuleInput {
  moduleName: string;
  thumbnail: string;
  widthCm: number;
  heightCm: number;
  offsetXCm: number;
  offsetYCm: number;
}

export interface BuildCollageParams {
  roomPreviewUrl: string | null;
  roomWidthCm: number;
  roomHeightCm: number;
  finish: string | null;
  handle: string | null;
  modules: CollageModuleInput[];
  fridge?: { offsetXCm: number; widthCm: number; heightCm: number } | null;
  stove?: { offsetXCm: number; widthCm: number; heightCm: number } | null;
  sink?: { offsetXCm: number; widthCm: number } | null;
  countertopRatio?: number;
}

/**
 * Monta a colagem num <canvas> e devolve base64 (JPEG). Usa a MESMA
 * matemática de posicionamento de `PhotoCollage.tsx` (quadro a 72% da
 * largura, centralizado, na proporção real do espaço). As fotos dos módulos
 * são same-origin (/modules/...) e a foto do ambiente é data URL — o canvas
 * não fica "tainted", então o toDataURL funciona.
 */
export async function buildCollageDataUrl(
  params: BuildCollageParams,
): Promise<{ base64: string; mimeType: string } | null> {
  try {
    const canvas = document.createElement('canvas');
    const ratio = params.roomHeightCm / params.roomWidthCm;
    let W: number, H: number, frameX: number, frameY: number, frameW: number, frameH: number;

    if (params.roomPreviewUrl) {
      // Com foto do ambiente: desenha a foto e centraliza a composicao num quadro de 72%.
      const roomImg = await loadImage(params.roomPreviewUrl);
      W = roomImg.naturalWidth || 1200;
      H = roomImg.naturalHeight || 900;
      canvas.width = W;
      canvas.height = H;
      const c = canvas.getContext('2d');
      if (!c) return null;
      c.drawImage(roomImg, 0, 0, W, H);
      frameW = W * 0.72;
      frameH = frameW * ratio;
      frameX = (W - frameW) / 2;
      frameY = (H - frameH) / 2;
    } else {
      // SEM foto: monta um fundo neutro de estudio (parede + piso) na proporcao
      // do ambiente, e a composicao ocupa o quadro inteiro. A IA depois
      // transforma isso numa cena realista (a foto do ambiente e opcional).
      W = 1600;
      H = Math.max(300, Math.round(W * ratio));
      canvas.width = W;
      canvas.height = H;
      const c = canvas.getContext('2d');
      if (!c) return null;
      const wall = c.createLinearGradient(0, 0, 0, H);
      wall.addColorStop(0, '#eff2f3');
      wall.addColorStop(1, '#dde3e5');
      c.fillStyle = wall;
      c.fillRect(0, 0, W, H);
      c.fillStyle = '#cdbca0';
      c.fillRect(0, Math.round(H * 0.9), W, Math.round(H * 0.1));
      frameX = 0;
      frameY = 0;
      frameW = W;
      frameH = H;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Geladeira e fogao (referencia visual) ancorados no chao, ATRAS dos modulos.
    const drawFloorPhoto = async (url: string, offsetXCm: number, wCm: number, hCm: number) => {
      const img = await loadImage(url);
      const x = frameX + (offsetXCm / params.roomWidthCm) * frameW;
      const w = (wCm / params.roomWidthCm) * frameW;
      const h = (hCm / params.roomHeightCm) * frameH;
      const y = frameY + frameH - h;
      ctx.drawImage(img, x, y, w, h);
    };
    if (params.fridge) await drawFloorPhoto('/modules/geladeira.jpg', params.fridge.offsetXCm, params.fridge.widthCm, params.fridge.heightCm);
    if (params.stove) await drawFloorPhoto('/modules/fogao.jpg', params.stove.offsetXCm, params.stove.widthCm, params.stove.heightCm);

    for (const m of params.modules) {
      const url = getModulePhoto(m.moduleName, params.finish, params.handle) ?? m.thumbnail;
      if (!url) continue;
      const img = await loadImage(url);
      const x = frameX + (m.offsetXCm / params.roomWidthCm) * frameW;
      const y = frameY + (m.offsetYCm / params.roomHeightCm) * frameH;
      const w = (m.widthCm / params.roomWidthCm) * frameW;
      const h = (m.heightCm / params.roomHeightCm) * frameH;
      ctx.drawImage(img, x, y, w, h);
    }

    // Pia: bancada de pedra + torneira, por cima dos modulos (se houver pia).
    if (params.sink && params.countertopRatio) {
      const lineY = frameY + params.countertopRatio * frameH;
      const sw = (params.sink.widthCm / params.roomWidthCm) * frameW;
      const sx = frameX + (params.sink.offsetXCm / params.roomWidthCm) * frameW;
      const stoneH = Math.max(6, frameH * 0.045);
      const faucetH = Math.max(14, frameH * 0.11);
      const stone = ctx.createLinearGradient(0, lineY, 0, lineY + stoneH);
      stone.addColorStop(0, '#3a3f44');
      stone.addColorStop(0.5, '#23272b');
      stone.addColorStop(1, '#15181b');
      ctx.fillStyle = stone;
      ctx.fillRect(sx, lineY, sw, stoneH);
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.fillRect(sx, lineY, sw, Math.max(1, stoneH * 0.12));
      const fw = Math.max(5, sw * 0.06);
      const fx = sx + sw / 2 - fw / 2;
      const fy = lineY - faucetH;
      const metal = ctx.createLinearGradient(fx, 0, fx + fw, 0);
      metal.addColorStop(0, '#8a929a');
      metal.addColorStop(0.5, '#c8cfd5');
      metal.addColorStop(1, '#7d858c');
      ctx.fillStyle = metal;
      ctx.fillRect(fx, fy, fw, faucetH);
      ctx.fillRect(fx, fy, Math.max(fw, sw * 0.16), fw);
    }

    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    const base64 = dataUrl.split(',')[1] ?? '';
    if (!base64) return null;
    return { base64, mimeType: 'image/jpeg' };
  } catch {
    return null;
  }
}
