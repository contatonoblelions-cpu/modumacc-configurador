import { create } from 'zustand';
import type { CatalogModule } from '../types/catalog';
import type { PlacedModule, RoomDimensions, RowKey } from '../types/composition';
import { fetchKitchenModules, resolveVariation } from '../api/storeApi';
import { buildRenderModules, generateRender } from '../api/generateRender';
import { inferRowKey, resolveOffsetCm, packedEndOffsetCm } from '../utils/rows';

type Step = 'room' | 'build' | 'review';

interface RoomPhoto {
  base64: string;
  mimeType: string;
  /** Data URL (`data:image/...;base64,...`) pronta pra usar num <img src>, só pra preview. */
  previewUrl: string;
}

interface AiRenderState {
  loading: boolean;
  imageDataUrl: string | null;
  error: string | null;
}

/**
 * Posição "fantasma" mostrada em tempo real ENQUANTO o usuário ainda está
 * arrastando (antes de soltar) — é o retângulo tracejado que aparece na
 * fileira certa, na posição exata pra onde o módulo vai se ele soltar ali.
 * Estado efêmero (não faz parte da composição salva), atualizado a cada
 * movimento do dedo/mouse via `onDragMove` em `App.tsx` e lido por
 * `BuildCanvas.tsx` pra desenhar o indicador.
 */
export interface DragPreview {
  row: RowKey;
  offsetCm: number;
  widthCm: number;
}

interface ConfiguratorState {
  step: Step;
  room: RoomDimensions | null;
  /** Foto do ambiente enviada pelo cliente na tela de medidas — opcional, usada na visualização com IA. */
  roomPhoto: RoomPhoto | null;
  catalog: CatalogModule[];
  catalogLoading: boolean;
  catalogError: string | null;
  modules: PlacedModule[];
  finish: string | null;
  handle: string | null;
  resolving: boolean;
  aiRender: AiRenderState;
  /** Ver `DragPreview` — null quando não há arrasto em andamento. */
  dragPreview: DragPreview | null;

  loadCatalog: () => Promise<void>;
  setRoom: (room: RoomDimensions) => void;
  setRoomPhoto: (photo: RoomPhoto | null) => void;
  backToRoomStep: () => void;
  /**
   * "Próximo passo" (usado sobretudo no celular, mas vale pros dois
   * formatos): sai da tela de montagem (módulos + parede) pra uma tela de
   * revisão só com a parede montada — ainda editável (dá pra mover e
   * remover módulo), só sem o painel de catálogo, pra facilitar conferir
   * tudo antes de ir pro carrinho.
   */
  goToReview: () => void;
  /** Volta da revisão pra tela de montagem (com o painel de módulos de novo). */
  backToBuildStep: () => void;
  /**
   * `offsetCm` é a posição horizontal LIVRE dentro da fileira (cm a partir
   * da esquerda) — omitido, entra encostado no final da fileira (usado pelo
   * botão "+ Adicionar" e pelo deep-link); informado, entra o mais perto
   * possível dali, sem sobrepor outro módulo (ver `resolveOffsetCm` em
   * `utils/rows.ts`) — usado ao soltar um módulo arrastado do catálogo em
   * qualquer ponto da fileira.
   */
  addModule: (mod: CatalogModule, widthCm: number, offsetCm?: number) => void;
  removeModule: (instanceId: string) => void;
  /** Move um módulo pra esquerda/direita dentro da própria fileira, um passo fixo (usado pelas setas no desktop). */
  reorderModules: (instanceId: string, direction: 'left' | 'right') => void;
  /** Reposiciona um módulo já colocado pra um X livre específico dentro da própria fileira (arrastar-e-soltar). */
  moveModule: (instanceId: string, targetOffsetCm: number) => void;
  /** Atualiza o indicador de posição em tempo real durante o arrasto (ver `DragPreview`). */
  setDragPreview: (preview: DragPreview | null) => void;
  setFinish: (finish: string) => void;
  setHandle: (handle: string) => void;
  /** Resolve preço + URL de add-to-cart de cada módulo colocado contra acabamento/puxador atuais. */
  resolveComposition: () => Promise<void>;
  /** Chama a função serverless que gera a visualização com IA (foto + módulos escolhidos). */
  generateAiRender: () => Promise<void>;
}

let instanceCounter = 0;

