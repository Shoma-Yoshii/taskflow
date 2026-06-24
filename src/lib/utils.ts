import type { Task } from '../types'

export const PRIORITY_COLOR: Record<string, string> = {
  low: '#3A5070',
  medium: '#F0A500',
  high: '#E07830',
  urgent: '#E3423B',
}

export const STATUS_LABEL: Record<string, string> = {
  todo: 'Todo',
  in_progress: 'In Progress',
  review: 'Review',
  done: 'Done',
}

export const STATUS_COLOR: Record<string, string> = {
  todo: '#7A96B8',
  in_progress: '#4898F2',
  review: '#F0A500',
  done: '#38C172',
}

export function fmtDate(iso?: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

export function isOverdue(task: Task): boolean {
  if (!task.dueDate || task.status === 'done') return false
  return new Date(task.dueDate) < new Date()
}

export function childProgress(task: Task, tasks: Record<string, Task>): { done: number; total: number } {
  const children = task.childIds.map((id) => tasks[id]).filter(Boolean)
  return {
    done: children.filter((c) => c.status === 'done').length,
    total: children.length,
  }
}

export function nanoid(): string {
  return Math.random().toString(36).slice(2, 10)
}
