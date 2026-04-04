import React from 'react'
import { Hexagon } from 'lucide-react'

const SECTIONS = [
  { id: 'overview', label: 'Overview' },
  { id: 'quota',    label: 'Quota'    },
  { id: 'models',   label: 'Models'   },
  { id: 'audit',    label: 'Audit'    },
  { id: 'gateway',  label: 'Gateway'  },
]

export default function Header({ activePage, setActivePage }) {
  return (
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 100,
      height: 64,
      background: '#FFFFFF',
      borderBottom: '1px solid #F0F0EE',
      display: 'flex',
      alignItems: 'center',
      padding: '0 32px',
    }}>

      {/* Left — logo + credit */}
      <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
        <Hexagon size={20} fill="#FF6B6B" stroke="none" />
        <span style={{
          fontSize: '1.1rem',
          fontWeight: 700,
          color: '#1A1A2E',
          marginLeft: 8,
        }}>
          Tollgate
        </span>
        <span style={{ color: '#E0E0E0', margin: '0 10px', fontWeight: 300 }}>|</span>
        <a
          href="https://odieyang.com"
          target="_blank"
          rel="noopener noreferrer"
          style={{ fontSize: '0.75rem', color: '#9B9B9B', textDecoration: 'none' }}
          onMouseEnter={e => { e.currentTarget.style.color = '#1A1A2E'; e.currentTarget.style.textDecoration = 'underline' }}
          onMouseLeave={e => { e.currentTarget.style.color = '#9B9B9B'; e.currentTarget.style.textDecoration = 'none' }}
        >
          by Odie Yang ↗
        </a>
      </div>

      {/* Center — section nav, absolutely centered */}
      <nav style={{
        position: 'absolute',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: 28,
        alignItems: 'center',
      }}>
        {SECTIONS.map(({ id, label }) => {
          const isActive = activePage === id
          return (
            <button
              key={id}
              onClick={() => setActivePage(id)}
              style={{
                background: 'none',
                border: 'none',
                borderBottom: isActive ? '2px solid #FF6B6B' : '2px solid transparent',
                cursor: 'pointer',
                fontSize: '0.85rem',
                fontWeight: 500,
                color: isActive ? '#1A1A2E' : '#9B9B9B',
                paddingBottom: 2,
                transition: 'color 150ms, border-color 150ms',
              }}
              onMouseEnter={e => { if (!isActive) e.currentTarget.style.color = '#1A1A2E' }}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.color = '#9B9B9B' }}
            >
              {label}
            </button>
          )
        })}
      </nav>

      {/* Right — CTA */}
      <div style={{ marginLeft: 'auto', flexShrink: 0 }}>
        <button
          onClick={() => setActivePage('gateway')}
          style={{
            background: 'linear-gradient(135deg, #FF6B6B, #FF8E53)',
            color: 'white',
            fontSize: '0.85rem',
            fontWeight: 600,
            padding: '8px 20px',
            borderRadius: 20,
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 2px 12px rgba(255,107,107,0.35)',
            transition: 'opacity 150ms, box-shadow 150ms',
          }}
          onMouseEnter={e => { e.currentTarget.style.opacity = '0.9'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(255,107,107,0.45)' }}
          onMouseLeave={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.boxShadow = '0 2px 12px rgba(255,107,107,0.35)' }}
        >
          Try It →
        </button>
      </div>
    </header>
  )
}
