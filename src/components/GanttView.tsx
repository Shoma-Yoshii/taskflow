import { useState } from 'react'
import { ChevronRight, ChevronDown } from 'lucide-react'
import { useStore } from '../store'
import type { Task } from '../types'
import { STATUS_COLOR, fmtDate } from '../lib/utils'

// ── Date helpers ──────────────────────────────────────────

const DAY_MS = 86400000

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / DAY_MS)
}

function addDays(d: Date, n: number): Date {
  return new Date(d.getTime() + n * DAY_MS)
}

function eachMonth(start: Date, end: Date): Date[] {
  const months: Date[] = []
  let cur = new Date(start.getFullYear(), start.getMonth(), 1)
  while (cur <= end) {
    months.push(new Date(cur))
    cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1)
  }
  return months
}

// ── Gantt row ─────────────────────────────────────────────

interface RowProps {
  task: Task
  rangeStart: Date
  totalDays: number
  depth: number
  collapsed: boolean
  onToggle: () => void
  onClick: () => void
  hasChildren: boolean
  today: Date
}

function GanttRow({ task, rangeStart, totalDays, depth, collapsed, onToggle, onClick, hasChildren, today }: RowProps) {
  const start = task.startDate ? new Date(task.startDate) : null
  const end = task.dueDate ? new Date(task.dueDate) : null

  let leftPct = 0
  let widthPct = 0

  if (start && end) {
    const startOff = Math.max(0, daysBetween(rangeStart, start))
    const endOff = Math.min(totalDays, daysBetween(rangeStart, end) + 1)
    leftPct = (startOff / totalDays) * 100
    widthPct = Math.max(0.3, ((endOff - startOff) / totalDays) * 100)
  }

  const barColor = STATUS_COLOR[task.status]
  const isParent = hasChildren

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '220px 1fr',
        borderBottom: '1px solid #182840',
        minHeight: 34,
        alignItems: 'center',
        background: isParent ? 'rgba(255,255,255,0.012)' : 'transparent',
      }}
    >
      {/* Task name cell */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '5px 10px',
          borderRight: '1px solid #1F3245',
          gap: 4,
          cursor: 'pointer',
        }}
        onClick={onClick}
      >
        {/* indent */}
        <div style={{ width: depth * 14, flexShrink: 0 }} />

        {hasChildren ? (
          <span
            style={{ color: '#3A5070', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            onClick={(e) => { e.stopPropagation(); onToggle() }}
          >
            {collapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
          </span>
        ) : (
          <div style={{ width: 12 }} />
        )}

        <span
          style={{
            fontSize: 11.5,
            color: isParent ? '#D0DCF0' : '#7A96B8',
            fontWeight: isParent ? 600 : 400,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {task.title}
        </span>
      </div>

      {/* Timeline bar cell */}
      <div style={{ position: 'relative', height: 34, overflow: 'hidden' }}>
        {/* Today line */}
        {(() => {
          const todayOff = daysBetween(rangeStart, today)
          if (todayOff >= 0 && todayOff <= totalDays) {
            const todayPct = (todayOff / totalDays) * 100
            return (
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  bottom: 0,
                  left: `${todayPct}%`,
                  width: 1,
                  background: '#F0A500',
                  opacity: 0.5,
                  zIndex: 5,
                }}
              />
            )
          }
          return null
        })()}

        {/* Bar */}
        {widthPct > 0 && (
          <div
            style={{
              position: 'absolute',
              top: '50%',
              transform: 'translateY(-50%)',
              left: `${leftPct}%`,
              width: `${widthPct}%`,
              height: isParent ? 7 : 15,
              borderRadius: 3,
              background: barColor,
              opacity: isParent ? 0.55 : 0.85,
              cursor: 'pointer',
            }}
            onClick={onClick}
            title={`${fmtDate(task.startDate)} → ${fmtDate(task.dueDate)}`}
          />
        )}
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────

export default function GanttView() {
  const { tasks, selectTask } = useStore()
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // range: 3 months centred on today's month
  const rangeStart = new Date(today.getFullYear(), today.getMonth() - 1, 1)
  const rangeEnd = new Date(today.getFullYear(), today.getMonth() + 3, 0)
  const totalDays = daysBetween(rangeStart, rangeEnd) + 1

  const months = eachMonth(rangeStart, rangeEnd)

  const taskList = Object.values(tasks)

  // Build ordered rows (only root tasks + visible children)
  const rows: Task[] = []
  const visit = (task: Task) => {
    rows.push(task)
    if (!collapsed.has(task.id)) {
      task.childIds
        .map((id) => tasks[id])
        .filter(Boolean)
        .forEach(visit)
    }
  }
  taskList.filter((t) => t.parentId === null).forEach(visit)

  const toggleCollapse = (id: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  // Week lines helper
  const weekLines: number[] = []
  let cur = addDays(rangeStart, (7 - rangeStart.getDay()) % 7)
  while (cur < rangeEnd) {
    weekLines.push((daysBetween(rangeStart, cur) / totalDays) * 100)
    cur = addDays(cur, 7)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Sticky header */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '220px 1fr',
          background: '#172130',
          borderBottom: '1px solid #1F3245',
          flexShrink: 0,
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}
      >
        <div
          style={{
            padding: '7px 10px',
            fontSize: 10,
            letterSpacing: '0.07em',
            textTransform: 'uppercase',
            color: '#3A5070',
            borderRight: '1px solid #1F3245',
          }}
        >
          タスク名
        </div>
        <div style={{ position: 'relative', overflow: 'hidden' }}>
          {/* Month labels */}
          {months.map((m) => {
            const off = daysBetween(rangeStart, m)
            const pct = Math.max(0, (off / totalDays) * 100)
            return (
              <div
                key={m.toISOString()}
                style={{
                  position: 'absolute',
                  left: `${pct}%`,
                  top: 0,
                  bottom: 0,
                  display: 'flex',
                  alignItems: 'center',
                  paddingLeft: 6,
                  fontSize: 10,
                  color: '#3A5070',
                  letterSpacing: '0.04em',
                  borderLeft: '1px solid #182840',
                }}
              >
                {m.getFullYear()}/{m.getMonth() + 1}月
              </div>
            )
          })}
        </div>
      </div>

      {/* Rows */}
      <div style={{ overflowY: 'auto', flex: 1 }}>
        {rows.map((task) => (
          <div key={task.id} style={{ position: 'relative' }}>
            {/* Week grid lines overlay */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: 220,
                right: 0,
                pointerEvents: 'none',
              }}
            >
              {weekLines.map((pct, i) => (
                <div
                  key={i}
                  style={{
                    position: 'absolute',
                    top: 0,
                    bottom: 0,
                    left: `${pct}%`,
                    width: 1,
                    background: '#182840',
                  }}
                />
              ))}
            </div>

            <GanttRow
              task={task}
              rangeStart={rangeStart}
              totalDays={totalDays}
              depth={task.depth}
              collapsed={collapsed.has(task.id)}
              onToggle={() => toggleCollapse(task.id)}
              onClick={() => selectTask(task.id)}
              hasChildren={task.childIds.length > 0}
              today={today}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
