import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'DERMAE INSTITUTO DE ESTÉTICA INTEGRATIVA',
  description: 'Sistema ERP de Alto Padrão',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  )
}
