import React from 'react';
import styles from './Card.module.css';

export function Card({ 
  children, 
  title,
  className = '', 
  style 
}: { 
  children: React.ReactNode, 
  title?: string,
  className?: string, 
  style?: React.CSSProperties 
}) {
  return (
    <div className={`${styles.card} ${className}`} style={style}>
      {title && <h3 className={styles.cardTitle}>{title}</h3>}
      {children}
    </div>
  )
}
