import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Task, Tag, User, TaskStatus, ViewMode, FilterMode, Toast } from '../types'
import { seedTasks, seedTags, seedUsers } from '../data/seed'
import { nanoid } from '../lib/utils'

interface AppState {
  tasks: Record<string, Task>
  tags: Record<string, Tag>
  users: Record<string, User>
  view: ViewMode
  selectedTaskId: string | null
  addingStatus: TaskStatus | null
  addingUser: boolean
  filterTagIds: string[]
  filterMode: FilterMode
  filterAssigneeIds: string[]
  filterStatusIds: TaskStatus[]
  toasts: Toast[]

  setView: (v: ViewMode) => void
  selectTask: (id: string | null) => void
  setAddingStatus: (s: TaskStatus | null) => void
  setAddingUser: (v: boolean) => void
  toggleFilterTag: (id: string) => void
  setFilterMode: (m: FilterMode) => void
  toggleFilterAssignee: (id: string) => void
  toggleFilterStatus: (s: TaskStatus) => void
  clearFilters: () => void
  addToast: (message: string, type?: Toast['type']) => void
  removeToast: (id: string) => void

  updateTask: (id: string, updates: Partial<Task>) => void
  moveTask: (id: string, status: TaskStatus) => void
  addTask: (task: Task) => void
  deleteTask: (id: string) => void
  addUser: (user: User) => void
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
      addingUser: false,
      filterTagIds: [],
      filterMode: 'OR',
      filterAssigneeIds: [],
      filterStatusIds: [],
      toasts: [],

      setView: (view) => set({ view }),
      selectTask: (id) => set({ selectedTaskId: id }),
      setAddingStatus: (addingStatus) => set({ addingStatus }),
      setAddingUser: (addingUser) => set({ addingUser }),

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

      toggleFilterStatus: (s) =>
        set((state) => ({
          filterStatusIds: state.filterStatusIds.includes(s)
            ? state.filterStatusIds.filter((x) => x !== s)
            : [...state.filterStatusIds, s],
        })),

      clearFilters: () => set({ filterTagIds: [], filterAssigneeIds: [], filterStatusIds: [] }),

      addToast: (message, type = 'info') =>
        set((s) => ({
          toasts: [...s.toasts, { id: nanoid(), message, type }],
        })),

      removeToast: (id) =>
        set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

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
          return {
            tasks,
            toasts: [
              ...s.toasts,
              { id: nanoid(), message: 'タスクを追加しました', type: 'success' as const },
            ],
          }
        }),

      deleteTask: (id) =>
        set((s) => {
          const task = s.tasks[id]
          if (!task) return s
          const newTasks = { ...s.tasks }

          const toDelete = new Set<string>()
          const collect = (tid: string) => {
            toDelete.add(tid)
            ;(newTasks[tid]?.childIds ?? []).forEach(collect)
          }
          collect(id)

          if (task.parentId && newTasks[task.parentId]) {
            newTasks[task.parentId] = {
              ...newTasks[task.parentId],
              childIds: newTasks[task.parentId].childIds.filter((cid) => !toDelete.has(cid)),
            }
          }

          toDelete.forEach((tid) => delete newTasks[tid])

          return {
            tasks: newTasks,
            selectedTaskId: toDelete.has(s.selectedTaskId ?? '') ? null : s.selectedTaskId,
            toasts: [
              ...s.toasts,
              { id: nanoid(), message: 'タスクを削除しました', type: 'danger' as const },
            ],
          }
        }),

      addUser: (user) =>
        set((s) => ({
          users: { ...s.users, [user.id]: user },
          toasts: [
            ...s.toasts,
            { id: nanoid(), message: `${user.name} を追加しました`, type: 'success' as const },
          ],
        })),
    }),
    {
      name: 'taskflow-v1',
      partialize: (s) => ({
        tasks: s.tasks,
        tags: s.tags,
        users: s.users,
        view: s.view,
        filterTagIds: s.filterTagIds,
        filterMode: s.filterMode,
        filterAssigneeIds: s.filterAssigneeIds,
        filterStatusIds: s.filterStatusIds,
      }),
    }
  )
)

// ── Selectors ──────────────────────────────────────────────

export function getFilteredTasks(
  tasks: Record<string, Task>,
  filterTagIds: string[],
  filterMode: FilterMode,
  filterAssigneeIds: string[],
  filterStatusIds: TaskStatus[] = []
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

  if (filterStatusIds.length > 0) {
    filtered = filtered.filter((t) => filterStatusIds.includes(t.status))
  }

  return new Set(filtered.map((t) => t.id))
}
