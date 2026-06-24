import { useState } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core'
import { useDroppable } from '@dnd-kit/core'
import { useStore, getFilteredTasks } from '../store'
import type { Task, TaskStatus } from '../types'
import { STATUS_COLOR } from '../lib/utils'
import TaskCard from './TaskCard'

const COLUMNS: { status: TaskStatus; label: string }[] = [
  { status: 'todo', label: 'Todo' },
  { status: 'in_progress', label: 'In Progress' },
  { status: 'review', label: 'Review' },
  { status: 'done', label: 'Done' },
]

function Column({ status, label, tasks }: { status: TaskStatus; label: string; tasks: Task[] }) {
  const { isOver, setNodeRef } = useDroppable({ id: status })
  const color = STATUS_COLOR[status]

  return (
    <div style={{ flexShrink: 0, width: 272, display: 'flex', flexDirection: 'column' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 10,
          padding: '0 2px',
        }}
      >
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color,
          }}
        >
          {label}
        </span>
        <span
          style={{
            fontSize: 10,
            color: '#3A5070',
            background: '#1D2A3C',
            padding: '1px 6px',
            borderRadius: 10,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {tasks.length}
        </span>
      </div>

      <div
        ref={setNodeRef}
        style={{
          flex: 1,
          minHeight: 120,
          borderRadius: 8,
          padding: 8,
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          background: isOver ? `${color}0D` : 'rgba(17,27,38,0.4)',
          border: isOver ? `1px solid ${color}44` : '1px solid transparent',
          transition: 'all 0.12s',
        }}
      >
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} />
        ))}
      </div>
    </div>
  )
}

export default function KanbanView() {
  const { tasks, filterTagIds, filterMode, moveTask } = useStore()
  const [activeTask, setActiveTask] = useState<Task | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  const visible = getFilteredTasks(tasks, filterTagIds, filterMode)

  const byStatus = (status: TaskStatus) =>
    Object.values(tasks).filter((t) => t.status === status && visible.has(t.id))

  const handleDragStart = ({ active }: DragStartEvent) => {
    setActiveTask(tasks[active.id as string] ?? null)
  }

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveTask(null)
    if (!over) return
    const newStatus = over.id as TaskStatus
    if (['todo', 'in_progress', 'review', 'done'].includes(newStatus)) {
      moveTask(active.id as string, newStatus)
    }
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div
        style={{
          display: 'flex',
          gap: 16,
          padding: '20px 20px',
          overflowX: 'auto',
          height: '100%',
          alignItems: 'flex-start',
        }}
      >
        {COLUMNS.map((col) => (
          <Column key={col.status} {...col} tasks={byStatus(col.status)} />
        ))}
      </div>

      <DragOverlay>
        {activeTask && <TaskCard task={activeTask} ghost />}
      </DragOverlay>
    </DndContext>
  )
}
