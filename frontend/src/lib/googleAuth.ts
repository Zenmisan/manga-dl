import { Capacitor } from '@capacitor/core'
import { supabase } from './supabase'
import api from './api'

export interface GoogleAuthResult {
  success: boolean
  isOnboarded: boolean
}

export async function signInWithGoogle(): Promise<GoogleAuthResult> {
  let idToken: string | undefined

  if (Capacitor.isNativePlatform()) {
    const { GoogleSignIn, ErrorCode } = await import('@capawesome/capacitor-google-sign-in')
    const webClientId =
      import.meta.env.VITE_GOOGLE_WEB_CLIENT_ID ||
      '912012648755-2lhitqdiq1uqo5i8h20k2b3r63vaf8l0.apps.googleusercontent.com'

    try {
      await GoogleSignIn.initialize({ clientId: webClientId })
      const res = await GoogleSignIn.signIn()
      idToken = res.idToken
    } catch (err: unknown) {
      const errorObj = err as { code?: string; message?: string }
      if (errorObj?.code === ErrorCode.SignInCanceled) {
        throw new Error('Sign-in was cancelled.')
      }
      if (errorObj?.code === ErrorCode.NoCredentialAvailable) {
        throw new Error('No Google account found on device.')
      }
      throw err
    }
  } else {
    const { GoogleAuthProvider, signInWithPopup } = await import('firebase/auth')
    const { firebaseAuth } = await import('./firebase')
    const provider = new GoogleAuthProvider()
    const result = await signInWithPopup(firebaseAuth, provider)
    const credential = GoogleAuthProvider.credentialFromResult(result)
    idToken = credential?.idToken
  }

  if (!idToken) {
    throw new Error('No ID token returned from Google.')
  }

  const { error: sbError } = await supabase.auth.signInWithIdToken({
    provider: 'google',
    token: idToken,
  })
  if (sbError) throw sbError

  const { data } = await api.get('/users/me').catch(() => ({ data: null }))
  const isOnboarded = Boolean(data?.profile_set)

  if (isOnboarded) {
    localStorage.setItem('onboarded', '1')
  } else {
    localStorage.removeItem('onboarded')
  }

  return { success: true, isOnboarded }
}

export async function signOutGoogle(): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    try {
      const { GoogleSignIn } = await import('@capawesome/capacitor-google-sign-in')
      await GoogleSignIn.signOut()
    } catch {
      // Non-fatal if native sign-out fails
    }
  }
}
