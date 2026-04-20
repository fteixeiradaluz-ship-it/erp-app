'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
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
  const router = useRouter()

  useEffect(() => {
     async function fetchLogo() {
        const res = await getPublicSettings()
        if (res.success && res.settings) {
           if (res.settings.companyLogo) setLogo(res.settings.companyLogo)
           if (res.settings.companyName) setCompanyName(res.settings.companyName)
        }
     }
     fetchLogo()
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
      if (result?.role === 'ADMIN') {
         router.push('/dashboard')
      } else {
         router.push('/pos')
      }
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.logoContainer} style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
           {logo ? (
             <img src={logo} alt="Company Logo" style={{ maxHeight: '80px', maxWidth: '200px', objectFit: 'contain', margin: '0 auto' }} />
           ) : (
             <h1 className={styles.title}>{companyName}</h1>
           )}
           {logo && <h2 className={styles.companySubTitle} style={{ fontSize: '1.2rem', marginTop: '0.5rem', opacity: 0.8 }}>{companyName}</h2>}
        </div>
        {!logo && <p className={styles.subtitle}>Acesso Restrito</p>}
        
        {error && <div className={styles.error}>{error}</div>}
        
        <form onSubmit={handleLogin} className={styles.form}>
          <div className={styles.inputGroup}>
            <label htmlFor="email">E-mail</label>
            <input 
              id="email"
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
              placeholder="admin@erp.com"
            />
          </div>
          <div className={styles.inputGroup}>
            <label htmlFor="password">Senha</label>
            <input 
              id="password"
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
              placeholder="••••••••"
            />
          </div>
          <button type="submit" disabled={loading} className={styles.button}>
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}
