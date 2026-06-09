import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

let nextId = 1

export const useOfflineQueueStore = create(
  persist(
    (set, get) => ({
      queue: [],

      enqueue: (payload) => {
        const id = `oq_${Date.now()}_${nextId++}`
        set((state) => ({
          queue: [...state.queue, { id, payload, createdAt: new Date().toISOString(), attempts: 0 }],
        }))
        return id
      },

      remove: (id) => set((state) => ({
        queue: state.queue.filter((q) => q.id !== id),
      })),

      incrementAttempts: (id, lastError) => set((state) => ({
        queue: state.queue.map((q) =>
          q.id === id ? { ...q, attempts: (q.attempts || 0) + 1, lastError } : q
        ),
      })),

      getPending: () => get().queue,

      pendingCount: () => get().queue.length,

      clearAll: () => set({ queue: [] }),
    }),
    {
      name: 'offline-sale-queue',
      storage: createJSONStorage(() => localStorage),
    }
  )
)
