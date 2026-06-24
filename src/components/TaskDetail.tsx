import { X, Calendar, AlertCircle } from 'lucide-react'
import { useStore } from '../store'
import type { Task, TaskStatus, Priority } from '../types'
import { PRIORITY_COLOR, STATUS_LABEL, STATUS_COLOR, fmtDate, isOverdue } from '../lib/utils'

const STATUSES: TaskStatus[] = ['todo', 'in_progress', 'review', 'done']
const PRIORITIES: Priority[] = ['low', 'medium', 'high', 'urgent']
const PRIORITY_LABEL: Record<Priority, string> = {
  low: 'Low', medium: 'Medium', high: 'High', urgent: 'Urgent',
}

function Selector<T extends string>({
  value, options, labels, colors, onChange,
}: {
  value: T
  options: T[]
  labels: Record<string, string>
  colors: Record<string, string>
  onChange: (v: T) => void
}) {
  return (
    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
      {options.map((opt) => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          style={{
            padding: '3px 10px',
            borderRadius: 5,
            border: value === opt ? `1px solid ${colors[opt]}55` : '1px solid #1F3245',
            background: value === opt ? `${colors[opt]}1A` : 'transparent',
            color: value === opt ? colors[opt] : '#7A96B8',
            fontSize: 11,
            cursor: 'pointer',
          }}
        >
          {labels[opt]}
        </button>
      ))}
    </div>
  )
}

export default function TaskDetail() {
  const { selectedTaskId, tasks, tags, users, selectTask, updateTask } = useStore()
  const task: Task | null = selectedTaskId ? tasks[selectedTaskId] ?? null : null

  if (!task) return null

  const taskTags = task.tagIds.map((id) => tags[id]).filter(Boolean)
  const taskUsers = task.assigneeIds.map((id) => users[id]).filter(Boolean)
  const parent = task.parentId ? tasks[task.parentId] : null
  const children = task.childIds.map((id) => tasks[id]).filter(Boolean)
  const overdue = isOverdue(task)

  const update = (updates: Partial<Task>) => updateTask(task.id, updates)

  const row = (label: string, content: React.ReactNode) => (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '80px 1fr',
        gap: 8,
        padding: '8px 0',
        borderBottom: '1px solid #182840',
        alignItems: 'start',
      }}
    >
      <span style={{ fontSize: 11, color: '#3A5070', paddingTop: 2 }}>{label}</span>
      <div>{content}</div>
    </div>
  )

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.35)',
          zIndex: 40,
        }}
        onClick={() => selectTask(null)}
      />

      {/* Panel */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: 420,
          background: '#111B26',
          borderLeft: '1px solid #1F3245',
          zIndex: 50,
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '14px 18px',
            borderBottom: '1px solid #1F3245',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 8,
          }}
        >
          <div style={{ flex: 1 }}>
            {parent && (
              <div style={{ fontSize: 10, color: '#3A5070', marginBottom: 4 }}>
                ↑ {parent.title}
              </div>
            )}
            <textarea
              value={task.title}
              onChange={(e) => update({ title: e.target.value })}
              rows={2}
              style={{
                width: '100%',
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: '#D0DCF0',
                fontSize: 15,
                fontWeight: 600,
                lineHeight: 1.4,
                resize: 'none',
                fontFamily: 'inherit',
              }}
            />
          </div>
          <button
            onClick={() => selectTask(null)}
            style={{
              background: 'none',
              border: 'none',
              color: '#3A5070',
              cursor: 'pointer',
              padding: 2,
              flexShrink: 0,
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '8px 18px', flex: 1 }}>
          {row(
            'ステータス',
            <Selector
              value={task.status}
              options={STATUSES}
              labels={STATUS_LABEL}
              colors={STATUS_COLOR}
              onChange={(v) => update({ status: v })}
            />,
          )}

          {row(
            '優先度',
            <Selector
              value={task.priority}
              options={PRIORITIES}
              labels={PRIORITY_LABEL}
              colors={PRIORITY_COLOR}
              onChange={(v) => update({ priority: v })}
            />,
          )}

          {row(
            '期間',
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#7A96B8' }}>
              <Calendar size={12} style={{ color: '#3A5070' }} />
              {task.startDate ? fmtDate(task.startDate) : '–'}
              <span style={{ color: '#3A5070' }}>→</span>
              <span style={{ color: overdue ? '#E3423B' : '#7A96B8' }}>
                {task.dueDate ? fmtDate(task.dueDate) : '–'}
              </span>
              {overdue && <AlertCircle size={11} style={{ color: '#E3423B' }} />}
            </div>,
          )}

          {taskTags.length > 0 &&
            row(
              'タグ',
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {taskTags.map((tag) => (
                  <span
                    key={tag.id}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '2px 8px',
                      borderRadius: 10,
                      background: `${tag.color}1E`,
                      color: tag.color,
                      fontSize: 11,
                      fontWeight: 500,
                    }}
                  >
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: tag.color }} />
                    {tag.name}
                  </span>
                ))}
              </div>,
            )}

          {taskUsers.length > 0 &&
            row(
              '担当者',
              <div style={{ display: 'flex', gap: 6 }}>
                {taskUsers.map((u) => (
                  <div
                    key={u.id}
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: '50%',
                      background: u.avatarColor,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 11,
                      fontWeight: 700,
                      color: '#fff',
                    }}
                    title={u.name}
                  >
                    {u.initials}
                  </div>
                ))}
              </div>,
            )}

          {task.description && (
            <div style={{ padding: '10px 0', borderBottom: '1px solid #182840' }}>
              <div style={{ fontSize: 10, color: '#3A5070', marginBottom: 6 }}>メモ</div>
              <p
                style={{
                  fontSize: 12,
                  color: '#7A96B8',
                  lineHeight: 1.65,
                  margin: 0,
                  whiteSpace: 'pre-wrap',
                }}
              >
                {task.description}
              </p>
            </div>
          )}

          {children.length > 0 && (
            <div style={{ padding: '10px 0' }}>
              <div style={{ fontSize: 10, color: '#3A5070', marginBottom: 8 }}>
                子タスク ({children.filter((c) => c.status === 'done').length}/{children.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {children.map((child) => (
                  <div
                    key={child.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '6px 8px',
                      borderRadius: 6,
                      background: '#172130',
                      cursor: 'pointer',
                    }}
                    onClick={() => selectTask(child.id)}
                  >
                    <div
                      onClick={(e) => {
                        e.stopPropagation()
                        updateTask(child.id, {
                          status: child.status === 'done' ? 'todo' : 'done',
                        })
                      }}
                      style={{
                        width: 14,
                        height: 14,
                        borderRadius: 3,
                        border: child.status === 'done' ? 'none' : '1px solid #3A5070',
                        background: child.status === 'done' ? '#38C172' : 'transparent',
                        flexShrink: 0,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {child.status === 'done' && (
                        <span style={{ color: '#fff', fontSize: 9, fontWeight: 700 }}>✓</span>
                      )}
                    </div>
                    <span
                      style={{
                        fontSize: 12,
                        color: child.status === 'done' ? '#3A5070' : '#D0DCF0',
                        textDecoration: child.status === 'done' ? 'line-through' : 'none',
                        flex: 1,
                      }}
                    >
                      {child.title}
                    </span>
                    {child.dueDate && (
                      <span style={{ fontSize: 10, color: isOverdue(child) ? '#E3423B' : '#3A5070' }}>
                        {fmtDate(child.dueDate)}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
