import React from 'react'
import styles from './Skeleton.module.css'

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  width?: string | number
  height?: string | number
  borderRadius?: string | number
  className?: string
}

export function Skeleton({
  width = '100%',
  height = '20px',
  borderRadius = '8px',
  className = '',
  style,
  ...props
}: SkeletonProps) {
  return (
    <div
      className={`${styles.skeleton} ${className}`}
      style={{
        width,
        height,
        borderRadius,
        ...style
      }}
      {...props}
    />
  )
}
