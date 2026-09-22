import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useQuery } from '@tanstack/react-query'
import { Printer, X } from 'lucide-react'
import { api, all, privateBlob } from '../../lib/api'
import { today } from '../../lib/format'
import { Button, ErrorState, Field, Loading } from '../../components/ui'
import { billAmounts, OrderDocument, ReportDocument, sampleOrder, templates } from './documents'
import './printing.css'

export function useBrandLogo(brand) {
  const [asset, setAsset] = useState(null)
  const query = useQuery({
    queryKey: ['brand-logo', brand?.id, brand?.logo_updated_at],
    enabled: !!brand?.has_logo,
    queryFn: ({ signal }) => privateBlob('workspace/logo/', signal),
    retry: false,
  })
  useEffect(() => {
    if (!brand?.has_logo || !query.data) return undefined
    const url = URL.createObjectURL(query.data)
    setAsset({ blob: query.data, url })
    return () => URL.revokeObjectURL(url)
  }, [brand?.has_logo, query.data])
  const logo = asset?.blob === query.data ? asset?.url || '' : ''
  return {
    logo: brand?.has_logo ? logo : '',
    loading: !!brand?.has_logo && (query.isPending || (!logo && !query.error)),
    error: query.error,
    retry: query.refetch,
  }
}

export async function loadPrintRows(kind, filters, signal) {
  const endpoint = kind === 'inventory' ? 'stock-batches' : kind
  const params = new URLSearchParams(filters)
  params.delete('page')
  params.set('page_size', '100')
  const result = [],
    seen = new Set()
  let expected
  for (let page = 1; page <= 100; page++) {
    params.set('page', String(page))
    const data = await api(`${endpoint}/?${params}`, { signal })
    if (expected === undefined) expected = data.count
    if (expected > 10000)
      throw new Error('This selection exceeds 10,000 records. Narrow your search before printing.')
    if (expected !== data.count)
      throw new Error(
        'Records changed while preparing this report. Reload the preview to get a complete list.',
      )
    for (const row of data.results) {
      if (seen.has(row.id))
        throw new Error('Records changed while preparing this report. Reload the preview.')
      seen.add(row.id)
      result.push(row)
    }
    if (!data.next) {
      if (result.length !== expected)
        throw new Error('The report is incomplete. Reload the preview.')
      return result
    }
  }
  throw new Error('This report is too large. Narrow your search before printing.')
}

