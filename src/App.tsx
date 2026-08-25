import { useEffect, useRef } from 'react';
import {
  DndContext,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragMoveEvent,
} from '@dnd-kit/core';
import { useConfiguratorStore } from './store/configuratorStore';
import { WALL_DROPPABLE_ID } from './components/BuildCanvas';
import { getModuleBand, getBandYRange } from './utils/bands';
import { snapPositionCm } from './utils/placement';
import { AppBackground } from './components/AppBackground';
import { Header } from './components/Header';
import { RoomSizeForm } from './components/RoomSizeForm';
import { ModulePanel } from './components/ModulePanel';
import { BuildCanvas } from './components/BuildCanvas';
import { SummaryBar } from './components/SummaryBar';

type DragData =
  | { type: 'catalog-module'; moduleId: number; moduleName: string; widthCm: number; heightCm: number }
  | { type: 'placed-module'; instanceId: string; moduleName: string; widthCm: number; heightCm: number }
  | { type: 'sink' }
  | { type: 'fridge' }
  | { type: 'stove' };

function App() {
  const step = useConfiguratorStore((s) => s.step);
  const room = useConfiguratorStore((s) => s.room);
  const catalog = useConfiguratorStore((s) => s.catalog);
  const loadCatalog = useConfiguratorStore((s) => s.loadCatalog);
  const addModule = useConfiguratorStore((s) => s.addModule);
  const moveModule = useConfiguratorStore((s) => s.moveModule);
  const modules = useConfiguratorStore((s) => s.modules);
  const moveSink = useConfiguratorStore((s) => s.moveSink);
  const moveFridge = useConfiguratorStore((s) => s.moveFridge);
  const moveStove = useConfiguratorStore((s) => s.moveStove);
  const setDragPreview = useConfiguratorStore((s) => s.setDragPreview);
  const autoAddedRef = useRef(false);

  /**
   * `PointerSensor` sozinho NÃO é confiável em toque real (testado em
   * celular físico): o navegador decide se o gesto é "rolar a faixa" ou
   * "arrastar o módulo" antes do JS conseguir reagir, e sem um sensor
   * dedicado a toque, o gesto quase sempre vira rolagem. Por isso aqui
   * usamos o par oficial recomendado pelo dnd-kit pra essa ambiguidade:
   * `MouseSensor` cuida do desktop (mouse), `TouchSensor` cuida do toque
   * de verdade — cada um com sua própria forma de desambiguar arrastar vs.
   * rolar:
   * - Mouse: `distance` (8px) — precisa mover um pouco antes de "confirmar"
   *   o drag, pra um clique simples não virar arrasto sem querer.
   * - Touch: `delay` (200ms) + `tolerance` (8px) — precisa segurar o dedo
   *   parado por um instante antes do drag "pegar"; se a pessoa já começar
   *   a mover o dedo rápido (gesto típico de rolagem), o navegador rola
   *   normalmente em vez de iniciar o arrasto.
   * O `touch-action: none` nos itens arrastáveis (ver `ModuleCard.tsx` e
   * `BuildCanvas.tsx`) reforça isso — EXCETO no `ModuleChip.tsx` da faixa
   * horizontal, que propositalmente não tem, pra não travar o deslize da
   * faixa (ver comentário lá).
   */
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  );

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  /**
   * Deep-link vindo do botão "Customizar" na página do produto no site
   * (modumacc.com.br/?produto=...): a URL do configurador vem com
   * `?add=<id-do-produto-woocommerce>`, e assim que o cliente entra na tela
   * de montagem (depois de informar as medidas do espaço) esse módulo já é
   * adicionado automaticamente à composição, no primeiro canto livre.
   * Roda só uma vez por sessão (ver `autoAddedRef`) e limpa o parâmetro da
   * URL depois, pra não adicionar de novo se a pessoa atualizar a página.
   */
  useEffect(() => {
    if (step !== 'build' || catalog.length === 0 || autoAddedRef.current) return;
    autoAddedRef.current = true;

    const params = new URLSearchParams(window.location.search);
    const addId = params.get('add');
    if (!addId) return;

    const mod = catalog.find((m) => m.id === Number(addId));
    if (mod && mod.availableWidths.length > 0) {
      addModule(mod, mod.availableWidths[0]);
    }

    params.delete('add');
    const newSearch = params.toString();
    window.history.replaceState(
      null,
      '',
      window.location.pathname + (newSearch ? `?${newSearch}` : ''),
    );
  }, [step, catalog, addModule]);

  /**
   * Calcula em que ponto (X, Y em cm) o módulo ficaria SE fosse solto agora
   * — usado tanto pra desenhar o indicador "fantasma" em tempo real
   * (`onDragMove`) quanto pra decidir a posição final (`onDragEnd`). Não há
   * mais fileiras: o quadrante inteiro (`WALL_DROPPABLE_ID`, ver
   * `BuildCanvas.tsx`) é um único alvo, e o módulo pode ir pra qualquer
   * ponto dele.
   *
   * A matemática: `active.rect.current.translated` é o retângulo do item
   * sendo arrastado (o elemento ORIGINAL, não um `DragOverlay`) já somado
   * ao deslocamento do dedo/mouse — o dnd-kit calcula isso sozinho, não
   * precisamos aplicar transform manualmente em nada. Pegamos o CENTRO
   * desse retângulo, subtraímos a borda esquerda/superior do quadrante
   * (`over.rect`) pra virar um X/Y relativo a ele, e convertemos de pixel
   * pra cm usando a escala real do quadrante (`over.rect.width /
   * room.widthCm` — largura e altura usam a MESMA escala, sem distorcer).
   * Por fim subtraímos metade da largura/altura do módulo, porque queremos
   * a borda ESQUERDA/SUPERIOR dele (o que a store espera), não o centro.
   */
  function computeDropTarget(
    event: DragMoveEvent | DragEndEvent,
  ): { x: number; y: number; widthCm: number; heightCm: number } | null {
    const { active, over } = event;
    if (!over || !room) return null;
    if (over.id !== WALL_DROPPABLE_ID) return null;

    const data = active.data.current as DragData | undefined;
    if (!data || data.type === 'sink' || data.type === 'fridge' || data.type === 'stove') return null;

    const translated = active.rect.current.translated;
    if (!translated || !over.rect.width) return null;

    const widthCm = data.widthCm;
    const heightCm = data.heightCm;
    const scale = over.rect.width / room.widthCm;
    const centerX = translated.left + translated.width / 2;
    const centerY = translated.top + translated.height / 2;
    const relativeX = centerX - over.rect.left;
    const relativeY = centerY - over.rect.top;
    const rawX = relativeX / scale - widthCm / 2;
    const rawY = relativeY / scale - heightCm / 2;

    const band = getModuleBand(data.moduleName);
    const { minY, maxY } = getBandYRange(band, room, heightCm);
    const isMicro = /microondas/i.test(data.moduleName.normalize('NFD').replace(/[\u0300-\u036f]/g, ''));
    const y = band === 'superior' && !isMicro ? minY : Math.min(maxY, Math.max(minY, rawY));

    const others = modules
      .filter((m) => !(data.type === 'placed-module' && m.instanceId === data.instanceId))
      .map((m) => ({ x: m.offsetXCm, y: m.offsetYCm, widthCm: m.widthCm, heightCm: m.heightCm }));
    const snapped = snapPositionCm(others, { x: rawX, y }, { widthCm, heightCm }, room, { minY, maxY });

    return { x: snapped.x, y: snapped.y, widthCm, heightCm };
  }

  /** Calcula a posição X (cm) da pia se fosse solta agora -- só horizontal, sempre na linha da bancada (ver `computeDropTarget` pra lógica geral equivalente dos módulos). */
  function computeSinkX(event: DragMoveEvent | DragEndEvent): number | null {
    const { active, over } = event;
    if (!over || !room) return null;
    if (over.id !== WALL_DROPPABLE_ID) return null;
    const data = active.data.current as DragData | undefined;
    if (!data || data.type !== 'sink') return null;

    const translated = active.rect.current.translated;
    if (!translated || !over.rect.width) return null;

    const scale = over.rect.width / room.widthCm;
    const centerX = translated.left + translated.width / 2;
    const relativeX = centerX - over.rect.left;
    return relativeX / scale;
  }

  /** Calcula a posição X (cm) da geladeira se fosse solta agora -- mesma lógica de `computeSinkX` (só horizontal, referência visual). */
  function computeFridgeX(event: DragMoveEvent | DragEndEvent): number | null {
    const { active, over } = event;
    if (!over || !room) return null;
    if (over.id !== WALL_DROPPABLE_ID) return null;
    const data = active.data.current as DragData | undefined;
    if (!data || data.type !== 'fridge') return null;

    const translated = active.rect.current.translated;
    if (!translated || !over.rect.width) return null;

    const scale = over.rect.width / room.widthCm;
    const centerX = translated.left + translated.width / 2;
    const relativeX = centerX - over.rect.left;
    return relativeX / scale;
  }

  /** Calcula a posição X (cm) do fogão se fosse solto agora -- mesma lógica de `computeFridgeX`. */
  function computeStoveX(event: DragMoveEvent | DragEndEvent): number | null {
    const { active, over } = event;
    if (!over || !room) return null;
    if (over.id !== WALL_DROPPABLE_ID) return null;
    const data = active.data.current as DragData | undefined;
    if (!data || data.type !== 'stove') return null;

    const translated = active.rect.current.translated;
    if (!translated || !over.rect.width) return null;

    const scale = over.rect.width / room.widthCm;
    const centerX = translated.left + translated.width / 2;
    const relativeX = centerX - over.rect.left;
    return relativeX / scale;
  }

  /** Atualiza o indicador "fantasma" a cada movimento — dá o feedback em tempo real de onde o módulo vai encaixar. */
  function handleDragMove(event: DragMoveEvent) {
    const data = event.active.data.current as DragData | undefined;
    if (data?.type === 'sink') {
      const sinkX = computeSinkX(event);
      if (sinkX !== null) moveSink(sinkX);
      return;
    }
    if (data?.type === 'fridge') {
      const fridgeX = computeFridgeX(event);
      if (fridgeX !== null) moveFridge(fridgeX);
      return;
    }
    if (data?.type === 'stove') {
      const stoveX = computeStoveX(event);
      if (stoveX !== null) moveStove(stoveX);
      return;
    }
    const target = computeDropTarget(event);
    setDragPreview(target);
  }

  function handleDragEnd(event: DragEndEvent) {
    setDragPreview(null);
    const data = event.active.data.current as DragData | undefined;
    if (!data) return;

    if (data.type === 'sink') {
      const sinkX = computeSinkX(event);
      if (sinkX !== null) moveSink(sinkX);
      return;
    }

    if (data.type === 'fridge') {
      const fridgeX = computeFridgeX(event);
      if (fridgeX !== null) moveFridge(fridgeX);
      return;
    }

    if (data.type === 'stove') {
      const stoveX = computeStoveX(event);
      if (stoveX !== null) moveStove(stoveX);
      return;
    }

    const target = computeDropTarget(event);
    if (!target) return;

    if (data.type === 'catalog-module') {
      const mod = catalog.find((m) => m.id === data.moduleId);
      if (!mod) return;
      addModule(mod, data.widthCm, { x: target.x, y: target.y });
    } else {
      moveModule(data.instanceId, target.x, target.y);
    }
  }

  function handleDragCancel() {
    setDragPreview(null);
  }

  if (step === 'room') {
    return (
      <>
        <AppBackground />
        <div className="flex h-dvh flex-col">
          <Header />
          <RoomSizeForm />
        </div>
      </>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <AppBackground />
      <div className="flex h-dvh flex-col">
        <Header />
        <div className="flex flex-1 flex-col overflow-hidden md:flex-row">
          {step === 'build' && <ModulePanel />}
          <BuildCanvas />
        </div>
        <SummaryBar />
      </div>
    </DndContext>
  );
}

export default App;
