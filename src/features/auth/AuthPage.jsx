import { useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowRight, ArrowUpRight, Check, Eye, EyeOff, ShieldCheck } from 'lucide-react'
import { Button, Field } from '../../components/ui'
import { Logo } from '../../components/Layout'
import { post } from '../../lib/api'
import { useAuth } from './AuthContext'
export default function AuthPage() {
  const location = useLocation(),
    navigate = useNavigate(),
    [params] = useSearchParams()
  const { refresh } = useAuth()
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [message, setMessage] = useState(''),
    [show, setShow] = useState(false)
  const resend = location.pathname === '/resend-verification'
  const register = location.pathname === '/register',
    forgot = location.pathname === '/forgot-password' || resend,
    reset = location.pathname === '/reset-password',
    verify = location.pathname === '/verify-email'
  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    setMessage('')
    const data = Object.fromEntries(new FormData(e.currentTarget))
    try {
      if (forgot) {
        const r = await post(resend ? 'auth/resend-verification/' : 'auth/forgot-password/', data)
        setMessage(r.detail)
      } else if (reset) {
        const r = await post('auth/reset-password/', {
          ...data,
          uid: params.get('uid'),
          token: params.get('token'),
        })
        setMessage(r.detail)
      } else if (verify) {
        const r = await post('auth/verify-email/', { token: params.get('token') })
        setMessage(r.detail)
      } else {
        const result = await post(register ? 'auth/register/' : 'auth/login/', data)
        if (register && result.verification_email_sent === false) {
          setMessage(`Your account was created. ${result.email_warning} ${result.detail}`)
          return
        }
        if (result.approval_required) {
          setMessage(
            result.verification_required
              ? `Your account was created. Verify your email, then ${result.detail}`
              : result.detail || 'Your dashboard is locked. Contact +923131471263 for Unlock.',
          )
          return
        }
        if (result.verification_required) {
          setMessage(
            'Your workspace is ready. Check your email to verify your account before signing in.',
          )
          return
        }
        await refresh()
        navigate(result.has_dashboard_access ? '/dashboard' : '/billing', { replace: true })
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }
  const title = resend
    ? 'A new link. A fresh start.'
    : register
      ? 'Make room for growth.'
      : forgot
        ? 'Let’s get you back in.'
        : reset
          ? 'A fresh start.'
          : verify
            ? 'Confirm your email.'
            : 'Good to see you again.'
  return (
    <div className="auth-shell">
      <section className="auth-story">
        <Logo />
        <div className="auth-story-content">
          <span className="auth-pill">
            <span /> COMMERCE, IN CONTROL
          </span>
          <h1>
            A little less chaos.
            <br />A lot more <em>clarity.</em>
          </h1>
          <p>
            Your orders, inventory, and real profit.
            <br />
            Finally, all on the same page.
          </p>
          <div className="auth-visual">
            <div className="auth-visual-header">
              <span>YOUR BUSINESS AT A GLANCE</span>
              <ArrowUpRight size={20} />
            </div>
            <div className="auth-visual-value">
              Every rupee.
              <br />
              <span>Accounted for.</span>
            </div>
            <div className="mini-bars">
              {[28, 42, 35, 53, 45, 67, 58, 79, 70, 92, 84, 100].map((h, i) => (
                <i key={i} style={{ height: h + '%' }} />
              ))}
            </div>
            <div className="auth-visual-footer">
              <ShieldCheck size={16} /> From the first order to the next milestone.
            </div>
          </div>
          <div className="auth-checks">
            <span>
              <Check size={15} /> FIFO-powered costing
            </span>
            <span>
              <Check size={15} /> Real profit intelligence
            </span>
          </div>
        </div>
        <p className="auth-story-footer">Built for the way your business really works.</p>
      </section>
      <section className="auth-form-side">
        <div className="auth-top-link">
          {register ? 'Already have an account?' : 'New to Comqora?'}{' '}
          <Link to={register ? '/login' : '/register'}>
            {register ? 'Sign in' : 'Create an account'} <ArrowUpRight size={14} />
          </Link>
        </div>
        <div className="auth-form-wrap">
          <div className="eyebrow">{register ? 'YOUR NEXT CHAPTER' : 'WELCOME TO COMQORA'}</div>
          <h2>{title}</h2>
          <p>
            {resend
              ? 'Enter your email to request a new verification link.'
              : register
                ? 'Create your workspace. Bring your business together.'
                : forgot
                  ? 'Enter your email and we’ll send a password reset link.'
                  : reset
                    ? 'Choose a strong password with at least 10 characters.'
                    : verify
                      ? 'Verify this email address to activate your account.'
                      : 'Sign in to keep your business moving forward.'}
          </p>
          <form onSubmit={submit} className="auth-form">
            {register && (
              <>
                <Field label="Your name">
                  <input
                    name="first_name"
                    required
                    autoComplete="given-name"
                    placeholder="Ahmed Khan"
                  />
                </Field>
                <Field label="Business name">
                  <input
                    name="workspace_name"
                    required
                    autoComplete="organization"
                    placeholder="Your brand or store"
                  />
                </Field>
              </>
            )}
            {!reset && !verify && (
              <Field label="Email address">
                <input
                  type="email"
                  name="email"
                  required
                  autoComplete="email"
                  placeholder="you@yourbusiness.com"
                />
              </Field>
            )}
            {!forgot && !verify && (
              <Field label={reset ? 'New password' : 'Password'}>
                <span className="password-input">
                  <input
                    name="password"
                    type={show ? 'text' : 'password'}
                    required
                    minLength={register || reset ? 10 : undefined}
                    autoComplete={register || reset ? 'new-password' : 'current-password'}
                    placeholder={
                      register || reset ? 'At least 10 characters' : 'Enter your password'
                    }
                  />
                  <button
                    type="button"
                    onClick={() => setShow(!show)}
                    aria-label={show ? 'Hide password' : 'Show password'}
                  >
                    {show ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </span>
              </Field>
            )}
            {!register && !forgot && !reset && !verify && (
              <div className="auth-forgot">
                <span>
                  <ShieldCheck size={14} /> Secure session
                </span>
                <Link to="/forgot-password">Forgot password?</Link>
              </div>
            )}
            {error && (
              <p role="alert" className="form-error">
                {error}
              </p>
            )}
            {message && (
              <p role="status" className="form-success">
                {message}
              </p>
            )}
            <Button loading={busy} type="submit">
              {resend
                ? 'Send verification link'
                : register
                  ? 'Create your workspace'
                  : forgot
                    ? 'Send reset link'
                    : reset
                      ? 'Reset password'
                      : verify
                        ? 'Verify email'
                        : 'Sign in to your workspace'}
              <ArrowRight size={17} />
            </Button>
            {(forgot || reset || verify) && (
              <Link className="back-login" to="/login">
                Back to sign in
              </Link>
            )}
            {!register && !forgot && !reset && (
              <Link className="back-login" to="/resend-verification">
                Need a new verification email?
              </Link>
            )}
          </form>
          <p className="auth-security">
            <ShieldCheck size={15} /> Your data stays in your workspace. Always.
          </p>
        </div>
        <p className="auth-bottom">
          Comqora · Commerce, at your core. <Link to="/privacy">Privacy</Link> ·{' '}
          <Link to="/terms">Terms</Link>
        </p>
      </section>
    </div>
  )
}
