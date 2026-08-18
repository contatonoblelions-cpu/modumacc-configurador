import { create } from 'zustand';
import type { CatalogModule } from '../types/catalog';
import type { PlacedModule, RoomDimensions } from '../types/composition';
import { fetchKitchenModules, resolveVariation } from '../api/storeApi';
import { buildRenderModules, generateRender } from '../api/generateRender';
import { repackBands, reorderInBand } from '../utils/bands';

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
 * arrastando (antes de soltar) — é o retângulo tracejado que aparece no
 * ponto exato (X, Y) pra onde o módulo vai se ele soltar ali, em qualquer
 * lugar do quadrante. Estado efêmero (não faz parte da composição salva),
 * atualizado a cada movimento do dedo/mouse via `onDragMove` em `App.tsx` e
 * lido por `BuildCanvas.tsx` pra desenhar o indicador.
 */
export interface DragPreview {
  x: number;
  y: number;
  widthCm: number;
  heightCm: number;
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
   * A fileira (parede/"superior" ou chão/"base", ver `utils/bands.ts`) é
   * SEMPRE decidida pelo tipo do módulo — não é mais escolha livre. `position`
   * só usa o `x` (cm), como dica de ONDE dentro da fileira ele deve entrar:
   * omitido, vai pro final dela (botão "+ Adicionar", deep-link); informado
   * (soltar arrastando do catálogo), entra colado na posição mais perto
   * daquele X, empurrando os outros da mesma fileira (ver `reorderInBand`).
   */
  addModule: (mod: CatalogModule, widthCm: number, position?: { x: number; y: number }) => void;
  removeModule: (instanceId: string) => void;
  /** Reordena um módulo já colocado DENTRO da própria fileira, pro X mais perto de onde foi solto (ver `utils/bands.ts` > `reorderInBand`). */
  moveModule: (instanceId: string, targetXCm: number, targetYCm?: number) => void;
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

  addModule: (mod, widthCm, position) => {
    const room = get().room;
    if (!room) return;

    const placed: PlacedModule = {
      instanceId: `inst-${++instanceCounter}`,
      moduleId: mod.id,
      moduleName: mod.name,
      thumbnail: mod.images[0]?.thumbnail ?? '',
      widthCm,
      heightCm: mod.heightCm,
      basePriceCents: mod.minPriceCents,
      offsetXCm: 0,
      offsetYCm: 0,
    };

    // Sem ponto explícito -> vai pro FINAL da fileira certa (parede ou
    // chão, ver `utils/bands.ts`) — usado pelo botão "+ Adicionar" e pelo
    // deep-link. Com ponto explícito (soltar arrastando) -> entra na
    // fileira já colado, na posição mais perto de onde soltou (mesmo
    // `reorderInBand` usado por `moveModule`, aplicado ao módulo recém-
    // criado antes do repack).
    const withNew = [...get().modules, placed];
    const ordered = position === undefined ? withNew : reorderInBand(withNew, placed.instanceId, position.x);
    set({ modules: repackBands(ordered, room) });
    void get().resolveComposition();
  },

  removeModule: (instanceId) => {
    const room = get().room;
    const remaining = get().modules.filter((m) => m.instanceId !== instanceId);
    set({ modules: room ? repackBands(remaining, room) : remaining });
  },

  moveModule: (instanceId, targetXCm) => {
    const room = get().room;
    if (!room) return;
    const reordered = reorderInBand(get().modules, instanceId, targetXCm);
    set({ modules: repackBands(reordered, room) });
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
