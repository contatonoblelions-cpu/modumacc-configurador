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
