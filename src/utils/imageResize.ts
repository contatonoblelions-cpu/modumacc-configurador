interface Decoded {
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void;
  width: number;
  height: number;
  cleanup?: () => void;
}

/**
 * Decodifica o arquivo de imagem de forma robusta em qualquer aparelho.
 * Caminho principal: `createImageBitmap` (rapido, sem alocar DOM). Fallback:
 * `<img>` + object URL — usado quando `createImageBitmap` nao existe ou falha
 * (ex.: Safari mais antigo, ou certos arquivos HEIC/formatos do iPhone), pra
 * a foto do ambiente nunca "travar em Processando..." no celular.
 */
async function decodeImage(file: File): Promise<Decoded> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file);
      return {
        width: bitmap.width,
        height: bitmap.height,
        draw: (ctx, w, h) => ctx.drawImage(bitmap, 0, 0, w, h),
        cleanup: () => bitmap.close?.(),
      };
    } catch {
      /* cai no fallback abaixo */
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Não foi possível ler a imagem enviada.'));
      el.src = url;
    });
    return {
      width: img.naturalWidth,
      height: img.naturalHeight,
      draw: (ctx, w, h) => ctx.drawImage(img, 0, 0, w, h),
    };
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function resizeImageToBase64(
file: File,
maxDim = 1600,
quality = 0.85,
): Promise<{ base64: string; mimeType: string }> {
const decoded = await decodeImage(file);
const scale = Math.min(1, maxDim / Math.max(decoded.width, decoded.height));
const width = Math.max(1, Math.round(decoded.width * scale));
const height = Math.max(1, Math.round(decoded.height * scale));

const canvas = document.createElement('canvas');
canvas.width = width;
canvas.height = height;
const ctx = canvas.getContext('2d');
if (!ctx) throw new Error('Não foi possível processar a imagem neste navegador.');
decoded.draw(ctx, width, height);
decoded.cleanup?.();

const dataUrl = canvas.toDataURL('image/jpeg', quality);
const base64 = dataUrl.split(',')[1] ?? '';
return { base64, mimeType: 'image/jpeg' };
}
