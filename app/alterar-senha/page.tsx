'use client'

import { useState } from 'react'
import { changePasswordAction } from '@/app/actions/userActions'
import styles from './alterar-senha.module.css'

export default function AlterarSenhaPage() {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (newPassword.length < 6) {
      setError('A nova senha deve ter pelo menos 6 caracteres.')
      setLoading(false)
      return
    }

    if (newPassword !== confirmPassword) {
      setError('A nova senha e a confirmação não conferem.')
      setLoading(false)
      return
    }

    if (currentPassword === newPassword) {
      setError('A nova senha deve ser diferente da senha atual.')
      setLoading(false)
      return
    }

    try {
      const res = await changePasswordAction({ currentPassword, newPassword })
      if (res.error) {
        setError(res.error)
        setLoading(false)
      } else {
        setSuccess(true)
        // Redireciona para o root após 1.5s (o middleware direcionará para /dashboard ou /pos)
        setTimeout(() => {
          window.location.href = '/'
        }, 1500)
      }
    } catch (err) {
      setError('Erro de rede ou comunicação com o servidor.')
      setLoading(false)
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.promoGlow1} />
      <div className={styles.promoGlow2} />

      <div className={styles.card}>
        <div className={styles.headerContainer}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginBottom: '0.2rem' }}>
            <rect width="24" height="24" rx="6" fill="rgba(212, 175, 55, 0.15)" />
            <path d="M12 15V17" stroke="#d4af37" strokeWidth="2" strokeLinecap="round" />
            <path d="M17 11V8C17 5.23858 14.7614 3 12 3C9.23858 3 7 5.23858 7 8V11C5.89543 11 5 11.8954 5 13V18C5 19.1046 5.89543 20 7 20H17C18.1046 20 19 19.1046 19 18V13C19 11.8954 18.1046 11 17 11Z" stroke="#d4af37" strokeWidth="2" strokeLinecap="round" />
            <path d="M10 8C10 6.89543 10.8954 6 12 6C13.1046 6 14 6.89543 14 8" stroke="#d4af37" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <h1 className={styles.title}>Definir Nova Senha</h1>
          <p className={styles.subtitle}>
            Para garantir a segurança da sua conta, você deve alterar a senha temporária registrada pelo administrador antes de prosseguir.
          </p>
        </div>

        {error && <div className={styles.error}>{error}</div>}
        {success && (
          <div className={styles.success}>
            Senha alterada com sucesso! Redirecionando...
          </div>
        )}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.inputGroup}>
            <label htmlFor="currentPassword">Senha Atual</label>
            <div className={styles.passwordWrapper}>
              <input
                id="currentPassword"
                type={showCurrent ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                placeholder="Digite a senha temporária"
                className={styles.passwordInput}
                autoComplete="current-password"
                disabled={success || loading}
              />
              <button
                type="button"
                className={styles.eyeButton}
                onClick={() => setShowCurrent(!showCurrent)}
                title={showCurrent ? 'Ocultar senha' : 'Mostrar senha'}
                aria-label={showCurrent ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {showCurrent ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="newPassword">Nova Senha</label>
            <div className={styles.passwordWrapper}>
              <input
                id="newPassword"
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                placeholder="Crie uma senha forte"
                className={styles.passwordInput}
                autoComplete="new-password"
                disabled={success || loading}
              />
              <button
                type="button"
                className={styles.eyeButton}
                onClick={() => setShowNew(!showNew)}
                title={showNew ? 'Ocultar senha' : 'Mostrar senha'}
                aria-label={showNew ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {showNew ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="confirmPassword">Confirmar Nova Senha</label>
            <div className={styles.passwordWrapper}>
              <input
                id="confirmPassword"
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                placeholder="Repita a nova senha"
                className={styles.passwordInput}
                autoComplete="new-password"
                disabled={success || loading}
              />
              <button
                type="button"
                className={styles.eyeButton}
                onClick={() => setShowConfirm(!showConfirm)}
                title={showConfirm ? 'Ocultar senha' : 'Mostrar senha'}
                aria-label={showConfirm ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {showConfirm ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <div className={styles.requirements}>
            <p>Requisitos da nova senha:</p>
            <ul>
              <li>Mínimo de 6 caracteres</li>
              <li>Deve ser diferente da senha temporária anterior</li>
            </ul>
          </div>

          <button
            type="submit"
            disabled={loading || success}
            className={styles.button}
          >
            {loading ? (
              <>
                <div className={styles.spinner} />
                <span>Atualizando...</span>
              </>
            ) : (
              <span>Confirmar Alteração</span>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
