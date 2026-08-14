import { useEffect } from 'react';
import { DndContext, type DragEndEvent } from '@dnd-kit/core';
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

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

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
      <div className="flex h-screen flex-col">
        <AppBackground />
        <Header />
        <RoomSizeForm />
      </div>
    );
  }

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <div className="flex h-screen flex-col">
        <AppBackground />
        <Header />
        <FinishHandleSelector />
        <div className="flex flex-1 overflow-hidden">
          <ModulePanel />
          <BuildCanvas />
        </div>
        <SummaryBar />
      </div>
    </DndContext>
  );
}

export default App;
