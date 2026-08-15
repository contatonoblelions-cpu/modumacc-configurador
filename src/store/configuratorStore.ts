import { create } from 'zustand';
import type { CatalogModule } from '../types/catalog';
import type { PlacedModule, RoomDimensions } from '../types/composition';
import { fetchKitchenModules, resolveVariation } from '../api/storeApi';
import { buildRenderModules, generateRender } from '../api/generateRender';
import { inferRowKey } from '../utils/rows';

type Step = 'room' | 'build';

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

  loadCatalog: () => Promise<void>;
  setRoom: (room: RoomDimensions) => void;
  setRoomPhoto: (photo: RoomPhoto | null) => void;
  backToRoomStep: () => void;
  addModule: (mod: CatalogModule, widthCm: number) => void;
  removeModule: (instanceId: string) => void;
  /** Move um módulo pra esquerda/direita dentro da própria fileira (superior, inferior...). */
  reorderModules: (instanceId: string, direction: 'left' | 'right') => void;
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

  addModule: (mod, widthCm) => {
    const placed: PlacedModule = {
      instanceId: `inst-${++instanceCounter}`,
      moduleId: mod.id,
      moduleName: mod.name,
      thumbnail: mod.images[0]?.thumbnail ?? '',
      widthCm,
      heightCm: mod.heightCm,
      basePriceCents: mod.minPriceCents,
      row: inferRowKey(mod.name),
    };
    set({ modules: [...get().modules, placed] });
    void get().resolveComposition();
  },

  removeModule: (instanceId) =>
    set({ modules: get().modules.filter((m) => m.instanceId !== instanceId) }),

  reorderModules: (instanceId, direction) => {
    const modules = [...get().modules];
    const item = modules.find((m) => m.instanceId === instanceId);
    if (!item) return;

    // Só troca de posição com o vizinho dentro da MESMA fileira — módulos de
    // fileiras diferentes não se misturam na ordenação (cada fileira é uma
    // linha independente da parede).
    const rowGlobalIndices = modules
      .map((m, i) => ({ m, i }))
      .filter(({ m }) => m.row === item.row)
      .map(({ i }) => i);
    const posInRow = rowGlobalIndices.indexOf(modules.indexOf(item));
    const swapPos = direction === 'left' ? posInRow - 1 : posInRow + 1;
    if (swapPos < 0 || swapPos >= rowGlobalIndices.length) return;

    const idxA = rowGlobalIndices[posInRow];
    const idxB = rowGlobalIndices[swapPos];
    [modules[idxA], modules[idxB]] = [modules[idxB], modules[idxA]];
    set({ modules });
  },

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
