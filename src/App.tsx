import { useStore } from './store'
import Header from './components/Header'
import FilterBar from './components/FilterBar'
import KanbanView from './components/KanbanView'
import GanttView from './components/GanttView'
import TaskDetail from './components/TaskDetail'
import AddTaskModal from './components/AddTaskModal'

export default function App() {
  const { view, selectedTaskId, addingStatus } = useStore()

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
    </div>
  )
}
