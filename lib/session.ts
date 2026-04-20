import 'server-only'
import { cookies } from 'next/headers'
import { decrypt, SessionPayload } from './auth'

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('user_session')?.value;
  if (!sessionCookie) return null;

  try {
    return await decrypt(sessionCookie);
  } catch (error) {
    return null;
  }
}
