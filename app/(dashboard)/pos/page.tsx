'use client'

import { useState, useEffect, Suspense } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { getPOSData, submitSale } from '@/app/actions/saleActions'
import { getSettings } from '@/app/actions/settingsActions'
import { useSearchParams } from 'next/navigation'
import styles from './pos.module.css'
import rStyles from './receipt.module.css'

type Product = { id: string; name: string; price: number; stock: number; type: string; }
type Customer = { id: string; name: string; }
type CartItem = Product & { quantity: number; }
type Bank = { id: string; name: string; balance: number; }

export default function POSPage() {
  return (
    <Suspense fallback={<div style={{ padding: '2rem', textAlign: 'center' }}>Carregando PDV...</div>}>
      <POSPageContent />
    </Suspense>
  )
}

function POSPageContent() {
  const [products, setProducts] = useState<Product[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('PIX')
  const [installments, setInstallments] = useState(1)
  const [discount, setDiscount] = useState(0)
  
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [saleResult, setSaleResult] = useState<any>(null)
  const [settings, setSettings] = useState<any>(null)
  const [banks, setBanks] = useState<Bank[]>([])
  const [selectedBank, setSelectedBank] = useState<string>('')

  // Prepayment / Signal state from appointment
  const [depositAmount, setDepositAmount] = useState(0)
  const [depositMethod, setDepositMethod] = useState('')
  const [appointmentId, setAppointmentId] = useState<string | null>(null)

  const searchParams = useSearchParams()
  const paramCustomerId = searchParams.get('customerId')
  const paramAppointmentId = searchParams.get('appointmentId')

  useEffect(() => {
    Promise.all([getPOSData(), getSettings()]).then(([posData, settingsData]) => {
      const loadedProducts = (posData.products || []) as Product[]
      setProducts(loadedProducts)
      setCustomers(posData.customers)
      const loadedBanks = (posData.banks || []) as Bank[]
      setBanks(loadedBanks)
      if (loadedBanks.length > 0) {
        setSelectedBank(loadedBanks[0].id)
      }
      if (settingsData.success) setSettings(settingsData.settings)
      
      // Auto-select customer from query param
      if (paramCustomerId) {
        setSelectedCustomer(paramCustomerId)
      }
      
      setLoading(false)
    })
  }, [paramCustomerId])

  // Load appointment details for deposits if appointmentId exists
  useEffect(() => {
    if (paramAppointmentId) {
      import('@/app/actions/appointmentActions').then(({ getAppointmentById }) => {
        getAppointmentById(paramAppointmentId).then(res => {
          if (res.success && res.appointment) {
            setDepositAmount(res.appointment.depositAmount || 0)
            setDepositMethod(res.appointment.depositMethod || '')
            setAppointmentId(paramAppointmentId)
          }
        })
      })
    }
  }, [paramAppointmentId])

  // Auto-add service (Consulta) if faturando from Agenda
  useEffect(() => {
    if (products.length > 0 && paramAppointmentId && !loading) {
      const serviceItem = products.find(p => p.type === 'SERVICE') || 
                          products.find(p => p.name.toLowerCase().includes('consulta'))
      
      if (serviceItem && cart.length === 0) {
        addToCart(serviceItem)
      }
    }
  }, [products, paramAppointmentId, loading])

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id)
      if (existing) {
        if (product.type !== 'SERVICE' && existing.quantity >= product.stock) return prev;
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item)
      }
      return [...prev, { ...product, quantity: 1 }]
    })
  }

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id))
  }

  const updateCartItemPrice = (id: string, newPrice: number) => {
    setCart(prev => prev.map(item => item.id === id ? { ...item, price: newPrice } : item))
  }

  const handleCheckout = async () => {
    if (!selectedCustomer) return alert('Selecione um cliente!')
    if (cart.length === 0) return alert('Carrinho vazio!')
    if (!selectedBank) return alert('Selecione uma conta bancária de destino!')
    
    setSubmitting(true)
    const result = await submitSale({
      customerId: selectedCustomer,
      paymentMethod,
      installments: paymentMethod === 'CARTAO' ? installments : 1,
      discount: (paymentMethod === 'A_VISTA' || paymentMethod === 'PIX') ? discount : 0,
      items: cart.map(item => ({ productId: item.id, quantity: item.quantity, price: item.price })),
      depositApplied: depositAmount,
      appointmentId: appointmentId || undefined,
      bankId: selectedBank
    })

    if (result.error) {
      alert(result.error)
    } else {
      setSaleResult(result.sale)
      setCart([])
      setSelectedCustomer('')
      setDiscount(0)
      setInstallments(1)
      setDepositAmount(0)
      setDepositMethod('')
      setAppointmentId(null)
    }
    setSubmitting(false)
  }

  const handlePrint = () => {
    window.print()
  }

  const closeReceipt = () => {
    setSaleResult(null)
  }

  const subtotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0)
  const discountValue = (paymentMethod === 'A_VISTA' || paymentMethod === 'PIX') ? (subtotal * (discount / 100)) : 0
  const netAmount = subtotal - discountValue
  
  // Deduct deposit signals paid
  const total = Math.max(0, netAmount - depositAmount)

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Carregando PDV...</div>

  return (
    <div className={styles.container}>
      <div className={styles.productsArea}>
        <h2 className={styles.areaTitle}>Serviços e Produtos</h2>
        <div className={styles.productGrid}>
          {products.map(p => (
            <Card key={p.id} className={styles.productCard}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <h3 style={{ margin: 0 }}>{p.name}</h3>
                <span style={{ 
                  fontSize: '0.75rem', 
                  fontWeight: 'bold', 
                  padding: '0.15rem 0.4rem', 
                  borderRadius: '4px',
                  background: p.type === 'SERVICE' ? 'rgba(212, 175, 55, 0.15)' : '#eee',
                  color: p.type === 'SERVICE' ? 'var(--gold-hover)' : '#666'
                }}>
                  {p.type === 'SERVICE' ? '🩺 Serviço' : '📦 Produto'}
                </span>
              </div>
              <p className={styles.price}>R$ {p.price.toFixed(2)}</p>
              <p className={`${styles.stock} ${p.type === 'SERVICE' ? '' : p.stock <= 0 ? styles.stockEmpty : p.stock <= 5 ? styles.stockLow : ''}`}>
                {p.type === 'SERVICE' ? '✨ Atendimento Ilimitado' : `Estoque: ${p.stock} ${p.stock <= 0 ? ' (Esgotado)' : p.stock <= 5 ? ' (Baixo)' : ''}`}
              </p>
              <Button onClick={() => addToCart(p)} disabled={p.type !== 'SERVICE' && p.stock <= 0} style={{width: '100%', marginTop: '1rem'}}>
                Adicionar
              </Button>
            </Card>
          ))}
          {products.length === 0 && <p>Nenhum item cadastrado.</p>}
        </div>
      </div>

      <div className={styles.cartArea}>
        <Card className={styles.checkoutPanel}>
          <h2 className={styles.areaTitle}>Carrinho</h2>
          <div className={styles.cartItems}>
            {cart.map(item => (
              <div key={item.id} className={styles.cartItem}>
                <div className={styles.cartItemInfo}>
                  <p>{item.name}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.25rem' }}>
                    <span>{item.quantity}x R$ </span>
                    <input 
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.price}
                      onChange={(e) => updateCartItemPrice(item.id, Number(e.target.value))}
                      style={{
                        width: '90px',
                        padding: '0.2rem 0.4rem',
                        border: '1px solid var(--border-gold)',
                        borderRadius: '4px',
                        fontSize: '0.9rem',
                        fontFamily: 'inherit',
                        outline: 'none',
                        background: '#fff'
                      }}
                    />
                  </div>
                </div>
                <button onClick={() => removeFromCart(item.id)} className={styles.removeBtn}>✕</button>
              </div>
            ))}
            {cart.length === 0 && <p className={styles.empty}>Vazio.</p>}
          </div>

          <div className={styles.checkoutSettings}>
            <div className={styles.field}>
              <label>Cliente</label>
              <select value={selectedCustomer} onChange={e => setSelectedCustomer(e.target.value)} className={styles.select}>
                <option value="">-- Selecione --</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            
            <div className={styles.field}>
              <label>Pagamento</label>
              <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className={styles.select}>
                <option value="PIX">PIX</option>
                <option value="A_VISTA">À Vista (Dinheiro)</option>
                <option value="CARTAO">Cartão de Crédito</option>
              </select>
            </div>

            <div className={styles.field}>
              <label>Depositar em (Conta Bancária)</label>
              <select value={selectedBank} onChange={e => setSelectedBank(e.target.value)} className={styles.select}>
                <option value="">-- Selecione --</option>
                {banks.map(b => <option key={b.id} value={b.id}>{b.name} (Saldo: R$ {b.balance.toFixed(2)})</option>)}
              </select>
            </div>

            {paymentMethod === 'CARTAO' && (
              <div className={styles.field}>
                <label>Parcelas (Sem Juros)</label>
                <select value={installments} onChange={e => setInstallments(Number(e.target.value))} className={styles.select}>
                  <option value={1}>1x</option>
                  <option value={2}>2x</option>
                  <option value={3}>3x</option>
                  <option value={4}>4x</option>
                </select>
              </div>
            )}

            {(paymentMethod === 'A_VISTA' || paymentMethod === 'PIX') && (
              <div className={styles.field}>
                <label>Desconto (%)</label>
                <input 
                  type="number" 
                  min="0" 
                  max="100" 
                  value={discount} 
                  onChange={e => setDiscount(Number(e.target.value))} 
                  className={styles.select}
                  style={{ padding: '0.5rem' }}
                />
              </div>
            )}
          </div>

          <div className={styles.totalRow} style={{ borderBottom: '1px solid #eee', paddingBottom: '0.5rem', marginBottom: '0.5rem' }}>
            <span>Subtotal:</span>
            <span>R$ {subtotal.toFixed(2)}</span>
          </div>
          {discountValue > 0 && (
            <div className={styles.totalRow} style={{ color: '#4caf50' }}>
              <span>Desconto:</span>
              <span>- R$ {discountValue.toFixed(2)}</span>
            </div>
          )}
          {depositAmount > 0 && (
            <div className={styles.totalRow} style={{ color: '#4caf50' }}>
              <span>Sinal Já Pago:</span>
              <span>- R$ {depositAmount.toFixed(2)} ({depositMethod})</span>
            </div>
          )}
          <div className={styles.totalRow}>
            <span>TOTAL A COBRAR:</span>
            <span className={styles.totalAmount}>R$ {total.toFixed(2)}</span>
          </div>

          <Button 
            className={styles.finalizarBtn} 
            onClick={handleCheckout} 
            disabled={submitting || cart.length === 0 || !selectedCustomer}
          >
            {submitting ? 'Processando...' : 'Finalizar Faturamento'}
          </Button>
        </Card>
      </div>

      {saleResult && (
        <div className={rStyles.receiptOverlay}>
          <div className={rStyles.receiptContainer}>
            <div className={rStyles.receiptHeader}>
              <h2>{settings?.companyName || 'ERP Enterprise'}</h2>
              {settings?.companyCnpj && <p>CNPJ: {settings.companyCnpj}</p>}
              {settings?.companyAddress && <p>{settings.companyAddress}</p>}
              {settings?.companyPhone && <p>Tel: {settings.companyPhone}</p>}
              <div className={rStyles.divider}></div>
              <p>Comprovante de Venda</p>
              <p>#{saleResult.id.slice(0, 8)}</p>
            </div>

            <div className={rStyles.receiptBody}>
              <div className={rStyles.infoRow}>
                <span>Data:</span>
                <span>{new Date(saleResult.createdAt).toLocaleDateString('pt-BR')} {new Date(saleResult.createdAt).toLocaleTimeString('pt-BR')}</span>
              </div>
              <div className={rStyles.infoRow}>
                <span>Vendedor:</span>
                <span>{saleResult.user?.name}</span>
              </div>
              <div className={rStyles.infoRow}>
                <span>Cliente:</span>
                <span>{saleResult.customer?.name}</span>
              </div>
              
              <div className={rStyles.divider}></div>

              <table className={rStyles.itemTable}>
                <thead>
                  <tr>
                    <th>Item</th>
                    <th style={{textAlign:'center'}}>Qtd</th>
                    <th style={{textAlign:'right'}}>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {saleResult.items.map((item: any) => (
                    <tr key={item.id}>
                      <td>{item.product.name}</td>
                      <td style={{textAlign:'center'}}>{item.quantity}</td>
                      <td style={{textAlign:'right'}}>R$ {(item.price * item.quantity).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className={rStyles.totalSection}>
                {depositAmount > 0 && (
                  <div className={rStyles.totalRow} style={{ fontSize: '0.9rem', color: '#666', marginBottom: '0.25rem' }}>
                    <span>Sinal Já Pago:</span>
                    <span>R$ {depositAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className={rStyles.totalRow}>
                  <span>TOTAL FATURADO:</span>
                  <span>R$ {saleResult.totalAmount.toFixed(2)}</span>
                </div>
                <p style={{fontSize: '0.8rem', marginTop: '0.5rem'}}>
                  Pagamento: {saleResult.paymentMethod === 'PIX' ? 'PIX' : saleResult.paymentMethod === 'A_VISTA' ? 'Dinheiro' : 'Cartão'}
                </p>
              </div>
            </div>

            <div className={rStyles.receiptFooter}>
              <p>Obrigado pela preferência!</p>
              <p>Volte Sempre</p>
            </div>

            <div className={rStyles.actions}>
              <Button onClick={handlePrint} style={{flex: 1}}>Imprimir</Button>
              <Button onClick={closeReceipt} variant="secondary" style={{flex: 1}}>Fechar</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
