import { SignJWT, jwtVerify, JWTPayload } from 'jose'

const secretKey = process.env.JWT_SECRET || 'erp-super-secret-key-for-development'
const key = new TextEncoder().encode(secretKey)

export interface SessionPayload extends JWTPayload {
  userId: string;
  role: string;
  permissions?: string;
  requirePasswordChange?: boolean;
}

export async function encrypt(payload: SessionPayload) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1d')
    .sign(key)
}

export async function decrypt(input: string): Promise<SessionPayload> {
  const { payload } = await jwtVerify(input, key, {
    algorithms: ['HS256'],
  })
  return payload as SessionPayload
}

export function hasPermission(session: SessionPayload, token: string): boolean {
  if (session.role === 'ADMIN') return true

  let userPermissions = session.permissions || ''
  if (!userPermissions) {
    if (session.role === 'SECRETARY') {
      userPermissions = 'dashboard,pos,agenda,relatorios,clientes'
    } else {
      userPermissions = 'dashboard,pos,envios,relatorios,clientes'
    }
  }

  return userPermissions.split(',').includes(token)
}
