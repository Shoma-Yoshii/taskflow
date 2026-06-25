import { useEffect } from 'react'
import { useStore } from './store'
import Header from './components/Header'
import FilterBar from './components/FilterBar'
import KanbanView from './components/KanbanView'
import GanttView from './components/GanttView'
import ListView from './components/ListView'
import TaskDetail from './components/TaskDetail'
import AddTaskModal from './components/AddTaskModal'
import AddUserModal from './components/AddUserModal'
import Toast from './components/Toast'

function LoadingScreen() {
  return (
    <div
      style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0C1219',
        gap: 12,
      }}
    >
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
        <circle cx="16" cy="16" r="14" stroke="#1F3245" strokeWidth="3" />
        <path d="M16 2 a14 14 0 0 1 14 14" stroke="#4898F2" strokeWidth="3" strokeLinecap="round">
          <animateTransform
            attributeName="transform"
            type="rotate"
            from="0 16 16"
            to="360 16 16"
            dur="0.8s"
            repeatCount="indefinite"
          />
        </path>
      </svg>
      <span style={{ color: '#3A5070', fontSize: 13 }}>読み込み中...</span>
    </div>
  )
}

export default function App() {
  const { view, selectedTaskId, addingStatus, addingUser, initialized, initialize } = useStore()

  useEffect(() => {
    initialize()
  }, [])

  if (!initialized) return <LoadingScreen />

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        background: '#0C1219',
        overflow: 'hidden',
      }}
    >
      <Header />
      <FilterBar />
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {view === 'kanban' ? <KanbanView /> : view === 'gantt' ? <GanttView /> : <ListView />}
      </div>
      {selectedTaskId && <TaskDetail />}
      {addingStatus !== null && <AddTaskModal />}
      {addingUser && <AddUserModal />}
      <Toast />
    </div>
  )
}
