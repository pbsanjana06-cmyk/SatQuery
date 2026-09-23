import { useState } from 'react'
import type { FormEvent } from 'react'
import { Eye, EyeOff, LoaderCircle, LockKeyhole, Mail, Sparkles } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface AuthPageProps {
  onAuthenticated: () => void
  isRecovery?: boolean
}

export function AuthPage({ onAuthenticated, isRecovery = false }: AuthPageProps) {
  const [isSignUp, setIsSignUp] = useState(false)
  const [isForgotPassword, setIsForgotPassword] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSubmitting(true)
    setMessage('')
    setError('')

    const redirectUrl = import.meta.env.VITE_APP_URL || window.location.origin
    const response = isRecovery
      ? await supabase.auth.updateUser({ password })
      : isForgotPassword
        ? await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${redirectUrl}/reset-password` })
      : isSignUp
        ? await supabase.auth.signUp({ email, password, options: { emailRedirectTo: redirectUrl } })
        : await supabase.auth.signInWithPassword({ email, password })

    setIsSubmitting(false)

    if (response.error) {
      setError(response.error.message)
      return
    }

    if (isRecovery) {
      setMessage('Your password has been updated successfully.')
      onAuthenticated()
      return
    }

    if (isForgotPassword) {
      setMessage('If an account exists for this email, a password reset link has been sent.')
      return
    }

    if (isSignUp && 'session' in response.data && !response.data.session) {
      setMessage('Account created successfully. Please sign in with your email and password.')
      setIsSignUp(false)
      return
    }

    onAuthenticated()
  }

  const switchMode = (mode: 'signin' | 'signup' | 'forgot') => {
    setIsSignUp(mode === 'signup')
    setIsForgotPassword(mode === 'forgot')
    setShowPassword(false)
    setError('')
    setMessage('')
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10 text-slate-800">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(212,160,23,0.14),transparent_40%),radial-gradient(circle_at_bottom_left,rgba(245,158,11,0.1),transparent_35%)]" />
      <section className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white/95 p-8 shadow-2xl shadow-slate-200/80 backdrop-blur">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
            <Sparkles size={24} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">SATQUERY AI</h1>
          <p className="mt-2 text-sm text-slate-500">
            {isRecovery ? 'Choose a new password' : isForgotPassword ? 'Reset your SatQuery password' : 'Sign in to analyze remote sensing imagery'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isRecovery && <label className="block text-sm text-slate-300">
            Email address
            <div className="mt-2 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 focus-within:border-amber-400">
              <Mail size={17} className="text-slate-500" />
              <input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="w-full bg-transparent text-slate-100 outline-none placeholder:text-slate-600" placeholder="you@example.com" />
            </div>
          </label>}

          {(!isForgotPassword || isRecovery) && (
            <label className="block text-sm text-slate-300">
              Password
              <div className="mt-2 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 focus-within:border-amber-400">
                <LockKeyhole size={17} className="text-slate-500" />
                <input required minLength={6} type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} className="w-full bg-transparent text-slate-100 outline-none placeholder:text-slate-600" placeholder="At least 6 characters" />
                <button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword((current) => !current)} className="text-slate-400 hover:text-slate-200">
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </label>
          )}

          {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</div>}
          {message && <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">{message}</div>}

          <button disabled={isSubmitting} type="submit" className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-3 font-semibold text-white transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-70">
            {isSubmitting && <LoaderCircle size={17} className="animate-spin" />}
            {isRecovery ? 'Update password' : isForgotPassword ? 'Send reset link' : isSignUp ? 'Create account' : 'Sign in'}
          </button>
        </form>

        {isRecovery ? (
          <div className="mt-6 text-center text-sm text-slate-400">Use at least 6 characters for your new password.</div>
        ) : isForgotPassword ? (
          <div className="mt-6 text-center text-sm text-slate-400">
            Remembered your password?{' '}
            <button type="button" onClick={() => switchMode('signin')} className="font-medium text-amber-700 hover:text-amber-600">Back to sign in</button>
          </div>
        ) : (
          <>
            {!isSignUp && <div className="mt-4 text-center"><button type="button" onClick={() => switchMode('forgot')} className="text-sm font-medium text-amber-700 hover:text-amber-600">Forgot password?</button></div>}
            <div className="mt-6 text-center text-sm text-slate-400">
              {isSignUp ? 'Already have an account?' : 'New to SatQuery?'}{' '}
              <button type="button" onClick={() => switchMode(isSignUp ? 'signin' : 'signup')} className="font-medium text-amber-700 hover:text-amber-600">
                {isSignUp ? 'Sign in' : 'Create an account'}
              </button>
            </div>
          </>
        )}
      </section>
    </main>
  )
}