import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase, toTask, toTaskRow, toTag, toTagRow, toUser, toUserRow } from '../lib/supabase'
import type { Task, Tag, User, TaskStatus, ViewMode, FilterMode, Toast } from '../types'
import { seedTasks, seedTags, seedUsers } from '../data/seed'
import { nanoid } from '../lib/utils'

interface AppState {
  // ── Data (Supabase-backed) ──────────────────────────
  tasks: Record<string, Task>
  tags: Record<string, Tag>
  users: Record<string, User>
  initialized: boolean

  // ── UI state (localStorage) ─────────────────────────
  view: ViewMode
  selectedTaskId: string | null
  addingStatus: TaskStatus | null
  addingUser: boolean
  filterTagIds: string[]
  filterMode: FilterMode
  filterAssigneeIds: string[]
  filterStatusIds: TaskStatus[]
  toasts: Toast[]

  // ── Actions ─────────────────────────────────────────
  initialize: () => Promise<void>
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

const hasSupabase = Boolean(
  import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY
)

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      // ── Initial state ───────────────────────────────
      tasks: {},
      tags: {},
      users: {},
      initialized: false,
      view: 'kanban',
      selectedTaskId: null,
      addingStatus: null,
      addingUser: false,
      filterTagIds: [],
      filterMode: 'OR',
      filterAssigneeIds: [],
      filterStatusIds: [],
      toasts: [],

      // ── Bootstrap ───────────────────────────────────
      initialize: async () => {
        if (!hasSupabase) {
          // No Supabase configured — use seed data in memory
          set({
            tasks: toMap(seedTasks),
            tags: toMap(seedTags),
            users: toMap(seedUsers),
            initialized: true,
          })
          return
        }

        try {
          const [{ data: taskRows, error: te }, { data: tagRows }, { data: userRows }] =
            await Promise.all([
              supabase.from('tasks').select('*').order('depth').order('created_at'),
              supabase.from('tags').select('*'),
              supabase.from('users').select('*'),
            ])

          if (te) throw te

          if (!taskRows || taskRows.length === 0) {
            // First run — seed the database
            await Promise.all([
              supabase.from('tags').upsert(seedTags.map(toTagRow)),
              supabase.from('users').upsert(seedUsers.map(toUserRow)),
              supabase.from('tasks').upsert(seedTasks.map(toTaskRow)),
            ])
            set({
              tasks: toMap(seedTasks),
              tags: toMap(seedTags),
              users: toMap(seedUsers),
              initialized: true,
            })
            return
          }

          set({
            tasks: toMap(taskRows.map(toTask)),
            tags: toMap((tagRows ?? []).map(toTag)),
            users: toMap((userRows ?? []).map(toUser)),
            initialized: true,
          })
        } catch (err) {
          console.error('Supabase init error:', err)
          // Fallback to seed data so the app still renders
          set({
            tasks: toMap(seedTasks),
            tags: toMap(seedTags),
            users: toMap(seedUsers),
            initialized: true,
          })
          get().addToast('DB接続に失敗しました（オフラインモード）', 'warning')
        }
      },

      // ── UI actions ──────────────────────────────────
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
        set((s) => ({ toasts: [...s.toasts, { id: nanoid(), message, type }] })),

      removeToast: (id) =>
        set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

      // ── Data mutations (optimistic + Supabase sync) ─
      updateTask: (id, updates) => {
        const updated: Task = { ...get().tasks[id], ...updates, updatedAt: new Date().toISOString() }
        set((s) => ({ tasks: { ...s.tasks, [id]: updated } }))
        if (hasSupabase) {
          supabase.from('tasks').upsert(toTaskRow(updated)).then(({ error }) => {
            if (error) {
              console.error('updateTask sync error:', error)
              get().addToast('保存に失敗しました', 'warning')
            }
          })
        }
      },

      moveTask: (id, status) => {
        const updated: Task = { ...get().tasks[id], status, updatedAt: new Date().toISOString() }
        set((s) => ({ tasks: { ...s.tasks, [id]: updated } }))
        if (hasSupabase) {
          supabase.from('tasks').update({ status, updated_at: updated.updatedAt }).eq('id', id)
        }
      },

      addTask: (task) => {
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
        })
        if (hasSupabase) {
          supabase.from('tasks').upsert(toTaskRow(task)).then(({ error }) => {
            if (error) console.error('addTask sync error:', error)
          })
          if (task.parentId) {
            const parent = get().tasks[task.parentId]
            if (parent) {
              supabase
                .from('tasks')
                .update({ child_ids: parent.childIds, updated_at: new Date().toISOString() })
                .eq('id', task.parentId)
            }
          }
        }
      },

      deleteTask: (id) => {
        const s = get()
        const task = s.tasks[id]
        if (!task) return

        const newTasks = { ...s.tasks }
        const toDelete = new Set<string>()
        const collect = (tid: string) => {
          toDelete.add(tid)
          ;(newTasks[tid]?.childIds ?? []).forEach(collect)
        }
        collect(id)

        let updatedParent: Task | null = null
        if (task.parentId && newTasks[task.parentId]) {
          updatedParent = {
            ...newTasks[task.parentId],
            childIds: newTasks[task.parentId].childIds.filter((cid) => !toDelete.has(cid)),
          }
          newTasks[task.parentId] = updatedParent
        }

        toDelete.forEach((tid) => delete newTasks[tid])

        set({
          tasks: newTasks,
          selectedTaskId: toDelete.has(s.selectedTaskId ?? '') ? null : s.selectedTaskId,
          toasts: [
            ...s.toasts,
            { id: nanoid(), message: 'タスクを削除しました', type: 'danger' as const },
          ],
        })

        if (hasSupabase) {
          toDelete.forEach((tid) => supabase.from('tasks').delete().eq('id', tid))
          if (updatedParent) {
            supabase
              .from('tasks')
              .update({ child_ids: updatedParent.childIds, updated_at: new Date().toISOString() })
              .eq('id', updatedParent.id)
          }
        }
      },

      addUser: (user) => {
        set((s) => ({
          users: { ...s.users, [user.id]: user },
          toasts: [
            ...s.toasts,
            { id: nanoid(), message: `${user.name} を追加しました`, type: 'success' as const },
          ],
        }))
        if (hasSupabase) {
          supabase.from('users').upsert(toUserRow(user)).then(({ error }) => {
            if (error) console.error('addUser sync error:', error)
          })
        }
      },
    }),
    {
      name: 'taskflow-ui',
      // Only persist UI preferences — data comes from Supabase
      partialize: (s) => ({
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
