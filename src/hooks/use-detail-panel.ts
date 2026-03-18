import { useCallback } from "react";
import { usePanelStore, type DetailTab } from "~/stores/panel-store";
import { useLayoutStore } from "~/stores/layout-store";

/**
 * Hook managing detail panel open/close state with unit ID.
 * Bridges the panel store and layout store for synchronized behavior.
 */
export function useDetailPanel() {
  const isOpen = usePanelStore((s) => s.isOpen);
  const selectedUnitId = usePanelStore((s) => s.selectedUnitId);
  const activeTab = usePanelStore((s) => s.activeTab);
  const openPanelStore = usePanelStore((s) => s.openPanel);
  const closePanelStore = usePanelStore((s) => s.closePanel);
  const setActiveTab = usePanelStore((s) => s.setActiveTab);
  const setDetailPanelOpen = useLayoutStore((s) => s.setDetailPanelOpen);

  const openPanel = useCallback(
    (unitId: string, tab?: DetailTab) => {
      openPanelStore(unitId);
      setDetailPanelOpen(true);
      if (tab) setActiveTab(tab);
    },
    [openPanelStore, setDetailPanelOpen, setActiveTab],
  );

  const closePanel = useCallback(() => {
    closePanelStore();
    setDetailPanelOpen(false);
  }, [closePanelStore, setDetailPanelOpen]);

  const togglePanel = useCallback(
    (unitId: string) => {
      if (isOpen && selectedUnitId === unitId) {
        closePanel();
      } else {
        openPanel(unitId);
      }
    },
    [isOpen, selectedUnitId, openPanel, closePanel],
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
