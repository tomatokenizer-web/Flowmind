import { useCallback } from "react";
import { usePanelStore, type DetailTab } from "~/stores/panel-store";

/**
 * Hook managing detail panel open/close state with unit ID.
 * Uses panel-store as the single source of truth.
 */
export function useDetailPanel() {
  const isOpen = usePanelStore((s) => s.isOpen);
  const selectedUnitId = usePanelStore((s) => s.selectedUnitId);
  const activeTab = usePanelStore((s) => s.activeTab);
  const openPanelStore = usePanelStore((s) => s.openPanel);
  const closePanelStore = usePanelStore((s) => s.closePanel);
  const togglePanelStore = usePanelStore((s) => s.togglePanel);
  const setActiveTab = usePanelStore((s) => s.setActiveTab);

  const openPanel = useCallback(
    (unitId: string, tab?: DetailTab) => {
      openPanelStore(unitId);
      if (tab) setActiveTab(tab);
    },
    [openPanelStore, setActiveTab],
  );

  const closePanel = useCallback(() => {
    closePanelStore();
  }, [closePanelStore]);

  const togglePanel = useCallback(
    (unitId: string) => {
      togglePanelStore(unitId);
    },
    [togglePanelStore],
  );

  return {
    isOpen,
    selectedUnitId,
    activeTab,
    openPanel,
    closePanel,
    togglePanel,
    setActiveTab,
  };
}
