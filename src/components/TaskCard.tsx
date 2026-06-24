import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { useStore } from '../store'
import type { Task } from '../types'
import { PRIORITY_COLOR, fmtDate, isOverdue, childProgress } from '../lib/utils'

interface Props {
  task: Task
  ghost?: boolean
}

export default function TaskCard({ task, ghost }: Props) {
  const { tags, tasks, selectTask } = useStore()
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: task.id })

  const style = transform
    ? { transform: CSS.Translate.toString(transform), zIndex: 999 }
    : undefined

  const taskTags = task.tagIds.map((id) => tags[id]).filter(Boolean)
  const { done, total } = childProgress(task, tasks)
  const parent = task.parentId ? tasks[task.parentId] : null
  const overdue = isOverdue(task)

  const borderLeft =
    task.status === 'in_progress'
      ? '2px solid #4898F2'
      : task.status === 'review'
      ? '2px solid #F0A500'
      : '2px solid transparent'

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        background: '#172130',
        border: '1px solid #1F3245',
        borderLeft,
        borderRadius: 6,
        padding: '9px 10px',
        cursor: 'grab',
        opacity: isDragging || ghost ? 0.45 : task.status === 'done' ? 0.6 : 1,
        userSelect: 'none',
        transition: 'border-color 0.12s',
      }}
      {...listeners}
      {...attributes}
      onClick={(e) => {
        e.stopPropagation()
        selectTask(task.id)
      }}
    >
      <p style={{ color: '#D0DCF0', fontSize: 12, lineHeight: 1.4, margin: '0 0 6px' }}>
        {task.title}
      </p>

      {taskTags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginBottom: 6 }}>
          {taskTags.slice(0, 3).map((tag) => (
            <span
              key={tag.id}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '1px 6px',
                borderRadius: 10,
                background: `${tag.color}1E`,
                color: tag.color,
                fontSize: 10,
                fontWeight: 500,
              }}
            >
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: tag.color }} />
              {tag.name}
            </span>
          ))}
          {taskTags.length > 3 && (
            <span style={{ fontSize: 10, color: '#3A5070' }}>+{taskTags.length - 3}</span>
          )}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {total > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div
                style={{
                  width: 32,
                  height: 2,
                  background: '#1F3245',
                  borderRadius: 1,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${(done / total) * 100}%`,
                    height: '100%',
                    background: '#38C172',
                    borderRadius: 1,
                  }}
                />
              </div>
              <span style={{ fontSize: 10, color: '#3A5070', fontVariantNumeric: 'tabular-nums' }}>
                {done}/{total}
              </span>
            </div>
          )}
          {parent && (
            <span style={{ fontSize: 10, color: '#3A5070' }}>
              ↑ {parent.title.length > 10 ? parent.title.slice(0, 10) + '…' : parent.title}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {task.dueDate && (
            <span
              style={{
                fontSize: 10,
                color: overdue ? '#E3423B' : '#3A5070',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {fmtDate(task.dueDate)}
            </span>
          )}
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: PRIORITY_COLOR[task.priority],
              flexShrink: 0,
            }}
          />
        </div>
      </div>
    </div>
  )
}
