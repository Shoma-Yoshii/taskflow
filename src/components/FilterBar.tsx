import { useStore } from '../store'
import { STATUS_COLOR } from '../lib/utils'
import type { TaskStatus } from '../types'

const STATUS_LABELS: { status: TaskStatus; label: string }[] = [
  { status: 'todo',        label: 'Todo'        },
  { status: 'in_progress', label: 'In Progress' },
  { status: 'review',      label: 'Review'      },
  { status: 'done',        label: 'Done'        },
]

export default function FilterBar() {
  const {
    tags, users,
    filterTagIds, filterMode, filterAssigneeIds, filterStatusIds,
    toggleFilterTag, setFilterMode, toggleFilterAssignee, toggleFilterStatus, clearFilters,
  } = useStore()

  const tagList = Object.values(tags)
  const userList = Object.values(users)
  const hasFilter = filterTagIds.length > 0 || filterAssigneeIds.length > 0 || filterStatusIds.length > 0

  const chip = (
    label: string,
    active: boolean,
    color: string,
    onClick: () => void,
    dot?: boolean,
  ) => (
    <button
      key={label}
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: '3px 9px',
        borderRadius: 12,
        border: active ? `1px solid ${color}55` : '1px solid #1F3245',
        background: active ? `${color}1A` : 'transparent',
        color: active ? color : '#7A96B8',
        fontSize: 11,
        fontWeight: 500,
        cursor: 'pointer',
        transition: 'all 0.12s',
        flexShrink: 0,
      }}
    >
      {dot && (
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: active ? color : '#3A5070',
            flexShrink: 0,
          }}
        />
      )}
      {label}
    </button>
  )

  return (
    <div
      style={{
        background: '#111B26',
        borderBottom: '1px solid #182840',
        padding: '7px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        flexShrink: 0,
      }}
    >
      {/* Status row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#3A5070', width: 52, flexShrink: 0 }}>
          ステータス
        </span>
        {STATUS_LABELS.map(({ status, label }) =>
          chip(label, filterStatusIds.includes(status), STATUS_COLOR[status], () => toggleFilterStatus(status), true)
        )}
      </div>

      {/* Tag row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#3A5070', width: 52, flexShrink: 0 }}>
          タグ
        </span>
        {tagList.map((tag) =>
          chip(tag.name, filterTagIds.includes(tag.id), tag.color, () => toggleFilterTag(tag.id), true)
        )}
        {filterTagIds.length > 1 && (
          <div style={{ display: 'flex', background: '#0C1219', border: '1px solid #1F3245', borderRadius: 6, padding: 2, gap: 2 }}>
            {(['AND', 'OR'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setFilterMode(m)}
                style={{
                  padding: '2px 7px',
                  borderRadius: 4,
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 10,
                  fontWeight: 600,
                  background: filterMode === m ? '#1D2A3C' : 'transparent',
                  color: filterMode === m ? '#D0DCF0' : '#3A5070',
                }}
              >
                {m}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Assignee row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#3A5070', width: 52, flexShrink: 0 }}>
          担当者
        </span>
        {userList.map((u) =>
          chip(u.name, filterAssigneeIds.includes(u.id), u.avatarColor, () => toggleFilterAssignee(u.id))
        )}
        {hasFilter && (
          <button
            onClick={clearFilters}
            style={{
              marginLeft: 4,
              padding: '2px 8px',
              borderRadius: 6,
              border: '1px solid #1F3245',
              background: 'transparent',
              color: '#3A5070',
              fontSize: 11,
              cursor: 'pointer',
            }}
          >
            クリア
          </button>
        )}
      </div>
    </div>
  )
}
