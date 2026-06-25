import { useState, useEffect } from 'react'
import { X, Calendar, AlertCircle, Trash2, Eye, Edit3, UserPlus } from 'lucide-react'
import { marked } from 'marked'
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
  const { selectedTaskId, tasks, tags, users, selectTask, updateTask, deleteTask, setAddingUser } = useStore()
  const task: Task | null = selectedTaskId ? tasks[selectedTaskId] ?? null : null
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [descPreview, setDescPreview] = useState(false)

  useEffect(() => {
    setConfirmDelete(false)
    setDescPreview(false)
  }, [selectedTaskId])

  if (!task) return null

  const taskTags = task.tagIds.map((id) => tags[id]).filter(Boolean)
  const parent = task.parentId ? tasks[task.parentId] : null
  const children = task.childIds.map((id) => tasks[id]).filter(Boolean)
  const overdue = isOverdue(task)
  const userList = Object.values(users)

  const update = (updates: Partial<Task>) => updateTask(task.id, updates)

  const toggleAssignee = (uid: string) => {
    const newIds = task.assigneeIds.includes(uid)
      ? task.assigneeIds.filter((id) => id !== uid)
      : [...task.assigneeIds, uid]
    update({ assigneeIds: newIds })
  }

  const row = (label: string, content: React.ReactNode) => (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '72px 1fr',
        gap: 8,
        padding: '8px 0',
        borderBottom: '1px solid #182840',
        alignItems: 'start',
      }}
    >
      <span style={{ fontSize: 11, color: '#3A5070', paddingTop: 3 }}>{label}</span>
      <div>{content}</div>
    </div>
  )

  const markdownHtml = String(marked.parse(task.description ?? ''))

  return (
    <>
      {/* Backdrop */}
      <div
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 40 }}
        onClick={() => selectTask(null)}
      />

      {/* Panel */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: 440,
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
            style={{ background: 'none', border: 'none', color: '#3A5070', cursor: 'pointer', padding: 2, flexShrink: 0 }}
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Calendar size={12} style={{ color: '#3A5070', flexShrink: 0 }} />
              <input
                type="date"
                className="date-input"
                value={task.startDate ? task.startDate.slice(0, 10) : ''}
                onChange={(e) => update({ startDate: e.target.value || undefined })}
                title="開始日"
              />
              <span style={{ color: '#3A5070', fontSize: 12, flexShrink: 0 }}>→</span>
              <input
                type="date"
                className="date-input"
                value={task.dueDate ? task.dueDate.slice(0, 10) : ''}
                onChange={(e) => update({ dueDate: e.target.value || undefined })}
                title="終了日"
                style={{ color: overdue ? '#E3423B' : undefined }}
              />
              {overdue && <AlertCircle size={11} style={{ color: '#E3423B', flexShrink: 0 }} />}
            </div>,
          )}

          {/* Assignees — editable + add new */}
          {row(
            '担当者',
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, alignItems: 'center' }}>
              {userList.map((u) => {
                const active = task.assigneeIds.includes(u.id)
                return (
                  <button
                    key={u.id}
                    onClick={() => toggleAssignee(u.id)}
                    title={active ? `${u.name} を外す` : `${u.name} を追加`}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      padding: '3px 9px 3px 5px',
                      borderRadius: 16,
                      border: active ? `1px solid ${u.avatarColor}55` : '1px solid #1F3245',
                      background: active ? `${u.avatarColor}1A` : 'transparent',
                      color: active ? u.avatarColor : '#3A5070',
                      fontSize: 12,
                      cursor: 'pointer',
                      transition: 'all 0.12s',
                    }}
                  >
                    <span
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: '50%',
                        background: active ? u.avatarColor : '#1D2A3C',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 9,
                        fontWeight: 700,
                        color: active ? '#fff' : '#3A5070',
                        flexShrink: 0,
                        transition: 'all 0.12s',
                      }}
                    >
                      {u.initials}
                    </span>
                    {u.name}
                  </button>
                )
              })}
              {/* Add new user */}
              <button
                onClick={() => setAddingUser(true)}
                title="新しい担当者を追加"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '3px 9px',
                  borderRadius: 16,
                  border: '1px dashed #1F3245',
                  background: 'transparent',
                  color: '#3A5070',
                  fontSize: 11,
                  cursor: 'pointer',
                }}
              >
                <UserPlus size={11} />
                担当者追加
              </button>
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

          {/* Memo — markdown */}
          <div style={{ padding: '12px 0', borderBottom: '1px solid #182840' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 11, color: '#3A5070' }}>メモ</span>
              <button
                onClick={() => setDescPreview(!descPreview)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  background: 'none',
                  border: '1px solid #1F3245',
                  borderRadius: 5,
                  color: '#7A96B8',
                  fontSize: 10,
                  cursor: 'pointer',
                  padding: '2px 8px',
                }}
              >
                {descPreview
                  ? <><Edit3 size={10} /> 編集</>
                  : <><Eye size={10} /> プレビュー</>
                }
              </button>
            </div>

            {descPreview ? (
              task.description ? (
                <div
                  className="md-preview"
                  dangerouslySetInnerHTML={{ __html: markdownHtml }}
                />
              ) : (
                <span style={{ fontSize: 12, color: '#3A5070', fontStyle: 'italic' }}>メモなし</span>
              )
            ) : (
              <textarea
                value={task.description ?? ''}
                onChange={(e) => update({ description: e.target.value })}
                placeholder={'マークダウン形式で記入できます\n\n# 見出し\n- リスト\n**太字** / *斜体*\n`コード`'}
                rows={5}
                style={{
                  width: '100%',
                  background: '#0C1219',
                  border: '1px solid #1F3245',
                  borderRadius: 6,
                  padding: '8px 10px',
                  color: '#D0DCF0',
                  fontSize: 12,
                  lineHeight: 1.65,
                  resize: 'vertical',
                  outline: 'none',
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                  boxSizing: 'border-box',
                }}
              />
            )}
          </div>

          {/* Predecessor tasks (dependsOn) */}
          {(() => {
            const deps = task.dependsOn ?? []
            const otherTasks = Object.values(tasks).filter(
              (t) => t.id !== task.id && !deps.includes(t.id)
            )
            const removeDep = (predId: string) =>
              update({ dependsOn: deps.filter((id) => id !== predId) })
            const addDep = (predId: string) => {
              if (!predId || deps.includes(predId)) return
              update({ dependsOn: [...deps, predId] })
            }

            return (
              <div style={{ padding: '10px 0', borderBottom: '1px solid #182840' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 11, color: '#3A5070' }}>前提タスク</span>
                </div>

                {/* Current deps */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: deps.length > 0 ? 8 : 0 }}>
                  {deps.map((predId) => {
                    const pred = tasks[predId]
                    if (!pred) return null
                    return (
                      <span
                        key={predId}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                          padding: '2px 6px 2px 9px',
                          borderRadius: 10,
                          background: '#172130',
                          border: '1px solid #1F3245',
                          fontSize: 11,
                          color: '#7A96B8',
                        }}
                      >
                        {pred.title.length > 20 ? pred.title.slice(0, 20) + '…' : pred.title}
                        <button
                          onClick={() => removeDep(predId)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#3A5070',
                            cursor: 'pointer',
                            padding: 0,
                            lineHeight: 1,
                            display: 'flex',
                          }}
                          title="前提タスクを外す"
                        >
                          <X size={10} />
                        </button>
                      </span>
                    )
                  })}
                </div>

                {/* Add dependency dropdown */}
                <select
                  value=""
                  onChange={(e) => { addDep(e.target.value); e.target.value = '' }}
                  style={{
                    background: '#172130',
                    border: '1px dashed #1F3245',
                    borderRadius: 6,
                    padding: '4px 8px',
                    color: '#3A5070',
                    fontSize: 11,
                    outline: 'none',
                    width: '100%',
                    fontFamily: 'inherit',
                    cursor: 'pointer',
                  }}
                >
                  <option value="">+ 前提タスクを追加...</option>
                  {otherTasks.map((t) => (
                    <option key={t.id} value={t.id}>
                      {'　'.repeat(t.depth)}{t.title}
                    </option>
                  ))}
                </select>
              </div>
            )
          })()}

          {/* Child tasks */}
          {children.length > 0 && (
            <div style={{ padding: '10px 0', borderBottom: '1px solid #182840' }}>
              <div style={{ fontSize: 11, color: '#3A5070', marginBottom: 8 }}>
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
                        updateTask(child.id, { status: child.status === 'done' ? 'todo' : 'done' })
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

          {/* Delete */}
          <div style={{ padding: '16px 0 4px' }}>
            {!confirmDelete ? (
              <button
                onClick={() => setConfirmDelete(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  background: 'none',
                  border: '1px solid #1F3245',
                  borderRadius: 6,
                  color: '#3A5070',
                  fontSize: 12,
                  cursor: 'pointer',
                  padding: '5px 12px',
                  transition: 'all 0.12s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#E3423B44'
                  e.currentTarget.style.color = '#E3423B'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#1F3245'
                  e.currentTarget.style.color = '#3A5070'
                }}
              >
                <Trash2 size={12} />
                このタスクを削除
                {children.length > 0 && (
                  <span style={{ fontSize: 10, color: '#E07830' }}>（子 {children.length} 件も削除）</span>
                )}
              </button>
            ) : (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 12px',
                  borderRadius: 6,
                  border: '1px solid #E3423B44',
                  background: '#E3423B0D',
                }}
              >
                <span style={{ fontSize: 12, color: '#D0DCF0', flex: 1 }}>
                  本当に削除しますか？
                  {children.length > 0 && <span style={{ color: '#E07830' }}> 子タスク {children.length} 件も消えます</span>}
                </span>
                <button
                  onClick={() => setConfirmDelete(false)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 5,
                    border: '1px solid #1F3245',
                    background: 'transparent',
                    color: '#7A96B8',
                    fontSize: 12,
                    cursor: 'pointer',
                  }}
                >
                  キャンセル
                </button>
                <button
                  onClick={() => deleteTask(task.id)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 5,
                    border: 'none',
                    background: '#E3423B',
                    color: '#fff',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  削除する
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
