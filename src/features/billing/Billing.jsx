import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Sparkles, ShieldCheck } from 'lucide-react'
import { api, post, privateBlob } from '../../lib/api'
import { useAuth } from '../auth/AuthContext'
import { Button, Loading, ErrorState } from '../../components/ui'
import './billing.css'

const money = (value) => `Rs ${Number(value).toLocaleString('en-PK')}`
const date = (value) => new Date(value).toLocaleString('en-PK')

export default function Billing() {
  const { user, refresh, signOut } = useAuth()
  const client = useQueryClient()
  const [selected, setSelected] = useState('')
  const [bankId, setBankId] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const plans = useQuery({ queryKey: ['plans'], queryFn: () => api('billing/plans/') })
  const billing = useQuery({
    queryKey: ['billing'],
    queryFn: () => api('billing/checkout/'),
    enabled: user?.role === 'owner',
    refetchInterval: 30000,
  })
  const open = billing.data?.payments.find((p) => ['AWAITING_PROOF', 'PENDING'].includes(p.status))
  const subscription = billing.data?.subscription
  async function act(operation, message) {
    setBusy(true)
    setError('')
    setNotice('')
    try {
      await operation()
      await client.invalidateQueries({ queryKey: ['billing'] })
      await refresh()
      setNotice(message)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }
  async function viewProof(id) {
    setError('')
    try {
      const blob = await privateBlob(`billing/payments/${id}/proof/`)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'payment-proof.jpg'
      link.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (err) {
      setError(err.message)
    }
  }
  if (plans.isPending || (user?.role === 'owner' && billing.isPending)) return <Loading />
  if (plans.error || billing.error)
    return (
      <ErrorState
        error={plans.error || billing.error}
        retry={() => {
          plans.refetch()
          billing.refetch()
        }}
      />
    )
  return (
    <section aria-label="Plans and billing" className="billing-page">
      <header className="billing-heading">
        <div>
          <span className="eyebrow">COMQORA / PLANS & BILLING</span>
          <h1>Everything your business needs.</h1>
          <p>One workspace. Every operational feature. Choose whether to add AI.</p>
        </div>
        {user && (
          <div className="billing-actions">
            {user.has_dashboard_access && (
              <Link className="btn btn-secondary" to="/dashboard">
                Dashboard
              </Link>
            )}
            <Button variant="secondary" onClick={signOut}>
              Sign out
            </Button>
          </div>
        )}
      </header>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="billing-notice">
          {notice}
        </p>
      )}
      {subscription && (
        <section className="billing-status">
          <ShieldCheck />
          <div>
            <strong>
              {subscription.plan} ·{' '}
              {subscription.suspended ? 'Suspended' : subscription.active ? 'Active' : 'Expired'}
            </strong>
            <p>Access until {date(subscription.expires_at)}. Renewals are paid manually.</p>
          </div>
          <Button
            variant="secondary"
            onClick={() => act(() => billing.refetch(), 'Status refreshed.')}
          >
            Refresh status
          </Button>
        </section>
      )}
      {user && user.role !== 'owner' && (
        <p className="billing-notice">
          Ask your workspace owner to manage payments and subscriptions.
        </p>
      )}
      <div className="billing-plans">
        {plans.data.map((plan) => (
          <section
            key={plan.id}
            className={`billing-plan ${plan.ai_enabled ? 'billing-plan-ai' : ''}`}
          >
            <span className="eyebrow">
              {plan.ai_enabled ? 'BUSINESS + INTELLIGENCE' : 'COMPLETE OPERATIONS'}
            </span>
            <h2>
              {plan.ai_enabled && <Sparkles size={24} />} {plan.name}
            </h2>
            <p className="billing-price">
              {money(plan.monthly_price)}
              <span> / month</span>
            </p>
            <ul>
              {[
                'Orders, customers & inventory',
                'Products, packaging & couriers',
                'Analytics, marketing & expenses',
                'Banking, settlements & invoices',
                'WhatsApp & team management',
                plan.ai_enabled
                  ? 'AI Manager and all AI features included'
                  : 'All non-AI features included; AI excluded',
              ].map((text) => (
                <li key={text}>
                  <Check size={17} />
                  {text}
                </li>
              ))}
            </ul>
            {!user ? (
              <Link className="btn btn-primary" to="/register">
                Get started
              </Link>
            ) : (
              user.role === 'owner' && (
                <Button
                  disabled={!!open}
                  variant={selected === String(plan.id) ? 'secondary' : 'primary'}
                  onClick={() => setSelected(String(plan.id))}
                >
                  {selected === String(plan.id) ? 'Selected' : `Choose ${plan.name}`}
                </Button>
              )
            )}
          </section>
        ))}
      </div>
      <p className="billing-caption">
        Prices are in PKR per workspace, per calendar month. Access begins after manual payment
        approval. Existing team roles still apply. Connected services require their own setup.
      </p>
      {user?.role === 'owner' && !open && (
        <section className="billing-card">
          <h2>Manual bank transfer</h2>
          <p>Select a plan and a payment account to create your checkout.</p>
          {billing.data.banks.length ? (
            <>
              <label htmlFor="billing-bank">Payment account</label>
              <select id="billing-bank" value={bankId} onChange={(e) => setBankId(e.target.value)}>
                <option value="">Choose a bank</option>
                {billing.data.banks.map((bank) => (
                  <option key={bank.id} value={bank.id}>
                    {bank.bank_name} — {bank.account_title}
                  </option>
                ))}
              </select>
              <p>
                Renewing the same active plan adds a month to its expiry. Changing plans starts a
                new month on approval and replaces the remaining period; no automatic prorating.
              </p>
              <Button
                loading={busy}
                disabled={!selected || !bankId}
                onClick={() =>
                  act(
                    () => post('billing/checkout/', { plan: selected, bank: bankId }),
                    'Checkout ready. Transfer the exact amount below, then submit your proof.',
                  )
                }
              >
                Continue to checkout
              </Button>
            </>
          ) : (
            <p className="billing-notice">
              Payment accounts are not configured yet. Please contact support before paying.
            </p>
          )}
        </section>
      )}
      {open && (
        <section className="billing-card">
          <span className="eyebrow">
            {open.status === 'PENDING' ? 'AWAITING ADMIN VERIFICATION' : 'YOUR CHECKOUT'}
          </span>
          <h2>
            {open.plan_name} · {money(open.amount)}
          </h2>
          <dl>
            {[
              ['Bank', open.bank_details.bank_name],
              ['Account title', open.bank_details.account_title],
              ['Account number', open.bank_details.account_number],
              ['IBAN', open.bank_details.iban],
            ]
              .filter(([, value]) => value)
              .map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
          </dl>
          <p className="billing-instructions">{open.bank_details.instructions}</p>
          {open.status === 'PENDING' ? (
            <>
              <p>
                Your proof is submitted. Access will unlock only after the administrator verifies
                your payment. This page checks for updates automatically.
              </p>
              <Button
                variant="secondary"
                onClick={() => act(() => billing.refetch(), 'Status refreshed.')}
              >
                Check status
              </Button>
            </>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault()
                const screenshot = e.currentTarget.elements.proof.files[0]
                if (!screenshot || screenshot.size > 5 * 1024 * 1024) {
                  setError('Choose a payment screenshot of 5 MB or smaller.')
                  return
                }
                const data = new FormData()
                data.append('reference', e.currentTarget.elements.reference.value)
                data.append('proof', screenshot)
                act(
                  () => api(`billing/payments/${open.id}/submit/`, { method: 'POST', body: data }),
                  'Proof submitted. Your payment is awaiting verification.',
                )
              }}
            >
              <p>
                Transfer exactly <strong>{money(open.amount)}</strong> to the account above, then
                attach the payment receipt.
              </p>
              <label htmlFor="payment-reference">Transaction reference</label>
              <input
                id="payment-reference"
                name="reference"
                maxLength={120}
                required
                placeholder="Bank transaction / reference ID"
              />
              <label htmlFor="payment-proof">Payment screenshot</label>
              <input
                id="payment-proof"
                name="proof"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                required
              />
              <small>
                PNG, JPG or WebP · maximum 5 MB. Only your workspace owner and platform admin can
                view this proof.
              </small>
              <div className="billing-actions">
                <Button loading={busy} type="submit">
                  Submit proof for verification
                </Button>
                <Button
                  disabled={busy}
                  type="button"
                  variant="secondary"
                  onClick={() =>
                    act(() => post(`billing/payments/${open.id}/cancel/`), 'Checkout cancelled.')
                  }
                >
                  Cancel checkout
                </Button>
              </div>
            </form>
          )}
        </section>
      )}
      {!!billing.data?.payments.length && (
        <section className="billing-card">
          <h2>Payment history</h2>
          <div className="billing-history">
            {billing.data.payments.map((p) => (
              <article key={p.id}>
                <div>
                  <strong>
                    {p.plan_name} · {money(p.amount)}
                  </strong>
                  <p>{date(p.created_at)}</p>
                  <small>Reference: {p.reference || 'Not submitted'}</small>
                  {p.review_note && <p>{p.review_note}</p>}
                </div>
                <div>
                  <span className={`billing-payment-state state-${p.status.toLowerCase()}`}>
                    {p.status.replaceAll('_', ' ')}
                  </span>
                  {p.submitted_at && (
                    <Button variant="secondary" onClick={() => viewProof(p.id)}>
                      Download proof
                    </Button>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </section>
  )
}
