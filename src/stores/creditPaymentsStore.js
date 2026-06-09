import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export const useCreditPaymentsStore = create(
  persist(
    (set) => ({
      payments: [],
      markAsPaid: (sale) =>
        set((state) => {
          const exists = state.payments.some((p) => p.sale_id === sale.id)
          if (exists) return state
          return {
            payments: [
              {
                id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                sale_id: sale.id,
                receipt_number: sale.receipt_number || null,
                customer_name: sale.customer_name || null,
                amount: parseFloat(sale.total_amount || 0),
                payment_method: sale.payment_method || 'credit',
                sale_created_at: sale.created_at || null,
                note: sale.note || null,
                paid_at: new Date().toISOString(),
              },
              ...state.payments,
            ],
          }
        }),
    }),
    {
      name: 'credit-payments',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ payments: state.payments }),
    }
  )
)
