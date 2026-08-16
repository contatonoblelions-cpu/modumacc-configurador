import { useEffect, useRef } from 'react';
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
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

function App() {
  const step = useConfiguratorStore((s) => s.step);
  const catalog = useConfiguratorStore((s) => s.catalog);
  const loadCatalog = useConfiguratorStore((s) => s.loadCatalog);
  const addModule = useConfiguratorStore((s) => s.addModule);
  const moveModule = useConfiguratorStore((s) => s.moveModule);
  const autoAddedRef = useRef(false);

  /**
   * Sem isso, arrastar no celular fica quebrado: o navegador interpreta o
   * toque como scroll da página antes do dnd-kit conseguir iniciar o drag.
   * O `activationConstraint` (mover 8px antes de "confirmar" o drag) evita
   * que um toque rápido em outro elemento dispare um arrasto sem querer —
   * o resto da confiabilidade em touch vem do `touch-none` nos elementos
   * arrastáveis (ver `ModuleCard.tsx` e `BuildCanvas.tsx`).
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
   * Um "slot" é uma zona fina de soltar entre dois módulos (ou nas pontas)
   * de uma fileira específica, com id no formato `slot::<fileira>::<índice>`
   * (ver `BuildCanvas.tsx` > `InsertSlot`). Isso é o que dá a sensação de
   * posição livre: em vez de só poder jogar no final, dá pra soltar em
   * qualquer posição dentro da fileira.
   *
   * A fileira em si NUNCA muda por causa de onde foi solto — é sempre a do
   * produto (ver `inferRowKey`). Por segurança, se por algum motivo o slot
   * for de outra fileira (não deveria acontecer, já que esses slots ficam
   * desabilitados durante o arrasto — ver `BuildCanvas.tsx`), o drop é
   * ignorado.
   */
  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;

    const match = /^slot::(.+)::(\d+)$/.exec(String(over.id));
    if (!match) return;
    const targetRow = match[1] as RowKey;
    const targetIndex = Number(match[2]);

    const data = active.data.current as
      | { type: 'catalog-module'; moduleId: number; widthCm: number }
      | { type: 'placed-module'; instanceId: string; row: RowKey }
      | undefined;
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
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <AppBackground />
      <div className="flex h-screen flex-col">
        <Header />
        <FinishHandleSelector />
        <div className="flex flex-1 flex-col overflow-hidden md:flex-row">
          <ModulePanel />
          <BuildCanvas />
        </div>
        <SummaryBar />
      </div>
    </DndContext>
  );
}

export default App;
