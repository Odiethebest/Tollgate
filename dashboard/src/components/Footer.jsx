import React from 'react'

export default function Footer() {
  return (
    <footer style={{
      padding: '24px 32px',
      background: '#F4F4F0',
      borderTop: '1px solid #F0F0EE',
      textAlign: 'center',
      fontSize: '0.8rem',
      color: '#9B9B9B',
    }}>
      © 2026{' '}
      <a
        href="https://odieyang.com"
        target="_blank"
        rel="noopener noreferrer"
        style={{ color: '#9B9B9B', textDecoration: 'none' }}
        onMouseEnter={e => { e.currentTarget.style.color = '#1A1A2E'; e.currentTarget.style.textDecoration = 'underline' }}
        onMouseLeave={e => { e.currentTarget.style.color = '#9B9B9B'; e.currentTarget.style.textDecoration = 'none' }}
      >
        Odie Yang
      </a>
      {' '}· Built with Alex Shao · CS5200 · Northeastern University
    </footer>
  )
}