export default function PrintPreview({
  kind,
  orderId,
  accountId = '',
  filters = '',
  filterLabel = '',
  sample = false,
  brandOverride,
  templateOverride,
  onClose,
}) {
  const panel = useRef(null)
  const [zoom, setZoom] = useState(1)
  const [account, setAccount] = useState(accountId)
  const [start, setStart] = useState(''),
    [end, setEnd] = useState(today())
  const [template, setTemplate] = useState(templateOverride || '')
  const [documentType, setDocumentType] = useState('bill')
  const [printing, setPrinting] = useState(false),
    [printError, setPrintError] = useState('')
  const [generatedAt] = useState(() => new Date().toISOString())
  const workspace = useQuery({
    queryKey: ['print-brand'],
    queryFn: () => api('workspace/'),
    enabled: !brandOverride,
    staleTime: 0,
  })
  const brand = brandOverride || workspace.data
  const logo = useBrandLogo(brand)
  const accounts = useQuery({
    queryKey: ['bank', 'accounts'],
    queryFn: () => all('bank-accounts'),
    enabled: kind === 'bank',
  })
  const selectedAccount = account || accounts.data?.[0]?.id || ''
  const selected = accounts.data?.find((a) => a.id === selectedAccount)
  const startDate = start || selected?.opening_date || ''
  const data = useQuery({
    queryKey: ['print-data', kind, orderId, filters, selectedAccount, startDate, end, sample],
    enabled: sample || kind !== 'bank' || !!(selectedAccount && startDate && end),
    retry: false,
    queryFn: ({ signal }) =>
      sample
        ? sampleOrder
        : kind === 'order'
          ? api(`orders/${orderId}/`, { signal })
          : kind === 'bank'
            ? api(
                `bank-accounts/${selectedAccount}/statement/?${new URLSearchParams({ start_date: startDate, end_date: end })}`,
                { signal },
              )
            : loadPrintRows(kind, filters, signal),
  })
  useEffect(() => {
    const resize = () =>
      setZoom(Math.min(1, Math.max(0.25, (panel.current.clientWidth - 40) / ((210 * 96) / 25.4))))
    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(panel.current)
    return () => observer.disconnect()
  }, [])
  useEffect(() => {
    const previous = document.activeElement,
      root = document.getElementById('root')
    const oldInert = root?.inert,
      overflow = document.body.style.overflow
    if (root) root.inert = true
    document.body.style.overflow = 'hidden'
    panel.current?.focus()
    const key = (e) => {
      if (e.key === 'Escape') onClose()
      if (e.key !== 'Tab') return
      const buttons = [
        ...panel.current.querySelectorAll('button:not([disabled]), select, input, [tabindex="0"]'),
      ]
      const first = buttons[0],
        last = buttons.at(-1)
      if (
        e.shiftKey &&
        (document.activeElement === first || document.activeElement === panel.current)
      ) {
        e.preventDefault()
        last?.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first?.focus()
      }
    }
    document.addEventListener('keydown', key)
    return () => {
      if (root) root.inert = oldInert
      document.body.style.overflow = overflow
      document.removeEventListener('keydown', key)
      previous?.focus()
    }
  }, [onClose])
  const invalidReceipt =
    kind === 'order' &&
    documentType === 'receipt' &&
    data.data &&
    Number(billAmounts(data.data).retained) <= 0
  const failure =
    workspace.error && !brandOverride ? workspace.error : data.error || accounts.error || logo.error
  const ready =
    !!brand && !!data.data && !data.isFetching && !logo.loading && !failure && !invalidReceipt
  async function print() {
    setPrinting(true)
    setPrintError('')
    const oldTitle = document.title
    try {
      await document.fonts?.ready
      await Promise.all(
        [...panel.current.querySelectorAll('.paper img')].map((img) => img.decode()),
      )
      document.title = `${brand.name} - ${kind === 'order' ? data.data.number : kind} - ${today()}`
      window.print()
    } catch {
      setPrintError('The logo could not finish loading. Reload the preview and try again.')
    } finally {
      document.title = oldTitle
      setPrinting(false)
    }
  }
  return createPortal(
    <div
      className="print-portal"
      role="dialog"
      aria-modal="true"
      aria-label="Print preview"
      ref={panel}
      tabIndex={-1}
    >
      <div className="print-controls">
        <div>
          <span className="print-kicker">YOUR BRAND. ON PAPER.</span>
          <h2>Print preview</h2>
          <p>A4 · Select “Save as PDF” in the print dialog to download.</p>
        </div>
        <div className="print-toolbar">
          {kind === 'order' && (
            <>
              <Field label="Document">
                <select value={documentType} onChange={(e) => setDocumentType(e.target.value)}>
                  <option value="bill">Order bill</option>
                  <option value="invoice">Invoice</option>
                  <option value="receipt">Payment receipt</option>
                </select>
              </Field>
              <Field label="Design">
                <select
                  value={template || brand?.invoice_template || 'studio'}
                  onChange={(e) => setTemplate(e.target.value)}
                >
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </Field>
            </>
          )}
          {kind === 'bank' && (
            <>
              <Field label="Account">
                <select
                  value={selectedAccount}
                  onChange={(e) => {
                    setAccount(e.target.value)
                    setStart('')
                  }}
                >
                  {!accounts.data?.length && <option value="">No accounts</option>}
                  {accounts.data?.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                      {a.last_four ? ` · ${a.last_four}` : ''}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="From">
                <input
                  type="date"
                  value={startDate}
                  min={selected?.opening_date}
                  max={end}
                  onChange={(e) => setStart(e.target.value)}
                />
              </Field>
              <Field label="Through">
                <input
                  type="date"
                  value={end}
                  min={startDate}
                  max={today()}
                  onChange={(e) => setEnd(e.target.value)}
                />
              </Field>
            </>
          )}
          <Button disabled={!ready} loading={printing} onClick={print}>
            <Printer size={16} /> Print / Save PDF
          </Button>
          <Button variant="secondary" onClick={onClose} aria-label="Close print preview">
            <X size={18} />
          </Button>
        </div>
      </div>
      <div className="print-stage" style={{ '--paper-zoom': zoom }}>
        {failure ? (
          <ErrorState
            error={failure}
            retry={() => {
              if (!brandOverride) workspace.refetch()
              if (kind === 'bank') accounts.refetch()
              if (kind !== 'bank' || (selectedAccount && startDate && end)) data.refetch()
              if (brand?.has_logo) logo.retry()
            }}
          />
        ) : kind === 'bank' && accounts.data?.length === 0 ? (
          <p className="print-notice">Add a bank account to prepare its statement.</p>
        ) : !ready && !invalidReceipt ? (
          <Loading />
        ) : invalidReceipt ? (
          <p className="print-notice" role="alert">
            There is no positive recorded advance or prepaid amount after refunds. Choose an order
            bill or invoice for this order.
          </p>
        ) : kind === 'order' ? (
          <OrderDocument
            brand={brand}
            logo={logo.logo}
            order={data.data}
            template={template || brand.invoice_template || 'studio'}
            documentType={documentType}
            sample={sample}
          />
        ) : (
          <ReportDocument
            brand={brand}
            logo={logo.logo}
            kind={kind}
            rows={kind === 'bank' ? [] : data.data}
            statement={kind === 'bank' ? data.data : undefined}
            filterLabel={filterLabel}
            generatedAt={generatedAt}
          />
        )}
        {printError && (
          <p className="print-notice" role="alert">
            {printError}
          </p>
        )}
      </div>
    </div>,
    document.body,
  )
}
