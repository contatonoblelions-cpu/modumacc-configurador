export async function resizeImageToBase64(
file: File,
maxDim = 1600,
quality = 0.85,
): Promise<{ base64: string; mimeType: string }> {
const bitmap = await createImageBitmap(file);
const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
const width = Math.round(bitmap.width * scale);
const height = Math.round(bitmap.height * scale);

const canvas = document.createElement('canvas');
canvas.width = width;
canvas.height = height;
const ctx = canvas.getContext('2d');
if (!ctx) throw new Error('Não foi possível processar a imagem neste navegador.');
ctx.drawImage(bitmap, 0, 0, width, height);

const dataUrl = canvas.toDataURL('image/jpeg', quality);
const base64 = dataUrl.split(',')[1] ?? '';
return { base64, mimeType: 'image/jpeg' };
}
