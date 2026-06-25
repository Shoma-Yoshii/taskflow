import { useState, useRef, useEffect } from 'react'
import { ChevronRight, ChevronDown, GitBranch } from 'lucide-react'
import { useStore } from '../store'
import type { Task } from '../types'
import { STATUS_COLOR, fmtDate } from '../lib/utils'

// ── Constants ─────────────────────────────────────────────
const DAY_W    = 22    // px per day
const ROW_H    = 36    // px per row
const NAME_W   = 180   // task name sub-column
const STATUS_W = 76    // status badge sub-column
const DATE_W   = 164   // date range sub-column
const LEFT_W   = NAME_W + STATUS_W + DATE_W
const HEAD_H   = 48    // px for header
const DAY_MS   = 86400000

const STATUS_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  todo:        { bg: '#1A2535', text: '#7A96B8', label: 'TODO'   },
  in_progress: { bg: '#0D2240', text: '#4898F2', label: '進行中' },
  review:      { bg: '#2A1E00', text: '#F0A500', label: 'レビュー' },
  done:        { bg: '#0A2015', text: '#38C172', label: '完了'   },
}

function fmtFull(iso?: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`
}

// ── Helpers ───────────────────────────────────────────────
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

// ── Critical path: tasks with ≤1 day slack between dependent pairs ──
function calcCriticalSet(tasks: Record<string, Task>): Set<string> {
  const critical = new Set<string>()
  for (const task of Object.values(tasks)) {
    const deps = task.dependsOn ?? []
    if (!deps.length || !task.startDate) continue
    const taskStart = new Date(task.startDate).getTime()
    for (const predId of deps) {
      const pred = tasks[predId]
      if (!pred?.dueDate) continue
      const slack = (taskStart - new Date(pred.dueDate).getTime()) / DAY_MS
      if (slack <= 1) {
        critical.add(predId)
        critical.add(task.id)
      }
    }
  }
  return critical
}

// ── Main component ─────────────────────────────────────────
export default function GanttView() {
  const { tasks, selectTask } = useStore()
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [showCritical, setShowCritical] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // 13-month range: 2 months before → 11 months after
  const rangeStart = new Date(today.getFullYear(), today.getMonth() - 2, 1)
  const rangeEnd   = new Date(today.getFullYear(), today.getMonth() + 11, 0)
  const totalDays  = daysBetween(rangeStart, rangeEnd) + 1
  const totalWidth = totalDays * DAY_W

  // Scroll to ~2 months before today on mount
  useEffect(() => {
    if (scrollRef.current) {
      const todayX = daysBetween(rangeStart, today) * DAY_W
      scrollRef.current.scrollLeft = Math.max(0, todayX - 160)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const months = eachMonth(rangeStart, rangeEnd)
  const todayX = daysBetween(rangeStart, today) * DAY_W
  const criticalSet = showCritical ? calcCriticalSet(tasks) : new Set<string>()

  // Build ordered visible rows
  const rows: Task[] = []
  const visit = (task: Task) => {
    rows.push(task)
    if (!collapsed.has(task.id))
      task.childIds.map((id) => tasks[id]).filter(Boolean).forEach(visit)
  }
  Object.values(tasks).filter((t) => t.parentId === null).forEach(visit)

  const toggleCollapse = (id: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  // Week lines (px)
  const weekLines: number[] = []
  let wcur = addDays(rangeStart, (7 - rangeStart.getDay()) % 7)
  while (wcur < rangeEnd) {
    weekLines.push(daysBetween(rangeStart, wcur) * DAY_W)
    wcur = addDays(wcur, 7)
  }

  // Bar position helper
  const barPos = (task: Task) => {
    if (!task.startDate || !task.dueDate) return null
    const x  = Math.max(0, daysBetween(rangeStart, new Date(task.startDate))) * DAY_W
    const x2 = Math.min(totalDays, daysBetween(rangeStart, new Date(task.dueDate)) + 1) * DAY_W
    return { x, w: Math.max(DAY_W * 0.5, x2 - x) }
  }

  // Row index map for arrows
  const rowIdx = new Map(rows.map((t, i) => [t.id, i]))

  // Build dependency arrows
  type Arrow = { x1: number; y1: number; x2: number; y2: number; critical: boolean }
  const arrows: Arrow[] = []
  if (showCritical) {
    for (const task of rows) {
      const deps = task.dependsOn ?? []
      const toIdx = rowIdx.get(task.id)
      const toPos = barPos(task)
      if (toIdx === undefined || !toPos) continue
      for (const predId of deps) {
        const fromIdx = rowIdx.get(predId)
        const fromTask = tasks[predId]
        if (fromIdx === undefined || !fromTask) continue
        const fromPos = barPos(fromTask)
        if (!fromPos) continue
        arrows.push({
          x1: fromPos.x + fromPos.w,
          y1: fromIdx * ROW_H + ROW_H / 2,
          x2: toPos.x,
          y2: toIdx * ROW_H + ROW_H / 2,
          critical: criticalSet.has(predId) && criticalSet.has(task.id),
        })
      }
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: '#0C1219' }}>

      {/* Toolbar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          padding: '5px 14px',
          background: '#0C1219',
          borderBottom: '1px solid #182840',
          flexShrink: 0,
          gap: 8,
        }}
      >
        <span style={{ fontSize: 10, color: '#3A5070', flex: 1 }}>
          ← → でスクロール　スクロールバーまたはトラックパッドで横移動
        </span>
        <button
          onClick={() => setShowCritical((v) => !v)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            padding: '4px 12px',
            borderRadius: 6,
            border: showCritical ? '1px solid #E3423B55' : '1px solid #1F3245',
            background: showCritical ? '#E3423B15' : 'transparent',
            color: showCritical ? '#E3423B' : '#7A96B8',
            fontSize: 12,
            cursor: 'pointer',
          }}
        >
          <GitBranch size={12} />
          クリティカルパス
        </button>
      </div>

      {/* Scrollable Gantt body */}
      <div
        ref={scrollRef}
        style={{ flex: 1, overflow: 'auto' }}
      >
        {/* Total content area */}
        <div style={{ minWidth: LEFT_W + totalWidth, position: 'relative' }}>

          {/* ── Header row (sticky top) ── */}
          <div
            style={{
              display: 'flex',
              position: 'sticky',
              top: 0,
              zIndex: 10,
              background: '#172130',
              borderBottom: '1px solid #1F3245',
              height: HEAD_H,
            }}
          >
            {/* Top-left corner: sticky top+left */}
            <div
              style={{
                width: LEFT_W,
                flexShrink: 0,
                position: 'sticky',
                left: 0,
                zIndex: 20,
                background: '#172130',
                borderRight: '1px solid #1F3245',
                display: 'flex',
                alignItems: 'flex-end',
                fontSize: 10,
                letterSpacing: '0.07em',
                textTransform: 'uppercase',
                color: '#3A5070',
              }}
            >
              <div style={{ width: NAME_W, flexShrink: 0, padding: '0 10px 6px' }}>タスク名</div>
              <div style={{
                width: STATUS_W, flexShrink: 0, padding: '0 0 6px',
                textAlign: 'center', borderLeft: '1px solid #182840',
              }}>ステータス</div>
              <div style={{
                width: DATE_W, flexShrink: 0, padding: '0 8px 6px',
                borderLeft: '1px solid #182840',
              }}>日付</div>
            </div>

            {/* Timeline header */}
            <div style={{ position: 'relative', width: totalWidth, height: HEAD_H, flexShrink: 0 }}>
              {/* Month bands */}
              {months.map((m) => {
                const x = Math.max(0, daysBetween(rangeStart, m)) * DAY_W
                const daysInM = new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate()
                return (
                  <div
                    key={m.toISOString()}
                    style={{
                      position: 'absolute',
                      left: x,
                      top: 0,
                      width: daysInM * DAY_W,
                      height: HEAD_H / 2,
                      display: 'flex',
                      alignItems: 'center',
                      paddingLeft: 6,
                      fontSize: 10,
                      color: '#7A96B8',
                      borderLeft: '1px solid #1F3245',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {m.getFullYear()}/{String(m.getMonth() + 1).padStart(2, '0')}月
                  </div>
                )
              })}

              {/* Week ticks (lower half of header) */}
              {weekLines.map((x, i) => (
                <div
                  key={i}
                  style={{
                    position: 'absolute',
                    left: x,
                    top: HEAD_H / 2,
                    bottom: 0,
                    width: 1,
                    background: '#1F3245',
                  }}
                />
              ))}

              {/* Today marker in header */}
              {todayX >= 0 && todayX <= totalWidth && (
                <div
                  style={{
                    position: 'absolute',
                    left: todayX,
                    top: HEAD_H / 2,
                    bottom: 0,
                    width: 2,
                    background: '#F0A500',
                    borderRadius: 1,
                  }}
                />
              )}
            </div>
          </div>

          {/* ── Task rows ── */}
          <div style={{ position: 'relative' }}>

            {/* Dependency arrows SVG (only when critical path is on) */}
            {showCritical && arrows.length > 0 && (
              <svg
                style={{
                  position: 'absolute',
                  top: 0,
                  left: LEFT_W,
                  width: totalWidth,
                  height: rows.length * ROW_H,
                  pointerEvents: 'none',
                  zIndex: 4,
                  overflow: 'visible',
                }}
              >
                <defs>
                  <marker id="arr-crit" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="5" markerHeight="5" orient="auto">
                    <path d="M0,1 L7,4 L0,7 Z" fill="#E3423B" />
                  </marker>
                  <marker id="arr-norm" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="5" markerHeight="5" orient="auto">
                    <path d="M0,1 L7,4 L0,7 Z" fill="#3A5070" />
                  </marker>
                </defs>
                {arrows.map((a, i) => {
                  const mx = a.x1 + Math.min(60, Math.abs(a.x2 - a.x1) * 0.4)
                  return (
                    <path
                      key={i}
                      d={`M${a.x1},${a.y1} C${mx},${a.y1} ${mx},${a.y2} ${a.x2},${a.y2}`}
                      fill="none"
                      stroke={a.critical ? '#E3423B' : '#3A5070'}
                      strokeWidth={a.critical ? 1.5 : 1}
                      strokeDasharray={a.critical ? 'none' : '4,3'}
                      opacity={a.critical ? 0.8 : 0.5}
                      markerEnd={a.critical ? 'url(#arr-crit)' : 'url(#arr-norm)'}
                    />
                  )
                })}
              </svg>
            )}

            {rows.map((task) => {
              const pos = barPos(task)
              const isParent = task.childIds.length > 0
              const isCrit = criticalSet.has(task.id)
              const barColor = isCrit && showCritical ? '#E3423B' : STATUS_COLOR[task.status]
              const leftBg = isParent ? '#111B26' : '#0C1219'

              return (
                <div
                  key={task.id}
                  style={{
                    display: 'flex',
                    height: ROW_H,
                    borderBottom: '1px solid #182840',
                  }}
                >
                  {/* Left cell: sticky left — 3 sub-columns */}
                  <div
                    style={{
                      width: LEFT_W,
                      flexShrink: 0,
                      position: 'sticky',
                      left: 0,
                      zIndex: 5,
                      background: leftBg,
                      borderRight: '1px solid #1F3245',
                      display: 'flex',
                      alignItems: 'center',
                      cursor: 'pointer',
                    }}
                    onClick={() => selectTask(task.id)}
                  >
                    {/* タスク名 */}
                    <div style={{
                      width: NAME_W, flexShrink: 0,
                      display: 'flex', alignItems: 'center',
                      padding: '0 6px 0 10px', gap: 4, overflow: 'hidden',
                    }}>
                      <div style={{ width: task.depth * 14, flexShrink: 0 }} />

                      {isParent ? (
                        <span
                          style={{ color: '#3A5070', display: 'flex', alignItems: 'center', cursor: 'pointer', flexShrink: 0 }}
                          onClick={(e) => { e.stopPropagation(); toggleCollapse(task.id) }}
                        >
                          {collapsed.has(task.id) ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                        </span>
                      ) : (
                        <div style={{ width: 12, flexShrink: 0 }} />
                      )}

                      {showCritical && isCrit && (
                        <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#E3423B', flexShrink: 0 }} />
                      )}

                      <span style={{
                        fontSize: 11.5,
                        color: isParent ? '#D0DCF0' : '#7A96B8',
                        fontWeight: isParent ? 600 : 400,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}>
                        {task.title}
                      </span>
                    </div>

                    {/* ステータスバッジ */}
                    <div style={{
                      width: STATUS_W, flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      borderLeft: '1px solid #182840',
                    }}>
                      {(() => {
                        const b = STATUS_BADGE[task.status]
                        return (
                          <span style={{
                            fontSize: 9.5,
                            fontWeight: 600,
                            padding: '2px 6px',
                            borderRadius: 4,
                            background: b.bg,
                            color: b.text,
                            whiteSpace: 'nowrap',
                            letterSpacing: '0.03em',
                          }}>
                            {b.label}
                          </span>
                        )
                      })()}
                    </div>

                    {/* 日付 */}
                    <div style={{
                      width: DATE_W, flexShrink: 0,
                      display: 'flex', alignItems: 'center',
                      padding: '0 8px',
                      borderLeft: '1px solid #182840',
                      overflow: 'hidden',
                    }}>
                      <span style={{
                        fontSize: 10,
                        color: '#4A6A8A',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}>
                        {task.startDate && task.dueDate
                          ? `${fmtFull(task.startDate)} → ${fmtFull(task.dueDate)}`
                          : '—'
                        }
                      </span>
                    </div>
                  </div>

                  {/* Bar cell */}
                  <div
                    style={{
                      position: 'relative',
                      width: totalWidth,
                      flexShrink: 0,
                      height: ROW_H,
                      background: isParent ? 'rgba(255,255,255,0.008)' : 'transparent',
                    }}
                  >
                    {/* Week grid lines */}
                    {weekLines.map((x, i) => (
                      <div
                        key={i}
                        style={{
                          position: 'absolute',
                          top: 0,
                          bottom: 0,
                          left: x,
                          width: 1,
                          background: '#182840',
                          pointerEvents: 'none',
                        }}
                      />
                    ))}

                    {/* Today line */}
                    {todayX >= 0 && todayX <= totalWidth && (
                      <div
                        style={{
                          position: 'absolute',
                          top: 0,
                          bottom: 0,
                          left: todayX,
                          width: 1,
                          background: '#F0A500',
                          opacity: 0.4,
                          pointerEvents: 'none',
                        }}
                      />
                    )}

                    {/* Bar */}
                    {pos && (
                      <div
                        style={{
                          position: 'absolute',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          left: pos.x,
                          width: pos.w,
                          height: isParent ? 7 : 15,
                          borderRadius: 3,
                          background: barColor,
                          opacity: isParent ? 0.6 : 0.88,
                          cursor: 'pointer',
                          zIndex: 2,
                          boxShadow: isCrit && showCritical ? `0 0 0 1px ${barColor}55` : 'none',
                        }}
                        onClick={() => selectTask(task.id)}
                        title={`${task.title}\n${fmtDate(task.startDate)} → ${fmtDate(task.dueDate)}`}
                      />
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
