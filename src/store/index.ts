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
  filterTagIds: string[]
  filterMode: FilterMode

  setView: (v: ViewMode) => void
  selectTask: (id: string | null) => void
  toggleFilterTag: (id: string) => void
  setFilterMode: (m: FilterMode) => void

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
      filterTagIds: [],
      filterMode: 'OR',

      setView: (view) => set({ view }),
      selectTask: (id) => set({ selectedTaskId: id }),

      toggleFilterTag: (id) =>
        set((s) => ({
          filterTagIds: s.filterTagIds.includes(id)
            ? s.filterTagIds.filter((t) => t !== id)
            : [...s.filterTagIds, id],
        })),

      setFilterMode: (filterMode) => set({ filterMode }),

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

export function getTaskProgress(taskId: string, tasks: Record<string, Task>): number {
  const task = tasks[taskId]
  if (!task) return 0
  if (task.childIds.length === 0) return task.status === 'done' ? 100 : 0
  const avg =
    task.childIds.reduce((sum, cid) => sum + getTaskProgress(cid, tasks), 0) /
    task.childIds.length
  return Math.round(avg)
}

export function getFilteredTasks(
  tasks: Record<string, Task>,
  filterTagIds: string[],
  filterMode: FilterMode
): Set<string> {
  const all = Object.values(tasks)
  if (filterTagIds.length === 0) return new Set(all.map((t) => t.id))
  return new Set(
    all
      .filter((t) =>
        filterMode === 'AND'
          ? filterTagIds.every((tid) => t.tagIds.includes(tid))
          : filterTagIds.some((tid) => t.tagIds.includes(tid))
      )
      .map((t) => t.id)
  )
}
