import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Eye, ImagePlus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { api, patch } from '../../lib/api'
import { Button, ErrorState, Field, Loading } from '../../components/ui'
import { useAuth } from '../auth/AuthContext'
import PrintPreview, { useBrandLogo } from './PrintPreview'
import { templates } from './documents'

export default function BrandSettings({ designs = false }) {
  const { user, refresh } = useAuth(),
    client = useQueryClient()
  const query = useQuery({ queryKey: ['print-brand'], queryFn: () => api('workspace/') })
  const logo = useBrandLogo(query.data)
  const [busy, setBusy] = useState(false),
    [preview, setPreview] = useState('')
  const owner = user?.role === 'owner'
  async function updated() {
    await client.invalidateQueries({ queryKey: ['print-brand'] })
    await client.invalidateQueries({ queryKey: ['brand-logo'] })
    await refresh()
  }
  async function save(e) {
    e.preventDefault()
    setBusy(true)
    try {
      await patch('workspace/', Object.fromEntries(new FormData(e.currentTarget)))
      await updated()
      toast.success('Brand settings saved')
    } catch (e) {
      toast.error(e.message)
    } finally {
      setBusy(false)
    }
  }
  async function upload(file) {
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Choose a logo smaller than 2 MB.')
      return
    }
    setBusy(true)
    try {
      const form = new FormData()
      form.append('logo', file)
      await api('workspace/logo/', { method: 'POST', body: form })
      await updated()
      toast.success('Your logo is ready for every print')
    } catch (e) {
      toast.error(e.message)
    } finally {
      setBusy(false)
    }
  }
  async function remove() {
    setBusy(true)
    try {
      await api('workspace/logo/', { method: 'DELETE' })
      await updated()
      toast.success('Logo removed')
    } catch (e) {
      toast.error(e.message)
    } finally {
      setBusy(false)
    }
  }
  async function choose(id) {
    setBusy(true)
    try {
      await patch('workspace/', { invoice_template: id })
      await updated()
      toast.success('Default order design saved')
    } catch (e) {
      toast.error(e.message)
    } finally {
      setBusy(false)
    }
  }
  if (query.error) return <ErrorState error={query.error} retry={query.refetch} />
  if (!query.data) return <Loading />
  const brand = query.data
  return (
    <>
      {designs ? (
        <section className="card settings-card print-settings">
          <div className="print-settings-title">
            <span className="print-kicker">THE FINISHING TOUCH</span>
            <h2>A signature for every order.</h2>
            <p>
              Choose the default for order bills, invoices and payment receipts. Other reports use
              the standard business layout.
            </p>
          </div>
          <div className="template-grid">
            {templates.map((t) => (
              <article
                key={t.id}
                className={`template-card ${brand.invoice_template === t.id ? 'selected' : ''}`}
              >
                <button
                  className={`template-art template-art-${t.id}`}
                  style={{ '--swatch': t.color }}
                  onClick={() => setPreview(t.id)}
                  aria-label={`Preview ${t.name} template`}
                >
                  <div className="mini-brand">{brand.name}</div>
                  <div className="mini-title">INVOICE</div>
                  <div className="mini-rule" />
                  <div className="mini-address">
                    <i />
                    <i />
                    <i />
                  </div>
                  <div className="mini-table">
                    <b />
                    <i />
                    <i />
                    <i />
                  </div>
                  <div className="mini-total">PKR 4,900.00</div>
                  <small>Thank you for your order.</small>
                </button>
                <div className="template-info">
                  <div>
                    <h3>{t.name}</h3>
                    <p>{t.note}</p>
                  </div>
                  {brand.invoice_template === t.id && (
                    <span className="template-selected">
                      <Check size={13} /> Selected
                    </span>
                  )}
                </div>
                <div className="template-actions">
                  <Button variant="secondary" onClick={() => setPreview(t.id)}>
                    <Eye size={14} /> Preview
                  </Button>
                  <Button
                    disabled={!owner || busy || brand.invoice_template === t.id}
                    onClick={() => choose(t.id)}
                  >
                    {brand.invoice_template === t.id ? 'Default design' : 'Use design'}
                  </Button>
                </div>
              </article>
            ))}
          </div>
          {!owner && <p className="muted">Your workspace owner can change the default design.</p>}
        </section>
      ) : (
        <section className="card settings-card print-settings">
          <span className="print-kicker">MADE TO LOOK LIKE YOU</span>
          <h2>General & brand</h2>
          <p className="muted">
            Your business identity, carried through every bill, receipt and report.
          </p>
          <form onSubmit={save} key={brand.id}>
            <div className="brand-logo-editor">
              <div className="brand-logo-box">
                {logo.logo ? (
                  <img src={logo.logo} alt="Current brand logo" />
                ) : (
                  <ImagePlus size={32} />
                )}
              </div>
              <div>
                <h3>Business logo</h3>
                <p>PNG, JPEG or WebP · up to 2 MB. A transparent PNG works well on every design.</p>
                {owner && (
                  <div className="brand-logo-actions">
                    <label className={`btn btn-secondary ${busy ? 'disabled' : ''}`}>
                      <ImagePlus size={16} /> Upload logo
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        disabled={busy}
                        onChange={(e) => {
                          upload(e.target.files?.[0])
                          e.target.value = ''
                        }}
                      />
                    </label>
                    {brand.has_logo && (
                      <Button type="button" variant="secondary" disabled={busy} onClick={remove}>
                        <Trash2 size={15} /> Remove
                      </Button>
                    )}
                  </div>
                )}
                {logo.error && (
                  <p role="alert">The saved logo could not be loaded. Refresh to retry.</p>
                )}
              </div>
            </div>
            <Field label="Brand / business name">
              <input
                name="name"
                required
                maxLength={120}
                defaultValue={brand.name}
                disabled={!owner}
              />
            </Field>
            <Field label="Business address">
              <textarea
                name="business_address"
                maxLength={500}
                defaultValue={brand.business_address}
                disabled={!owner}
              />
            </Field>
            <div className="two-col">
              <Field label="Business phone">
                <input
                  name="business_phone"
                  maxLength={40}
                  defaultValue={brand.business_phone}
                  disabled={!owner}
                />
              </Field>
              <Field label="Business email">
                <input
                  name="business_email"
                  type="email"
                  defaultValue={brand.business_email}
                  disabled={!owner}
                />
              </Field>
            </div>
            <Field label="Order document footer">
              <textarea
                name="invoice_footer"
                maxLength={300}
                defaultValue={brand.invoice_footer}
                disabled={!owner}
              />
            </Field>
            <div className="brand-save">
              <span>Currency: PKR · Business timezone: Asia/Karachi</span>
              {owner && (
                <Button loading={busy} type="submit">
                  Save brand settings
                </Button>
              )}
            </div>
          </form>
        </section>
      )}
      {preview && (
        <PrintPreview
          kind="order"
          sample
          brandOverride={brand}
          templateOverride={preview}
          onClose={() => setPreview('')}
        />
      )}
    </>
  )
}
