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

type GroupMode = 'status' | 'assignee'

const COLUMNS: { status: TaskStatus; label: string }[] = [
  { status: 'todo',        label: 'Todo'        },
  { status: 'in_progress', label: 'In Progress' },
  { status: 'review',      label: 'Review'      },
  { status: 'done',        label: 'Done'        },
]

// ── ステータス列（既存）────────────────────────────────────
function StatusColumn({ status, label, tasks }: { status: TaskStatus; label: string; tasks: Task[] }) {
  const { isOver, setNodeRef } = useDroppable({ id: status })
  const { setAddingStatus } = useStore()
  const color = STATUS_COLOR[status]

  return (
    <div style={{ flexShrink: 0, width: 272, display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, padding: '0 2px' }}>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color }}>
          {label}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 10, color: '#3A5070', background: '#1D2A3C', padding: '1px 6px', borderRadius: 10, fontVariantNumeric: 'tabular-nums' }}>
            {tasks.length}
          </span>
          <button
            onClick={() => setAddingStatus(status)}
            title={`${label}にタスクを追加`}
            style={{
              width: 20, height: 20, borderRadius: 5, border: '1px solid #1F3245',
              background: 'transparent', color: '#3A5070', fontSize: 14, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1, padding: 0,
            }}
          >
            +
          </button>
        </div>
      </div>

      <div
        ref={setNodeRef}
        style={{
          flex: 1, minHeight: 120, borderRadius: 8, padding: 8,
          display: 'flex', flexDirection: 'column', gap: 6,
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

// ── 担当者列 ───────────────────────────────────────────────
function AssigneeColumn({
  id, label, color, initials, tasks,
}: {
  id: string; label: string; color: string; initials: string; tasks: Task[]
}) {
  const isUnassigned = id === 'unassigned'

  return (
    <div style={{ flexShrink: 0, width: 272, display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, padding: '0 2px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <div style={{
            width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
            background: isUnassigned ? 'transparent' : color,
            border: isUnassigned ? '1px dashed #3A5070' : 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 10, fontWeight: 700,
            color: isUnassigned ? '#3A5070' : '#fff',
          }}>
            {initials}
          </div>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color }}>
            {label}
          </span>
        </div>
        <span style={{ fontSize: 10, color: '#3A5070', background: '#1D2A3C', padding: '1px 6px', borderRadius: 10, fontVariantNumeric: 'tabular-nums' }}>
          {tasks.length}
        </span>
      </div>

      <div style={{
        flex: 1, minHeight: 120, borderRadius: 8, padding: 8,
        display: 'flex', flexDirection: 'column', gap: 6,
        background: 'rgba(17,27,38,0.4)',
        border: `1px solid ${isUnassigned ? '#1F3245' : `${color}22`}`,
      }}>
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} />
        ))}
      </div>
    </div>
  )
}

// ── メインコンポーネント ───────────────────────────────────
export default function KanbanView() {
  const { tasks, users, filterTagIds, filterMode, filterAssigneeIds, moveTask } = useStore()
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const [groupMode, setGroupMode] = useState<GroupMode>('status')

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  const visible = getFilteredTasks(tasks, filterTagIds, filterMode, filterAssigneeIds)

  const byStatus = (status: TaskStatus) =>
    Object.values(tasks).filter((t) => t.status === status && visible.has(t.id))

  const byAssignee = (userId: string) => {
    if (userId === 'unassigned') {
      return Object.values(tasks).filter((t) => t.assigneeIds.length === 0 && visible.has(t.id))
    }
    return Object.values(tasks).filter((t) => t.assigneeIds.includes(userId) && visible.has(t.id))
  }

  const handleDragStart = ({ active }: DragStartEvent) => {
    setActiveTask(tasks[active.id as string] ?? null)
  }

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveTask(null)
    if (!over || groupMode !== 'status') return
    const newStatus = over.id as TaskStatus
    if (['todo', 'in_progress', 'review', 'done'].includes(newStatus)) {
      moveTask(active.id as string, newStatus)
    }
  }

  const userList = Object.values(users)

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

        {/* グループ切り替えトグル */}
        <div style={{
          display: 'flex', justifyContent: 'flex-end',
          padding: '10px 20px 0', flexShrink: 0,
        }}>
          <div style={{
            display: 'inline-flex', background: '#0D1620', borderRadius: 8,
            border: '1px solid #1F3245', padding: 3, gap: 2,
          }}>
            {(['status', 'assignee'] as GroupMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setGroupMode(mode)}
                style={{
                  padding: '4px 14px', borderRadius: 6, border: 'none',
                  background: groupMode === mode ? '#1F3245' : 'transparent',
                  color: groupMode === mode ? '#C8D8F0' : '#3A5070',
                  fontSize: 11, fontWeight: groupMode === mode ? 600 : 400,
                  cursor: 'pointer', transition: 'all 0.12s', whiteSpace: 'nowrap',
                }}
              >
                {mode === 'status' ? 'ステータス別' : '担当者別'}
              </button>
            ))}
          </div>
        </div>

        {/* カンバン列エリア */}
        <div style={{
          display: 'flex', gap: 16,
          padding: '12px 20px 20px',
          overflowX: 'auto', flex: 1,
          alignItems: 'flex-start',
        }}>
          {groupMode === 'status'
            ? COLUMNS.map((col) => (
                <StatusColumn key={col.status} {...col} tasks={byStatus(col.status)} />
              ))
            : (
              <>
                {userList.map((user) => (
                  <AssigneeColumn
                    key={user.id}
                    id={user.id}
                    label={user.name}
                    color={user.avatarColor}
                    initials={user.initials}
                    tasks={byAssignee(user.id)}
                  />
                ))}
                <AssigneeColumn
                  id="unassigned"
                  label="未割当"
                  color="#3A5070"
                  initials="?"
                  tasks={byAssignee('unassigned')}
                />
              </>
            )
          }
        </div>
      </div>

      <DragOverlay>
        {activeTask && <TaskCard task={activeTask} ghost />}
      </DragOverlay>
    </DndContext>
  )
}
