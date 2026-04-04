import React from 'react'
import { LayoutDashboard, BarChart2, PieChart, Shield, Zap } from 'lucide-react'

const NAV_ITEMS = [
  { id: 'overview', icon: LayoutDashboard, label: 'Overview' },
  { id: 'reports', icon: BarChart2, label: 'Reports' },
  { id: 'quota', icon: PieChart, label: 'Quota' },
  { id: 'audit', icon: Shield, label: 'Audit' },
  { id: 'gateway', icon: Zap, label: 'Gateway' },
]

export default function Sidebar({ active, onNav }) {
  return (
    <div style={{
      width: 72,
      minHeight: '100vh',
      background: '#1A1A2E',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '24px 0',
      position: 'fixed',
      top: 0,
      left: 0,
      zIndex: 100,
    }}>
      <nav style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 32 }}>
        {NAV_ITEMS.map(({ id, icon: Icon, label }) => {
          const isActive = active === id
          return (
            <button
              key={id}
              title={label}
              onClick={() => onNav(id)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                position: 'relative',
                padding: 8,
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon
                size={22}
                color={isActive ? '#FFFFFF' : 'rgba(255,255,255,0.4)'}
              />
              {isActive && (
                <span style={{
                  position: 'absolute',
                  right: 0,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: '#4CAF82',
                }} />
              )}
            </button>
          )
        })}
      </nav>

      <div style={{
        width: 36,
        height: 36,
        borderRadius: '50%',
        background: 'rgba(255,255,255,0.1)',
      }} />
    </div>
  )
}
