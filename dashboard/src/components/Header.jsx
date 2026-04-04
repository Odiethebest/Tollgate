import React, { useState, useEffect } from 'react'
import { Hexagon } from 'lucide-react'

const SECTIONS = [
  { id: 'overview', label: 'Overview' },
  { id: 'quota',    label: 'Quota'    },
  { id: 'models',   label: 'Models'   },
  { id: 'audit',    label: 'Audit'    },
  { id: 'gateway',  label: 'Gateway'  },
]

export default function Header({ onTryIt }) {
  const [active, setActive] = useState('overview')

  useEffect(() => {
    const observers = SECTIONS.map(({ id }) => {
      const el = document.getElementById(id)
      if (!el) return null
      const obs = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setActive(id) },
        { threshold: 0.3, rootMargin: '-64px 0px 0px 0px' }
      )
      obs.observe(el)
      return obs
    })
    return () => observers.forEach(o => o?.disconnect())
  }, [])

  const handleNavClick = (e, id) => {
    e.preventDefault()
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ behavior: 'smooth' })
    setActive(id)
  }

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
          style={{
            fontSize: '0.75rem',
            color: '#9B9B9B',
            textDecoration: 'none',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = '#1A1A2E'; e.currentTarget.style.textDecoration = 'underline' }}
          onMouseLeave={e => { e.currentTarget.style.color = '#9B9B9B'; e.currentTarget.style.textDecoration = 'none' }}
        >
          by Odie Yang ↗
        </a>
      </div>

      {/* Center — section anchors, absolutely centered */}
      <nav style={{
        position: 'absolute',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: 28,
        alignItems: 'center',
      }}>
        {SECTIONS.map(({ id, label }) => (
          <a
            key={id}
            href={`#${id}`}
            onClick={e => handleNavClick(e, id)}
            style={{
              fontSize: '0.85rem',
              fontWeight: 500,
              color: active === id ? '#1A1A2E' : '#9B9B9B',
              textDecoration: 'none',
              paddingBottom: 2,
              borderBottom: active === id ? '2px solid #FF6B6B' : '2px solid transparent',
              transition: 'color 150ms, border-color 150ms',
            }}
            onMouseEnter={e => { if (active !== id) e.currentTarget.style.color = '#1A1A2E' }}
            onMouseLeave={e => { if (active !== id) e.currentTarget.style.color = '#9B9B9B' }}
          >
            {label}
          </a>
        ))}
      </nav>

      {/* Right — CTA */}
      <div style={{ marginLeft: 'auto', flexShrink: 0 }}>
        <button
          onClick={onTryIt}
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
