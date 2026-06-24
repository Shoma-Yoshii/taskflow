import { useStore } from '../store'

export default function FilterBar() {
  const { tags, filterTagIds, filterMode, toggleFilterTag, setFilterMode } = useStore()
  const tagList = Object.values(tags)

  return (
    <div
      style={{
        background: '#111B26',
        borderBottom: '1px solid #182840',
        padding: '8px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        flexShrink: 0,
        flexWrap: 'wrap',
      }}
    >
      <span style={{ fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#3A5070', flexShrink: 0 }}>
        フィルタ
      </span>

      {tagList.map((tag) => {
        const active = filterTagIds.includes(tag.id)
        return (
          <button
            key={tag.id}
            onClick={() => toggleFilterTag(tag.id)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: '3px 9px',
              borderRadius: 12,
              border: active ? `1px solid ${tag.color}55` : '1px solid #1F3245',
              background: active ? `${tag.color}1A` : 'transparent',
              color: active ? tag.color : '#7A96B8',
              fontSize: 11,
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.12s',
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: active ? tag.color : '#3A5070',
                flexShrink: 0,
              }}
            />
            {tag.name}
          </button>
        )
      })}

      {filterTagIds.length > 1 && (
        <div
          style={{
            marginLeft: 4,
            display: 'flex',
            background: '#0C1219',
            border: '1px solid #1F3245',
            borderRadius: 6,
            padding: 2,
            gap: 2,
          }}
        >
          {(['AND', 'OR'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setFilterMode(m)}
              style={{
                padding: '2px 8px',
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

      {filterTagIds.length > 0 && (
        <button
          onClick={() => filterTagIds.forEach((id) => toggleFilterTag(id))}
          style={{
            marginLeft: 2,
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
  )
}
