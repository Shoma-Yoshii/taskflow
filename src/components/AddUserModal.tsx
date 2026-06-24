import { useState } from 'react'
import { X } from 'lucide-react'
import { useStore } from '../store'
import { nanoid } from '../lib/utils'

const PRESET_COLORS = [
  '#4898F2', '#9B72F0', '#38C172', '#E07830',
  '#2BBFC9', '#F0A500', '#E3423B', '#7A96B8',
]

export default function AddUserModal() {
  const { setAddingUser, addUser } = useStore()
  const [name, setName] = useState('')
  const [initials, setInitials] = useState('')
  const [color, setColor] = useState(PRESET_COLORS[0])
  const [initialsEdited, setInitialsEdited] = useState(false)

  const derivedInitials = name.trim().replace(/\s+/g, '').slice(0, 2)
  const displayInitials = initials || derivedInitials || '?'

  const handleNameChange = (v: string) => {
    setName(v)
    if (!initialsEdited) {
      setInitials(v.trim().replace(/\s+/g, '').slice(0, 2))
    }
  }

  const handleInitialsChange = (v: string) => {
    setInitials(v.slice(0, 2))
    setInitialsEdited(true)
  }

  const handleSubmit = () => {
    if (!name.trim()) return
    addUser({
      id: `u-${nanoid()}`,
      name: name.trim(),
      initials: displayInitials === '?' ? name[0] : displayInitials,
      avatarColor: color,
    })
    setAddingUser(false)
  }

  const label = (text: string) => (
    <div style={{ fontSize: 10, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#3A5070', marginBottom: 6 }}>
      {text}
    </div>
  )

  return (
    <>
      <div
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 60 }}
        onClick={() => setAddingUser(false)}
      />
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 360,
          background: '#111B26',
          border: '1px solid #1F3245',
          borderRadius: 10,
          zIndex: 70,
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '14px 18px',
            borderBottom: '1px solid #1F3245',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span style={{ fontSize: 14, fontWeight: 600, color: '#D0DCF0' }}>担当者を追加</span>
          <button
            onClick={() => setAddingUser(false)}
            style={{ background: 'none', border: 'none', color: '#3A5070', cursor: 'pointer' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: 18 }}>
          {/* Preview */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              padding: '12px 14px',
              borderRadius: 8,
              background: '#172130',
              marginBottom: 18,
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                background: color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 17,
                fontWeight: 700,
                color: '#fff',
                flexShrink: 0,
              }}
            >
              {displayInitials}
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: name ? '#D0DCF0' : '#3A5070' }}>
                {name || '氏名を入力してください'}
              </div>
              <div style={{ fontSize: 11, color: '#3A5070', marginTop: 2 }}>プレビュー</div>
            </div>
          </div>

          {/* Name */}
          <div style={{ marginBottom: 14 }}>
            {label('氏名')}
            <input
              autoFocus
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              placeholder="例: 萩原 勉"
              style={{
                width: '100%',
                background: '#172130',
                border: '1px solid #1F3245',
                borderRadius: 6,
                padding: '7px 11px',
                color: '#D0DCF0',
                fontSize: 13,
                outline: 'none',
                fontFamily: 'inherit',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Initials */}
          <div style={{ marginBottom: 16 }}>
            {label('イニシャル（最大2文字）')}
            <input
              value={initials}
              onChange={(e) => handleInitialsChange(e.target.value)}
              placeholder={derivedInitials || '—'}
              style={{
                width: 64,
                background: '#172130',
                border: '1px solid #1F3245',
                borderRadius: 6,
                padding: '7px 11px',
                color: '#D0DCF0',
                fontSize: 13,
                outline: 'none',
                fontFamily: 'inherit',
                textAlign: 'center',
              }}
            />
          </div>

          {/* Color */}
          <div>
            {label('アバターカラー')}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: '50%',
                    background: c,
                    border: color === c ? '3px solid #D0DCF0' : '3px solid transparent',
                    cursor: 'pointer',
                    padding: 0,
                    outline: color === c ? `2px solid ${c}` : 'none',
                    outlineOffset: 2,
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '12px 18px',
            borderTop: '1px solid #1F3245',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 8,
          }}
        >
          <button
            onClick={() => setAddingUser(false)}
            style={{
              padding: '6px 16px',
              borderRadius: 6,
              border: '1px solid #1F3245',
              background: 'transparent',
              color: '#7A96B8',
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            キャンセル
          </button>
          <button
            onClick={handleSubmit}
            disabled={!name.trim()}
            style={{
              padding: '6px 16px',
              borderRadius: 6,
              border: 'none',
              background: name.trim() ? '#4898F2' : '#1D2A3C',
              color: name.trim() ? '#fff' : '#3A5070',
              fontSize: 13,
              fontWeight: 600,
              cursor: name.trim() ? 'pointer' : 'not-allowed',
            }}
          >
            追加
          </button>
        </div>
      </div>
    </>
  )
}
