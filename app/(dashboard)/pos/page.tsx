'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { getPOSData, submitSale } from '@/app/actions/saleActions'
import { getSettings } from '@/app/actions/settingsActions'
import styles from './pos.module.css'
import rStyles from './receipt.module.css'

type Product = { id: string; name: string; price: number; stock: number; }
type Customer = { id: string; name: string; }
type CartItem = Product & { quantity: number; }

export default function POSPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('PIX')
  
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [saleResult, setSaleResult] = useState<any>(null)
  const [settings, setSettings] = useState<any>(null)

  useEffect(() => {
    Promise.all([getPOSData(), getSettings()]).then(([posData, settingsData]) => {
      setProducts(posData.products)
      setCustomers(posData.customers)
      if (settingsData.success) setSettings(settingsData.settings)
      setLoading(false)
    })
  }, [])

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id)
      if (existing) {
        if (existing.quantity >= product.stock) return prev; // Limit to stock
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item)
      }
      return [...prev, { ...product, quantity: 1 }]
    })
  }

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id))
  }

  const handleCheckout = async () => {
    if (!selectedCustomer) return alert('Selecione um cliente!')
    if (cart.length === 0) return alert('Carrinho vazio!')
    
    setSubmitting(true)
    const result = await submitSale({
      customerId: selectedCustomer,
      paymentMethod,
      items: cart.map(item => ({ productId: item.id, quantity: item.quantity, price: item.price }))
    })

    if (result.error) {
      alert(result.error)
    } else {
      setSaleResult(result.sale)
      setCart([])
      setSelectedCustomer('')
    }
    setSubmitting(false)
  }

  const handlePrint = () => {
    window.print()
  }

  const closeReceipt = () => {
    setSaleResult(null)
  }

  const total = cart.reduce((acc, item) => acc + item.price * item.quantity, 0)

  if (loading) return <div>Carregando PDV...</div>

  return (
    <div className={styles.container}>
      <div className={styles.productsArea}>
        <h2 className={styles.areaTitle}>Produtos</h2>
        <div className={styles.productGrid}>
          {products.map(p => (
            <Card key={p.id} className={styles.productCard}>
              <h3>{p.name}</h3>
              <p className={styles.price}>R$ {p.price.toFixed(2)}</p>
              <p className={`${styles.stock} ${p.stock <= 0 ? styles.stockEmpty : p.stock <= 5 ? styles.stockLow : ''}`}>
                Estoque: {p.stock} {p.stock <= 0 ? ' (Esgotado)' : p.stock <= 5 ? ' (Baixo)' : ''}
              </p>
              <Button onClick={() => addToCart(p)} disabled={p.stock <= 0} style={{width: '100%', marginTop: '1rem'}}>
                Adicionar
              </Button>
            </Card>
          ))}
          {products.length === 0 && <p>Nenhum produto cadastrado.</p>}
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
                  <span>{item.quantity}x R$ {item.price.toFixed(2)}</span>
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
          </div>

          <div className={styles.totalRow}>
            <span>Total:</span>
            <span className={styles.totalAmount}>R$ {total.toFixed(2)}</span>
          </div>

          <Button 
            className={styles.finalizarBtn} 
            onClick={handleCheckout} 
            disabled={submitting || cart.length === 0 || !selectedCustomer}
          >
            {submitting ? 'Processando...' : 'Finalizar Venda'}
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
                <div className={rStyles.totalRow}>
                  <span>TOTAL:</span>
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
