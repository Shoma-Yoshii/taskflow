import { useState } from 'react'
import { ArrowUp, ArrowDown, ArrowUpDown, ListFilter, X } from 'lucide-react'
import { useStore, getFilteredTasks } from '../store'
import type { Task, TaskStatus } from '../types'

type SortKey = 'title' | 'status' | 'dueDate' | 'assignee'
type SortDir  = 'asc' | 'desc'

interface ColFilters {
  status:      TaskStatus[]
  assigneeIds: string[]
  tagIds:      string[]
}

const STATUS_ORDER: TaskStatus[] = ['todo', 'in_progress', 'review', 'done']

const STATUS_BADGE: Record<TaskStatus, { bg: string; text: string; label: string }> = {
  todo:        { bg: '#1A2535', text: '#7A96B8', label: 'TODO'    },
  in_progress: { bg: '#0D2240', text: '#4898F2', label: '進行中'  },
  review:      { bg: '#2A1E00', text: '#F0A500', label: 'レビュー' },
  done:        { bg: '#0A2015', text: '#38C172', label: '完了'    },
}

function fmtDate(iso?: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`
}

// ── 行コンポーネント（外部定義でリレンダーを最小化）─────────
function TaskRow({
  task, even, users, tags, onSelect,
}: {
  task:     Task
  even:     boolean
  users:    ReturnType<typeof useStore>['users']
  tags:     ReturnType<typeof useStore>['tags']
  onSelect: (id: string) => void
}) {
  const b         = STATUS_BADGE[task.status]
  const assignees = task.assigneeIds.map((id) => users[id]).filter(Boolean)
  const taskTags  = task.tagIds.map((id) => tags[id]).filter(Boolean)

  return (
    <tr
      onClick={() => onSelect(task.id)}
      style={{ background: even ? '#0C1219' : '#0F1A26', cursor: 'pointer' }}
      onMouseEnter={(e) => { e.currentTarget.style.background = '#162030' }}
      onMouseLeave={(e) => { e.currentTarget.style.background = even ? '#0C1219' : '#0F1A26' }}
    >
      {/* タスク名 */}
      <td style={{ padding: '9px 14px', borderBottom: '1px solid #182840', overflow: 'hidden' }}>
        <span style={{
          fontSize: 12.5, display: 'block', whiteSpace: 'nowrap',
          overflow: 'hidden', textOverflow: 'ellipsis',
          color: task.parentId === null ? '#C8D8F0' : '#7A96B8',
          fontWeight: task.parentId === null ? 600 : 400,
        }}>
          {task.parentId !== null && (
            <span style={{ color: '#2A3F55', marginRight: 6 }}>└</span>
          )}
          {task.title}
        </span>
      </td>

      {/* ステータス */}
      <td style={{ padding: '9px 14px', borderBottom: '1px solid #182840' }}>
        <span style={{
          fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 4,
          background: b.bg, color: b.text, whiteSpace: 'nowrap',
        }}>
          {b.label}
        </span>
      </td>

      {/* 担当者 */}
      <td style={{ padding: '9px 14px', borderBottom: '1px solid #182840' }}>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          {assignees.length === 0 ? (
            <span style={{ fontSize: 11, color: '#2A3F55' }}>—</span>
          ) : (
            assignees.map((u) => (
              <div
                key={u.id}
                title={u.name}
                style={{
                  width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                  background: u.avatarColor,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 9.5, fontWeight: 700, color: '#fff',
                }}
              >
                {u.initials}
              </div>
            ))
          )}
        </div>
      </td>

      {/* 日付 */}
      <td style={{ padding: '9px 14px', borderBottom: '1px solid #182840', whiteSpace: 'nowrap' }}>
        {task.startDate || task.dueDate ? (
          <span style={{ fontSize: 11, color: '#4A6A8A' }}>
            {fmtDate(task.startDate)}
            {task.startDate && task.dueDate && (
              <span style={{ color: '#2A3F55', margin: '0 5px' }}>→</span>
            )}
            {!task.startDate && task.dueDate && (
              <span style={{ color: '#2A3F55', marginRight: 5 }}>〜</span>
            )}
            {fmtDate(task.dueDate)}
          </span>
        ) : (
          <span style={{ fontSize: 11, color: '#2A3F55' }}>—</span>
        )}
      </td>

      {/* タグ */}
      <td style={{ padding: '9px 14px', borderBottom: '1px solid #182840' }}>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {taskTags.length === 0 ? (
            <span style={{ fontSize: 11, color: '#2A3F55' }}>—</span>
          ) : (
            taskTags.map((tag) => (
              <span
                key={tag.id}
                style={{
                  fontSize: 9.5, padding: '2px 6px', borderRadius: 4, fontWeight: 500,
                  background: `${tag.color}1A`, color: tag.color,
                  border: `1px solid ${tag.color}33`, whiteSpace: 'nowrap',
                }}
              >
                {tag.name}
              </span>
            ))
          )}
        </div>
      </td>
    </tr>
  )
}

// ── メインコンポーネント ───────────────────────────────────
export default function ListView() {
  const {
    tasks, users, tags,
    filterTagIds, filterMode, filterAssigneeIds, filterStatusIds,
    selectTask,
  } = useStore()

  const [sortKey,    setSortKey]    = useState<SortKey>('dueDate')
  const [sortDir,    setSortDir]    = useState<SortDir>('asc')
  const [colFilters, setColFilters] = useState<ColFilters>({ status: [], assigneeIds: [], tagIds: [] })
  const [openFilter, setOpenFilter] = useState<string | null>(null)

  // FilterBar のフィルターを適用した可視タスクセット
  const visible = getFilteredTasks(tasks, filterTagIds, filterMode, filterAssigneeIds, filterStatusIds)

  // 列フィルターを重ねて適用
  let rows = Object.values(tasks).filter((t) => visible.has(t.id))
  if (colFilters.status.length > 0)
    rows = rows.filter((t) => colFilters.status.includes(t.status))
  if (colFilters.assigneeIds.length > 0)
    rows = rows.filter((t) => colFilters.assigneeIds.some((uid) => t.assigneeIds.includes(uid)))
  if (colFilters.tagIds.length > 0)
    rows = rows.filter((t) => colFilters.tagIds.some((tid) => t.tagIds.includes(tid)))

  // ソート
  rows.sort((a, b) => {
    let cmp = 0
    switch (sortKey) {
      case 'title':
        cmp = a.title.localeCompare(b.title, 'ja')
        break
      case 'status':
        cmp = STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status)
        break
      case 'dueDate': {
        const da = a.dueDate ? +new Date(a.dueDate) : Infinity
        const db = b.dueDate ? +new Date(b.dueDate) : Infinity
        cmp = da - db
        break
      }
      case 'assignee': {
        const na = a.assigneeIds[0] ? (users[a.assigneeIds[0]]?.name ?? '') : '￿'
        const nb = b.assigneeIds[0] ? (users[b.assigneeIds[0]]?.name ?? '') : '￿'
        cmp = na.localeCompare(nb, 'ja')
        break
      }
    }
    return sortDir === 'asc' ? cmp : -cmp
  })

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(key); setSortDir('asc') }
  }

  // 列フィルタートグル
  const toggleStatus = (s: TaskStatus) =>
    setColFilters((p) => ({
      ...p,
      status: p.status.includes(s) ? p.status.filter((x) => x !== s) : [...p.status, s],
    }))
  const toggleAssignee = (id: string) =>
    setColFilters((p) => ({
      ...p,
      assigneeIds: p.assigneeIds.includes(id) ? p.assigneeIds.filter((x) => x !== id) : [...p.assigneeIds, id],
    }))
  const toggleTag = (id: string) =>
    setColFilters((p) => ({
      ...p,
      tagIds: p.tagIds.includes(id) ? p.tagIds.filter((x) => x !== id) : [...p.tagIds, id],
    }))

  const hasAnyColFilter =
    colFilters.status.length > 0 || colFilters.assigneeIds.length > 0 || colFilters.tagIds.length > 0

  const tagList  = Object.values(tags)
  const userList = Object.values(users)

  // ── ヘルパー: ソートボタン ────────────────────────────────
  const SortBtn = ({ label, k }: { label: string; k: SortKey }) => (
    <button
      onClick={() => handleSort(k)}
      style={{
        display: 'flex', alignItems: 'center', gap: 4,
        background: 'none', border: 'none', cursor: 'pointer', padding: 0,
        color: sortKey === k ? '#C8D8F0' : '#3A5070',
        fontSize: 10, fontWeight: 600,
        letterSpacing: '0.07em', textTransform: 'uppercase',
      }}
    >
      {label}
      {sortKey !== k
        ? <ArrowUpDown size={11} style={{ opacity: 0.3 }} />
        : sortDir === 'asc' ? <ArrowUp size={11} /> : <ArrowDown size={11} />
      }
    </button>
  )

  // ── ヘルパー: フィルタードロップダウン ────────────────────
  const FilterDropdown = ({
    fKey, active, onClear, children,
  }: {
    fKey: string
    active: boolean
    onClear: () => void
    children: React.ReactNode
  }) => {
    const isOpen = openFilter === fKey
    return (
      <div style={{ position: 'relative', display: 'inline-flex' }}>
        <button
          onClick={(e) => { e.stopPropagation(); setOpenFilter(isOpen ? null : fKey) }}
          style={{
            display: 'flex', alignItems: 'center',
            background: active ? '#4898F222' : 'none',
            border: active ? '1px solid #4898F244' : '1px solid transparent',
            borderRadius: 4, cursor: 'pointer',
            color: active ? '#4898F2' : '#3A5070',
            padding: '2px 4px',
          }}
        >
          <ListFilter size={10} />
        </button>

        {isOpen && (
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'absolute', top: 'calc(100% + 6px)', left: 0,
              background: '#172130', border: '1px solid #1F3245',
              borderRadius: 8, padding: 8, zIndex: 200,
              minWidth: 140, boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
              display: 'flex', flexDirection: 'column', gap: 4,
            }}
          >
            {children}
            {active && (
              <button
                onClick={onClear}
                style={{
                  marginTop: 4, padding: '3px 8px', borderRadius: 5,
                  border: '1px solid #1F3245', background: 'none',
                  color: '#3A5070', fontSize: 10, cursor: 'pointer', textAlign: 'left',
                }}
              >
                クリア
              </button>
            )}
          </div>
        )}
      </div>
    )
  }

  // ── ヘルパー: フィルターメニュー項目 ─────────────────────
  const menuItem = (label: string, active: boolean, color: string, onClick: () => void) => (
    <button
      key={label}
      onClick={onClick}
      style={{
        display: 'block', width: '100%', textAlign: 'left',
        padding: '4px 8px', borderRadius: 6,
        border: active ? `1px solid ${color}55` : '1px solid #1F3245',
        background: active ? `${color}1A` : 'transparent',
        color: active ? color : '#7A96B8',
        fontSize: 11, cursor: 'pointer',
      }}
    >
      {label}
    </button>
  )

  const thStyle = {
    padding: '10px 14px', textAlign: 'left' as const,
    fontWeight: 600, fontSize: 10, letterSpacing: '0.07em',
    textTransform: 'uppercase' as const, color: '#3A5070',
    borderBottom: '1px solid #1F3245', background: '#0F1A26',
    position: 'sticky' as const, top: 0, zIndex: 10,
    whiteSpace: 'nowrap' as const, userSelect: 'none' as const,
  }

  return (
    // ドロップダウン外クリックで閉じる
    <div
      style={{ height: '100%', overflow: 'auto', padding: '14px 20px' }}
      onClick={() => setOpenFilter(null)}
    >
      {/* ツールバー */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ fontSize: 12, color: '#3A5070' }}>{rows.length} 件</span>
        {hasAnyColFilter && (
          <button
            onClick={() => setColFilters({ status: [], assigneeIds: [], tagIds: [] })}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '3px 10px', borderRadius: 6,
              border: '1px solid #1F3245', background: 'transparent',
              color: '#7A96B8', fontSize: 11, cursor: 'pointer',
            }}
          >
            <X size={10} />
            列フィルターをクリア
          </button>
        )}
      </div>

      {/* テーブル */}
      <div style={{ borderRadius: 10, border: '1px solid #1F3245', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
          <colgroup>
            <col />
            <col style={{ width: 128 }} />
            <col style={{ width: 120 }} />
            <col style={{ width: 215 }} />
            <col style={{ width: 220 }} />
          </colgroup>

          <thead>
            <tr>
              {/* タスク名 */}
              <th style={thStyle}>
                <SortBtn label="タスク名" k="title" />
              </th>

              {/* ステータス */}
              <th style={thStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <SortBtn label="ステータス" k="status" />
                  <FilterDropdown
                    fKey="status"
                    active={colFilters.status.length > 0}
                    onClear={() => setColFilters((p) => ({ ...p, status: [] }))}
                  >
                    {STATUS_ORDER.map((s) => {
                      const b = STATUS_BADGE[s]
                      return menuItem(b.label, colFilters.status.includes(s), b.text, () => toggleStatus(s))
                    })}
                  </FilterDropdown>
                </div>
              </th>

              {/* 担当者 */}
              <th style={thStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <SortBtn label="担当者" k="assignee" />
                  <FilterDropdown
                    fKey="assignee"
                    active={colFilters.assigneeIds.length > 0}
                    onClear={() => setColFilters((p) => ({ ...p, assigneeIds: [] }))}
                  >
                    {userList.map((u) =>
                      menuItem(u.name, colFilters.assigneeIds.includes(u.id), u.avatarColor, () => toggleAssignee(u.id))
                    )}
                  </FilterDropdown>
                </div>
              </th>

              {/* 日付 */}
              <th style={thStyle}>
                <SortBtn label="日付" k="dueDate" />
              </th>

              {/* タグ */}
              <th style={thStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span>タグ</span>
                  <FilterDropdown
                    fKey="tags"
                    active={colFilters.tagIds.length > 0}
                    onClear={() => setColFilters((p) => ({ ...p, tagIds: [] }))}
                  >
                    {tagList.map((tag) =>
                      menuItem(tag.name, colFilters.tagIds.includes(tag.id), tag.color, () => toggleTag(tag.id))
                    )}
                  </FilterDropdown>
                </div>
              </th>
            </tr>
          </thead>

          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  style={{ padding: 48, textAlign: 'center', color: '#3A5070', fontSize: 13 }}
                >
                  タスクが見つかりません
                </td>
              </tr>
            ) : (
              rows.map((task, i) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  even={i % 2 === 0}
                  users={users}
                  tags={tags}
                  onSelect={selectTask}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
