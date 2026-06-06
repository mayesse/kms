import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export const useLocalSalesStore = create(
  persist(
    (set) => ({
      sales: [],
      addSale: (sale) =>
        set((state) => ({
          sales: [sale, ...state.sales].slice(0, 500),
        })),
      clearLocalSales: () => set({ sales: [] }),
    }),
    {
      name: 'local-sales-history',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        sales: state.sales,
      }),
    }
  )
)
