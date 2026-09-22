import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  MessageCircle,
  RefreshCw,
  ShieldCheck,
  Zap,
  Users,
  Megaphone,
  Package,
  History,
  Link2,
} from 'lucide-react'
import { toast } from 'sonner'
import { api, post, patch } from '../../lib/api'
import { useAuth } from '../auth/AuthContext'
import { Badge, Button, Field, Loading, ErrorState, PageHeading, Empty } from '../../components/ui'
import Select from '../../components/Select'
import { money } from '../../lib/format'
import './whatsapp.css'
import MessageEditor from './MessageEditor'

const label = (text) => text.toLowerCase().replaceAll('_', ' ')
const initial = {
  enabled: false,
  marketing_enabled: false,
  events: [],
  templates: {},
  gap_seconds: 60,
  daily_limit: 100,
  quiet_start: 20,
  quiet_end: 9,
}

export default function WhatsApp({ embedded = false }) {
  const { user } = useAuth()
  const allowed = ['owner', 'manager'].includes(user?.role)
  const [tab, setTab] = useState('account')
  const query = useQuery({
    queryKey: ['whatsapp-account'],
    queryFn: () => api('whatsapp/account/'),
    enabled: allowed,
  })
  if (!allowed)
    return (
      <Empty
        title="WhatsApp management"
        description="Only owners and managers can manage the connection, WhatsApp customers and campaigns. Manual WhatsApp links remain available on orders."
      />
    )
  if (query.isPending) return <Loading />
  if (query.error) return <ErrorState error={query.error} retry={query.refetch} />
  return (
    <div className="whatsapp-center">
      {!embedded && (
        <PageHeading
          eyebrow="CUSTOMER COMMUNICATIONS"
          title="Conversations that count."
          description="Order updates and approved product campaigns, from your connected WhatsApp account."
        />
      )}
      <div className="wa-intro card">
        <MessageCircle size={30} />
        <div>
          <span className="wa-eyebrow">YOUR CUSTOMER COMMUNICATION HUB</span>
          <h2>A personal touch. On autopilot.</h2>
          <p>Connect your number, create branded updates, and follow every message.</p>
        </div>
        <Badge status={query.data.account?.session_status || 'NOT_CONNECTED'} />
      </div>
      <div className="order-tabs wa-tabs">
        {['account', 'notifications', 'contacts', 'campaigns', 'broadcast', 'outbox'].map(
          (item) => (
            <button
              key={item}
              className={tab === item ? 'selected' : ''}
              onClick={() => setTab(item)}
              aria-pressed={tab === item}
            >
              {(() => {
                const Icon = {
                  account: Link2,
                  notifications: Zap,
                  contacts: Users,
                  campaigns: Package,
                  broadcast: Megaphone,
                  outbox: History,
                }[item]
                return <Icon size={17} aria-hidden="true" />
              })()}
              {
                {
                  account: 'Connection',
                  notifications: 'Auto messages',
                  contacts: 'Customers',
                  campaigns: 'Product campaigns',
                  broadcast: 'Broadcast',
                  outbox: 'Message history',
                }[item]
              }
            </button>
          ),
        )}
      </div>
      {tab === 'account' && <Connection data={query.data} refresh={query.refetch} />}
      {tab === 'notifications' && <Preferences data={query.data} refresh={query.refetch} />}
      {tab === 'contacts' && <Contacts />}
      {tab === 'campaigns' && <Campaigns />}
      {tab === 'broadcast' && <Campaigns key="broadcast" broadcast />}
      {tab === 'outbox' && <Outbox />}
      <p className="muted">Sending too many messages may lead to WhatsApp restrictions.</p>
    </div>
  )
}

