import { LayoutGrid, GanttChart } from 'lucide-react'
import { useStore } from '../store'

export default function Header() {
  const { view, setView } = useStore()

  return (
    <header
      style={{
        background: '#111B26',
        borderBottom: '1px solid #1F3245',
        padding: '0 20px',
        height: 52,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#F0A500' }}>
          ABDI
        </span>
        <span style={{ color: '#1F3245' }}>|</span>
        <span style={{ fontSize: 14, fontWeight: 600, color: '#D0DCF0' }}>推進タスク管理</span>
      </div>

      <div
        style={{
          display: 'flex',
          background: '#0C1219',
          border: '1px solid #1F3245',
          borderRadius: 8,
          padding: 3,
          gap: 2,
        }}
      >
        {([
          { id: 'kanban', label: 'カンバン', Icon: LayoutGrid },
          { id: 'gantt', label: 'ガント', Icon: GanttChart },
        ] as const).map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setView(id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: '4px 12px',
              borderRadius: 5,
              border: 'none',
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 500,
              transition: 'all 0.15s',
              background: view === id ? '#1D2A3C' : 'transparent',
              color: view === id ? '#D0DCF0' : '#7A96B8',
            }}
          >
            <Icon size={13} />
            {label}
          </button>
        ))}
      </div>
    </header>
  )
}
