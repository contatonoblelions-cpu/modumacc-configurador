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
import { getModuleBand } from './utils/bands';
import { AppBackground } from './components/AppBackground';
import { Header } from './components/Header';
import { RoomSizeForm } from './components/RoomSizeForm';
import { ModulePanel } from './components/ModulePanel';
import { BuildCanvas } from './components/BuildCanvas';
import { FinishHandleSelector } from './components/FinishHandleSelector';
import { SummaryBar } from './components/SummaryBar';

type DragData =
  | { type: 'catalog-module'; moduleId: number; widthCm: number; heightCm: number }
  | { type: 'placed-module'; instanceId: string; widthCm: number; heightCm: number };

function App() {
  const step = useConfiguratorStore((s) => s.step);
  const room = useConfiguratorStore((s) => s.room);
  const catalog = useConfiguratorStore((s) => s.catalog);
  const modules = useConfiguratorStore((s) => s.modules);
  const loadCatalog = useConfiguratorStore((s) => s.loadCatalog);
  const addModule = useConfiguratorStore((s) => s.addModule);
  const moveModule = useConfiguratorStore((s) => s.moveModule);
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
   * Calcula em que ponto (X em cm, mais a largura/altura) o módulo ficaria
   * SE fosse solto agora — usado tanto pra desenhar o indicador "fantasma"
   * em tempo real (`onDragMove`) quanto pra decidir a posição final
   * (`onDragEnd`). O quadrante inteiro (`WALL_DROPPABLE_ID`, ver
   * `BuildCanvas.tsx`) continua sendo um único alvo pro drop, mas a
   * fileira (parede/chão) e o Y já não são mais livres — são sempre fixos
   * pelo TIPO do módulo (ver `utils/bands.ts` > `getModuleBand`), só o X
   * (em que ordem ele entra na fileira) é que continua vindo de onde a
   * pessoa soltou.
   *
   * A matemática do X: `active.rect.current.translated` é o retângulo do
   * item sendo arrastado (o elemento ORIGINAL, não um `DragOverlay`) já
   * somado ao deslocamento do dedo/mouse — o dnd-kit calcula isso sozinho.
   * Pegamos o CENTRO desse retângulo, subtraímos a borda esquerda do
   * quadrante (`over.rect`) pra virar um X relativo a ele, e convertemos de
   * pixel pra cm usando a escala real do quadrante (`over.rect.width /
   * room.widthCm`). Por fim subtraímos metade da largura do módulo, porque
   * a store espera a borda ESQUERDA dele, não o centro.
   */
  function computeDropTarget(
    event: DragMoveEvent | DragEndEvent,
  ): { x: number; y: number; widthCm: number; heightCm: number } | null {
    const { active, over } = event;
    if (!over || !room) return null;
    if (over.id !== WALL_DROPPABLE_ID) return null;

    const data = active.data.current as DragData | undefined;
    if (!data) return null;

    const translated = active.rect.current.translated;
    if (!translated || !over.rect.width) return null;

    const widthCm = data.widthCm;
    const heightCm = data.heightCm;
    const scale = over.rect.width / room.widthCm;
    const centerX = translated.left + translated.width / 2;
    const relativeX = centerX - over.rect.left;
    const x = relativeX / scale - widthCm / 2;

    // Nome do módulo (pra descobrir a fileira, ver `getModuleBand`): vem do
    // catálogo (novo módulo) ou da composição já montada (módulo existente
    // sendo reordenado).
    const name =
      data.type === 'catalog-module'
        ? catalog.find((m) => m.id === data.moduleId)?.name
        : modules.find((m) => m.instanceId === data.instanceId)?.moduleName;
    const band = name ? getModuleBand(name) : 'base';
    const y = band === 'superior' ? 0 : Math.max(0, room.heightCm - heightCm);

    return { x, y, widthCm, heightCm };
  }

  /** Atualiza o indicador "fantasma" a cada movimento — dá o feedback em tempo real de onde o módulo vai encaixar. */
  function handleDragMove(event: DragMoveEvent) {
    const target = computeDropTarget(event);
    setDragPreview(target);
  }

  function handleDragEnd(event: DragEndEvent) {
    setDragPreview(null);
    const target = computeDropTarget(event);
    if (!target) return;

    const data = event.active.data.current as DragData | undefined;
    if (!data) return;

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
        <div className="flex h-screen flex-col">
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
      <div className="flex h-screen flex-col">
        <Header />
        <FinishHandleSelector />
        {/*
          No mobile a ordem visual é invertida (área de montagem fixa em
          cima, faixa de módulos rolável embaixo — layout "estilo editor de
          vídeo", ver BuildCanvas.tsx/ModulePanel.tsx) via `order`, sem mudar
          a ordem real no DOM nem o layout desktop (`md:order-none` volta pra
          ordem de código: painel à esquerda, parede à direita).
        */}
        <div className="flex flex-1 flex-col overflow-hidden md:flex-row">
          {step === 'build' && <ModulePanel />}
          <BuildCanvas />
        </div>
        <SummaryBar />
      </div>

      {/*
        Não usamos `DragOverlay` com preview do módulo aqui: o feedback em
        tempo real é o indicador "fantasma" desenhado dentro do próprio
        quadrante (`BuildCanvas.tsx`), que já mostra exatamente onde e do
        tamanho que o módulo vai encaixar — muito mais direto que um card
        flutuante genérico seguindo o dedo.
      */}
    </DndContext>
  );
}

export default App;
