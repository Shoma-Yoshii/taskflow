import { useStore } from './store'
import Header from './components/Header'
import FilterBar from './components/FilterBar'
import KanbanView from './components/KanbanView'
import GanttView from './components/GanttView'
import TaskDetail from './components/TaskDetail'
import AddTaskModal from './components/AddTaskModal'
import AddUserModal from './components/AddUserModal'
import Toast from './components/Toast'

export default function App() {
  const { view, selectedTaskId, addingStatus, addingUser } = useStore()

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
        {view === 'kanban' ? <KanbanView /> : <GanttView />}
      </div>
      {selectedTaskId && <TaskDetail />}
      {addingStatus !== null && <AddTaskModal />}
      {addingUser && <AddUserModal />}
      <Toast />
    </div>
  )
}
