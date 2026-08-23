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
  roomPreviewUrl: string;
  roomWidthCm: number;
  roomHeightCm: number;
  finish: string | null;
  handle: string | null;
  modules: CollageModuleInput[];
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
    const roomImg = await loadImage(params.roomPreviewUrl);
    const W = roomImg.naturalWidth || 1200;
    const H = roomImg.naturalHeight || 900;
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(roomImg, 0, 0, W, H);

    const frameW = W * 0.72;
    const frameH = frameW * (params.roomHeightCm / params.roomWidthCm);
    const frameX = (W - frameW) / 2;
    const frameY = (H - frameH) / 2;

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

    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    const base64 = dataUrl.split(',')[1] ?? '';
    if (!base64) return null;
    return { base64, mimeType: 'image/jpeg' };
  } catch {
    return null;
  }
}
