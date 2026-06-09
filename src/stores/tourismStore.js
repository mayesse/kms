import { create } from 'zustand'

export const useTourismStore = create((set, get) => ({
  selectedDossier: null,
  selectedPackage: null,
  dossierTab: 'info',
  filterStatus: null,
  filterType: null,

  setSelectedDossier: (dossier) => set({ selectedDossier: dossier }),
  setSelectedPackage: (pkg) => set({ selectedPackage: pkg }),
  setDossierTab: (tab) => set({ dossierTab: tab }),
  setFilterStatus: (status) => set({ filterStatus: status }),
  setFilterType: (type) => set({ filterType: type }),

  clearSelection: () => set({
    selectedDossier: null,
    selectedPackage: null,
    dossierTab: 'info',
  }),
}))
