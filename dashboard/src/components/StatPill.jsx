import React from 'react'

export default function StatPill({ icon: Icon, iconBg, iconColor, value, label, alertColor }) {
  return (
    <div style={{
      background: 'white',
      borderRadius: 20,
      padding: 20,
      boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
      display: 'flex',
      alignItems: 'center',
      gap: 16,
    }}>
      <div style={{
        width: 48,
        height: 48,
        borderRadius: 12,
        background: iconBg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}>
        <Icon size={22} color={iconColor} />
      </div>
      <div>
        <div style={{ fontSize: '1.8rem', fontWeight: 600, color: alertColor, lineHeight: 1.1 }}>{value}</div>
        <div style={{ fontSize: '0.8rem', color: '#9B9B9B', marginTop: 2 }}>{label}</div>
      </div>
    </div>
  )
}
