import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

let nextId = 1

export const usePendingActivityLogStore = create(
  persist(
    (set, get) => ({
      queue: [],

      enqueue: (entry) => {
        const id = `al_${Date.now()}_${nextId++}`
        set((state) => ({
          queue: [...state.queue, { id, ...entry, createdAt: new Date().toISOString() }],
        }))
        return id
      },

      remove: (id) => set((state) => ({
        queue: state.queue.filter((q) => q.id !== id),
      })),

      getPending: () => get().queue,

      pendingCount: () => get().queue.length,
    }),
    {
      name: 'pending-activity-log',
      storage: createJSONStorage(() => localStorage),
    }
  )
)
