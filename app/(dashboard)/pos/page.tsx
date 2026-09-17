'use client'

import { useState, useEffect, useMemo, Suspense } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { getPOSData, submitSale } from '@/app/actions/saleActions'
import { getSettings } from '@/app/actions/settingsActions'
import { useSearchParams } from 'next/navigation'
import styles from './pos.module.css'
import rStyles from './receipt.module.css'

type Product = { 
  id: string; 
  name: string; 
  price: number; 
  stock: number; 
  type: string; 
}

type Customer = { 
  id: string; 
  name: string; 
  document?: string | null;
}

type CartItem = Product & { 
  quantity: number; 
}

type Bank = { 
  id: string; 
  name: string; 
  balance: number; 
}

type SplitPaymentRow = {
  method: 'PIX' | 'A_VISTA' | 'DEBITO' | 'CARTAO';
  amount: number;
  installments?: number;
  bankId?: string;
}

export default function POSPage() {
  return (
    <Suspense fallback={
      <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>✨</div>
        <p>Carregando Frente de Caixa...</p>
      </div>
    }>
      <POSPageContent />
    </Suspense>
  )
}

function POSPageContent() {
  const [products, setProducts] = useState<Product[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'PIX' | 'A_VISTA' | 'DEBITO' | 'CARTAO' | 'MULTIPLO'>('PIX')
  const [installments, setInstallments] = useState(1)
  const [discount, setDiscount] = useState(0)
  const [searchTerm, setSearchTerm] = useState('')
  const [mobileTab, setMobileTab] = useState<'catalog' | 'checkout'>('catalog')
  
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
      setCustomers(posData.customers || [])
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

  // Auto-add service (Consulta/Procedimento) if faturando from Agenda
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
        if (product.type !== 'SERVICE' && existing.quantity >= product.stock) {
          alert(`Estoque máximo atingido para ${product.name} (${product.stock} un).`)
          return prev
        }
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item)
      }
      return [...prev, { ...product, quantity: 1 }]
    })
  }

  const decreaseQuantity = (productId: string) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === productId)
      if (!existing) return prev
      if (existing.quantity <= 1) {
        return prev.filter(item => item.id !== productId)
      }
      return prev.map(item => item.id === productId ? { ...item, quantity: item.quantity - 1 } : item)
    })
  }

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id))
  }

  const clearCart = () => {
    if (cart.length === 0) return
    if (confirm('Deseja realmente limpar todos os itens da comanda?')) {
      setCart([])
    }
  }

  const updateCartItemPrice = (id: string, newPrice: number) => {
    setCart(prev => prev.map(item => item.id === id ? { ...item, price: newPrice } : item))
  }

  // Calculation of totals
  const subtotal = useMemo(() => {
    return cart.reduce((acc, item) => acc + (item.price * item.quantity), 0)
  }, [cart])

  const discountValue = useMemo(() => {
    if (paymentMethod === 'A_VISTA' || paymentMethod === 'PIX') {
      return subtotal * (discount / 100)
    }
    return 0
  }, [subtotal, paymentMethod, discount])

  const total = useMemo(() => {
    return Math.max(0, subtotal - discountValue - depositAmount)
  }, [subtotal, discountValue, depositAmount])

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

  const splitTotal = useMemo(() => {
    return splitPayments.reduce((sum, r) => sum + (Number(r.amount) || 0), 0)
  }, [splitPayments])

  const splitDifference = useMemo(() => {
    return total - splitTotal
  }, [total, splitTotal])

  const handleCheckout = async () => {
    if (!selectedCustomer) return alert('Por favor, selecione um cliente!')
    if (cart.length === 0) return alert('O carrinho / comanda está vazio!')
    
    if (paymentMethod === 'MULTIPLO') {
      if (Math.abs(splitDifference) > 0.05) {
        return alert(`A soma dos pagamentos parciais (R$ ${splitTotal.toFixed(2)}) deve ser exatamente igual ao total (R$ ${total.toFixed(2)})!`)
      }
    } else {
      if (!selectedBank) return alert('Selecione uma conta bancária de destino!')
    }
    
    setSubmitting(true)
    try {
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
    } catch (err: any) {
      alert('Erro ao processar faturamento: ' + (err.message || 'Erro inesperado'))
    } finally {
      setSubmitting(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  const closeReceipt = () => {
    setSaleResult(null)
  }

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesCategory = activeCategory === 'ALL' || p.type === activeCategory
      const matchesSearch = searchTerm.trim() === '' || 
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
      return matchesCategory && matchesSearch
    })
  }, [products, activeCategory, searchTerm])

  const totalCartItemsCount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity, 0)
  }, [cart])

  if (loading) {
    return (
      <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>✨</div>
        <p style={{ fontWeight: 600 }}>Carregando dados do Ponto de Venda...</p>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      {/* ── Top Header ────────────────────────────────────────── */}
      <header className={styles.header}>
        <div>
          <h1 className={styles.headerTitle}>
            <span>🛒 Ponto de Venda (PDV)</span>
          </h1>
          <p className={styles.headerSubtitle}>
            Faturamento rápido e intuitivo de procedimentos, consultas e produtos home care.
          </p>
        </div>
      </header>

      {/* ── Prepayment / Signal Notice ────────────────────────── */}
      {depositAmount > 0 && (
        <div className={styles.depositBanner}>
          <div className={styles.depositBannerText}>
            <span>💳</span>
            <span>
              <strong>Sinal Identificado na Agenda:</strong> R$ {depositAmount.toFixed(2)} já recebido via {depositMethod}.
            </span>
          </div>
          <span className={styles.depositBannerBadge}>
            Abatido Automaticamente
          </span>
        </div>
      )}

      {/* ── Mobile Tab Switcher (Small Screens) ───────────────── */}
      <div className={styles.mobileTabs}>
        <button 
          className={`${styles.mobileTabBtn} ${mobileTab === 'catalog' ? styles.mobileTabActive : ''}`}
          onClick={() => setMobileTab('catalog')}
        >
          🔍 Catálogo ({products.length})
        </button>
        <button 
          className={`${styles.mobileTabBtn} ${mobileTab === 'checkout' ? styles.mobileTabActive : ''}`}
          onClick={() => setMobileTab('checkout')}
        >
          🛍️ Comanda ({totalCartItemsCount}) • R$ {total.toFixed(2)}
        </button>
      </div>

      {/* ── Main POS 2-Column Grid ───────────────────────────── */}
      <div className={`${styles.posLayout} ${mobileTab === 'catalog' ? styles.showCatalog : styles.showCheckout}`}>
        
        {/* ── Left Column: Catálogo de Produtos e Procedimentos ── */}
        <section className={styles.catalogSection}>
          
          {/* Controls Bar: Busca e Filtros de Categoria */}
          <div className={styles.controlsBar}>
            <div className={styles.searchWrapper}>
              <span className={styles.searchIcon}>🔍</span>
              <input 
                type="text"
                placeholder="Buscar por nome do procedimento, serviço ou produto..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className={styles.searchInput}
              />
            </div>

            <div className={styles.categoryFilter}>
              <button 
                className={`${styles.categoryBtn} ${activeCategory === 'ALL' ? styles.activeCategory : ''}`}
                onClick={() => setActiveCategory('ALL')}
              >
                <span>Todos</span>
                <span className={styles.categoryCount}>{products.length}</span>
              </button>
              <button 
                className={`${styles.categoryBtn} ${activeCategory === 'SERVICE' ? styles.activeCategory : ''}`}
                onClick={() => setActiveCategory('SERVICE')}
              >
                <span>✨ Procedimentos / Serviços</span>
                <span className={styles.categoryCount}>{products.filter(p => p.type === 'SERVICE').length}</span>
              </button>
              <button 
                className={`${styles.categoryBtn} ${activeCategory === 'PRODUCT' ? styles.activeCategory : ''}`}
                onClick={() => setActiveCategory('PRODUCT')}
              >
                <span>📦 Home Care / Produtos</span>
                <span className={styles.categoryCount}>{products.filter(p => p.type === 'PRODUCT').length}</span>
              </button>
            </div>
          </div>

          {/* Grid de Cards de Produtos */}
          <div className={styles.productsGrid}>
            {filteredProducts.map(p => {
              const isService = p.type === 'SERVICE'
              const isOutOfStock = !isService && p.stock <= 0
              const isLowStock = !isService && p.stock > 0 && p.stock <= 5

              return (
                <div 
                  key={p.id} 
                  className={`${styles.productCard} ${isOutOfStock ? styles.disabledCard : ''}`}
                  onClick={() => !isOutOfStock && addToCart(p)}
                  title={isOutOfStock ? 'Produto indisponível em estoque' : 'Clique para adicionar à comanda'}
                >
                  <div className={styles.addBtnHint}>+</div>
                  
                  <div>
                    <div className={styles.cardHeader}>
                      <span className={`${styles.productTypeBadge} ${isService ? styles.badgeService : styles.badgeProduct}`}>
                        {isService ? '✨ Serviço' : '📦 Produto'}
                      </span>
                    </div>

                    <h3 className={styles.productName}>{p.name}</h3>
                  </div>

                  <div className={styles.productInfo}>
                    <span className={styles.price}>R$ {p.price.toFixed(2)}</span>
                    {isService ? (
                      <span className={`${styles.stockStatus} ${styles.stockAvailable}`}>
                        Disponível
                      </span>
                    ) : (
                      <span className={`${styles.stockStatus} ${isOutOfStock ? styles.stockEmpty : isLowStock ? styles.stockLow : styles.stockAvailable}`}>
                        {isOutOfStock ? 'Esgotado' : `${p.stock} un.`}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}

            {filteredProducts.length === 0 && (
              <div className={styles.emptyCatalog}>
                <p style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>🔎</p>
                <p style={{ fontWeight: 600 }}>Nenhum item encontrado.</p>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  Tente ajustar os termos de busca ou o filtro de categoria selecionado.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* ── Right Column: Comanda / Checkout Panel ───────────── */}
        <aside className={styles.checkoutPanel}>
          
          <div className={styles.panelHeader}>
            <div className={styles.panelHeaderTitle}>
              <span>Comanda de Venda</span>
              <span className={styles.itemsBadge}>{totalCartItemsCount} itens</span>
            </div>
            {cart.length > 0 && (
              <button onClick={clearCart} className={styles.clearCartBtn} title="Limpar todos os itens">
                Limpar
              </button>
            )}
          </div>

          {/* Lista de Itens do Carrinho */}
          <div className={styles.cartList}>
            {cart.map(item => (
              <div key={item.id} className={styles.cartItem}>
                <div className={styles.itemMainInfo}>
                  <p className={styles.itemName} title={item.name}>{item.name}</p>
                  
                  <div className={styles.itemControls}>
                    <button 
                      type="button" 
                      onClick={(e) => { e.stopPropagation(); decreaseQuantity(item.id); }} 
                      className={styles.qtyBtn}
                      title="Diminuir quantidade"
                    >
                      -
                    </button>
                    <span className={styles.qtyDisplay}>{item.quantity}</span>
                    <button 
                      type="button" 
                      onClick={(e) => { e.stopPropagation(); addToCart(item); }} 
                      className={styles.qtyBtn}
                      title="Aumentar quantidade"
                    >
                      +
                    </button>

                    <div className={styles.priceWrapper} style={{ marginLeft: '0.4rem' }}>
                      <span>R$</span>
                      <input 
                        type="number" 
                        step="0.01" 
                        min="0"
                        value={item.price}
                        onChange={(e) => updateCartItemPrice(item.id, parseFloat(e.target.value) || 0)}
                        className={styles.priceInput}
                        title="Preço unitário customizado"
                      />
                    </div>
                  </div>
                </div>

                <button 
                  onClick={() => removeFromCart(item.id)} 
                  className={styles.removeBtn}
                  title="Remover item da comanda"
                >
                  ✕
                </button>
              </div>
            ))}

            {cart.length === 0 && (
              <div className={styles.emptyCartNotice}>
                <p style={{ fontSize: '1.5rem', marginBottom: '0.4rem' }}>🛒</p>
                <p>A comanda está vazia.</p>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Selecione procedimentos ou produtos ao lado para iniciar.
                </p>
              </div>
            )}
          </div>

          {/* Formulário de Finalização */}
          <div className={styles.checkoutForm}>
            
            {/* Seletor de Cliente */}
            <div className={styles.formField}>
              <label className={styles.fieldLabel}>Cliente</label>
              <select 
                value={selectedCustomer} 
                onChange={e => setSelectedCustomer(e.target.value)} 
                className={styles.selectInput}
              >
                <option value="">-- Selecione o Cliente --</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.document ? `(${c.document})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Forma de Pagamento - Botões Visuais */}
            <div className={styles.formField}>
              <label className={styles.fieldLabel}>Forma de Pagamento</label>
              <div className={styles.paymentGrid}>
                <button
                  type="button"
                  className={`${styles.paymentPill} ${paymentMethod === 'PIX' ? styles.paymentPillActive : ''}`}
                  onClick={() => setPaymentMethod('PIX')}
                >
                  ⚡ PIX
                </button>
                <button
                  type="button"
                  className={`${styles.paymentPill} ${paymentMethod === 'A_VISTA' ? styles.paymentPillActive : ''}`}
                  onClick={() => setPaymentMethod('A_VISTA')}
                >
                  💵 Dinheiro
                </button>
                <button
                  type="button"
                  className={`${styles.paymentPill} ${paymentMethod === 'DEBITO' ? styles.paymentPillActive : ''}`}
                  onClick={() => setPaymentMethod('DEBITO')}
                >
                  💳 Débito
                </button>
                <button
                  type="button"
                  className={`${styles.paymentPill} ${paymentMethod === 'CARTAO' ? styles.paymentPillActive : ''}`}
                  onClick={() => setPaymentMethod('CARTAO')}
                >
                  💳 Crédito
                </button>
                <button
                  type="button"
                  className={`${styles.paymentPill} ${paymentMethod === 'MULTIPLO' ? styles.paymentPillActive : ''}`}
                  onClick={() => setPaymentMethod('MULTIPLO')}
                  style={{ gridColumn: '1 / -1' }}
                >
                  🔀 Pagamento Dividido / Múltiplo
                </button>
              </div>
            </div>

            {/* Conta Bancária Destino */}
            {paymentMethod !== 'MULTIPLO' && (
              <div className={styles.formField}>
                <label className={styles.fieldLabel}>Conta Bancária de Destino</label>
                <select 
                  value={selectedBank} 
                  onChange={e => setSelectedBank(e.target.value)} 
                  className={styles.selectInput}
                >
                  <option value="">-- Selecione a Conta --</option>
                  {banks.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.name} (Saldo: R$ {b.balance.toFixed(2)})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Parcelamento no Crédito */}
            {paymentMethod === 'CARTAO' && (
              <div className={styles.formField}>
                <label className={styles.fieldLabel}>Parcelamento</label>
                <select 
                  value={installments} 
                  onChange={e => setInstallments(Number(e.target.value))} 
                  className={styles.selectInput}
                >
                  <option value={1}>1x de R$ {total.toFixed(2)} (À Vista no Cartão)</option>
                  {[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(num => (
                    <option key={num} value={num}>
                      {num}x de R$ {(total / num).toFixed(2)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Desconto à Vista / PIX */}
            {(paymentMethod === 'A_VISTA' || paymentMethod === 'PIX') && (
              <div className={styles.formField}>
                <label className={styles.fieldLabel}>Desconto à Vista (%)</label>
                <input 
                  type="number" 
                  min="0" 
                  max="100" 
                  value={discount} 
                  onChange={e => setDiscount(Math.max(0, Math.min(100, Number(e.target.value))))} 
                  className={styles.selectInput}
                  placeholder="0"
                />
              </div>
            )}

            {/* Divisão Múltipla de Pagamento */}
            {paymentMethod === 'MULTIPLO' && (
              <div className={styles.splitPaymentBox}>
                <div className={styles.splitHeader}>
                  <strong style={{ fontSize: '0.8rem', color: 'var(--foreground)' }}>Divisão do Valor:</strong>
                  <button 
                    type="button" 
                    onClick={addSplitRow} 
                    style={{ 
                      fontSize: '0.72rem', 
                      padding: '0.2rem 0.5rem', 
                      background: 'var(--gold-primary)', 
                      color: '#000', 
                      border: 'none', 
                      borderRadius: '4px', 
                      cursor: 'pointer',
                      fontWeight: 700 
                    }}
                  >
                    + Forma
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                  {splitPayments.map((row, idx) => (
                    <div key={idx} className={styles.splitRow}>
                      <select 
                        value={row.method} 
                        onChange={(e) => updateSplitRow(idx, 'method', e.target.value)}
                        className={styles.selectInput}
                        style={{ width: '95px', fontSize: '0.75rem', padding: '0.35rem 0.4rem' }}
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
                        className={styles.selectInput}
                        style={{ flex: 1, fontSize: '0.8rem', padding: '0.35rem 0.5rem' }}
                      />

                      {row.method === 'CARTAO' && (
                        <select 
                          value={row.installments || 1}
                          onChange={(e) => updateSplitRow(idx, 'installments', Number(e.target.value))}
                          className={styles.selectInput}
                          style={{ width: '60px', fontSize: '0.75rem', padding: '0.35rem 0.2rem' }}
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
                        <button 
                          type="button" 
                          onClick={() => removeSplitRow(idx)} 
                          style={{ color: 'var(--error)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.9rem', padding: '0.2rem' }}
                          title="Remover forma"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <div className={styles.splitSumRow}>
                  <span>Soma: <strong>R$ {splitTotal.toFixed(2)}</strong></span>
                  <span style={{ color: Math.abs(splitDifference) < 0.05 ? 'var(--success)' : 'var(--error)', fontWeight: 700 }}>
                    {Math.abs(splitDifference) < 0.05 ? '✓ Total Conferido' : `Restante: R$ ${splitDifference.toFixed(2)}`}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Resumo Financeiro */}
          <div className={styles.summaryBox}>
            <div className={styles.summaryRow}>
              <span>Subtotal Itens:</span>
              <span>R$ {subtotal.toFixed(2)}</span>
            </div>
            
            {discountValue > 0 && (
              <div className={`${styles.summaryRow} ${styles.summaryDiscount}`}>
                <span>Desconto ({discount}%):</span>
                <span>- R$ {discountValue.toFixed(2)}</span>
              </div>
            )}

            {depositAmount > 0 && (
              <div className={`${styles.summaryRow} ${styles.summaryDiscount}`}>
                <span>Sinal Pago ({depositMethod}):</span>
                <span>- R$ {depositAmount.toFixed(2)}</span>
              </div>
            )}

            <div className={styles.summaryTotal}>
              <span className={styles.totalLabel}>Total a Cobrar</span>
              <span className={styles.totalValue}>R$ {total.toFixed(2)}</span>
            </div>
          </div>

          {/* Botão de Finalização */}
          <button 
            type="button"
            className={styles.submitBtn} 
            onClick={handleCheckout} 
            disabled={submitting || cart.length === 0 || !selectedCustomer}
          >
            {submitting ? 'Processando Venda...' : 'Finalizar Faturamento'}
          </button>
        </aside>

      </div>

      {/* ── Recibo / Cupom Não-Fiscal para Impressão Térmica (80mm) ── */}
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
                  {saleResult.items?.map((item: any) => (
                    <tr key={item.id}>
                      <td>{item.product?.name}</td>
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
