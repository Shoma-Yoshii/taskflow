export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done'
export type Priority = 'low' | 'medium' | 'high' | 'urgent'
export type ViewMode = 'kanban' | 'gantt'
export type FilterMode = 'AND' | 'OR'

export interface Task {
  id: string
  title: string
  description?: string
  status: TaskStatus
  priority: Priority
  parentId: string | null
  childIds: string[]
  depth: number
  tagIds: string[]
  assigneeIds: string[]
  startDate?: string
  dueDate?: string
  estimatedHours?: number
  createdAt: string
  updatedAt: string
}

export interface Tag {
  id: string
  name: string
  color: string
}

export interface User {
  id: string
  name: string
  initials: string
  avatarColor: string
}

export interface Toast {
  id: string
  message: string
  type: 'success' | 'info' | 'warning' | 'danger'
}
