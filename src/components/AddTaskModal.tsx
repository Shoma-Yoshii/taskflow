import { useState } from 'react'
import { X } from 'lucide-react'
import { useStore } from '../store'
import type { TaskStatus, Priority } from '../types'
import { STATUS_LABEL, STATUS_COLOR, PRIORITY_COLOR, nanoid } from '../lib/utils'

const STATUSES: TaskStatus[] = ['todo', 'in_progress', 'review', 'done']
const PRIORITIES: Priority[] = ['low', 'medium', 'high', 'urgent']
const PRIORITY_LABEL: Record<Priority, string> = { low: 'Low', medium: 'Medium', high: 'High', urgent: 'Urgent' }

export default function AddTaskModal() {
  const { addingStatus, setAddingStatus, addTask, tags, users, tasks } = useStore()

  const [title, setTitle] = useState('')
  const [status, setStatus] = useState<TaskStatus>(addingStatus ?? 'todo')
  const [priority, setPriority] = useState<Priority>('medium')
  const [tagIds, setTagIds] = useState<string[]>([])
  const [assigneeIds, setAssigneeIds] = useState<string[]>([])
  const [startDate, setStartDate] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [parentId, setParentId] = useState<string>('')

  if (!addingStatus && addingStatus !== 'todo') return null

  const tagList = Object.values(tags)
  const userList = Object.values(users)
  // Root tasks only as potential parents (depth 0 or 1)
  const parentOptions = Object.values(tasks).filter((t) => t.depth < 2)

  const toggleTag = (id: string) =>
    setTagIds((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]))

  const toggleAssignee = (id: string) =>
    setAssigneeIds((prev) => (prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]))

  const handleSubmit = () => {
    if (!title.trim()) return
    const now = new Date().toISOString()
    const parent = parentId ? tasks[parentId] : null
    addTask({
      id: nanoid(),
      title: title.trim(),
      status,
      priority,
      parentId: parentId || null,
      childIds: [],
      depth: parent ? parent.depth + 1 : 0,
      tagIds,
      assigneeIds,
      startDate: startDate || undefined,
      dueDate: dueDate || undefined,
      createdAt: now,
      updatedAt: now,
    })
    setAddingStatus(null)
  }

  const handleClose = () => setAddingStatus(null)

  const section = (label: string, content: React.ReactNode) => (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 10, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#3A5070', marginBottom: 6 }}>
        {label}
      </div>
      {content}
    </div>
  )

  const toggleRow = <T extends string>(
    options: T[],
    labels: Record<string, string>,
    colors: Record<string, string>,
    value: T | T[],
    onToggle: (v: T) => void,
    multi = false,
  ) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
      {options.map((opt) => {
        const active = multi ? (value as T[]).includes(opt) : value === opt
        return (
          <button
            key={opt}
            onClick={() => onToggle(opt)}
            style={{
              padding: '3px 10px',
              borderRadius: 5,
              border: active ? `1px solid ${colors[opt]}55` : '1px solid #1F3245',
              background: active ? `${colors[opt]}1A` : 'transparent',
              color: active ? colors[opt] : '#7A96B8',
              fontSize: 11,
              cursor: 'pointer',
            }}
          >
            {labels[opt]}
          </button>
        )
      })}
    </div>
  )

  return (
    <>
      {/* Backdrop */}
      <div
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 60 }}
        onClick={handleClose}
      />

      {/* Modal */}
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 480,
          maxWidth: '95vw',
          maxHeight: '85vh',
          background: '#111B26',
          border: '1px solid #1F3245',
          borderRadius: 10,
          zIndex: 70,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '14px 18px',
            borderBottom: '1px solid #1F3245',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span style={{ fontSize: 14, fontWeight: 600, color: '#D0DCF0' }}>タスクを追加</span>
          <button
            onClick={handleClose}
            style={{ background: 'none', border: 'none', color: '#3A5070', cursor: 'pointer' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '18px', overflowY: 'auto', flex: 1 }}>
          {/* Title */}
          <div style={{ marginBottom: 18 }}>
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              placeholder="タスクタイトル（必須）"
              style={{
                width: '100%',
                background: '#172130',
                border: '1px solid #1F3245',
                borderRadius: 6,
                padding: '8px 12px',
                color: '#D0DCF0',
                fontSize: 14,
                outline: 'none',
                fontFamily: 'inherit',
              }}
            />
          </div>

          {section('ステータス',
            toggleRow(STATUSES, STATUS_LABEL, STATUS_COLOR, status, (v) => setStatus(v))
          )}

          {section('優先度',
            toggleRow(PRIORITIES, PRIORITY_LABEL, PRIORITY_COLOR, priority, (v) => setPriority(v))
          )}

          {section('担当者',
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {userList.map((u) => {
                const active = assigneeIds.includes(u.id)
                return (
                  <button
                    key={u.id}
                    onClick={() => toggleAssignee(u.id)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '3px 10px 3px 6px',
                      borderRadius: 16,
                      border: active ? `1px solid ${u.avatarColor}55` : '1px solid #1F3245',
                      background: active ? `${u.avatarColor}1A` : 'transparent',
                      color: active ? u.avatarColor : '#7A96B8',
                      fontSize: 12,
                      cursor: 'pointer',
                    }}
                  >
                    <span
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: '50%',
                        background: u.avatarColor,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 10,
                        fontWeight: 700,
                        color: '#fff',
                      }}
                    >
                      {u.initials}
                    </span>
                    {u.name}
                  </button>
                )
              })}
            </div>
          )}

          {section('タグ',
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {tagList.map((tag) => {
                const active = tagIds.includes(tag.id)
                return (
                  <button
                    key={tag.id}
                    onClick={() => toggleTag(tag.id)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '3px 9px',
                      borderRadius: 10,
                      border: active ? `1px solid ${tag.color}55` : '1px solid #1F3245',
                      background: active ? `${tag.color}1A` : 'transparent',
                      color: active ? tag.color : '#7A96B8',
                      fontSize: 11,
                      cursor: 'pointer',
                    }}
                  >
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: active ? tag.color : '#3A5070' }} />
                    {tag.name}
                  </button>
                )
              })}
            </div>
          )}

          {section('期間',
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={{
                  background: '#172130',
                  border: '1px solid #1F3245',
                  borderRadius: 6,
                  padding: '5px 8px',
                  color: '#D0DCF0',
                  fontSize: 12,
                  outline: 'none',
                  colorScheme: 'dark',
                  fontFamily: 'inherit',
                }}
              />
              <span style={{ color: '#3A5070', fontSize: 12 }}>→</span>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                style={{
                  background: '#172130',
                  border: '1px solid #1F3245',
                  borderRadius: 6,
                  padding: '5px 8px',
                  color: '#D0DCF0',
                  fontSize: 12,
                  outline: 'none',
                  colorScheme: 'dark',
                  fontFamily: 'inherit',
                }}
              />
            </div>
          )}

          {section('親タスク（任意）',
            <select
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
              style={{
                background: '#172130',
                border: '1px solid #1F3245',
                borderRadius: 6,
                padding: '5px 10px',
                color: parentId ? '#D0DCF0' : '#3A5070',
                fontSize: 12,
                outline: 'none',
                width: '100%',
                fontFamily: 'inherit',
              }}
            >
              <option value="">なし（ルートタスク）</option>
              {parentOptions.map((t) => (
                <option key={t.id} value={t.id}>
                  {'　'.repeat(t.depth)}{t.title}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '12px 18px',
            borderTop: '1px solid #1F3245',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 8,
          }}
        >
          <button
            onClick={handleClose}
            style={{
              padding: '6px 16px',
              borderRadius: 6,
              border: '1px solid #1F3245',
              background: 'transparent',
              color: '#7A96B8',
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            キャンセル
          </button>
          <button
            onClick={handleSubmit}
            disabled={!title.trim()}
            style={{
              padding: '6px 16px',
              borderRadius: 6,
              border: 'none',
              background: title.trim() ? '#4898F2' : '#1D2A3C',
              color: title.trim() ? '#fff' : '#3A5070',
              fontSize: 13,
              fontWeight: 600,
              cursor: title.trim() ? 'pointer' : 'not-allowed',
            }}
          >
            追加
          </button>
        </div>
      </div>
    </>
  )
}
