'use client'

import React, { useState, useEffect } from 'react'
import styles from './precificacao.module.css'
import { getSettings } from '@/app/actions/settingsActions'
import { getProducts, updateProductPrice } from '@/app/actions/productActions'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { formatCurrency } from '@/lib/format'

export default function PrecificacaoPage() {
  const [settings, setSettings] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [products, setProducts] = useState<any[]>([])
  const [selectedProductId, setSelectedProductId] = useState('')
  const [updating, setUpdating] = useState(false)

  const [formData, setFormData] = useState({
    cost: '0',
    desiredMargin: '20',
    taxOverride: '',
    fixedOverride: '',
    commissionOverride: ''
  })

  useEffect(() => {
    async function load() {
      const [settingsRes, productsRes] = await Promise.all([getSettings(), getProducts()])
      if (settingsRes.success) {
        setSettings(settingsRes.settings)
        setFormData(prev => ({
          ...prev,
          taxOverride: settingsRes.settings.taxPercentage.toString(),
          fixedOverride: settingsRes.settings.fixedExpensesPercentage.toString(),
          commissionOverride: settingsRes.settings.commissionPercentage.toString()
        }))
      }
      if (productsRes.success) {
        setProducts(productsRes.products)
      }
      setLoading(false)
    }
    load()
  }, [])

  const handleProductChange = (productId: string) => {
    setSelectedProductId(productId)
    if (productId) {
      const prod = products.find(p => p.id === productId)
      if (prod) {
        setFormData(prev => ({
          ...prev,
          cost: prod.cost.toString()
        }))
      }
    } else {
      setFormData(prev => ({
        ...prev,
        cost: '0'
      }))
    }
  }

  const handleApplyPrice = async () => {
    if (!selectedProductId) return
    if (sellingPrice <= 0) return alert('Calcule um preço de venda válido primeiro.')

    setUpdating(true)
    const res = await updateProductPrice(selectedProductId, sellingPrice)
    if (res.success) {
      alert('Preço de venda atualizado com sucesso no estoque!')
      const productsRes = await getProducts()
      if (productsRes.success) {
        setProducts(productsRes.products)
      }
    } else {
      alert(res.error || 'Erro ao atualizar preço de venda.')
    }
    setUpdating(false)
  }

  const cost = parseFloat(formData.cost) || 0
  const margin = parseFloat(formData.desiredMargin) || 0
  const tax = parseFloat(formData.taxOverride) || 0
  const fixed = parseFloat(formData.fixedOverride) || 0
  const commission = parseFloat(formData.commissionOverride) || 0

  // Markup Divisor Calculation
  const totalPercentage = (tax + fixed + commission + margin) / 100
  const canCalculate = totalPercentage < 1
  const sellingPrice = canCalculate ? cost / (1 - totalPercentage) : 0

  // Breakdown values
  const taxValue = sellingPrice * (tax / 100)
  const fixedValue = sellingPrice * (fixed / 100)
  const commissionValue = sellingPrice * (commission / 100)
  const profitValue = sellingPrice * (margin / 100)

  if (loading) return <div style={{ padding: '2rem' }}>Carregando parâmetros...</div>

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>🧮 Calculadora de Precificação Sustentável</h1>
        <p style={{ color: '#888' }}>Aplique o Markup Divisor para garantir lucro real em cada venda.</p>
      </header>

      <div className={styles.grid}>
        <div className={styles.column}>
          <Card className={styles.calcCard}>
            <h2 className={styles.sectionTitle}>Dados Base</h2>
            
            <div style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1.5rem' }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '600', display: 'block', marginBottom: '0.5rem' }}>
                Vincular a um Produto Existente (Opcional)
              </label>
              <select
                value={selectedProductId}
                onChange={e => handleProductChange(e.target.value)}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--background)', color: 'var(--text-primary)', outline: 'none' }}
              >
                <option value="">-- Modo Simulação (Digitar Manualmente) --</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} (Custo: R$ {p.cost.toFixed(2)} | Preço Atual: R$ {p.price.toFixed(2)})
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.inputsGroup}>
              <Input 
                label="Custo da Mercadoria (R$)" 
                type="number" 
                step="0.01" 
                value={formData.cost}
                onChange={(e) => setFormData({...formData, cost: e.target.value})}
              />
              <Input 
                label="Margem de Lucro Desejada (%)" 
                type="number" 
                step="0.1" 
                value={formData.desiredMargin}
                onChange={(e) => setFormData({...formData, desiredMargin: e.target.value})}
              />
            </div>

            <h2 className={styles.sectionTitle} style={{ marginTop: '2rem' }}>Custos Variáveis & Fixos</h2>
            <div className={styles.inputsGroup}>
              <Input 
                label="Impostos sobre Venda (%)" 
                type="number" 
                step="0.1" 
                value={formData.taxOverride}
                onChange={(e) => setFormData({...formData, taxOverride: e.target.value})}
              />
              <Input 
                label="Despesas Fixas (%)" 
                type="number" 
                step="0.1" 
                value={formData.fixedOverride}
                onChange={(e) => setFormData({...formData, fixedOverride: e.target.value})}
              />
              <Input 
                label="Comissão de Vendedor (%)" 
                type="number" 
                step="0.1" 
                value={formData.commissionOverride}
                onChange={(e) => setFormData({...formData, commissionOverride: e.target.value})}
              />
            </div>
            <p style={{ fontSize: '0.8rem', color: '#666', marginTop: '1rem' }}>
              * Os valores acima foram carregados de suas Configurações Globais.
            </p>
          </Card>
        </div>

        <div className={styles.column}>
          <Card className={styles.resultCard}>
            <span className={styles.priceLabel}>Preço de Venda Sugerido</span>
            {!canCalculate ? (
              <div className={styles.errorBox}>
                ⚠️ Erro: Somatório de porcentagens igual ou superior a 100%. <br/>
                O preço se torna infinito. Revise suas margens ou despesas.
              </div>
            ) : (
              <>
                <span className={styles.priceValue}>{formatCurrency(sellingPrice)}</span>
                
                <div className={styles.breakdown}>
                  <div className={styles.breakdownItem}>
                    <span className={styles.label}>(+) Custo do Produto</span>
                    <span className={styles.value}>{formatCurrency(cost)} ({((cost/sellingPrice)*100 || 0).toFixed(1)}%)</span>
                  </div>
                  <div className={styles.breakdownItem}>
                    <span className={styles.label}>(+) Impostos</span>
                    <span className={styles.value}>{formatCurrency(taxValue)} ({tax}%)</span>
                  </div>
                  <div className={styles.breakdownItem}>
                    <span className={styles.label}>(+) Despesas Fixas</span>
                    <span className={styles.value}>{formatCurrency(fixedValue)} ({fixed}%)</span>
                  </div>
                  <div className={styles.breakdownItem}>
                    <span className={styles.label}>(+) Comissão</span>
                    <span className={styles.value}>{formatCurrency(commissionValue)} ({commission}%)</span>
                  </div>
                  <div className={styles.breakdownItem} style={{ borderTop: '1px solid var(--gold-primary)', paddingTop: '1rem', marginTop: '0.5rem' }}>
                    <span className={styles.label} style={{ color: '#4caf50', fontWeight: 'bold' }}>(=) Lucro Líquido Real</span>
                    <span className={styles.value} style={{ color: '#4caf50' }}>{formatCurrency(profitValue)} ({margin}%)</span>
                  </div>
                </div>

                <div className={`${styles.sustainabilityBadge} ${margin >= 15 ? styles.sustainable : styles.notSustainable}`}>
                  {margin >= 15 ? '🚀 Margem de Lucro Sustentável' : '⚠️ Alerta: Margem muito baixa'}
                </div>

                {selectedProductId && (
                  <Button 
                    onClick={handleApplyPrice} 
                    disabled={updating}
                    style={{ width: '100%', marginTop: '1.5rem', background: 'var(--gold-primary)', color: '#000' }}
                  >
                    {updating ? 'Salvando...' : 'Salvar Preço no Estoque'}
                  </Button>
                )}
              </>
            )}
          </Card>

          <Card>
            <h3 style={{ color: 'var(--gold-primary)', marginBottom: '1rem', fontSize: '1rem' }}>Entenda o Markup Divisor</h3>
            <p style={{ fontSize: '0.85rem', color: '#ccc', lineHeight: '1.4' }}>
              Ao precificar sobre o custo, você esquece que os impostos e a comissão incidem sobre o <strong>preço final</strong>. 
              O Markup Divisor protege sua margem garantindo que, após pagar todos os custos variáveis e fixos, sobre exatamente a porcentagem de lucro que você definiu.
            </p>
          </Card>
        </div>
      </div>
    </div>
  )
}
