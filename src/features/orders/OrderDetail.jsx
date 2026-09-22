import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  Truck,
  MapPin,
  Phone,
  Package,
  ShieldCheck,
  RotateCcw,
  X,
  ArrowUpRight,
  Check,
  CreditCard,
  MessageCircle,
  RefreshCw,
} from 'lucide-react'
import { toast } from 'sonner'
import { api, post } from '../../lib/api'
import { date, money } from '../../lib/format'
import {
  Badge,
  Button,
  Empty,
  ErrorState,
  Field,
  Loading,
  Modal,
  PageHeading,
} from '../../components/ui'
import { useAuth } from '../auth/AuthContext'
import Select from '../../components/Select'
import { ACTIVE_SHIPMENT_STATUSES } from '../../lib/orderStatus'
import ManualMessage from '../whatsapp/ManualMessage'
import PrintPreview from '../printing/PrintPreview'
export default function OrderDetail() {
  const { id } = useParams(),
    client = useQueryClient(),
    { user } = useAuth()
  const [action, setAction] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('')
  const query = useQuery({
    queryKey: ['order', id],
    queryFn: () => api(`orders/${id}/`),
    refetchInterval: 15000,
  })
  const worker = useQuery({
    queryKey: ['integrations'],
    queryFn: () => api('workspace/'),
    refetchInterval: 30000,
  })
  const [syncing, setSyncing] = useState(false)
  const [printOpen, setPrintOpen] = useState(false)
  async function syncTracking() {
    setSyncing(true)
    try {
      const result = await post(`orders/${id}/sync-tracking/`)
      toast.success(result.detail)
    } catch (err) {
      toast.error(err.message)
    } finally {
      await client.invalidateQueries({ predicate: (q) => q.queryKey[0] !== 'auth' })
      setSyncing(false)
    }
  }
  const canWrite = user?.role !== 'viewer'
  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    const data = Object.fromEntries(new FormData(e.currentTarget))
    const payload =
      action === 'receive-return'
        ? {
            damaged: Object.fromEntries(
              Object.entries(data).map(([key, value]) => [key, Number(value)]),
            ),
          }
        : data
    try {
      await post(`orders/${id}/${action}/`, payload)
      await client.invalidateQueries({ predicate: (q) => q.queryKey[0] !== 'auth' })
      setAction('')
      toast.success('Order updated. Financials recalculated.')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }
  if (query.isPending) return <Loading />
  if (query.error) return <ErrorState error={query.error} retry={query.refetch} />
  const o = query.data,
    f = o.financials
  const phone = o.customer_snapshot.phone.replace(/[^0-9]/g, '').replace(/^0/, '92')
  return (
    <>
      {printOpen && <PrintPreview kind="order" orderId={id} onClose={() => setPrintOpen(false)} />}
      <Link to="/orders" className="back-link">
        <ArrowLeft size={15} />
        Back to orders
      </Link>
      <PageHeading
        title={o.number}
        description={`Created ${date(o.created_at)} · ${o.items.reduce((s, i) => s + i.quantity, 0)} items · ${o.payment_type}`}
        actions={
          <>
            <Badge status={o.status} />
            <Button variant="secondary" onClick={() => setPrintOpen(true)}>
              Print bill / receipt
            </Button>
            {canWrite && o.status === 'CREATED' && (
              <>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setAction('cancel')
                    setError('')
                  }}
                >
                  <X size={15} />
                  Cancel order
                </Button>
                <Button
                  onClick={() => {
                    setAction('dispatch')
                    setError('')
                  }}
                >
                  <Truck size={17} />
                  Dispatch order
                </Button>
              </>
            )}
            {canWrite && o.status === 'RETURNED' && !o.return_received_at && (
              <Button
                onClick={() => {
                  setAction('receive-return')
                  setError('')
                }}
              >
                <RotateCcw size={16} />
                Receive return
              </Button>
            )}
          </>
        }
      />
      <div className="detail-layout">
        <div className="detail-main">
          <section className="card">
            <div className="card-heading">
              <div>
                <h2>Order items</h2>
                <p>Product and FIFO costs, captured at creation.</p>
              </div>
              <Package size={19} />
            </div>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Quantity</th>
                    <th>Unit price</th>
                    <th>FIFO cost</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {o.items.map((i) => (
                    <tr key={i.id}>
                      <td>
                        <strong>{i.name}</strong>
                        <small className="table-sub">{i.sku}</small>
                      </td>
                      <td>{i.quantity}</td>
                      <td>{money(i.unit_price)}</td>
                      <td>{money(i.fifo_cost)}</td>
                      <td>{money(i.quantity * Number(i.unit_price))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="detail-padding">
              <details className="breakdown">
                <summary>View FIFO batch allocations</summary>
                {o.items.map((i) => (
                  <div key={i.id}>
                    <strong>{i.name}</strong>
                    {i.allocations.map((a) => (
                      <p key={a.id}>
                        {a.reference} · {a.quantity} units × {money(a.unit_cost)}
                      </p>
                    ))}
                  </div>
                ))}
              </details>
            </div>
          </section>
          <section className="card section-gap">
            <div className="card-heading">
              <div>
                <h2>Shipment timeline</h2>
                <p>Original courier checkpoints · times shown in Pakistan Standard Time.</p>
              </div>
              <Truck size={19} />
            </div>
            <div className="tracking-banner">
              <div>
                <small>COURIER</small>
                <strong>{o.courier_name}</strong>
              </div>
              <div>
                <small>TRACKING ID</small>
                <strong>{o.tracking_id || 'Awaiting dispatch'}</strong>
              </div>
              <div>
                <small>WEIGHT</small>
                <strong>{o.weight} kg</strong>
              </div>
            </div>
            <div className="tracking-sync-panel">
              {o.tracking?.warning && (
                <p className="form-warning" role="status">
                  {o.tracking.warning}
                </p>
              )}
              {o.tracking?.configured && o.tracking_mode === 'AUTO' && (
                <p>
                  Via {o.tracking.source === 'postex' ? 'PostEx' : 'Run Courier'} · checks every{' '}
                  {o.tracking.poll_seconds}s while unresolved · page refreshes every 15s.
                </p>
              )}
              {o.tracking?.configured &&
                o.tracking_mode === 'AUTO' &&
                worker.data &&
                !worker.data.integrations.tracking_worker.running && (
                  <p className="form-warning" role="status">
                    Background tracking worker is not running. Start it to enable automatic checks.
                  </p>
                )}
              <p>
                Last successful check:{' '}
                {o.tracking_checked_at
                  ? new Date(o.tracking_checked_at).toLocaleString('en-GB', {
                      timeZone: 'Asia/Karachi',
                    })
                  : 'Not checked yet'}
              </p>
              {o.tracking_next_sync_at && (
                <p>
                  Next check due:{' '}
                  {new Date(o.tracking_next_sync_at).toLocaleString('en-GB', {
                    timeZone: 'Asia/Karachi',
                  })}
                </p>
              )}
              {o.tracking_error && (
                <p className="form-error" role="alert">
                  {o.tracking_error}
                </p>
              )}
              {canWrite &&
                o.tracking?.configured &&
                o.tracking_mode === 'AUTO' &&
                ACTIVE_SHIPMENT_STATUSES.includes(o.status) && (
                  <Button variant="secondary" loading={syncing} onClick={syncTracking}>
                    <RefreshCw size={15} />
                    Check tracking now
                  </Button>
                )}
              {canWrite && ACTIVE_SHIPMENT_STATUSES.includes(o.status) && (
                <div className="manual-tracking-actions">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setAction('manual-status')
                      setError('')
                    }}
                  >
                    Update status manually
                  </Button>
                  {o.tracking_mode === 'MANUAL' && o.tracking?.configured && (
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setAction('resume-tracking')
                        setError('')
                      }}
                    >
                      Resume auto tracking
                    </Button>
                  )}
                </div>
              )}
            </div>
            <div className="timeline">
              {[...o.tracking_events]
                .sort(
                  (a, b) =>
                    new Date(a.occurred_at || a.created_at).getTime() -
                    new Date(b.occurred_at || b.created_at).getTime(),
                )
                .map((ev, i) => (
                  <div className="timeline-event" key={ev.id}>
                    <span
                      className={`timeline-dot ${i === o.tracking_events.length - 1 ? 'current' : ''}`}
                    >
                      <Check size={12} />
                    </span>
                    <div>
                      <strong className="tracking-original-status">
                        {ev.raw_status || ev.status.toLowerCase().replaceAll('_', ' ')}
                      </strong>
                      {!ev.raw_status && <p>{ev.message}</p>}
                      <small>
                        {new Date(ev.occurred_at || ev.created_at).toLocaleString('en-GB', {
                          timeZone: 'Asia/Karachi',
                        })}{' '}
                        PKT ·{' '}
                        {ev.source === 'manual'
                          ? 'Manual team update'
                          : ev.source === 'webhook'
                            ? 'Webhook'
                            : ev.source === 'local'
                              ? 'Local action'
                              : `${ev.source === 'postex' ? 'PostEx' : 'Run Courier'}${ev.occurred_at ? '' : ' · observed time; courier time unavailable'}`}
                      </small>
                    </div>
                  </div>
                ))}
            </div>
            {o.status === 'RETURNED' && !o.return_received_at && (
              <p className="form-warning detail-padding">
                Return inspection is pending. Reusable inventory and final loss will be recognized
                when you receive this return.
              </p>
            )}
          </section>
          <div className="two-col section-gap">
            <section className="card">
              <div className="card-heading">
                <h2>Customer details</h2>
              </div>
              <div className="customer-details">
                <strong>{o.customer_snapshot.name}</strong>
                <p>
                  <MapPin size={16} />
                  {o.customer_snapshot.address}, {o.customer_snapshot.city}
                </p>
                <p>
                  <Phone size={15} />
                  {o.customer_snapshot.phone}
                </p>
                <div className="customer-contact-actions">
                  <a
                    className="btn btn-secondary"
                    href={`https://wa.me/${phone}?text=${encodeURIComponent(`Hi ${o.customer_snapshot.name}, here is an update on your order ${o.number}. ${o.tracking_id ? `Your ${o.courier_name} tracking ID is ${o.tracking_id}.` : ''}`)}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <MessageCircle size={16} />
                    Open WhatsApp
                    <ArrowUpRight size={14} />
                  </a>
                  {['owner', 'manager'].includes(user?.role) && <ManualMessage order={o} />}
                </div>
              </div>
            </section>
            <section className="card">
              <div className="card-heading">
                <h2>Order notes</h2>
              </div>
              <div className="detail-padding">
                {o.notes ? (
                  <p className="notes-text">{o.notes}</p>
                ) : (
                  <Empty
                    title="No notes"
                    description="No internal notes were added to this order."
                  />
                )}
              </div>
            </section>
          </div>
        </div>
        <aside>
          <section className="card financial-card">
            <div className="card-heading">
              <div>
                <h2>Financial summary</h2>
                <p>Every rupee, with a reason.</p>
              </div>
              <ShieldCheck size={20} />
            </div>
            <div className="financial-lines">
              <div>
                <span>Subtotal</span>
                <strong>{money(o.subtotal)}</strong>
              </div>
              <div>
                <span>Discount</span>
                <strong>− {money(o.discount)}</strong>
              </div>
              <div className="line-total">
                <span>Net sale</span>
                <strong>{money(f.net_sale)}</strong>
              </div>
              <div>
                <span>Charge handling</span>
                <strong>{o.charges_mode === 'ADD' ? 'Added to bill' : 'Absorbed'}</strong>
              </div>
              {o.charges_mode === 'ADD' && (
                <div>
                  <span>Includes added charges</span>
                  <strong>{money(o.customer_charges)}</strong>
                </div>
              )}
              <div>
                <span>Advance collected</span>
                <strong>{money(o.advance_paid)}</strong>
              </div>
              <div>
                <span>Refunds recorded</span>
                <strong>{money(o.refunded_amount)}</strong>
              </div>
              {f.is_final && (
                <div className="line-total">
                  <span>Recognized revenue</span>
                  <strong>{money(f.revenue)}</strong>
                </div>
              )}
              <div className="cost-section-label">ORDER COSTS</div>
              <div>
                <span>Product / FIFO</span>
                <strong>{money(f.product_cost)}</strong>
              </div>
              <details className="breakdown">
                <summary>
                  <span>Courier & return</span>
                  <strong>{money(f.courier_cost)}</strong>
                </summary>
                <p>Contract: {o.courier_snapshot.courier}</p>
                {f.courier_cost_source && (
                  <p>
                    Cost source:{' '}
                    <Link to={`/bank/${f.courier_cost_source}`}>
                      {f.courier_cost_basis === 'ALLOCATED'
                        ? 'CPR + allocated shared expenses'
                        : 'Verified CPR row'}
                    </Link>
                    . Original estimate: {money(f.courier_cost_estimate)}.
                  </p>
                )}
                <p>Base: {money(o.courier_snapshot.base_rate)}</p>
                <p>
                  Region:{' '}
                  {(o.courier_snapshot.delivery_zone || 'Standard contract').replaceAll('_', ' ')}
                </p>
                {(o.courier_snapshot.extra_fees || []).map((fee, i) => (
                  <p key={i}>
                    {fee.name}
                    {fee.kind === 'PERCENT' ? ` (${fee.amount}%)` : ''}: {money(fee.cost)}
                  </p>
                ))}
                <p>Additional weight: {money(o.courier_snapshot.extra_weight_charge)}</p>
                <p>
                  Tax: {money(o.courier_snapshot.tax)} · Fixed:{' '}
                  {money(o.courier_snapshot.fixed_charge)}
                </p>
                <p>Return charge: {money(o.return_cost)}</p>
              </details>
              <details className="breakdown">
                <summary>
                  <span>Packaging</span>
                  <strong>{money(f.packaging_cost)}</strong>
                </summary>
                {o.packaging_snapshot.map((p) => (
                  <p key={p.id}>
                    {p.name} · {p.quantity} {p.unit} · {money(p.cost)}
                  </p>
                ))}
              </details>
              <details className="breakdown">
                <summary>
                  <span>Ads & marketing</span>
                  <strong>{money(o.ad_cost)}</strong>
                </summary>
                {o.ad_history.length ? (
                  o.ad_history.map((a, i) => (
                    <p key={i}>
                      {a.campaign} · {money(a.amount)} {a.active ? '' : '(undone)'}
                    </p>
                  ))
                ) : (
                  <p>Direct ad cost captured at order creation.</p>
                )}
              </details>
              <details className="breakdown">
                <summary>
                  <span>Other costs</span>
                  <strong>{money(o.other_cost)}</strong>
                </summary>
                {o.other_costs.map((c, i) => (
                  <p key={i}>
                    {c.name} · {money(c.amount)}
                  </p>
                ))}
              </details>
              <div className="line-total">
                <span>Total costs</span>
                <strong>{money(f.cost)}</strong>
              </div>
            </div>
            <div
              className={`profit-result ${Number(f.is_final ? f.profit : f.expected_profit) < 0 ? 'profit-negative' : ''}`}
            >
              <span>
                {f.is_final
                  ? 'REALIZED ORDER RESULT'
                  : o.status === 'RETURNED'
                    ? 'ESTIMATED RETURN RESULT'
                    : 'EXPECTED ORDER PROFIT'}
              </span>
              <strong>{money(f.is_final ? f.profit : f.expected_profit)}</strong>
              <p>
                {f.is_final
                  ? `${f.margin}% margin on recognized revenue`
                  : o.status === 'RETURNED'
                    ? 'Assumes reusable stock · inspection pending'
                    : 'Estimate · final outcome is pending'}
              </p>
            </div>
            <p className="financial-footnote">
              <ShieldCheck size={14} />
              Costs are saved with the order. Settings changes won’t rewrite its history.
            </p>
            {['owner', 'manager'].includes(user.role) && (
              <div className="detail-padding">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setAction('refund')
                    setError('')
                  }}
                >
                  <CreditCard size={15} />
                  Record a refund
                </Button>
              </div>
            )}
          </section>
        </aside>
      </div>
      {action && (
        <Modal
          title={
            action === 'manual-status'
              ? 'Manual shipment update'
              : action === 'resume-tracking'
                ? 'Resume automatic tracking?'
                : action === 'dispatch'
                  ? 'Ready to dispatch?'
                  : action === 'cancel'
                    ? 'Cancel this order?'
                    : action === 'refund'
                      ? 'Record a customer refund'
                      : 'Receive & inspect return'
          }
          description={
            action === 'manual-status'
              ? 'This records an audited status update and pauses automatic tracking. Delivered/returned outcomes cannot be reversed here. Returned stock still requires inspection.'
              : action === 'resume-tracking'
                ? 'New courier checkpoints will update this unresolved shipment again. Older checkpoints cannot override your latest manual update.'
                : action === 'dispatch'
                  ? 'Enter the tracking ID from your courier booking. Stock and packaging will be deducted.'
                  : action === 'cancel'
                    ? 'Product reservations will be released. Already incurred ad and other costs remain.'
                    : action === 'refund'
                      ? 'Record an already-paid refund. This does not transfer money.'
                      : 'Enter damaged quantities. All other units return to their original FIFO batches.'
          }
          onClose={() => !busy && setAction('')}
        >
          <form onSubmit={submit}>
            {action === 'manual-status' && (
              <>
                <Field label="Shipment status">
                  <Select name="status" defaultValue={o.status} required>
                    <option value="IN_TRANSIT">In transit</option>
                    <option value="OUT_FOR_DELIVERY">Out for delivery</option>
                    <option value="DELIVERY_FAILED">Delivery failed</option>
                    <option value="RETURN_IN_TRANSIT">Return in transit</option>
                    <option value="DELIVERED">Delivered</option>
                    <option value="RETURNED">Returned to sender</option>
                  </Select>
                </Field>
                <Field label="Reason / update details">
                  <textarea
                    name="message"
                    required
                    minLength={3}
                    maxLength={250}
                    rows={3}
                    placeholder="e.g. Delivery confirmed with customer by phone"
                  />
                </Field>
              </>
            )}
            {action === 'dispatch' && (
              <Field label="Courier tracking ID">
                <input name="tracking_id" required autoFocus maxLength={100} />
              </Field>
            )}
            {action === 'refund' && (
              <Field label="Refund amount (PKR)">
                <input type="number" name="amount" required min="0.01" step="0.01" />
              </Field>
            )}
            {action === 'receive-return' &&
              o.items.map((i) => (
                <Field
                  key={i.id}
                  label={`${i.name} · ${i.quantity} shipped`}
                  hint="Zero means all units are reusable."
                >
                  <input
                    name={i.id}
                    type="number"
                    min="0"
                    max={i.quantity}
                    step="1"
                    defaultValue="0"
                    required
                  />
                </Field>
              ))}
            {error && <p className="form-error">{error}</p>}
            <div className="modal-actions">
              <Button
                type="button"
                variant="secondary"
                disabled={busy}
                onClick={() => setAction('')}
              >
                Go back
              </Button>
              <Button type="submit" loading={busy}>
                Confirm {action === 'receive-return' ? 'return receipt' : action}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </>
  )
}
