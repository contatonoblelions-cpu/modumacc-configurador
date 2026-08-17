import { useEffect, useRef, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { useConfiguratorStore } from './store/configuratorStore';
import { inferRowKey } from './utils/rows';
import type { RowKey } from './types/composition';
import { AppBackground } from './components/AppBackground';
import { Header } from './components/Header';
import { RoomSizeForm } from './components/RoomSizeForm';
import { ModulePanel } from './components/ModulePanel';
import { BuildCanvas } from './components/BuildCanvas';
import { FinishHandleSelector } from './components/FinishHandleSelector';
import { SummaryBar } from './components/SummaryBar';

type DragData =
  | { type: 'catalog-module'; moduleId: number; widthCm: number }
  | { type: 'placed-module'; instanceId: string; row: RowKey };

/** O que mostrar dentro do `DragOverlay` enquanto um módulo está sendo arrastado. */
interface ActiveDragPreview {
  name: string;
  widthCm: number;
}

function App() {
  const step = useConfiguratorStore((s) => s.step);
  const catalog = useConfiguratorStore((s) => s.catalog);
  const modules = useConfiguratorStore((s) => s.modules);
  const loadCatalog = useConfiguratorStore((s) => s.loadCatalog);
  const addModule = useConfiguratorStore((s) => s.addModule);
  const moveModule = useConfiguratorStore((s) => s.moveModule);
  const autoAddedRef = useRef(false);
  const [activeDrag, setActiveDrag] = useState<ActiveDragPreview | null>(null);

  /**
   * Sem isso, arrastar no celular fica quebrado: o navegador interpreta o
   * toque como scroll da página antes do dnd-kit conseguir iniciar o drag.
   * O `activationConstraint` (mover 8px antes de "confirmar" o drag) evita
   * que um toque rápido em outro elemento dispare um arrasto sem querer —
   * o resto da confiabilidade em touch vem do `touch-none` nos elementos
   * arrastáveis (ver `ModuleCard.tsx`, `ModuleChip.tsx` e `BuildCanvas.tsx`)
   * e do `PointerSensor`, que no mobile já cobre toque via Pointer Events
   * (não precisa de um `TouchSensor` separado).
   */
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  /**
   * Deep-link vindo do botão "Customizar" na página do produto no site
   * (modumacc.com.br/?produto=...): a URL do configurador vem com
   * `?add=<id-do-produto-woocommerce>`, e assim que o cliente entra na tela
   * de montagem (depois de informar as medidas do espaço) esse módulo já é
   * adicionado automaticamente à composição, no final da fileira certa
   * (decidida pelo nome do produto — ver `store/`).
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
   * Guarda nome + largura do módulo sendo arrastado agora (do catálogo ou
   * já colocado na parede) pra alimentar o `DragOverlay` abaixo — é esse
   * card flutuante que dá a sensação de "arrastar de verdade", seguindo o
   * dedo/mouse em tempo real por cima de qualquer scroll ou breakpoint,
   * sem precisar calcular transform manualmente pra cada contêiner.
   */
  function handleDragStart(event: DragStartEvent) {
    const data = event.active.data.current as DragData | undefined;
    if (!data) return;

    if (data.type === 'catalog-module') {
      const mod = catalog.find((m) => m.id === data.moduleId);
      if (mod) setActiveDrag({ name: mod.name, widthCm: data.widthCm });
    } else if (data.type === 'placed-module') {
      const placed = modules.find((m) => m.instanceId === data.instanceId);
      if (placed) setActiveDrag({ name: placed.moduleName, widthCm: placed.widthCm });
    }
  }

  /**
   * Um "slot" é uma zona fina de soltar entre dois módulos (ou nas pontas)
   * de uma fileira específica, com id no formato `slot::<fileira>::<índice>`
   * (ver `BuildCanvas.tsx` > `InsertSlot`). Isso é o que dá a sensação de
   * posição livre: em vez de só poder jogar no final, dá pra soltar em
   * qualquer posição dentro da fileira — o `closestCenter` (ver `DndContext`
   * abaixo) já escolhe sozinho o slot mais próreo de onde o dedo soltou,
   * mesmo que o toque não esteja exatamente em cima dele.
   *
   * A fileira em si NUNCA muda por causa de onde foi solto — é sempre a do
   * produto (ver `inferRowKey`). Por segurança, se por algum motivo o slot
   * for de outra fileira (não deveria acontecer, já que esses slots ficam
   * desabilitados durante o arrasto — ver `BuildCanvas.tsx`), o drop é
   * ignorado.
   */
  function handleDragEnd(event: DragEndEvent) {
    setActiveDrag(null);
    const { active, over } = event;
    if (!over) return;

    const match = /^slot::(.+)::(\d+)$/.exec(String(over.id));
    if (!match) return;
    const targetRow = match[1] as RowKey;
    const targetIndex = Number(match[2]);

    const data = active.data.current as DragData | undefined;
    if (!data) return;

    if (data.type === 'catalog-module') {
      const mod = catalog.find((m) => m.id === data.moduleId);
      if (!mod) return;
      if (inferRowKey(mod.name) !== targetRow) return;
      addModule(mod, data.widthCm, targetIndex);
    } else if (data.type === 'placed-module') {
      if (data.row !== targetRow) return;
      moveModule(data.instanceId, targetIndex);
    }
  }

  function handleDragCancel() {
    setActiveDrag(null);
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
      onDragStart={handleDragStart}
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
        Card flutuante que segue o dedo/mouse durante o arrasto — sem isso o
        módulo "sumia" da faixa/parede sem nenhum indício visual de que
        estava sendo movido, o que fazia o recurso parecer quebrado (o drop
        funcionava por baixo dos panos, mas ninguém via o arrasto
        acontecendo). Estilo único (chip escuro) pros dois casos — catálogo
        e reposicionar já colocado — e pros dois breakpoints, já que aqui
        não faz diferença visual estar no mobile ou desktop.
      */}
      <DragOverlay dropAnimation={{ duration: 150, easing: 'ease-out' }}>
        {activeDrag ? (
          <div className="pointer-events-none flex h-[72px] w-[76px] flex-col items-center justify-center gap-0.5 rounded-lg bg-brand-navy-800 px-1.5 text-center text-white shadow-lg">
            <span className="line-clamp-2 text-[11px] font-medium leading-tight">
              {activeDrag.name}
            </span>
            <span className="text-[10px] text-brand-silver-300">{activeDrag.widthCm}cm</span>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

export default App;
