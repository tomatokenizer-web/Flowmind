import { create } from "zustand";
import { persist } from "zustand/middleware";

interface InquiryStore {
  activePursuitId: string | null;
  setActivePursuit: (id: string | null) => void;
  activeInquiryId: string | null;
  setActiveInquiry: (id: string | null) => void;
  compassVisible: boolean;
  toggleCompass: () => void;
}

export const useInquiryStore = create<InquiryStore>()(
  persist(
    (set) => ({
      activePursuitId: null,
      setActivePursuit: (id) => set({ activePursuitId: id }),
      activeInquiryId: null,
      setActiveInquiry: (id) => set({ activeInquiryId: id }),
      compassVisible: false,
      toggleCompass: () =>
        set((state) => ({ compassVisible: !state.compassVisible })),
    }),
    {
      name: "flowmind-inquiry",
      // compassVisible is ephemeral; only persist the active IDs
      partialize: (state) => ({
        activePursuitId: state.activePursuitId,
        activeInquiryId: state.activeInquiryId,
      }),
    },
  ),
);
