import { create } from 'zustand';
import type { CatalogModule } from '../types/catalog';
import type { PlacedModule, RoomDimensions, SinkFixture, FridgeFixture, StoveFixture } from '../types/composition';
import { fetchKitchenModules, resolveVariation } from '../api/storeApi';
import { buildCollageDataUrl, buildRenderModules, generateRender } from '../api/generateRender';
import { resolvePositionCm, packedPositionCm, snapPositionCm } from '../utils/placement';
import { getModuleBand, getBandYRange, getCountertopRatio } from '../utils/bands';
import { FRIDGE_WIDTH_CM, FRIDGE_HEIGHT_CM } from '../utils/fridge';
import { STOVE_WIDTH_CM, STOVE_HEIGHT_CM } from '../utils/stove';

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
    /** Pia com torneira posicionada sobre a bancada -- null quando o espaço não tem largura de pia informada (ver `RoomDimensions.sinkWidthCm`). */
  sink: SinkFixture | null;
    /** Geladeira de referência visual -- null quando o cliente não marcou "incluir geladeira" (ver `RoomDimensions.includeFridge`). */
  fridge: FridgeFixture | null;
    /** Fogão de referência visual -- null quando o cliente não marcou "incluir fogão". */
  stove: StoveFixture | null;

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
    /**
     * Gira o módulo `deltaDeg` graus (positivo = horário) a partir da rotação
     * atual, dando a volta completa (0-359, com wraparound nos dois
     * sentidos) — só efeito visual, não muda o espaço ocupado na parede.
     */
  rotateModule: (instanceId: string, deltaDeg: number) => void;
    /** Atualiza o indicador de posição em tempo real durante o arrasto (ver `DragPreview`). */
  setDragPreview: (preview: DragPreview | null) => void;
    /** Move a pia pra uma posição X (cm) livre horizontalmente dentro do espaço -- fica sempre encostada na linha da bancada, só desliza pros lados. */
  moveSink: (targetXCm: number) => void;
    /** Move a geladeira pra uma posição X (cm) livre horizontalmente dentro do espaço -- fica sempre encostada no chão, só desliza pros lados (mesma lógica de `moveSink`). */
  moveFridge: (targetXCm: number) => void;
    /** Move o fogão horizontalmente (mesma lógica de `moveFridge`). */
  moveStove: (targetXCm: number) => void;
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
    sink: null,
    fridge: null,
    stove: null,

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

    setRoom: (room) => {
          const sink: SinkFixture | null =
              room.sinkWidthCm && room.sinkWidthCm > 0
              ? { widthCm: room.sinkWidthCm, offsetXCm: Math.max(0, (room.widthCm - room.sinkWidthCm) / 2) }
                : null;
          const fridgeW = room.fridgeWidthCm && room.fridgeWidthCm > 0 ? room.fridgeWidthCm : FRIDGE_WIDTH_CM;
          const fridgeH = room.fridgeHeightCm && room.fridgeHeightCm > 0 ? room.fridgeHeightCm : FRIDGE_HEIGHT_CM;
          const fridge: FridgeFixture | null = room.includeFridge
            ? { offsetXCm: Math.max(0, Math.min(room.widthCm - fridgeW, 0)), widthCm: fridgeW, heightCm: fridgeH }
              : null;
          const stoveW = room.stoveWidthCm && room.stoveWidthCm > 0 ? room.stoveWidthCm : STOVE_WIDTH_CM;
          const stoveH = room.stoveHeightCm && room.stoveHeightCm > 0 ? room.stoveHeightCm : STOVE_HEIGHT_CM;
          const stove: StoveFixture | null = room.includeStove
            ? { offsetXCm: Math.max(0, Math.min(room.widthCm - stoveW, room.includeFridge ? fridgeW + 20 : 100)), widthCm: stoveW, heightCm: stoveH }
              : null;
          set({ room, step: 'build', sink, fridge, stove });
    },

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
          const fridge = get().fridge;
          if (fridge) {
                  others.push({
                            x: fridge.offsetXCm,
                            y: Math.max(0, room.heightCm - fridge.heightCm),
                            widthCm: fridge.widthCm,
                            heightCm: fridge.heightCm,
                  });
          }
          const stoveObs = get().stove;
          if (stoveObs) {
                  others.push({
                            x: stoveObs.offsetXCm,
                            y: Math.max(0, room.heightCm - stoveObs.heightCm),
                            widthCm: stoveObs.widthCm,
                            heightCm: stoveObs.heightCm,
                  });
          }
          const band = getModuleBand(mod.name);
          const yBounds = getBandYRange(band, room, mod.heightCm, mod.name);
          const packed = packedPositionCm(others, size, room, yBounds, band === 'base' ? 'bottom' : 'top');
          const resolvedRaw =
              position === undefined ? packed : resolvePositionCm(others, position, size, room, packed, yBounds);
          const resolved = snapPositionCm(others, resolvedRaw, size, room, yBounds);
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
              rotationDeg: 0,
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
          const fridgeObstacle = get().fridge;
          if (fridgeObstacle) {
                  others.push({
                            x: fridgeObstacle.offsetXCm,
                            y: Math.max(0, room.heightCm - fridgeObstacle.heightCm),
                            widthCm: fridgeObstacle.widthCm,
                            heightCm: fridgeObstacle.heightCm,
                  });
          }
          const stoveObstacle = get().stove;
          if (stoveObstacle) {
                  others.push({
                            x: stoveObstacle.offsetXCm,
                            y: Math.max(0, room.heightCm - stoveObstacle.heightCm),
                            widthCm: stoveObstacle.widthCm,
                            heightCm: stoveObstacle.heightCm,
                  });
          }
          const band = getModuleBand(item.moduleName);
          const yBounds = getBandYRange(band, room, item.heightCm, item.moduleName);
          const resolvedRaw = resolvePositionCm(
                  others,
            { x: targetXCm, y: targetYCm },
            { widthCm: item.widthCm, heightCm: item.heightCm },
                  room,
            { x: item.offsetXCm, y: item.offsetYCm },
                  yBounds,
                );
          const resolved = snapPositionCm(
                  others,
                  resolvedRaw,
            { widthCm: item.widthCm, heightCm: item.heightCm },
                  room,
                  yBounds,
                );
          set({
                  modules: modules.map((m) =>
                            m.instanceId === instanceId ? { ...m, offsetXCm: resolved.x, offsetYCm: resolved.y } : m,
                                             ),
          });
    },

    moveSink: (targetXCm) => {
          const { sink, room } = get();
          if (!sink || !room) return;
          const maxX = Math.max(0, room.widthCm - sink.widthCm);
          const offsetXCm = Math.min(maxX, Math.max(0, targetXCm));
          set({ sink: { ...sink, offsetXCm } });
    },

    moveFridge: (targetXCm) => {
          const { fridge, room } = get();
          if (!fridge || !room) return;
          const maxX = Math.max(0, room.widthCm - fridge.widthCm);
          const offsetXCm = Math.min(maxX, Math.max(0, targetXCm));
          set({ fridge: { ...fridge, offsetXCm } });
    },

    moveStove: (targetXCm) => {
          const { stove, room } = get();
          if (!stove || !room) return;
          const maxX = Math.max(0, room.widthCm - stove.widthCm);
          const offsetXCm = Math.min(maxX, Math.max(0, targetXCm));
          set({ stove: { ...stove, offsetXCm } });
    },

    rotateModule: (instanceId, deltaDeg) =>
          set({
                  modules: get().modules.map((m) =>
                            m.instanceId === instanceId
                                                       ? { ...m, rotationDeg: (((m.rotationDeg + deltaDeg) % 360) + 360) % 360 }
                              : m,
                                                   ),
          }),

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
          const { roomPhoto, room, modules, finish, handle, sink, fridge, stove } = get();
          // A foto do ambiente e OPCIONAL: sem ela, geramos sobre um fundo neutro.
          if (!room || modules.length === 0) return;

      set({ aiRender: { loading: true, imageDataUrl: null, error: null } });
          try {
                  const collage = await buildCollageDataUrl({
                            roomPreviewUrl: roomPhoto?.previewUrl ?? null,
                            roomWidthCm: room.widthCm,
                            roomHeightCm: room.heightCm,
                            finish,
                            handle,
                            modules: modules.map((m) => ({
                                        moduleName: m.moduleName,
                                        thumbnail: m.thumbnail,
                                        widthCm: m.widthCm,
                                        heightCm: m.heightCm,
                                        offsetXCm: m.offsetXCm,
                                        offsetYCm: m.offsetYCm,
                            })),
                            fridge: fridge ? { offsetXCm: fridge.offsetXCm, widthCm: fridge.widthCm, heightCm: fridge.heightCm } : null,
                            stove: stove ? { offsetXCm: stove.offsetXCm, widthCm: stove.widthCm, heightCm: stove.heightCm } : null,
                            sink: sink ? { offsetXCm: sink.offsetXCm, widthCm: sink.widthCm } : null,
                            countertopRatio: getCountertopRatio(room),
                  });
                  const result = await generateRender({
                            roomPhotoBase64: roomPhoto?.base64 ?? '',
                            roomPhotoMimeType: roomPhoto?.mimeType ?? 'image/jpeg',
                            roomWidthCm: room.widthCm,
                            roomHeightCm: room.heightCm,
                            finish,
                            handle,
                            modules: buildRenderModules(modules),
                            collageBase64: collage?.base64,
                            collageMimeType: collage?.mimeType,
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
