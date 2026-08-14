import { useEffect, useRef } from 'react';
import { DndContext, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { useConfiguratorStore } from './store/configuratorStore';
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
  const autoAddedRef = useRef(false);

  /**
   * Sem isso, arrastar no celular fica quebrado: o navegador interpreta o
   * toque como scroll da página antes do dnd-kit conseguir iniciar o drag.
   * O `activationConstraint` (mover 8px antes de "confirmar" o drag) evita
   * que um toque rápido em outro elemento dispare um arrasto sem querer —
   * o resto da confiabilidade em touch vem do `touch-none` no card
   * arrastável (ver `ModuleCard.tsx`).
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
   * adicionado automaticamente à composição, na primeira largura disponível.
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

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || over.id !== 'build-canvas') return;
    const data = active.data.current as { moduleId: number; widthCm: number } | undefined;
    if (!data) return;
    const mod = catalog.find((m) => m.id === data.moduleId);
    if (!mod) return;
    addModule(mod, data.widthCm);
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
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
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
