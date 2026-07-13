import { useState, useRef, useEffect } from 'react'
import { ChevronRight, ChevronDown, GitBranch } from 'lucide-react'
import { useStore } from '../store'
import type { Task } from '../types'
import { STATUS_COLOR, fmtDate } from '../lib/utils'

// ── Constants ─────────────────────────────────────────────
const DAY_W    = 22
const ROW_H    = 40
const NAME_W   = 190
const ASSIGN_W = 78
const STATUS_W = 68
const LEFT_W   = NAME_W + ASSIGN_W + STATUS_W
const MONTH_H  = 36
const WEEK_H   = 28
const HEAD_H   = MONTH_H + WEEK_H
const DAY_MS   = 86400000

const STATUS_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  todo:        { bg: '#1A2535', text: '#7A96B8', label: '未着手'  },
  in_progress: { bg: '#0D2240', text: '#4898F2', label: '進行中'  },
  review:      { bg: '#2A1E00', text: '#F0A500', label: 'レビュー' },
  done:        { bg: '#0A2015', text: '#38C172', label: '完了'    },
}

const STATUS_INFO = [
  { key: 'todo'       , label: '未着手',   color: '#7A96B8' },
  { key: 'in_progress', label: '進行中',   color: '#4898F2' },
  { key: 'review'     , label: 'レビュー', color: '#F0A500' },
  { key: 'done'       , label: '完了',     color: '#38C172' },
] as const

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
  const { tasks, users, selectTask } = useStore()
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [showCritical, setShowCritical] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const rangeStart = new Date(today.getFullYear(), today.getMonth() - 2, 1)
  const rangeEnd   = new Date(today.getFullYear(), today.getMonth() + 11, 0)
  const totalDays  = daysBetween(rangeStart, rangeEnd) + 1
  const totalWidth = totalDays * DAY_W

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

  const weekTicks: { x: number; date: Date }[] = []
  let wcur = addDays(rangeStart, (7 - rangeStart.getDay()) % 7)
  while (wcur < rangeEnd) {
    weekTicks.push({ x: daysBetween(rangeStart, wcur) * DAY_W, date: new Date(wcur) })
    wcur = addDays(wcur, 7)
  }

  const barPos = (task: Task) => {
    if (!task.startDate || !task.dueDate) return null
    const x  = Math.max(0, daysBetween(rangeStart, new Date(task.startDate))) * DAY_W
    const x2 = Math.min(totalDays, daysBetween(rangeStart, new Date(task.dueDate)) + 1) * DAY_W
    return { x, w: Math.max(DAY_W * 0.5, x2 - x) }
  }

  const rowIdx = new Map(rows.map((t, i) => [t.id, i]))

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

  // Stats: count leaf tasks by status
  const counts = { todo: 0, in_progress: 0, review: 0, done: 0 }
  Object.values(tasks)
    .filter((t) => t.childIds.length === 0)
    .forEach((t) => { counts[t.status]++ })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: '#0C1219' }}>

      {/* Toolbar + Stats */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '0 14px',
          height: 38,
          background: '#0C1219',
          borderBottom: '1px solid #182840',
          flexShrink: 0,
          gap: 16,
        }}
      >
        {/* Status counts */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1 }}>
          {STATUS_INFO.map(({ key, label, color }) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{
                width: 7, height: 7, borderRadius: '50%',
                background: color, flexShrink: 0,
              }} />
              <span style={{ fontSize: 11, color: '#4A6A8A' }}>{label}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color }}>
                {counts[key as keyof typeof counts]}
              </span>
            </div>
          ))}
        </div>

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
      <div ref={scrollRef} style={{ flex: 1, overflow: 'auto' }}>
        <div style={{ minWidth: LEFT_W + totalWidth, position: 'relative' }}>

          {/* ── Header (sticky top) ── */}
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
            {/* Corner: sticky top+left */}
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
                width: ASSIGN_W, flexShrink: 0, padding: '0 0 6px',
                textAlign: 'center', borderLeft: '1px solid #182840',
              }}>担当</div>
              <div style={{
                width: STATUS_W, flexShrink: 0, padding: '0 0 6px',
                textAlign: 'center', borderLeft: '1px solid #182840',
              }}>状態</div>
            </div>

            {/* Timeline header */}
            <div style={{ position: 'relative', width: totalWidth, height: HEAD_H, flexShrink: 0 }}>

              {/* Month labels */}
              {months.map((m, mi) => {
                const x = Math.max(0, daysBetween(rangeStart, m)) * DAY_W
                const daysInM = new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate()
                const isCurrent = m.getFullYear() === today.getFullYear() && m.getMonth() === today.getMonth()
                const showYear  = mi === 0 || m.getFullYear() !== months[mi - 1].getFullYear()
                return (
                  <div
                    key={m.toISOString()}
                    style={{
                      position: 'absolute',
                      left: x, top: 0,
                      width: daysInM * DAY_W,
                      height: MONTH_H,
                      display: 'flex',
                      alignItems: 'center',
                      paddingLeft: 8,
                      gap: 5,
                      borderLeft: '1px solid #1F3245',
                      background: isCurrent ? 'rgba(240,165,0,0.06)' : 'transparent',
                      overflow: 'hidden',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {showYear && (
                      <span style={{ fontSize: 9, color: '#2A3F55', fontWeight: 600, letterSpacing: '0.06em', flexShrink: 0 }}>
                        {m.getFullYear()}
                      </span>
                    )}
                    <span style={{
                      fontSize: 12,
                      fontWeight: isCurrent ? 700 : 500,
                      color: isCurrent ? '#F0A500' : '#7A96B8',
                      letterSpacing: '0.02em',
                    }}>
                      {String(m.getMonth() + 1).padStart(2, '0')}月
                    </span>
                  </div>
                )
              })}

              <div style={{ position: 'absolute', left: 0, right: 0, top: MONTH_H, height: 1, background: '#1F3245' }} />

              {/* Week ticks */}
              {weekTicks.map(({ x, date }, i) => {
                const isThisWeek = today >= date && today < addDays(date, 7)
                return (
                  <div key={i}>
                    <div style={{
                      position: 'absolute',
                      left: x, top: MONTH_H, bottom: 0,
                      width: 1, background: '#1A2A3C',
                    }} />
                    <div style={{
                      position: 'absolute',
                      left: x + 4,
                      top: MONTH_H + 7,
                      fontSize: 9,
                      fontWeight: isThisWeek ? 700 : 400,
                      color: isThisWeek ? '#F0A500' : '#2E4460',
                      lineHeight: 1,
                      userSelect: 'none',
                      pointerEvents: 'none',
                    }}>
                      {date.getDate()}
                    </div>
                  </div>
                )
              })}

              {/* Today marker */}
              {todayX >= 0 && todayX <= totalWidth && (
                <>
                  <div style={{
                    position: 'absolute',
                    left: todayX, top: 0, bottom: 0,
                    width: 2, background: '#F0A500', opacity: 0.9, borderRadius: 1,
                    zIndex: 3,
                  }} />
                  <div style={{
                    position: 'absolute',
                    left: todayX,
                    top: MONTH_H + 6,
                    transform: 'translateX(-50%)',
                    background: '#F0A500',
                    color: '#0C1219',
                    fontSize: 7.5,
                    fontWeight: 800,
                    padding: '1px 4px',
                    borderRadius: 3,
                    letterSpacing: '0.04em',
                    whiteSpace: 'nowrap',
                    lineHeight: 1.5,
                    zIndex: 4,
                    pointerEvents: 'none',
                  }}>
                    今日
                  </div>
                </>
              )}
            </div>
          </div>

          {/* ── Task rows ── */}
          <div style={{ position: 'relative' }}>

            {/* Dependency arrows */}
            {showCritical && arrows.length > 0 && (
              <svg style={{
                position: 'absolute',
                top: 0, left: LEFT_W,
                width: totalWidth,
                height: rows.length * ROW_H,
                pointerEvents: 'none',
                zIndex: 4,
                overflow: 'visible',
              }}>
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
              const isPhase  = task.depth === 0
              const isCrit   = criticalSet.has(task.id)
              const barColor = isCrit && showCritical ? '#E3423B' : STATUS_COLOR[task.status]

              const leftBg  = isPhase ? '#141F2E' : isParent ? '#111B26' : '#0C1219'
              const ganttBg = isPhase ? 'rgba(20,31,46,0.6)' : isParent ? 'rgba(255,255,255,0.008)' : 'transparent'

              const firstAssignee  = task.assigneeIds[0] ? users[task.assigneeIds[0]]  : null
              const secondAssignee = task.assigneeIds[1] ? users[task.assigneeIds[1]] : null

              // Bar label: show title + first assignee name when bar is wide enough
              const barLabel = !isParent && pos && pos.w > 44
                ? (firstAssignee ? `${task.title}・${firstAssignee.name}` : task.title)
                : null

              return (
                <div
                  key={task.id}
                  style={{
                    display: 'flex',
                    height: ROW_H,
                    borderBottom: `1px solid ${isPhase ? '#1C2D40' : '#182840'}`,
                  }}
                >
                  {/* Left panel */}
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
                    {/* Phase accent stripe */}
                    {isPhase && (
                      <div style={{ width: 3, alignSelf: 'stretch', background: '#2A4870', flexShrink: 0 }} />
                    )}

                    {/* タスク名 */}
                    <div style={{
                      width: isPhase ? NAME_W - 3 : NAME_W,
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      padding: '0 6px 0 10px',
                      gap: 4,
                      overflow: 'hidden',
                    }}>
                      <div style={{ width: task.depth * 14, flexShrink: 0 }} />

                      {isParent ? (
                        <span
                          style={{
                            color: isPhase ? '#5A7A9A' : '#3A5070',
                            display: 'flex',
                            alignItems: 'center',
                            cursor: 'pointer',
                            flexShrink: 0,
                          }}
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
                        fontSize: isPhase ? 12 : 11.5,
                        color: isPhase ? '#C8D8EC' : isParent ? '#D0DCF0' : '#7A96B8',
                        fontWeight: isPhase ? 700 : isParent ? 600 : 400,
                        letterSpacing: isPhase ? '0.02em' : 0,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}>
                        {task.title}
                      </span>
                    </div>

                    {/* 担当 */}
                    <div style={{
                      width: ASSIGN_W,
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 3,
                      borderLeft: '1px solid #182840',
                    }}>
                      {!isParent && (
                        <>
                          {firstAssignee && (
                            <span
                              title={firstAssignee.name}
                              style={{
                                width: 22, height: 22,
                                borderRadius: '50%',
                                background: firstAssignee.avatarColor,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 8,
                                fontWeight: 700,
                                color: '#fff',
                                flexShrink: 0,
                              }}
                            >
                              {firstAssignee.initials}
                            </span>
                          )}
                          {secondAssignee && (
                            <span
                              title={secondAssignee.name}
                              style={{
                                width: 22, height: 22,
                                borderRadius: '50%',
                                background: secondAssignee.avatarColor,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 8,
                                fontWeight: 700,
                                color: '#fff',
                                flexShrink: 0,
                              }}
                            >
                              {secondAssignee.initials}
                            </span>
                          )}
                          {!firstAssignee && (
                            <span style={{ fontSize: 10, color: '#2A3F55' }}>—</span>
                          )}
                        </>
                      )}
                    </div>

                    {/* 状態バッジ */}
                    <div style={{
                      width: STATUS_W,
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderLeft: '1px solid #182840',
                    }}>
                      {!isParent && (() => {
                        const b = STATUS_BADGE[task.status]
                        return (
                          <span style={{
                            fontSize: 9.5,
                            fontWeight: 600,
                            padding: '2px 7px',
                            borderRadius: 10,
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
                  </div>

                  {/* Gantt bar cell */}
                  <div
                    style={{
                      position: 'relative',
                      width: totalWidth,
                      flexShrink: 0,
                      height: ROW_H,
                      background: ganttBg,
                    }}
                  >
                    {/* Week grid lines */}
                    {weekTicks.map(({ x }, i) => (
                      <div key={i} style={{
                        position: 'absolute',
                        top: 0, bottom: 0, left: x,
                        width: 1, background: '#182840',
                        pointerEvents: 'none',
                      }} />
                    ))}

                    {/* Today line */}
                    {todayX >= 0 && todayX <= totalWidth && (
                      <div style={{
                        position: 'absolute',
                        top: 0, bottom: 0, left: todayX,
                        width: 1, background: '#F0A500', opacity: 0.4,
                        pointerEvents: 'none',
                      }} />
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
                          height: isParent ? 6 : 20,
                          borderRadius: isParent ? 2 : 4,
                          background: barColor,
                          opacity: isParent ? 0.5 : 0.88,
                          cursor: 'pointer',
                          zIndex: 2,
                          display: 'flex',
                          alignItems: 'center',
                          overflow: 'hidden',
                          boxShadow: isCrit && showCritical ? `0 0 0 1px ${barColor}55` : 'none',
                        }}
                        onClick={() => selectTask(task.id)}
                        title={`${task.title}\n${fmtDate(task.startDate)} → ${fmtDate(task.dueDate)}`}
                      >
                        {barLabel && (
                          <span style={{
                            fontSize: 9,
                            fontWeight: 600,
                            color: 'rgba(255,255,255,0.92)',
                            paddingLeft: 6,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            lineHeight: 1,
                            pointerEvents: 'none',
                            flexShrink: 0,
                          }}>
                            {barLabel}
                          </span>
                        )}
                      </div>
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
