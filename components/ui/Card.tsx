import React from 'react';
import styles from './Card.module.css';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  title?: string;
  className?: string;
}

export function Card({ 
  children, 
  title,
  className = '', 
  ...props 
}: CardProps) {
  return (
    <div className={`${styles.card} ${className}`} {...props}>
      {title && <h3 className={styles.cardTitle}>{title}</h3>}
      {children}
    </div>
  )
}
