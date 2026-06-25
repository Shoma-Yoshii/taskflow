import { createClient } from '@supabase/supabase-js'
import type { Task, Tag, User } from '../types'

const url = import.meta.env.VITE_SUPABASE_URL as string
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export const supabase = createClient(url, key)

// ── Task ─────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toTask(r: any): Task {
  return {
    id: r.id,
    title: r.title,
    description: r.description ?? undefined,
    status: r.status,
    priority: r.priority,
    parentId: r.parent_id ?? null,
    childIds: r.child_ids ?? [],
    depth: r.depth,
    tagIds: r.tag_ids ?? [],
    assigneeIds: r.assignee_ids ?? [],
    dependsOn: r.depends_on ?? [],
    startDate: r.start_date ?? undefined,
    dueDate: r.due_date ?? undefined,
    estimatedHours: r.estimated_hours ?? undefined,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

export function toTaskRow(task: Task) {
  return {
    id: task.id,
    title: task.title,
    description: task.description ?? null,
    status: task.status,
    priority: task.priority,
    parent_id: task.parentId ?? null,
    child_ids: task.childIds,
    depth: task.depth,
    tag_ids: task.tagIds,
    assignee_ids: task.assigneeIds,
    depends_on: task.dependsOn ?? [],
    start_date: task.startDate ?? null,
    due_date: task.dueDate ?? null,
    estimated_hours: task.estimatedHours ?? null,
    created_at: task.createdAt,
    updated_at: new Date().toISOString(),
  }
}

// ── Tag ──────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const toTag = (r: any): Tag => ({ id: r.id, name: r.name, color: r.color })
export const toTagRow = (t: Tag) => ({ id: t.id, name: t.name, color: t.color })

// ── User ─────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toUser(r: any): User {
  return { id: r.id, name: r.name, initials: r.initials, avatarColor: r.avatar_color }
}
export function toUserRow(u: User) {
  return { id: u.id, name: u.name, initials: u.initials, avatar_color: u.avatarColor }
}
