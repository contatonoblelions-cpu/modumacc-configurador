import { create } from 'zustand';
import type { CatalogModule } from '../types/catalog';
import type { PlacedModule, RoomDimensions } from '../types/composition';
import { fetchKitchenModules, resolveVariation } from '../api/storeApi';
import { buildRenderModules, generateRender } from '../api/generateRender';
import { resolvePositionCm, packedPositionCm } from '../utils/placement';
import { getModuleBand, getBandYRange } from '../utils/bands';

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
   * `position` é o ponto (X, Y) LIVRE onde o módulo entra, em cm a partir do
   * canto superior esquerdo do espaço — omitido, entra no primeiro canto
   * livre (usado pelo botão "+ Adicionar" e pelo deep-link); informado,
   * entra o mais perto possível dali, sem sobrepor outro módulo (ver
   * `resolvePositionCm` em `utils/placement.ts`) — usado ao soltar um
   * módulo arrastado do catálogo em qualquer ponto do quadrante.
   */
  addModule: (mod: CatalogModule, widthCm: number, position?: { x: number; y: number }) => void;
  removeModule: (instanceId: string) => void;
  /** Reposiciona um módulo já colocado pra um ponto (X, Y) livre específico do quadrante (arrastar-e-soltar). */
  moveModule: (instanceId: string, targetXCm: number, targetYCm: number) => void;
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
    const size = { widthCm, heightCm: mod.heightCm };
    const others = get().modules.map((m) => ({
      x: m.offsetXCm,
      y: m.offsetYCm,
      widthCm: m.widthCm,
      heightCm: m.heightCm,
    }));
    // Módulo de parede ("superior") só pode ficar na faixa de cima, módulo
    // de chão só na faixa de baixo — nunca cruza a linha da bancada (ver
    // `utils/bands.ts`). Dentro da própria faixa continua livre em X e Y.
    const band = getModuleBand(mod.name);
    const yBounds = getBandYRange(band, room, mod.heightCm);
    const packed = packedPositionCm(others, size, room, yBounds);
    // Sem ponto explícito -> primeiro canto livre da faixa (botão "+
    // Adicionar", deep-link). Com ponto explícito (soltar arrastando) ->
    // resolve pro ponto livre mais próximo de onde o dedo soltou, sem
    // sobrepor ninguém e sem sair da faixa.
    const resolved =
      position === undefined ? packed : resolvePositionCm(others, position, size, room, packed, yBounds);

    const placed: PlacedModule = {
      instanceId: `inst-${++instanceCounter}`,
      moduleId: mod.id,
      moduleName: mod.name,
      thumbnail: mod.images[0]?.thumbnail ?? '',
      widthCm,
      heightCm: mod.heightCm,
      basePriceCents: mod.minPriceCents,
      offsetXCm: resolved.x,
      offsetYCm: resolved.y,
    };
    set({ modules: [...get().modules, placed] });
    void get().resolveComposition();
  },

  removeModule: (instanceId) =>
    set({ modules: get().modules.filter((m) => m.instanceId !== instanceId) }),

  moveModule: (instanceId, targetXCm, targetYCm) => {
    const modules = get().modules;
    const item = modules.find((m) => m.instanceId === instanceId);
    if (!item) return;
    const room = get().room;
    if (!room) return;
    const others = modules
      .filter((m) => m.instanceId !== instanceId)
      .map((m) => ({ x: m.offsetXCm, y: m.offsetYCm, widthCm: m.widthCm, heightCm: m.heightCm }));
    const band = getModuleBand(item.moduleName);
    const yBounds = getBandYRange(band, room, item.heightCm);
    const resolved = resolvePositionCm(
      others,
      { x: targetXCm, y: targetYCm },
      { widthCm: item.widthCm, heightCm: item.heightCm },
      room,
      { x: item.offsetXCm, y: item.offsetYCm },
      yBounds,
    );
    set({
      modules: modules.map((m) =>
        m.instanceId === instanceId ? { ...m, offsetXCm: resolved.x, offsetYCm: resolved.y } : m,
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
