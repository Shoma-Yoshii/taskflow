import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Task, Tag, User, TaskStatus, ViewMode, FilterMode } from '../types'
import { seedTasks, seedTags, seedUsers } from '../data/seed'

interface AppState {
  tasks: Record<string, Task>
  tags: Record<string, Tag>
  users: Record<string, User>
  view: ViewMode
  selectedTaskId: string | null
  addingStatus: TaskStatus | null   // which column's + was clicked
  filterTagIds: string[]
  filterMode: FilterMode
  filterAssigneeIds: string[]

  setView: (v: ViewMode) => void
  selectTask: (id: string | null) => void
  setAddingStatus: (s: TaskStatus | null) => void
  toggleFilterTag: (id: string) => void
  setFilterMode: (m: FilterMode) => void
  toggleFilterAssignee: (id: string) => void
  clearFilters: () => void

  updateTask: (id: string, updates: Partial<Task>) => void
  moveTask: (id: string, status: TaskStatus) => void
  addTask: (task: Task) => void
}

const toMap = <T extends { id: string }>(arr: T[]): Record<string, T> =>
  Object.fromEntries(arr.map(x => [x.id, x]))

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      tasks: toMap(seedTasks),
      tags: toMap(seedTags),
      users: toMap(seedUsers),
      view: 'kanban',
      selectedTaskId: null,
      addingStatus: null,
      filterTagIds: [],
      filterMode: 'OR',
      filterAssigneeIds: [],

      setView: (view) => set({ view }),
      selectTask: (id) => set({ selectedTaskId: id }),
      setAddingStatus: (addingStatus) => set({ addingStatus }),

      toggleFilterTag: (id) =>
        set((s) => ({
          filterTagIds: s.filterTagIds.includes(id)
            ? s.filterTagIds.filter((t) => t !== id)
            : [...s.filterTagIds, id],
        })),

      setFilterMode: (filterMode) => set({ filterMode }),

      toggleFilterAssignee: (id) =>
        set((s) => ({
          filterAssigneeIds: s.filterAssigneeIds.includes(id)
            ? s.filterAssigneeIds.filter((a) => a !== id)
            : [...s.filterAssigneeIds, id],
        })),

      clearFilters: () => set({ filterTagIds: [], filterAssigneeIds: [] }),

      updateTask: (id, updates) =>
        set((s) => ({
          tasks: {
            ...s.tasks,
            [id]: { ...s.tasks[id], ...updates, updatedAt: new Date().toISOString() },
          },
        })),

      moveTask: (id, status) =>
        set((s) => ({
          tasks: {
            ...s.tasks,
            [id]: { ...s.tasks[id], status, updatedAt: new Date().toISOString() },
          },
        })),

      addTask: (task) =>
        set((s) => {
          const tasks = { ...s.tasks, [task.id]: task }
          if (task.parentId && tasks[task.parentId]) {
            tasks[task.parentId] = {
              ...tasks[task.parentId],
              childIds: [...tasks[task.parentId].childIds, task.id],
            }
          }
          return { tasks }
        }),
    }),
    { name: 'taskflow-v1' }
  )
)

// ── Selectors ──────────────────────────────────────────────

export function getFilteredTasks(
  tasks: Record<string, Task>,
  filterTagIds: string[],
  filterMode: FilterMode,
  filterAssigneeIds: string[]
): Set<string> {
  const all = Object.values(tasks)
  let filtered = all

  if (filterTagIds.length > 0) {
    filtered = filtered.filter((t) =>
      filterMode === 'AND'
        ? filterTagIds.every((tid) => t.tagIds.includes(tid))
        : filterTagIds.some((tid) => t.tagIds.includes(tid))
    )
  }

  if (filterAssigneeIds.length > 0) {
    filtered = filtered.filter((t) =>
      filterAssigneeIds.some((uid) => t.assigneeIds.includes(uid))
    )
  }

  return new Set(filtered.map((t) => t.id))
}
