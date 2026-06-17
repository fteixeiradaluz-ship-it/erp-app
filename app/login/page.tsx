'use client'

import { useState, useEffect } from 'react'
import { loginAction } from '@/app/actions/authActions'
import { getPublicSettings } from '@/app/actions/settingsActions'
import styles from './login.module.css'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [logo, setLogo] = useState<string | null>(null)
  const [companyName, setCompanyName] = useState('Sistema ERP')
  const [showPassword, setShowPassword] = useState(false)
  const [showForgotModal, setShowForgotModal] = useState(false)
  const [greeting, setGreeting] = useState('Olá!')
  const [loadingLogo, setLoadingLogo] = useState(true)

  useEffect(() => {
    async function fetchLogo() {
      try {
        const res = await getPublicSettings()
        if (res.success && res.settings) {
          if (res.settings.companyLogo) setLogo(res.settings.companyLogo)
          if (res.settings.companyName) setCompanyName(res.settings.companyName)
        }
      } catch (e) {
        console.error(e)
      } finally {
        setLoadingLogo(false)
      }
    }
    fetchLogo()

    // Saudação dinâmica com base no horário
    const hour = new Date().getHours()
    if (hour >= 5 && hour < 12) {
      setGreeting('Bom dia!')
    } else if (hour >= 12 && hour < 18) {
      setGreeting('Boa tarde!')
    } else {
      setGreeting('Boa noite!')
    }
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const result = await loginAction(email, password)
    
    if (result?.error) {
      setError(result.error)
      setLoading(false)
    } else {
      // Usando window.location.href para forçar recarregamento completo da página,
      // garantindo que os cookies sejam registrados imediatamente pelo middleware no Next.js
      if (result?.role === 'ADMIN') {
        window.location.href = '/dashboard'
      } else {
        window.location.href = '/pos'
      }
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.promoGlow1} />
      <div className={styles.promoGlow2} />

      <div className={styles.card}>
        <div className={styles.logoContainer}>
          {loadingLogo ? (
            <div style={{ height: '80px', width: '280px' }} />
          ) : logo ? (
            <img 
              src={logo} 
              alt="Logo da Empresa" 
              style={{ maxHeight: '120px', maxWidth: '280px', objectFit: 'contain' }} 
            />
          ) : (
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginBottom: '0.5rem' }}>
              <rect width="24" height="24" rx="6" fill="rgba(212, 175, 55, 0.15)" />
              <path d="M12 7L6 10L12 13L18 10L12 7Z" fill="#d4af37" />
              <path d="M6 14L12 17L18 14" stroke="#d4af37" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
          <h1 className={styles.title}>{greeting}</h1>
          <p className={styles.subtitle}>Seja bem-vindo ao {companyName}</p>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        <form onSubmit={handleLogin} className={styles.form}>
          <div className={styles.inputGroup}>
            <label htmlFor="email">E-mail Corporativo</label>
            <input 
              id="email"
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
              placeholder="nome@empresa.com"
              autoComplete="email"
            />
          </div>

          <div className={styles.inputGroup}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label htmlFor="password">Senha de Acesso</label>
              <button 
                type="button" 
                onClick={() => setShowForgotModal(true)} 
                className={styles.forgotPasswordLink}
              >
                Esqueci a senha
              </button>
            </div>
            <div className={styles.passwordWrapper}>
              <input 
                id="password"
                type={showPassword ? 'text' : 'password'} 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required 
                placeholder="••••••••"
                className={styles.passwordInput}
                autoComplete="current-password"
              />
              <button
                type="button"
                className={styles.eyeButton}
                onClick={() => setShowPassword(!showPassword)}
                title={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {showPassword ? (
                  // Olho aberto SVG
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                ) : (
                  // Olho fechado (com risco) SVG
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading} className={styles.button}>
            {loading ? (
              <>
                <div className={styles.spinner} />
                <span>Entrando...</span>
              </>
            ) : (
              <span>Entrar no Sistema</span>
            )}
          </button>
        </form>
      </div>

      {/* MODAL ESQUECI A SENHA */}
      {showForgotModal && (
        <div className={styles.modalOverlay} onClick={() => setShowForgotModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <button 
              className={styles.modalCloseBtn} 
              onClick={() => setShowForgotModal(false)}
              aria-label="Fechar"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

            <div className={styles.modalHeader}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.5rem' }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#d4af37" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </div>
              <h2 className={styles.modalTitle}>Esqueceu sua senha?</h2>
              <p className={styles.modalDesc}>Por motivos de segurança corporativa e auditoria, siga as instruções abaixo para recuperar seu acesso:</p>
            </div>

            <div className={styles.modalDivider} />

            <div className={styles.modalBody}>
              <div className={styles.modalInstructionCard}>
                <div className={styles.modalInstructionItem}>
                  <span className={styles.modalInstructionIcon}>1.</span>
                  <p className={styles.modalInstructionText}>
                    <strong>Procure a Administração:</strong> Entre em contato direto com o administrador ou setor de TI da sua empresa.
                  </p>
                </div>
                <div className={styles.modalInstructionItem}>
                  <span className={styles.modalInstructionIcon}>2.</span>
                  <p className={styles.modalInstructionText}>
                    <strong>Redefinição Segura:</strong> O administrador pode redefinir sua credencial por meio do painel de usuários (`Configurações &rsaquo; Usuários`).
                  </p>
                </div>
                <div className={styles.modalInstructionItem}>
                  <span className={styles.modalInstructionIcon}>3.</span>
                  <p className={styles.modalInstructionText}>
                    <strong>Novo Acesso:</strong> Uma senha temporária será gerada para que você possa efetuar o login e alterá-la no seu primeiro acesso.
                  </p>
                </div>
              </div>

              <button 
                type="button" 
                className={styles.modalActionBtn} 
                onClick={() => setShowForgotModal(false)}
              >
                Entendi, Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
