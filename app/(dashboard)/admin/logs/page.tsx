'use client'

import React, { useState, useEffect } from 'react'
import styles from './logs.module.css'
import { getAuditLogs } from '@/app/actions/auditActions'
import { Card } from '@/components/ui/Card'

export default function LogsPage() {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    const res = await getAuditLogs()
    if (res.success) setLogs(res.logs)
    setLoading(false)
  }

  const formatDetails = (details: string | null) => {
    if (!details) return '-'
    try {
      const obj = JSON.parse(details)
      return Object.entries(obj).map(([k, v]) => `${k}: ${v}`).join(', ')
    } catch {
      return details
    }
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>📜 Logs do Sistema</h1>
        <p>Monitoramento de ações críticas realizadas por usuários</p>
      </header>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Data/Hora</th>
              <th>Usuário</th>
              <th>Ação</th>
              <th>Entidade</th>
              <th>Detalhes</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{ textAlign: 'center' }}>Carregando logs...</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan={5} style={{ textAlign: 'center' }}>Nenhum log registrado.</td></tr>
            ) : logs.map(log => (
              <tr key={log.id}>
                <td className={styles.dateCell}>
                  {new Date(log.createdAt).toLocaleString('pt-BR')}
                </td>
                <td className={styles.userCell}>{log.user.name}</td>
                <td>
                  <span className={styles.actionBadge}>{log.action}</span>
                </td>
                <td>{log.entity}</td>
                <td className={styles.detailsCell}>{formatDetails(log.details)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
