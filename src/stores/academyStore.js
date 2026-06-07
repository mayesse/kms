import { create } from 'zustand'

export const useAcademyStore = create((set, get) => ({
  selectedStudent: null,
  selectedCourse: null,
  selectedSession: null,
  studentTab: 'info',
  filterStatus: null,

  setSelectedStudent: (student) => set({ selectedStudent: student }),
  setSelectedCourse: (course) => set({ selectedCourse: course }),
  setSelectedSession: (session) => set({ selectedSession: session }),
  setStudentTab: (tab) => set({ studentTab: tab }),
  setFilterStatus: (status) => set({ filterStatus: status }),

  clearSelection: () => set({
    selectedStudent: null,
    selectedCourse: null,
    selectedSession: null,
    studentTab: 'info',
  }),
}))
