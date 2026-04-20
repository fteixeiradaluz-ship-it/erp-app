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

      // SELLER role constraints
      if (session.role === 'SELLER') {
         const blockedRoutes = ['/admin', '/financeiro', '/estoque', '/precificacao', '/fornecedores', '/configuracoes', '/consultas']
         if (blockedRoutes.some(route => pathname.startsWith(route))) {
             return NextResponse.redirect(new URL('/pos', request.url))
         }
      }

      // SECRETARY role constraints
      if (session.role === 'SECRETARY') {
         const blockedRoutes = ['/admin', '/financeiro', '/estoque', '/precificacao', '/fornecedores', '/configuracoes', '/contas-pagar']
         if (blockedRoutes.some(route => pathname.startsWith(route))) {
             return NextResponse.redirect(new URL('/dashboard', request.url))
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
