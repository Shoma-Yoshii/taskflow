import { useEffect } from 'react'
import { X, CheckCircle, Info, AlertTriangle, AlertCircle } from 'lucide-react'
import { useStore } from '../store'
import type { Toast as ToastType } from '../types'

const COLORS: Record<ToastType['type'], string> = {
  success: '#38C172',
  info: '#4898F2',
  warning: '#F0A500',
  danger: '#E3423B',
}

function ToastItem({ toast }: { toast: ToastType }) {
  const { removeToast } = useStore()
  const color = COLORS[toast.type]

  useEffect(() => {
    const t = setTimeout(() => removeToast(toast.id), 3500)
    return () => clearTimeout(t)
  }, [toast.id, removeToast])

  const Icon =
    toast.type === 'success' ? CheckCircle
    : toast.type === 'warning' ? AlertTriangle
    : toast.type === 'danger' ? AlertCircle
    : Info

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 14px',
        background: '#111B26',
        border: '1px solid #1F3245',
        borderLeft: `3px solid ${color}`,
        borderRadius: 8,
        minWidth: 220,
        maxWidth: 320,
        boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
      }}
    >
      <Icon size={14} color={color} style={{ flexShrink: 0 }} />
      <span style={{ fontSize: 13, color: '#D0DCF0', flex: 1, lineHeight: 1.3 }}>
        {toast.message}
      </span>
      <button
        onClick={() => removeToast(toast.id)}
        style={{
          background: 'none',
          border: 'none',
          color: '#3A5070',
          cursor: 'pointer',
          padding: 0,
          flexShrink: 0,
          lineHeight: 1,
        }}
      >
        <X size={12} />
      </button>
    </div>
  )
}

export default function Toast() {
  const { toasts } = useStore()
  if (toasts.length === 0) return null

  return (
    <div
      style={{
        position: 'fixed',
        top: 68,
        right: 20,
        zIndex: 100,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        pointerEvents: 'none',
      }}
    >
      {toasts.map((t) => (
        <div key={t.id} style={{ pointerEvents: 'auto' }}>
          <ToastItem toast={t} />
        </div>
      ))}
    </div>
  )
}
