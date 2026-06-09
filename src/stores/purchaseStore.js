import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

const initialDraftState = {
  supplierId: '',
  items: [],
  note: '',
  paymentStatus: 'unpaid',
  amountPaid: '',
}

export const usePurchaseStore = create(
  persist(
    (set) => ({
      ...initialDraftState,
      setSupplierId: (supplierId) => set({ supplierId }),
      setItems: (updater) => set((state) => ({
        items: typeof updater === 'function' ? updater(state.items) : updater,
      })),
      setNote: (note) => set({ note }),
      setPaymentStatus: (paymentStatus) => set({ paymentStatus }),
      setAmountPaid: (amountPaid) => set({ amountPaid }),
      clearDraft: () => set({ ...initialDraftState }),
    }),
    {
      name: 'purchase-draft',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        supplierId: state.supplierId,
        items: state.items,
        note: state.note,
        paymentStatus: state.paymentStatus,
        amountPaid: state.amountPaid,
      }),
    }
  )
)
