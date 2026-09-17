import React from 'react'
import styles from './Badge.module.css'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'success' | 'warning' | 'error' | 'info' | 'gold' | 'neutral'
  className?: string
}

export function Badge({ children, variant = 'gold', className = '' }: BadgeProps) {
  return (
    <span className={`${styles.badge} ${styles[variant]} ${className}`}>
      {children}
    </span>
  )
}
