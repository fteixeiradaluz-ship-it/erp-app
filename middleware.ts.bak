import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { decrypt } from './lib/auth'

export async function middleware(request: NextRequest) {
  const sessionCookie = request.cookies.get('user_session')?.value
  const { pathname } = request.nextUrl

  // Ignore static assets inside public and API routes that shouldn't be blocked
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next()
  }

  // Not logged in trying to access private routes
  if (!sessionCookie && pathname !== '/login') {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (sessionCookie) {
    try {
      const session = await decrypt(sessionCookie)
      
      // Logged in trying to access login
      if (pathname === '/login' || pathname === '/') {
         return NextResponse.redirect(new URL('/dashboard', request.url))
      }

      // Route to permission token mapping
      const routePermissionMap = [
        { prefix: '/admin/logs', token: 'logs' },
        { prefix: '/admin/usuarios', token: 'usuarios' },
        { prefix: '/dashboard', token: 'dashboard' },
        { prefix: '/pos', token: 'pos' },
        { prefix: '/agenda', token: 'agenda' },
        { prefix: '/envios', token: 'envios' },
        { prefix: '/relatorios', token: 'relatorios' },
        { prefix: '/clientes', token: 'clientes' },
        { prefix: '/fornecedores', token: 'fornecedores' },
        { prefix: '/estoque', token: 'estoque' },
        { prefix: '/precificacao', token: 'precificacao' },
        { prefix: '/financeiro', token: 'financeiro' },
        { prefix: '/contas-pagar', token: 'contas-pagar' },
        { prefix: '/configuracoes', token: 'configuracoes' },
      ]

      let userPermissions = session.permissions || ''
      
      // Fallback to default role permissions if empty
      if (!userPermissions) {
        if (session.role === 'ADMIN') {
          userPermissions = 'dashboard,pos,agenda,envios,relatorios,clientes,fornecedores,estoque,precificacao,financeiro,contas-pagar,logs,usuarios,configuracoes'
        } else if (session.role === 'SECRETARY') {
          userPermissions = 'dashboard,pos,agenda,relatorios,clientes'
        } else {
          userPermissions = 'dashboard,pos,envios,relatorios,clientes'
        }
      }

      // Check access
      if (session.role !== 'ADMIN') {
        const matched = routePermissionMap.find(item => pathname.startsWith(item.prefix))
        if (matched) {
          const allowedTokens = userPermissions.split(',')
          if (!allowedTokens.includes(matched.token)) {
            // Find first allowed prefix to redirect to
            const firstAllowed = routePermissionMap.find(item => allowedTokens.includes(item.token))
            const redirectUrl = firstAllowed ? firstAllowed.prefix : '/pos'
            return NextResponse.redirect(new URL(redirectUrl, request.url))
          }
        }
      }
    } catch (error) {
      if (pathname !== '/login') {
          return NextResponse.redirect(new URL('/login', request.url))
      }
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
