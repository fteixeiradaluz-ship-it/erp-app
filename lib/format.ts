export const formatCurrency = (value: any) => {
  const num = typeof value === 'number' ? value : Number(value);
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(isNaN(num) || !isFinite(num) ? 0 : num);
};

