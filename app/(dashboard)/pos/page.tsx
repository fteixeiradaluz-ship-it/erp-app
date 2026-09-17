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

type SplitPaymentRow = {
  method: 'PIX' | 'A_VISTA' | 'DEBITO' | 'CARTAO';
  amount: number;
  installments?: number;
  bankId?: string;
}

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
  
  // Split payments state
  const [splitPayments, setSplitPayments] = useState<SplitPaymentRow[]>([
    { method: 'PIX', amount: 0, installments: 1, bankId: '' }
  ])

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [saleResult, setSaleResult] = useState<any>(null)
  const [settings, setSettings] = useState<any>(null)
  const [banks, setBanks] = useState<Bank[]>([])
  const [selectedBank, setSelectedBank] = useState<string>('')
  const [activeCategory, setActiveCategory] = useState<'ALL' | 'SERVICE' | 'PRODUCT'>('ALL')

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
        setSplitPayments([{ method: 'PIX', amount: 0, installments: 1, bankId: loadedBanks[0].id }])
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

  // Totais
  const subtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0)
  const discountValue = (paymentMethod === 'A_VISTA' || paymentMethod === 'PIX') ? (subtotal * (discount / 100)) : 0
  const total = Math.max(0, subtotal - discountValue - depositAmount)

  // Split payment helper methods
  const addSplitRow = () => {
    setSplitPayments(prev => [
      ...prev,
      { method: 'CARTAO', amount: 0, installments: 1, bankId: selectedBank }
    ])
  }

  const removeSplitRow = (index: number) => {
    setSplitPayments(prev => prev.filter((_, idx) => idx !== index))
  }

  const updateSplitRow = (index: number, field: keyof SplitPaymentRow, value: any) => {
    setSplitPayments(prev => prev.map((row, idx) => idx === index ? { ...row, [field]: value } : row))
  }

  const splitTotal = splitPayments.reduce((sum, r) => sum + (Number(r.amount) || 0), 0)
  const splitDifference = total - splitTotal

  const handleCheckout = async () => {
    if (!selectedCustomer) return alert('Selecione um cliente!')
    if (cart.length === 0) return alert('Carrinho vazio!')
    
    if (paymentMethod === 'MULTIPLO') {
      if (Math.abs(splitDifference) > 0.05) {
        return alert(`A soma dos pagamentos parciais (R$ ${splitTotal.toFixed(2)}) deve ser exatamente igual ao total (R$ ${total.toFixed(2)})!`)
      }
    } else {
      if (!selectedBank) return alert('Selecione uma conta bancária de destino!')
    }
    
    setSubmitting(true)
    const result = await submitSale({
      customerId: selectedCustomer,
      paymentMethod,
      installments: paymentMethod === 'CARTAO' ? installments : 1,
      discount: (paymentMethod === 'A_VISTA' || paymentMethod === 'PIX') ? discount : 0,
      items: cart.map(item => ({ productId: item.id, quantity: item.quantity, price: item.price })),
      depositApplied: depositAmount,
      appointmentId: appointmentId || undefined,
      bankId: selectedBank,
      splitPayments: paymentMethod === 'MULTIPLO' ? splitPayments.map(p => ({
        method: p.method,
        amount: Number(p.amount),
        installments: p.installments || 1,
        bankId: p.bankId || selectedBank
      })) : undefined
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
      setPaymentMethod('PIX')
    }
    setSubmitting(false)
  }

  const handlePrint = () => {
    window.print()
  }

  const closeReceipt = () => {
    setSaleResult(null)
  }

  if (loading) return <div className={styles.container}>Carregando produtos...</div>

  const filteredProducts = products.filter(p => {
    if (activeCategory === 'ALL') return true
    return p.type === activeCategory
  })

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1>🛒 Ponto de Venda (PDV)</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Faturamento rápido de consultas, pacotes e produtos dermatológicos.
          </p>
        </div>
      </header>

      {depositAmount > 0 && (
        <div style={{
          background: 'rgba(76, 175, 80, 0.1)',
          border: '1px solid rgba(76, 175, 80, 0.3)',
          padding: '0.75rem 1rem',
          borderRadius: '8px',
          color: '#2e7d32',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.9rem'
        }}>
          <span>💳 <strong>Sinal Identificado:</strong> R$ {depositAmount.toFixed(2)} já recebido via {depositMethod} no agendamento.</span>
          <span style={{ fontSize: '0.8rem', background: '#2e7d32', color: '#fff', padding: '0.2rem 0.6rem', borderRadius: '4px' }}>
            Abatido Automaticamente
          </span>
        </div>
      )}

      <div className={styles.grid}>
        {/* Catálogo de Produtos e Serviços */}
        <div className={styles.productCatalog}>
          <div className={styles.categoryFilter}>
            <button 
              className={`${styles.categoryBtn} ${activeCategory === 'ALL' ? styles.activeCategory : ''}`}
              onClick={() => setActiveCategory('ALL')}
            >
              Todos ({products.length})
            </button>
            <button 
              className={`${styles.categoryBtn} ${activeCategory === 'SERVICE' ? styles.activeCategory : ''}`}
              onClick={() => setActiveCategory('SERVICE')}
            >
              Procedimentos / Serviços ({products.filter(p => p.type === 'SERVICE').length})
            </button>
            <button 
              className={`${styles.categoryBtn} ${activeCategory === 'PRODUCT' ? styles.activeCategory : ''}`}
              onClick={() => setActiveCategory('PRODUCT')}
            >
              Produtos Home Care ({products.filter(p => p.type === 'PRODUCT').length})
            </button>
          </div>

          <div className={styles.productsGrid}>
            {filteredProducts.map(p => (
              <Card 
                key={p.id} 
                className={`${styles.productCard} ${p.type !== 'SERVICE' && p.stock <= 0 ? styles.disabledCard : ''}`}
                onClick={() => addToCart(p)}
              >
                <span className={styles.productTypeBadge}>
                  {p.type === 'SERVICE' ? '✨ SERVIÇO' : '📦 PRODUTO'}
                </span>
                <h3 className={styles.productName}>{p.name}</h3>
                <div className={styles.productInfo}>
                  <span className={styles.price}>R$ {p.price.toFixed(2)}</span>
                  {p.type === 'PRODUCT' ? (
                    <span className={p.stock > 0 ? styles.stock : styles.noStock}>
                      {p.stock > 0 ? `${p.stock} em estoque` : 'Sem estoque'}
                    </span>
                  ) : (
                    <span className={styles.stock} style={{ color: 'var(--gold-primary)' }}>Disponível</span>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Carrinho e Checkout */}
        <Card className={styles.cartCard}>
          <h2>Resumo do Pedido</h2>
          
          <div className={styles.cartItems}>
            {cart.map(item => (
              <div key={item.id} className={styles.cartItem}>
                <div className={styles.cartItemDetails}>
                  <strong>{item.name}</strong>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.3rem' }}>
                    <span style={{ fontSize: '0.8rem', color: '#666' }}>{item.quantity}x</span>
                    <span style={{ fontSize: '0.8rem', color: '#666' }}>R$</span>
                    <input 
                      type="number" 
                      step="0.01" 
                      min="0"
                      value={item.price}
                      onChange={(e) => updateCartItemPrice(item.id, parseFloat(e.target.value) || 0)}
                      className={styles.priceInput}
                    />
                  </div>
                </div>
                <button onClick={() => removeFromCart(item.id)} className={styles.removeBtn}>✕</button>
              </div>
            ))}
            {cart.length === 0 && <p className={styles.empty}>Nenhum item adicionado ao carrinho.</p>}
          </div>

          <div className={styles.checkoutSettings}>
            <div className={styles.field}>
              <label>Cliente</label>
              <select value={selectedCustomer} onChange={e => setSelectedCustomer(e.target.value)} className={styles.select}>
                <option value="">-- Selecione o Cliente --</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            
            <div className={styles.field}>
              <label>Forma de Pagamento</label>
              <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className={styles.select}>
                <option value="PIX">PIX</option>
                <option value="A_VISTA">À Vista (Dinheiro)</option>
                <option value="DEBITO">Cartão de Débito</option>
                <option value="CARTAO">Cartão de Crédito</option>
                <option value="MULTIPLO">🔀 Pagamento Dividido / Múltiplo</option>
              </select>
            </div>

            {paymentMethod !== 'MULTIPLO' && (
              <div className={styles.field}>
                <label>Conta Bancária de Destino</label>
                <select value={selectedBank} onChange={e => setSelectedBank(e.target.value)} className={styles.select}>
                  <option value="">-- Selecione --</option>
                  {banks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
            )}

            {paymentMethod === 'CARTAO' && (
              <div className={styles.field}>
                <label>Parcelas</label>
                <select value={installments} onChange={e => setInstallments(Number(e.target.value))} className={styles.select}>
                  <option value={1}>1x (À Vista)</option>
                  <option value={2}>2x</option>
                  <option value={3}>3x</option>
                  <option value={4}>4x</option>
                  <option value={5}>5x</option>
                  <option value={6}>6x</option>
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
                />
              </div>
            )}

            {/* Painel de Pagamento Múltiplo / Dividido */}
            {paymentMethod === 'MULTIPLO' && (
              <div style={{ background: 'var(--background)', padding: '1rem', borderRadius: '8px', marginTop: '0.5rem', border: '1px solid var(--border-gold)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <strong style={{ fontSize: '0.85rem' }}>Divisão do Pagamento:</strong>
                  <Button type="button" variant="secondary" onClick={addSplitRow} style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}>
                    + Adicionar Forma
                  </Button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  {splitPayments.map((row, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                      <select 
                        value={row.method} 
                        onChange={(e) => updateSplitRow(idx, 'method', e.target.value)}
                        className={styles.select}
                        style={{ width: '110px', fontSize: '0.75rem', padding: '0.4rem' }}
                      >
                        <option value="PIX">PIX</option>
                        <option value="A_VISTA">Dinheiro</option>
                        <option value="DEBITO">Débito</option>
                        <option value="CARTAO">Crédito</option>
                      </select>

                      <input 
                        type="number" 
                        placeholder="R$ 0,00" 
                        step="0.01" 
                        min="0"
                        value={row.amount || ''}
                        onChange={(e) => updateSplitRow(idx, 'amount', parseFloat(e.target.value) || 0)}
                        className={styles.select}
                        style={{ flex: 1, fontSize: '0.8rem', padding: '0.4rem' }}
                      />

                      {row.method === 'CARTAO' && (
                        <select 
                          value={row.installments || 1}
                          onChange={(e) => updateSplitRow(idx, 'installments', Number(e.target.value))}
                          className={styles.select}
                          style={{ width: '65px', fontSize: '0.75rem', padding: '0.4rem' }}
                        >
                          <option value={1}>1x</option>
                          <option value={2}>2x</option>
                          <option value={3}>3x</option>
                          <option value={4}>4x</option>
                          <option value={5}>5x</option>
                          <option value={6}>6x</option>
                        </select>
                      )}

                      {splitPayments.length > 1 && (
                        <button type="button" onClick={() => removeSplitRow(idx)} style={{ color: 'var(--error)', background: 'none', border: 'none', cursor: 'pointer' }}>
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Soma: <strong>R$ {splitTotal.toFixed(2)}</strong></span>
                  <span style={{ color: Math.abs(splitDifference) < 0.05 ? 'var(--success)' : 'var(--error)', fontWeight: 600 }}>
                    {Math.abs(splitDifference) < 0.05 ? '✓ Total Conferido' : `Restante: R$ ${splitDifference.toFixed(2)}`}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className={styles.totalRow} style={{ borderBottom: '1px solid #eee', paddingBottom: '0.5rem', marginBottom: '0.5rem' }}>
            <span>Subtotal:</span>
            <span>R$ {subtotal.toFixed(2)}</span>
          </div>
          {discountValue > 0 && (
            <div className={styles.totalRow} style={{ color: 'var(--success)' }}>
              <span>Desconto:</span>
              <span>- R$ {discountValue.toFixed(2)}</span>
            </div>
          )}
          {depositAmount > 0 && (
            <div className={styles.totalRow} style={{ color: 'var(--success)' }}>
              <span>Sinal Abatido:</span>
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
            {submitting ? 'Processando Faturamento...' : 'Finalizar Faturamento'}
          </Button>
        </Card>
      </div>

      {/* Recibo / Cupom Não-Fiscal para Impressão Térmica (80mm) */}
      {saleResult && (
        <div className={rStyles.receiptOverlay}>
          <div className={rStyles.receiptContainer}>
            <div className={rStyles.receiptHeader}>
              <h2>{settings?.companyName || 'DERMAE INSTITUTO'}</h2>
              {settings?.companyCnpj && <p>CNPJ: {settings.companyCnpj}</p>}
              {settings?.companyAddress && <p>{settings.companyAddress}</p>}
              {settings?.companyPhone && <p>Tel: {settings.companyPhone}</p>}
              <div className={rStyles.divider}></div>
              <p style={{ fontWeight: 'bold' }}>CUPOM NÃO-FISCAL</p>
              <p>Venda #{saleResult.id.slice(0, 8)}</p>
            </div>

            <div className={rStyles.receiptBody}>
              <div className={rStyles.infoRow}>
                <span>Data/Hora:</span>
                <span>{new Date(saleResult.createdAt).toLocaleDateString('pt-BR')} {new Date(saleResult.createdAt).toLocaleTimeString('pt-BR')}</span>
              </div>
              <div className={rStyles.infoRow}>
                <span>Atendente:</span>
                <span>{saleResult.user?.name || 'Profissional'}</span>
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
                    <th style={{ textAlign: 'center' }}>Qtd</th>
                    <th style={{ textAlign: 'right' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {saleResult.items.map((item: any) => (
                    <tr key={item.id}>
                      <td>{item.product.name}</td>
                      <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                      <td style={{ textAlign: 'right' }}>R$ {(item.price * item.quantity).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className={rStyles.totalSection}>
                {depositAmount > 0 && (
                  <div className={rStyles.totalRow} style={{ fontSize: '0.85rem', color: '#666', marginBottom: '0.25rem' }}>
                    <span>Sinal Pago:</span>
                    <span>R$ {depositAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className={rStyles.totalRow}>
                  <span>VALOR TOTAL:</span>
                  <span>R$ {saleResult.totalAmount.toFixed(2)}</span>
                </div>
                <p style={{ fontSize: '0.85rem', marginTop: '0.5rem', fontWeight: 600 }}>
                  Forma: {saleResult.paymentMethod === 'PIX' ? 'PIX' : 
                          saleResult.paymentMethod === 'A_VISTA' ? 'Dinheiro' : 
                          saleResult.paymentMethod === 'DEBITO' ? 'Cartão de Débito' : 
                          saleResult.paymentMethod === 'MULTIPLO' ? 'Pagamento Dividido' : 
                          `Cartão (${saleResult.installments}x)`}
                </p>
              </div>
            </div>

            <div className={rStyles.receiptFooter}>
              <p>Obrigado pela preferência!</p>
              <p>Agradecemos a confiança em nossos serviços.</p>
            </div>

            <div className={rStyles.actions}>
              <Button onClick={handlePrint} style={{ flex: 1, background: 'var(--gold-primary)', color: '#000' }}>
                🖨️ Imprimir Recibo
              </Button>
              <Button onClick={closeReceipt} variant="secondary" style={{ flex: 1 }}>
                Fechar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
