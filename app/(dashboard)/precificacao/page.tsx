'use client'

import React, { useState, useEffect, useMemo } from 'react'
import styles from './precificacao.module.css'
import { getSettings } from '@/app/actions/settingsActions'
import { getProducts, updateProductPrice } from '@/app/actions/productActions'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { formatCurrency } from '@/lib/format'

export default function PrecificacaoPage() {
  const [settings, setSettings] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [products, setProducts] = useState<any[]>([])
  const [selectedProductId, setSelectedProductId] = useState('')
  const [updating, setUpdating] = useState(false)

  const [formData, setFormData] = useState({
    cost: '0',
    desiredMargin: '25',
    taxOverride: '',
    fixedOverride: '',
    commissionOverride: ''
  })

  useEffect(() => {
    async function load() {
      const [settingsRes, productsRes] = await Promise.all([getSettings(), getProducts()])
      if (settingsRes.success && settingsRes.settings) {
        setSettings(settingsRes.settings)
        setFormData(prev => ({
          ...prev,
          taxOverride: (settingsRes.settings.taxPercentage || 0).toString(),
          fixedOverride: (settingsRes.settings.fixedExpensesPercentage || 0).toString(),
          commissionOverride: (settingsRes.settings.commissionPercentage || 0).toString()
        }))
      }
      if (productsRes.success) {
        setProducts(productsRes.products || [])
      }
      setLoading(false)
    }
    load()
  }, [])

  const selectedProduct = useMemo(() => {
    return products.find(p => p.id === selectedProductId) || null
  }, [products, selectedProductId])

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

  const cost = parseFloat(formData.cost) || 0
  const margin = parseFloat(formData.desiredMargin) || 0
  const tax = parseFloat(formData.taxOverride) || 0
  const fixed = parseFloat(formData.fixedOverride) || 0
  const commission = parseFloat(formData.commissionOverride) || 0

  // Markup Divisor Calculation
  const totalPercentage = (tax + fixed + commission + margin) / 100
  const canCalculate = totalPercentage < 1 && totalPercentage > 0
  const sellingPrice = canCalculate && cost > 0 ? cost / (1 - totalPercentage) : 0

  // Minimum Break-even Price (Margem 0%)
  const breakEvenPercentage = (tax + fixed + commission) / 100
  const breakEvenPrice = breakEvenPercentage < 1 && cost > 0 ? cost / (1 - breakEvenPercentage) : 0

  // Breakdown values
  const taxValue = sellingPrice * (tax / 100)
  const fixedValue = sellingPrice * (fixed / 100)
  const commissionValue = sellingPrice * (commission / 100)
  const profitValue = sellingPrice * (margin / 100)

  // Percentages for the Visual Stacked Bar
  const costPctOfPrice = sellingPrice > 0 ? (cost / sellingPrice) * 100 : 0
  const taxPctOfPrice = sellingPrice > 0 ? tax : 0
  const fixedPctOfPrice = sellingPrice > 0 ? fixed : 0
  const commissionPctOfPrice = sellingPrice > 0 ? commission : 0
  const profitPctOfPrice = sellingPrice > 0 ? margin : 0

  // Price comparison
  const currentPrice = selectedProduct ? selectedProduct.price : 0
  const priceDiff = sellingPrice - currentPrice
  const priceDiffPct = currentPrice > 0 ? ((priceDiff / currentPrice) * 100) : 0

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

  if (loading) {
    return (
      <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🧮</div>
        <p style={{ fontWeight: 600 }}>Carregando parâmetros de precificação...</p>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      {/* ── Header ────────────────────────────────────────────── */}
      <header className={styles.header}>
        <div>
          <h1 className={styles.headerTitle}>
            <span>🧮 Calculadora de Precificação Inteligente</span>
          </h1>
          <p className={styles.headerSubtitle}>
            Simule preços com Markup Divisor e garanta que sua clínica opere com margem de lucro real.
          </p>
        </div>
      </header>

      {/* ── Main Layout ──────────────────────────────────────── */}
      <div className={styles.grid}>
        
        {/* ── Left Column: Inputs & Parâmetros ────────────────── */}
        <div className={styles.column}>
          <div className={styles.calcCard}>
            <h2 className={styles.sectionTitle}>
              <span>⚙️ Dados do Produto & Margem</span>
            </h2>
            
            {/* Seletor de Produto */}
            <div className={styles.selectProductBox}>
              <label className={styles.selectLabel}>
                Vincular a um Item do Estoque (Opcional)
              </label>
              <select
                value={selectedProductId}
                onChange={e => handleProductChange(e.target.value)}
                className={styles.selectInput}
              >
                <option value="">-- Modo Simulação Livre (Digitar Custo) --</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} (Custo: R$ {p.cost.toFixed(2)} | Preço Atual: R$ {p.price.toFixed(2)})
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.inputsGroup}>
              <Input 
                label="Custo de Aquisição / Insumos (R$)" 
                type="number" 
                step="0.01" 
                min="0"
                value={formData.cost}
                onChange={(e) => setFormData({...formData, cost: e.target.value})}
              />

              <div>
                <Input 
                  label="Margem de Lucro Desejada (%)" 
                  type="number" 
                  step="0.5" 
                  min="0"
                  max="99"
                  value={formData.desiredMargin}
                  onChange={(e) => setFormData({...formData, desiredMargin: e.target.value})}
                />

                {/* Presets Rápidos de Margem */}
                <div className={styles.presetBox} style={{ marginTop: '0.6rem' }}>
                  <span className={styles.presetLabel}>Atalhos de Margem:</span>
                  <div className={styles.presetGrid}>
                    <button
                      type="button"
                      className={`${styles.presetBtn} ${formData.desiredMargin === '15' ? styles.presetBtnActive : ''}`}
                      onClick={() => setFormData(prev => ({ ...prev, desiredMargin: '15' }))}
                    >
                      15% (Mín)
                    </button>
                    <button
                      type="button"
                      className={`${styles.presetBtn} ${formData.desiredMargin === '25' ? styles.presetBtnActive : ''}`}
                      onClick={() => setFormData(prev => ({ ...prev, desiredMargin: '25' }))}
                    >
                      25% (Padrão)
                    </button>
                    <button
                      type="button"
                      className={`${styles.presetBtn} ${formData.desiredMargin === '35' ? styles.presetBtnActive : ''}`}
                      onClick={() => setFormData(prev => ({ ...prev, desiredMargin: '35' }))}
                    >
                      35% (Ideal)
                    </button>
                    <button
                      type="button"
                      className={`${styles.presetBtn} ${formData.desiredMargin === '50' ? styles.presetBtnActive : ''}`}
                      onClick={() => setFormData(prev => ({ ...prev, desiredMargin: '50' }))}
                    >
                      50% (Premium)
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <h2 className={styles.sectionTitle} style={{ marginTop: '1.75rem' }}>
              <span>🏛️ Custos Fixos & Despesas sobre a Venda</span>
            </h2>

            <div className={styles.inputsGroup}>
              <Input 
                label="Impostos sobre a Venda (%)" 
                type="number" 
                step="0.1" 
                min="0"
                value={formData.taxOverride}
                onChange={(e) => setFormData({...formData, taxOverride: e.target.value})}
              />
              <Input 
                label="Despesas Fixas Rateadas (%)" 
                type="number" 
                step="0.1" 
                min="0"
                value={formData.fixedOverride}
                onChange={(e) => setFormData({...formData, fixedOverride: e.target.value})}
              />
              <Input 
                label="Comissão do Profissional / Vendedor (%)" 
                type="number" 
                step="0.1" 
                min="0"
                value={formData.commissionOverride}
                onChange={(e) => setFormData({...formData, commissionOverride: e.target.value})}
              />
            </div>
            
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.85rem' }}>
              ℹ️ Valores carregados automaticamente das suas <strong>Configurações Globais</strong>.
            </p>
          </div>
        </div>

        {/* ── Right Column: Resultados & Simulação ────────────── */}
        <div className={styles.column}>
          <div className={styles.resultCard}>
            
            <div className={styles.priceHeader}>
              <span className={styles.priceLabel}>Preço de Venda Sugerido</span>
              {!canCalculate || cost <= 0 ? (
                <div style={{ marginTop: '1rem' }}>
                  {totalPercentage >= 1 ? (
                    <div className={styles.errorBox}>
                      ⚠️ A soma das porcentagens ({(totalPercentage * 100).toFixed(1)}%) é igual ou superior a 100%.<br/>
                      Reduza as despesas ou a margem desejada para viabilizar o cálculo.
                    </div>
                  ) : (
                    <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-muted)' }}>
                      R$ 0,00
                    </div>
                  )}
                </div>
              ) : (
                <div className={styles.priceValue}>{formatCurrency(sellingPrice)}</div>
              )}
            </div>

            {canCalculate && cost > 0 && (
              <>
                {/* Comparador de Preço Atual vs Sugerido (Se produto selecionado) */}
                {selectedProduct && (
                  <div className={styles.comparisonBox}>
                    <div className={styles.compareItem}>
                      <span className={styles.compareTitle}>Preço Praticado Hoje</span>
                      <span className={styles.compareVal}>{formatCurrency(currentPrice)}</span>
                    </div>
                    <div className={styles.compareItem}>
                      <span className={styles.compareTitle}>Preço Sugerido</span>
                      <span className={styles.compareVal} style={{ color: 'var(--gold-hover)' }}>
                        {formatCurrency(sellingPrice)}
                      </span>
                    </div>
                    <div className={styles.compareItem}>
                      <span className={styles.compareTitle}>Diferença</span>
                      <span className={`${styles.compareVal} ${priceDiff >= 0 ? styles.diffPositive : styles.diffNegative}`}>
                        {priceDiff >= 0 ? `+${formatCurrency(priceDiff)}` : formatCurrency(priceDiff)} ({priceDiffPct >= 0 ? `+${priceDiffPct.toFixed(1)}%` : `${priceDiffPct.toFixed(1)}%`})
                      </span>
                    </div>
                  </div>
                )}

                {/* Barra Visual de Composição do Preço */}
                <div className={styles.visualBarWrapper}>
                  <div className={styles.barHeader}>
                    <span>Composição da Venda</span>
                    <span>100% da Receita</span>
                  </div>

                  <div className={styles.stackedBar} title="Composição percentual do preço de venda">
                    <div 
                      className={`${styles.barSegment} ${styles.segCost}`} 
                      style={{ width: `${costPctOfPrice}%` }} 
                      title={`Custo: ${costPctOfPrice.toFixed(1)}%`}
                    />
                    <div 
                      className={`${styles.barSegment} ${styles.segTax}`} 
                      style={{ width: `${taxPctOfPrice}%` }} 
                      title={`Impostos: ${taxPctOfPrice.toFixed(1)}%`}
                    />
                    <div 
                      className={`${styles.barSegment} ${styles.segFixed}`} 
                      style={{ width: `${fixedPctOfPrice}%` }} 
                      title={`Despesas Fixas: ${fixedPctOfPrice.toFixed(1)}%`}
                    />
                    <div 
                      className={`${styles.barSegment} ${styles.segCommission}`} 
                      style={{ width: `${commissionPctOfPrice}%` }} 
                      title={`Comissão: ${commissionPctOfPrice.toFixed(1)}%`}
                    />
                    <div 
                      className={`${styles.barSegment} ${styles.segProfit}`} 
                      style={{ width: `${profitPctOfPrice}%` }} 
                      title={`Lucro Líquido: ${profitPctOfPrice.toFixed(1)}%`}
                    />
                  </div>

                  <div className={styles.barLegend}>
                    <div className={styles.legendItem}>
                      <span className={styles.legendDot} style={{ background: '#3b82f6' }} />
                      <span>Custo ({costPctOfPrice.toFixed(1)}%)</span>
                    </div>
                    <div className={styles.legendItem}>
                      <span className={styles.legendDot} style={{ background: '#ef4444' }} />
                      <span>Impostos ({tax}%)</span>
                    </div>
                    <div className={styles.legendItem}>
                      <span className={styles.legendDot} style={{ background: '#f97316' }} />
                      <span>Fixas ({fixed}%)</span>
                    </div>
                    <div className={styles.legendItem}>
                      <span className={styles.legendDot} style={{ background: '#8b5cf6' }} />
                      <span>Comissão ({commission}%)</span>
                    </div>
                    <div className={styles.legendItem}>
                      <span className={styles.legendDot} style={{ background: '#10b981' }} />
                      <span style={{ fontWeight: 700, color: 'var(--success)' }}>Lucro ({margin}%)</span>
                    </div>
                  </div>
                </div>

                {/* Decomposição Detalhada */}
                <div className={styles.breakdown}>
                  <div className={styles.breakdownItem}>
                    <span className={styles.label}>📦 (+) Custo de Insumos/Produto</span>
                    <span className={styles.value}>{formatCurrency(cost)}</span>
                  </div>
                  <div className={styles.breakdownItem}>
                    <span className={styles.label}>🏛️ (+) Provisão de Impostos</span>
                    <span className={styles.value}>{formatCurrency(taxValue)}</span>
                  </div>
                  <div className={styles.breakdownItem}>
                    <span className={styles.label}>🏢 (+) Rateio de Custos Fixos</span>
                    <span className={styles.value}>{formatCurrency(fixedValue)}</span>
                  </div>
                  <div className={styles.breakdownItem}>
                    <span className={styles.label}>🤝 (+) Comissão de Vendas</span>
                    <span className={styles.value}>{formatCurrency(commissionValue)}</span>
                  </div>
                  <div className={`${styles.breakdownItem} ${styles.profitRow}`}>
                    <span className={styles.label}>💰 (=) Lucro Líquido Real no Bolso</span>
                    <span className={styles.value}>{formatCurrency(profitValue)} ({margin}%)</span>
                  </div>
                </div>

                {/* Preço Mínimo de Segurança / Ponto de Equilíbrio */}
                <div className={styles.safetyBox}>
                  <div className={styles.safetyText}>
                    🛡️ <strong>Ponto de Equilíbrio (Margem 0%):</strong><br/>
                    Menor preço para não ter prejuízo operacional.
                  </div>
                  <span className={styles.safetyPrice}>
                    {formatCurrency(breakEvenPrice)}
                  </span>
                </div>

                {/* Badge de Sustentabilidade */}
                <div className={`${styles.sustainabilityBadge} ${margin >= 20 ? styles.sustainable : styles.notSustainable}`}>
                  {margin >= 20 ? '🚀 Margem Saudável & Sustentável' : margin >= 10 ? '⚠️ Margem Moderada (Atenção a Descontos)' : '🚨 Margem Perigosa (Alto Risco de Prejuízo)'}
                </div>

                {/* Salvar Preço no Estoque */}
                {selectedProductId && (
                  <button 
                    type="button"
                    className={styles.applyBtn} 
                    onClick={handleApplyPrice} 
                    disabled={updating}
                  >
                    {updating ? 'Atualizando Estoque...' : `💾 Salvar ${formatCurrency(sellingPrice)} no Produto`}
                  </button>
                )}
              </>
            )}
          </div>

          {/* Card Educativo */}
          <div className={styles.infoCard}>
            <h3 className={styles.infoCardTitle}>
              <span>💡</span> Por que usamos Markup Divisor?
            </h3>
            <p className={styles.infoCardText}>
              Diferente da margem simples sobre o custo, o <strong>Markup Divisor</strong> leva em conta que impostos, comissões de profissionais e taxas de cartão são cobrados sobre o <strong>valor final pago pelo cliente</strong>. Essa metodologia garante que a porcentagem de lucro definida seja exatamente o que sobra no caixa.
            </p>
          </div>
        </div>

      </div>
    </div>
  )
}