export const useConfiguratorStore = create<ConfiguratorState>((set, get) => ({
  step: 'room',
  room: null,
  roomPhoto: null,
  catalog: [],
  catalogLoading: false,
  catalogError: null,
  modules: [],
  finish: null,
  handle: null,
  resolving: false,
  aiRender: { loading: false, imageDataUrl: null, error: null },
  dragPreview: null,

  loadCatalog: async () => {
    set({ catalogLoading: true, catalogError: null });
    try {
      const catalog = await fetchKitchenModules();
      const firstWithFinish = catalog.find((m) => m.availableFinishes.length > 0);
      const firstWithHandle = catalog.find((m) => m.availableHandles.length > 0);
      set({
        catalog,
        catalogLoading: false,
        finish: get().finish ?? firstWithFinish?.availableFinishes[0] ?? null,
        handle: get().handle ?? firstWithHandle?.availableHandles[0] ?? null,
      });
    } catch (err) {
      set({
        catalogLoading: false,
        catalogError: err instanceof Error ? err.message : 'Erro ao carregar catálogo',
      });
    }
  },

  setRoom: (room) => set({ room, step: 'build' }),

  setRoomPhoto: (photo) => set({ roomPhoto: photo }),

  backToRoomStep: () => set({ step: 'room' }),

  goToReview: () => set({ step: 'review' }),

  backToBuildStep: () => set({ step: 'build' }),

  addModule: (mod, widthCm, offsetCm) => {
    const row = inferRowKey(mod.name);
    const room = get().room;
    const roomWidthCm = room?.widthCm ?? Number.POSITIVE_INFINITY;
    const others = get().modules.filter((m) => m.row === row);
    const packedEnd = packedEndOffsetCm(others);
    // Sem X explícito -> encosta no final da fileira (botão "+ Adicionar",
    // deep-link). Com X explícito (soltar arrastando) -> resolve pro ponto
    // livre mais próximo de onde o dedo soltou, sem sobrepor ninguém.
    const resolvedOffset =
      offsetCm === undefined
        ? packedEnd
        : resolveOffsetCm(others, offsetCm, widthCm, roomWidthCm, packedEnd);

    const placed: PlacedModule = {
      instanceId: `inst-${++instanceCounter}`,
      moduleId: mod.id,
      moduleName: mod.name,
      thumbnail: mod.images[0]?.thumbnail ?? '',
      widthCm,
      heightCm: mod.heightCm,
      basePriceCents: mod.minPriceCents,
      row,
      offsetCm: resolvedOffset,
    };
    set({ modules: [...get().modules, placed] });
    void get().resolveComposition();
  },

  removeModule: (instanceId) =>
    set({ modules: get().modules.filter((m) => m.instanceId !== instanceId) }),

  moveModule: (instanceId, targetOffsetCm) => {
    const modules = get().modules;
    const item = modules.find((m) => m.instanceId === instanceId);
    if (!item) return;
    const room = get().room;
    const roomWidthCm = room?.widthCm ?? Number.POSITIVE_INFINITY;
    const others = modules.filter((m) => m.row === item.row && m.instanceId !== instanceId);
    const resolvedOffset = resolveOffsetCm(others, targetOffsetCm, item.widthCm, roomWidthCm, item.offsetCm);
    set({
      modules: modules.map((m) =>
        m.instanceId === instanceId ? { ...m, offsetCm: resolvedOffset } : m,
      ),
    });
  },

  reorderModules: (instanceId, direction) => {
    const modules = get().modules;
    const item = modules.find((m) => m.instanceId === instanceId);
    if (!item) return;
    const room = get().room;
    const roomWidthCm = room?.widthCm ?? Number.POSITIVE_INFINITY;
    const others = modules.filter((m) => m.row === item.row && m.instanceId !== instanceId);
    // Passo fixo de 10cm — só usado pelas setas ←/→ no desktop, pra ajuste
    // fino sem precisar arrastar; se colidir com o vizinho, encosta nele.
    const step = 10;
    const desired = item.offsetCm + (direction === 'left' ? -step : step);
    const resolvedOffset = resolveOffsetCm(others, desired, item.widthCm, roomWidthCm, item.offsetCm);
    set({
      modules: modules.map((m) =>
        m.instanceId === instanceId ? { ...m, offsetCm: resolvedOffset } : m,
      ),
    });
  },

  setDragPreview: (preview) => set({ dragPreview: preview }),

  setFinish: (finish) => {
    set({ finish });
    void get().resolveComposition();
  },

  setHandle: (handle) => {
    set({ handle });
    void get().resolveComposition();
  },

  resolveComposition: async () => {
    const { modules, catalog, finish, handle } = get();
    if (modules.length === 0) return;
    set({ resolving: true });
    try {
      const updated = await Promise.all(
        modules.map(async (placed) => {
          const catalogModule = catalog.find((c) => c.id === placed.moduleId);
          if (!catalogModule) return placed;

          const match = catalogModule.variations.find(
            (v) =>
              v.widthCm === placed.widthCm &&
              v.finish === (finish ?? v.finish) &&
              (catalogModule.hasHandle ? v.handle === (handle ?? v.handle) : true),
          );
          if (!match) return placed;

          try {
            const resolved = await resolveVariation(match.variationId);
            return {
              ...placed,
              resolvedVariationId: resolved.variationId,
              resolvedPriceCents: resolved.priceCents,
              resolvedAddToCartUrl: resolved.addToCartUrl,
            };
          } catch {
            return placed;
          }
        }),
      );
      set({ modules: updated, resolving: false });
    } catch {
      set({ resolving: false });
    }
  },

  generateAiRender: async () => {
    const { roomPhoto, room, modules, finish, handle } = get();
    if (!roomPhoto || !room || modules.length === 0) return;

    set({ aiRender: { loading: true, imageDataUrl: null, error: null } });
    try {
      const result = await generateRender({
        roomPhotoBase64: roomPhoto.base64,
        roomPhotoMimeType: roomPhoto.mimeType,
        roomWidthCm: room.widthCm,
        roomHeightCm: room.heightCm,
        finish,
        handle,
        modules: buildRenderModules(modules),
      });
      set({
        aiRender: {
          loading: false,
          imageDataUrl: `data:${result.mimeType};base64,${result.imageBase64}`,
          error: null,
        },
      });
    } catch (err) {
      set({
        aiRender: {
          loading: false,
          imageDataUrl: null,
          error: err instanceof Error ? err.message : 'Erro ao gerar a visualização.',
        },
      });
    }
  },
}));