function Connection({ data, refresh }) {
  const [qr, setQr] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('')
  async function action(value) {
    setBusy(true)
    setError('')
    setQr('')
    try {
      const result = await post('whatsapp/account/', { action: value })
      if (result.qr) setQr(result.qr)
      await refresh()
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <section className="card settings-card">
      <h2>Connect your workspace’s WhatsApp</h2>
      <p className="muted">
        Scan the QR from WhatsApp → Linked devices to connect your business number.
      </p>
      {!data.configured && (
        <p className="form-warning">Connection setup is incomplete. Contact your administrator.</p>
      )}
      {data.configured && !data.worker_running && (
        <p className="form-warning">Automatic sending is offline. Restart the background worker.</p>
      )}
      {data.configured && !data.webhook_configured && (
        <p className="form-warning">
          Unsubscribe setup is incomplete. Contact your administrator before sending.
        </p>
      )}
      <div className="wa-actions">
        <Button disabled={!data.configured || busy} onClick={() => action('connect')}>
          <MessageCircle size={16} />
          Connect / start session
        </Button>
        <Button
          variant="secondary"
          disabled={!data.account || busy}
          onClick={() => action('status')}
        >
          <RefreshCw size={16} />
          Refresh connection
        </Button>
        <Button variant="secondary" disabled={!data.account || busy} onClick={() => action('qr')}>
          Show / refresh QR
        </Button>
        <Button variant="secondary" disabled={!data.account || busy} onClick={() => action('stop')}>
          Pause sends & stop session
        </Button>
      </div>
      {qr && (
        <div className="wa-qr">
          <img src={qr} alt="WhatsApp account pairing QR code" />
          <p>QR expires quickly. Refresh QR if needed, then refresh connection after pairing.</p>
        </div>
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {data.account?.last_error && <p className="form-error">{data.account.last_error}</p>}
    </section>
  )
}

function Preferences({ data, refresh }) {
  const [selectedEvent, setSelectedEvent] = useState(data.account?.events?.[0] || data.events[0])
  const [dirty, setDirty] = useState(false)
  const [form, setForm] = useState({ ...initial, ...(data.account || {}) }),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('')
  const change = (key, value) => {
    setDirty(true)
    setForm((v) => ({ ...v, [key]: value }))
  }
  async function save(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await patch('whatsapp/account/', form)
      await refresh()
      setDirty(false)
      toast.success('WhatsApp preferences saved')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <form className="card settings-card wa-automation" onSubmit={save}>
      <div className="wa-section-heading">
        <div>
          <span className="wa-eyebrow">AUTOMATIC ORDER UPDATES</span>
          <h2>The right message, at the right moment.</h2>
          <p>1. Turn sending on · 2. Choose order events · 3. Personalise and save</p>
        </div>
        <span className="wa-count-pill">{form.events.length} events selected</span>
      </div>
      <div className="wa-control-cards">
        <label className="wa-check wa-toggle-card">
          <input
            type="checkbox"
            checked={form.enabled}
            aria-label="Enable WhatsApp queue sending"
            onChange={(e) => change('enabled', e.target.checked)}
          />
          <div>
            <strong>Automatic sending</strong>
            <small>Allow queued messages to leave your connected account.</small>
          </div>
        </label>
        <label className="wa-check wa-toggle-card">
          <input
            type="checkbox"
            checked={form.marketing_enabled}
            aria-label="Allow approved product campaigns"
            onChange={(e) => change('marketing_enabled', e.target.checked)}
          />
          <div>
            <strong>Product campaigns</strong>
            <small>Allow campaigns you review and approve separately.</small>
          </div>
        </label>
      </div>
      <p className="muted">
        Enabled customers receive selected updates. Removed and unsubscribed customers are excluded.
        Product campaigns still require approval. Disabling sending pauses the queue; cancel
        unwanted pending messages in Outbox before re-enabling.
      </p>
      <details className="wa-delivery-settings">
        <summary>
          Sending schedule & limits{' '}
          <span>
            {form.gap_seconds}s gap · {form.daily_limit} messages / 24h
          </span>
        </summary>
        <div className="wa-grid">
          {[
            ['gap_seconds', 'Gap between messages (seconds)', 30, 3600],
            ['daily_limit', 'Maximum sends per rolling 24 hours', 1, 500],
            ['quiet_start', 'Marketing quiet hours start (PKT)', 0, 23],
            ['quiet_end', 'Marketing quiet hours end (PKT)', 0, 23],
          ].map(([key, title, min, max]) => (
            <Field key={key} label={title}>
              <input
                type="number"
                min={min}
                max={max}
                required
                value={form[key]}
                onChange={(e) => change(key, Number(e.target.value))}
              />
            </Field>
          ))}
        </div>
        <p>
          One marketing message per recipient per 7 days. Service updates bypass marketing quiet
          hours, but use the shared gap and total limit.
        </p>
      </details>
      <div className="wa-automation-layout">
        <aside className="wa-event-list">
          <h3>When should we message?</h3>
          <p>Tick to enable. Select an event to edit its message.</p>
          {data.events.map((event) => (
            <div
              className={`wa-event ${selectedEvent === event ? 'wa-event-active' : ''}`}
              key={event}
            >
              <label className="wa-check">
                <input
                  type="checkbox"
                  checked={form.events.includes(event)}
                  aria-label={label(event)}
                  onChange={(e) => {
                    setSelectedEvent(event)
                    change(
                      'events',
                      e.target.checked
                        ? [...form.events, event]
                        : form.events.filter((v) => v !== event),
                    )
                  }}
                />
              </label>
              <button
                type="button"
                aria-pressed={selectedEvent === event}
                onClick={() => setSelectedEvent(event)}
              >
                <strong>{label(event)}</strong>
                <small>{form.events.includes(event) ? 'Enabled' : 'Off'} · Edit message</small>
              </button>
            </div>
          ))}
        </aside>
        <section className="wa-event-editor">
          {selectedEvent && (
            <>
              <div className="wa-section-heading">
                <div>
                  <h3>{label(selectedEvent)}</h3>
                  <p>
                    {form.events.includes(selectedEvent)
                      ? 'This update is selected. Save preferences to apply your changes.'
                      : 'This event is off. You can prepare the template without enabling it.'}
                  </p>
                </div>
              </div>
              <MessageEditor
                key={selectedEvent}
                label={`${label(selectedEvent)} template`}
                order
                placeholders={data.placeholders}
                previewStatus={label(selectedEvent)}
                maxLength={1500}
                value={form.templates[selectedEvent] ?? data.default_template}
                onChange={(value) =>
                  change('templates', { ...form.templates, [selectedEvent]: value })
                }
              />
            </>
          )}
        </section>
      </div>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="wa-save-bar">
        <span role="status">
          {dirty
            ? 'Unsaved changes — save to apply to future messages.'
            : 'Editing a template does not send a message.'}
        </span>
        <Button loading={busy}>
          <ShieldCheck size={16} />
          Save preferences
        </Button>
      </div>
    </form>
  )
}

function Contacts() {
  const client = useQueryClient()
  const [search, setSearch] = useState(''),
    [offset, setOffset] = useState(0)
  const [confirm, setConfirm] = useState(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('')
  const contacts = useQuery({
    queryKey: ['wa-contacts', search, offset],
    queryFn: () => api(`whatsapp/contacts/?search=${encodeURIComponent(search)}&offset=${offset}`),
  })
  async function remove() {
    setBusy(true)
    setError('')
    try {
      const result = await post(`whatsapp/contacts/${confirm.id}/remove/`, {})
      await client.invalidateQueries({ queryKey: ['wa-contacts'] })
      await client.invalidateQueries({ queryKey: ['wa-campaigns'] })
      toast.success(result.detail)
      setConfirm(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <section className="card settings-card">
      <h2>WhatsApp customers</h2>
      <p>
        Customers with valid phone numbers appear automatically. Enabled customers can receive order
        updates and approved product campaigns. This is a sending preference, not proof of
        permission. STOP and removed numbers remain excluded, even when the customer is edited.
      </p>
      <Field label="Search customers by name or phone">
        <input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setOffset(0)
          }}
          placeholder="Name or international phone number"
        />
      </Field>
      {contacts.isPending && <Loading />}
      {contacts.error && <ErrorState error={contacts.error} retry={contacts.refetch} />}
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Customer</th>
              <th>WhatsApp status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {contacts.data?.map((c) => (
              <tr key={c.id}>
                <td>
                  {c.name}
                  <small className="table-sub">{c.phone}</small>
                </td>
                <td>
                  {c.opted_out
                    ? 'Removed / unsubscribed'
                    : c.transactional && c.marketing
                      ? 'Enabled — orders & products'
                      : 'Limited messaging'}
                </td>
                <td>
                  <Button
                    variant="secondary"
                    disabled={c.opted_out || busy}
                    onClick={() => {
                      setConfirm(c)
                      setError('')
                    }}
                  >
                    {c.opted_out ? 'Excluded from sending' : 'Remove from WhatsApp'}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!contacts.isPending && !contacts.error && contacts.data?.length === 0 && (
        <p>
          No matching WhatsApp customers. Add a customer with a valid phone number in Customers.
        </p>
      )}
      <div className="wa-actions">
        <Button
          variant="secondary"
          disabled={offset === 0 || contacts.isPending}
          onClick={() => setOffset(Math.max(0, offset - 100))}
        >
          Previous
        </Button>
        <span>Page {Math.floor(offset / 100) + 1}</span>
        <Button
          variant="secondary"
          disabled={contacts.data?.length !== 100 || contacts.isPending}
          onClick={() => setOffset(offset + 100)}
        >
          Next
        </Button>
      </div>
      {confirm && (
        <div className="form-warning" role="alert">
          <p>
            Remove {confirm.name} ({confirm.phone}) from all WhatsApp messages? Pending messages
            will be cancelled. Customer details and orders will not be deleted. Messages already
            sending cannot be recalled.
          </p>
          {error && <p className="form-error">{error}</p>}
          <div className="wa-actions">
            <Button loading={busy} onClick={remove}>
              Confirm removal
            </Button>
            <Button variant="secondary" disabled={busy} onClick={() => setConfirm(null)}>
              Keep customer
            </Button>
          </div>
        </div>
      )}
    </section>
  )
}

function Campaigns({ broadcast = false }) {
  const [announcement, setAnnouncement] = useState('')
  const [audience, setAudience] = useState('ALL'),
    [recipients, setRecipients] = useState([])
  const [customerSearch, setCustomerSearch] = useState(''),
    [customerOffset, setCustomerOffset] = useState(0)
  const [media, setMedia] = useState(null),
    [uploading, setUploading] = useState(false)
  const customers = useQuery({
    queryKey: ['wa-audience', customerSearch, customerOffset],
    queryFn: () =>
      api(
        `whatsapp/contacts/?search=${encodeURIComponent(customerSearch)}&offset=${customerOffset}`,
      ),
    enabled: audience === 'SPECIFIC',
  })
  const client = useQueryClient()
  const [search, setSearch] = useState(''),
    [selected, setSelected] = useState([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [confirm, setConfirm] = useState(null)
  const products = useQuery({
    queryKey: ['wa-products', search],
    queryFn: () => api(`products/?page_size=100&search=${encodeURIComponent(search)}`),
  })
  const campaigns = useQuery({
    queryKey: ['wa-campaigns'],
    queryFn: () => api('whatsapp/campaigns/'),
    refetchInterval: 15000,
  })
  const refresh = () => client.invalidateQueries({ queryKey: ['wa-campaigns'] })
  async function upload(file) {
    if (!file) return
    setError('')
    if (file.size > 10 * 1024 * 1024) {
      setError('Choose a file up to 10 MB.')
      return
    }
    setUploading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      setMedia(await api('whatsapp/media/', { method: 'POST', body: form }))
    } catch (err) {
      setError(err.message)
    } finally {
      setUploading(false)
    }
  }
  async function create(e) {
    e.preventDefault()
    const form = e.currentTarget,
      data = new FormData(form)
    setBusy(true)
    setError('')
    try {
      await post('whatsapp/campaigns/', {
        name: data.get('name'),
        body: data.get('body'),
        product_ids: selected.map((p) => p.id),
        kind: broadcast ? 'BROADCAST' : 'PRODUCT',
        audience_mode: audience,
        recipient_ids: audience === 'SPECIFIC' ? recipients.map((c) => c.id) : [],
        media_id: media?.id || null,
        ...(data.get('schedule')
          ? { scheduled_at: new Date(`${data.get('schedule')}:00+05:00`).toISOString() }
          : {}),
      })
      await refresh()
      form.reset()
      setSelected([])
      setAnnouncement('')
      setRecipients([])
      setMedia(null)
      toast.success('Draft created. Review and approve below.')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }
  async function action(campaign, value) {
    setBusy(true)
    setError('')
    try {
      await post(`whatsapp/campaigns/${campaign.id}/action/`, {
        action: value,
        confirm: value === 'approve',
      })
      setConfirm(null)
      await refresh()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <>
      <form className="card settings-card" onSubmit={create}>
        <h2>{broadcast ? 'Create a broadcast' : 'Product announcements'}</h2>
        <p>
          Create a draft, review the exact message, then approve. Approved campaigns automatically
          send to enabled customers, excluding removed and unsubscribed numbers. Adding a product
          never sends an unapproved broadcast.
        </p>
        <Field label="Campaign name">
          <input name="name" required maxLength="100" />
        </Field>
        <MessageEditor
          label="Announcement"
          name="body"
          value={announcement}
          onChange={setAnnouncement}
        />
        <Field label="Send to">
          <Select value={audience} onChange={(e) => setAudience(e.target.value)}>
            <option value="ALL">All Customers</option>
            <option value="SPECIFIC">Specific Customers</option>
          </Select>
        </Field>
        {audience === 'SPECIFIC' && (
          <div>
            <Field label="Find recipients">
              <input
                value={customerSearch}
                onChange={(e) => {
                  setCustomerSearch(e.target.value)
                  setCustomerOffset(0)
                }}
              />
            </Field>
            {customers.error && <ErrorState error={customers.error} retry={customers.refetch} />}
            <Field label="Add recipient">
              <Select
                value=""
                onChange={(e) => {
                  const c = customers.data?.find((row) => row.id === e.target.value)
                  if (c && recipients.length < 1000 && !recipients.some((row) => row.id === c.id))
                    setRecipients([...recipients, c])
                }}
              >
                <option value="">Choose customer</option>
                {Array.isArray(customers.data) &&
                  customers.data
                    .filter((c) => !c.opted_out && c.marketing)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} · {c.phone}
                      </option>
                    ))}
              </Select>
            </Field>
            <div className="wa-actions">
              <Button
                type="button"
                variant="secondary"
                disabled={!customerOffset}
                onClick={() => setCustomerOffset(Math.max(0, customerOffset - 100))}
              >
                Previous customers
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={customers.data?.length !== 100}
                onClick={() => setCustomerOffset(customerOffset + 100)}
              >
                More customers
              </Button>
            </div>
            <p>{recipients.length} selected</p>
            <div className="wa-actions">
              {recipients.map((c) => (
                <Button
                  key={c.id}
                  type="button"
                  variant="secondary"
                  onClick={() => setRecipients(recipients.filter((row) => row.id !== c.id))}
                >
                  {c.name} · {c.phone} ×
                </Button>
              ))}
            </div>
          </div>
        )}
        {!broadcast && (
          <>
            <Field label="Find products">
              <input value={search} onChange={(e) => setSearch(e.target.value)} />
            </Field>
            <Field label="Add product (up to 5)">
              <Select
                value=""
                onChange={(e) => {
                  const p = products.data?.results.find((p) => p.id === e.target.value)
                  if (p && selected.length < 5 && !selected.some((s) => s.id === p.id))
                    setSelected([...selected, p])
                }}
              >
                <option value="">Choose product</option>
                {products.data?.results
                  .filter((p) => p.is_active)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} · {money(p.selling_price)}
                    </option>
                  ))}
              </Select>
            </Field>
            <div className="wa-actions">
              {selected.map((p) => (
                <Button
                  key={p.id}
                  type="button"
                  variant="secondary"
                  onClick={() => setSelected(selected.filter((s) => s.id !== p.id))}
                >
                  {p.name} ×
                </Button>
              ))}
            </div>
          </>
        )}
        <Field label="Attach media (optional, up to 10 MB)">
          <input
            type="file"
            accept="image/jpeg,image/png,application/pdf,video/mp4"
            disabled={uploading || busy}
            onChange={(e) => upload(e.target.files?.[0])}
          />
        </Field>
        <p className="muted">
          JPEG/PNG image, PDF document or MP4 video. Media uploads use Cloudinary; use public
          promotional material, not private documents. Keep media messages short to leave room for
          store and product details (1024 characters total for media captions).
        </p>
        {uploading && <p>Uploading attachment…</p>}
        {media && (
          <div>
            <a href={media.url} target="_blank" rel="noreferrer">
              Preview {media.filename}
            </a>
            <Button type="button" variant="secondary" onClick={() => setMedia(null)}>
              Remove attachment
            </Button>
          </div>
        )}
        <Field label="Schedule (Pakistan time; blank = after approval)">
          <input name="schedule" type="datetime-local" />
        </Field>
        <p className="muted">
          Product names and prices are included. Upload the product image above to send it as actual
          media, not a link. One attachment per campaign. Up to 1000 recipients per campaign. One
          marketing message per number per 7 days. Only send relevant messages customers expect.
        </p>
        <p>
          Scheduled time starts the queue, not simultaneous delivery. Your message gap, daily limit
          and marketing quiet hours apply to broadcasts too.
        </p>
        <Button
          loading={busy}
          disabled={
            uploading ||
            (!broadcast && !selected.length) ||
            (audience === 'SPECIFIC' && !recipients.length)
          }
        >
          Create preview draft
        </Button>
      </form>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {campaigns.error && <p className="form-error">{campaigns.error.message}</p>}
      {campaigns.data
        ?.filter((c) => (c.kind || 'PRODUCT') === (broadcast ? 'BROADCAST' : 'PRODUCT'))
        .map((c) => (
          <section className="card settings-card" key={c.id}>
            <div className="wa-actions">
              <h3>{c.name}</h3>
              <Badge status={c.state} />
            </div>
            <pre className="wa-preview">{c.body}</pre>
            {c.media && (
              <p>
                <a href={c.media.url} target="_blank" rel="noreferrer">
                  Attachment: {c.media.filename}
                </a>
              </p>
            )}
            <p>
              Recipients:{' '}
              {c.audience_mode === 'SPECIFIC'
                ? `${c.recipient_ids.length} selected customers`
                : 'All enabled customers'}
            </p>
            <p>
              Scheduled:{' '}
              {new Date(c.scheduled_at).toLocaleString('en-GB', { timeZone: 'Asia/Karachi' })} PKT ·
              Audience: {c.audience_count || 'Not yet approved'}
            </p>
            <p>
              {Object.entries(c.counts)
                .map(([state, count]) => `${label(state)}: ${count}`)
                .join(' · ')}
            </p>
            {c.state === 'DRAFT' &&
              (confirm === c.id ? (
                <div className="form-warning">
                  <p>
                    Confirm this exact message to {c.eligible_count} currently enabled customers
                    (maximum 1000)? Recipient exclusions and frequency limits are checked again
                    before each send.
                  </p>
                  <Button disabled={busy} onClick={() => action(c, 'approve')}>
                    Confirm & queue campaign
                  </Button>
                  <Button variant="secondary" onClick={() => setConfirm(null)}>
                    Go back
                  </Button>
                </div>
              ) : (
                <Button disabled={busy} onClick={() => setConfirm(c.id)}>
                  Review approval
                </Button>
              ))}
            <div className="wa-actions">
              {c.state === 'RUNNING' && (
                <Button variant="secondary" disabled={busy} onClick={() => action(c, 'pause')}>
                  Pause campaign
                </Button>
              )}
              {c.state === 'PAUSED' && (
                <Button disabled={busy} onClick={() => action(c, 'resume')}>
                  Resume campaign
                </Button>
              )}
              {['DRAFT', 'RUNNING', 'PAUSED'].includes(c.state) && (
                <Button variant="secondary" disabled={busy} onClick={() => action(c, 'cancel')}>
                  Cancel unsent messages
                </Button>
              )}
            </div>
          </section>
        ))}
    </>
  )
}

function Outbox() {
  const [checking, setChecking] = useState(null)
  const query = useQuery({
    queryKey: ['wa-outbox'],
    queryFn: () => api('whatsapp/messages/'),
    refetchInterval: 15000,
  })
  async function cancel(id) {
    try {
      await post(`whatsapp/messages/${id}/cancel/`)
      await query.refetch()
    } catch (e) {
      toast.error(e.message)
    }
  }
  async function check(id) {
    setChecking(id)
    try {
      const result = await post(`whatsapp/messages/${id}/check/`, {})
      toast.success(result.detail)
      await query.refetch()
    } catch (e) {
      toast.error(e.message)
    } finally {
      setChecking(null)
    }
  }
  if (query.isPending) return <Loading />
  if (query.error) return <ErrorState error={query.error} retry={query.refetch} />
  return (
    <section className="card settings-card">
      <h2>Message outbox</h2>
      <p>
        Latest 100 messages. SENT means accepted by WAHA, not guaranteed delivery/read. UNKNOWN
        means a send may have succeeded: check WhatsApp before any manual resend.
      </p>
      {!query.data.length && (
        <Empty
          title="No messages yet"
          description="Enable sending in Auto messages, then send an order update or approve a product campaign."
        />
      )}
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Recipient</th>
              <th>Message</th>
              <th>State</th>
              <th>Details</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {query.data.map((m) => (
              <tr key={m.id}>
                <td>
                  {m.contact__name}
                  <small className="table-sub">{m.contact__phone}</small>
                </td>
                <td>
                  <small>
                    {m.kind} · {label(m.event || 'manual')}
                  </small>
                  <details>
                    <summary>View message</summary>
                    <pre className="wa-preview">{m.body}</pre>
                  </details>
                </td>
                <td>
                  <Badge status={m.state} />
                  <small className="table-sub">
                    {{
                      '-1': 'Delivery error',
                      0: 'Pending at WhatsApp',
                      1: 'Accepted by WhatsApp server',
                      2: 'Delivered to device',
                      3: 'Read',
                      4: 'Played / read',
                    }[m.ack] || 'Delivery unconfirmed'}
                  </small>
                </td>
                <td>
                  {m.error ||
                    (m.sent_at
                      ? new Date(m.sent_at).toLocaleString('en-GB', { timeZone: 'Asia/Karachi' })
                      : 'Queued')}
                </td>
                <td>
                  {m.state === 'PENDING' && (
                    <Button variant="secondary" onClick={() => cancel(m.id)}>
                      Cancel
                    </Button>
                  )}
                  {['SENT', 'UNKNOWN'].includes(m.state) && (
                    <Button
                      variant="secondary"
                      disabled={checking !== null}
                      onClick={() => check(m.id)}
                    >
                      {checking === m.id ? 'Checking…' : 'Check delivery'}
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
