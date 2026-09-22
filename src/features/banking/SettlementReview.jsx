import { useEffect, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  Plus,
  Save,
  ShieldCheck,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import { api, all, post, privateBlob } from '../../lib/api'
import { money } from '../../lib/format'
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
import Select from '../../components/Select'
import { CashModal, FinanceGate, ReversalModal } from './Bank'
import './banking.css'

const columnRoles = [
  ['unknown', 'Choose meaning…'],
  ['tracking', 'Tracking / CN'],
  ['order_ref', 'Your order reference'],
  ['gross', 'Settlement gross (+)'],
  ['fee', 'Courier expense (−)'],
  ['deduction', 'Other deduction / withholding (−)'],
  ['credit', 'Other credit / release (+)'],
  ['fee_credit', 'Courier expense credit (+)'],
  ['net', 'Reported row net'],
  ['info', 'Information only'],
]

function SourcePreview({ statement, selected, onPage }) {
  const [url, setUrl] = useState(''),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false)
  const [textMode, setTextMode] = useState(false)
  const [zoom, setZoom] = useState(100)
  const isPdf = (statement.extracted?.document_kind || 'pdf') === 'pdf'
  const page = selected?.page || 1,
    sourcePage = statement.extracted.pages?.[page - 1]
  useEffect(() => {
    if (!isPdf) return undefined
    const controller = new AbortController()
    let objectUrl = ''
    setUrl('')
    setError('')
    privateBlob(`settlement-imports/${statement.id}/source/?page=${page}`, controller.signal)
      .then((blob) => {
        if (!controller.signal.aborted) {
          objectUrl = URL.createObjectURL(blob)
          setUrl(objectUrl)
        }
      })
      .catch((err) => {
        if (!controller.signal.aborted) setError(err.message)
      })
    return () => {
      controller.abort()
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [statement.id, page, isPdf])
  async function download() {
    setBusy(true)
    try {
      const blob = await privateBlob(`settlement-imports/${statement.id}/source/`)
      const objectUrl = URL.createObjectURL(blob),
        link = document.createElement('a')
      link.href = objectUrl
      link.download = statement.filename
      link.click()
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBusy(false)
    }
  }
  const box = selected?.bbox
  return (
    <aside className="bank-source bank-panel">
      <div className="bank-source-heading">
        <div>
          <FileText size={19} />
          <strong>Original document</strong>
        </div>
        <Button
          variant="secondary"
          loading={busy}
          aria-label="Download original statement"
          onClick={download}
        >
          <Download size={16} />
        </Button>
      </div>
      {isPdf ? (
        <>
          <div className="bank-source-controls">
            <Button
              variant="secondary"
              aria-label="Previous PDF page"
              disabled={page <= 1}
              onClick={() => onPage({ page: page - 1 })}
            >
              <ChevronLeft size={16} />
            </Button>
            <span>
              Page {page} / {statement.page_count || '?'}
            </span>
            <Button
              variant="secondary"
              aria-label="Next PDF page"
              disabled={page >= statement.page_count}
              onClick={() => onPage({ page: page + 1 })}
            >
              <ChevronRight size={16} />
            </Button>
            <button className="bank-text-link" onClick={() => setTextMode(!textMode)}>
              {textMode ? 'Page image' : 'Extracted text'}
            </button>
          </div>
          {textMode ? (
            <pre className="bank-source-text">
              {sourcePage?.text || 'No embedded text. Use the page image to transcribe this scan.'}
            </pre>
          ) : error ? (
            <p className="bank-error" role="alert">
              {error}
            </p>
          ) : !url ? (
            <Loading />
          ) : (
            <div className="bank-page-scroll">
              <div className="bank-page-image" style={{ width: `${zoom}%`, maxWidth: 'none' }}>
                <img src={url} alt={`Original settlement PDF, page ${page}`} />
                {box && sourcePage && (
                  <div
                    className="bank-source-highlight"
                    style={{
                      left: `${(box[0] / sourcePage.width) * 100}%`,
                      top: `${(box[1] / sourcePage.height) * 100}%`,
                      width: `${((box[2] - box[0]) / sourcePage.width) * 100}%`,
                      height: `${((box[3] - box[1]) / sourcePage.height) * 100}%`,
                    }}
                  />
                )}
              </div>
            </div>
          )}
          {!textMode && (
            <div className="bank-source-controls">
              <Button
                variant="secondary"
                aria-label="Zoom out PDF"
                disabled={zoom <= 100}
                onClick={() => setZoom(zoom - 50)}
              >
                −
              </Button>
              <span>{zoom}%</span>
              <Button
                variant="secondary"
                aria-label="Zoom in PDF"
                disabled={zoom >= 300}
                onClick={() => setZoom(zoom + 50)}
              >
                +
              </Button>
              <small>Scroll inside the page to inspect details</small>
            </div>
          )}
        </>
      ) : (
        <div className="bank-source-text">
          <strong>
            {sourcePage?.sheet ? `Extracted sheet: ${sourcePage.sheet}` : 'Extracted source text'}
          </strong>
          <p>
            Download the original file to inspect its formatting. The imported cells are shown
            below.
          </p>
          <pre>{sourcePage?.text || 'No readable cells were extracted.'}</pre>
        </div>
      )}
      <p className="bank-note">
        Click a shipment’s source button to locate its original row. Extracted values are
        suggestions; the original document is the evidence.
      </p>
    </aside>
  )
}

export default function SettlementReview() {
  return (
    <FinanceGate>
      <ReviewPage />
    </FinanceGate>
  )
}

function ReviewPage() {
  const { id } = useParams()
  const query = useQuery({
    queryKey: ['bank', 'import', id],
    queryFn: () => api(`settlement-imports/${id}/`),
    refetchOnWindowFocus: false,
    refetchInterval: (q) =>
      ['QUEUED', 'PROCESSING'].includes(q.state.data?.status) ? 3000 : false,
  })
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('')
  if (query.error) return <ErrorState error={query.error} retry={query.refetch} />
  if (!query.data) return <Loading />
  const statement = query.data
  async function retry() {
    setBusy(true)
    setError('')
    try {
      await post(`settlement-imports/${id}/retry/`, { revision: statement.revision })
      query.refetch()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="bank-workspace">
      <Link className="bank-back" to="/bank">
        <ArrowLeft size={16} /> Bank & settlements
      </Link>
      <PageHeading
        eyebrow="COURIER PAYMENT REVIEW"
        title={statement.reference || 'Review your settlement.'}
        description={`${statement.courier_name} · ${statement.filename}`}
        actions={<Badge status={statement.status} />}
      />
      {['QUEUED', 'PROCESSING'].includes(statement.status) ? (
        <section className="bank-panel bank-waiting">
          <Loading />
          <h2>
            {statement.status === 'QUEUED'
              ? 'Your statement is in the queue'
              : 'Reading the statement locally'}
          </h2>
          <p>
            We are reading your statement and looking for your orders and payment totals. You do not
            need to refresh.
          </p>
          <details className="bank-evidence">
            <summary>Taking too long? Help for your administrator</summary>
            <p className="bank-note">
              If the queue does not move, restart the existing background worker after installing
              the update: <code>python manage.py sync_tracking --loop</code>. No separate service or
              Redis is needed.
            </p>
          </details>
        </section>
      ) : statement.status === 'ERROR' ? (
        <section className="bank-panel bank-waiting">
          <Empty
            title="This document needs another look"
            description={statement.error}
            action={
              <Button loading={busy} onClick={retry}>
                Retry extraction
              </Button>
            }
          />
          {error && (
            <p className="bank-error" role="alert">
              {error}
            </p>
          )}
        </section>
      ) : (
        <ReviewEditor
          key={`${id}:${statement.revision}`}
          statement={statement}
          onRefresh={query.refetch}
        />
      )}
    </div>
  )
}

export function ReviewEditor({ statement, onRefresh }) {
  const navigate = useNavigate()
  const client = useQueryClient()
  const [review, setReview] = useState(statement.review),
    [revision, setRevision] = useState(statement.revision)
  const [validation, setValidation] = useState(statement.validation || {})
  const [dirty, setDirty] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('')
  const [selected, setSelected] = useState({ page: 1 }),
    [modal, setModal] = useState('')
  const editable = statement.status === 'REVIEW'
  const accounts = useQuery({
    queryKey: ['bank', 'accounts'],
    queryFn: () => all('bank-accounts'),
    enabled: modal === 'cash',
  })
  function edit(next) {
    setReview({ ...next, source_confirmed: false })
    setDirty(true)
  }
  function set(key, value) {
    if (key === 'source_confirmed') {
      setReview({ ...review, [key]: value })
      setDirty(true)
    } else edit({ ...review, [key]: value })
  }
  function tableEdit(ti, fn) {
    edit({ ...review, tables: review.tables.map((t, i) => (i === ti ? fn(t) : t)) })
  }
  function mapRole(tableIndex, columnIndex, role) {
    edit({
      ...review,
      tables: review.tables.map((table, currentTableIndex) =>
        currentTableIndex === tableIndex
          ? {
              ...table,
              columns: table.columns.map((column, currentColumnIndex) =>
                currentColumnIndex === columnIndex ? { ...column, role } : column,
              ),
            }
          : table,
      ),
    })
  }
  const invalidate = () => {
    client.invalidateQueries({ queryKey: ['bank'] })
    client.invalidateQueries({ queryKey: ['orders'] })
    client.invalidateQueries({ queryKey: ['order'] })
    client.invalidateQueries({ queryKey: ['analytics'] })
    client.invalidateQueries({ queryKey: ['dashboard'] })
    onRefresh()
  }
  async function save() {
    setBusy(true)
    setError('')
    try {
      const result = await post(`settlement-imports/${statement.id}/save-review/`, {
        revision,
        review,
      })
      setRevision(result.revision)
      setValidation(result.validation)
      setDirty(false)
      toast.success(
        result.validation.valid
          ? 'Reconciled. Ready for confirmation.'
          : 'Draft saved. Review the checks below.',
      )
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }
  async function confirm() {
    setBusy(true)
    setError('')
    try {
      await post(`settlement-imports/${statement.id}/confirm/`, { revision })
      setModal('')
      invalidate()
      toast.success('Settlement confirmed. No bank receipt was created.')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }
  useEffect(() => {
    function unload(e) {
      if (dirty) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', unload)
    return () => window.removeEventListener('beforeunload', unload)
  }, [dirty])
  const errors = validation.errors || [],
    warnings = validation.warnings || []
  const rowCount = review.tables?.reduce((n, t) => n + t.rows.length, 0) || 0
  const unknownColumns =
    review.tables?.reduce((n, t) => n + t.columns.filter((c) => c.role === 'unknown').length, 0) ||
    0
  return (
    <>
      {editable && (
        <section className="bank-review-guide bank-panel" aria-label="How to review your CPR">
          <div>
            <span className="bank-guide-kicker">LET’S CHECK YOUR PAYMENT</span>
            <h2>Your statement is ready. Review it in 3 simple steps.</h2>
            <p>
              Check the details against your original statement, save the checks, then approve.
              Nothing changes in your bank until you record the money received.
            </p>
          </div>
          <nav className="bank-guide-steps" aria-label="Review steps">
            <a href="#payment-details">
              <b>1</b>
              <span>
                Check payment<small>Reference, date & final amount</small>
              </span>
            </a>
            <a href="#shipment-details">
              <b>2</b>
              <span>
                Check orders & charges
                <small>
                  {rowCount} shipment rows found
                  {unknownColumns ? ` · ${unknownColumns} columns need your help` : ''}
                </small>
              </span>
            </a>
            <a href="#payment-confirm">
              <b>3</b>
              <span>
                Save & approve<small>Bank selection comes after approval</small>
              </span>
            </a>
          </nav>
          <p className="bank-note" role="status">
            {dirty
              ? 'Next: finish your changes, then use Save & check in step 3.'
              : validation.valid
                ? 'Checks passed. Compare the original statement once more, then confirm in step 3.'
                : 'Next: check the details below. Step 3 shows anything that needs correcting.'}
          </p>
        </section>
      )}
      {!editable && (
        <div className="bank-confirmed-strip">
          <div>
            <ShieldCheck size={23} />
            <span>
              <strong>
                {statement.status === 'VOID'
                  ? 'Reversed—retained for your records'
                  : 'Confirmed settlement'}
              </strong>
              <small>
                CPR {money(statement.net_amount)} · Bank recorded {money(statement.received_amount)}{' '}
                · Remaining {money(statement.remaining_amount)}
              </small>
            </span>
          </div>
          {statement.status === 'VOID' && (
            <Button
              loading={busy}
              onClick={async () => {
                setBusy(true)
                try {
                  const result = await post(`settlement-imports/${statement.id}/revise/`, {
                    revision,
                  })
                  navigate(`/bank/${result.id}`)
                } catch (err) {
                  toast.error(err.message)
                } finally {
                  setBusy(false)
                }
              }}
            >
              Create corrected draft
            </Button>
          )}
          {statement.status === 'CONFIRMED' && (
            <div className="bank-actions">
              <Button variant="secondary" onClick={() => setModal('reverse')}>
                Reverse confirmation
              </Button>
              <Button
                disabled={!Number(statement.remaining_amount)}
                onClick={() => setModal('cash')}
              >
                Record bank movement
              </Button>
            </div>
          )}
        </div>
      )}
      <div className="bank-review-layout">
        <SourcePreview statement={statement} selected={selected} onPage={setSelected} />
        <div className="bank-review-content">
          <section id="payment-details" className="bank-panel bank-section">
            <div className="bank-section-title">
              <span>01</span>
              <div>
                <h2>Check your payment details</h2>
                <p>
                  Compare these details with your original statement. Use the statement date, not
                  the day you downloaded it.
                </p>
              </div>
            </div>
            <fieldset disabled={!editable || busy} className="bank-fieldset">
              <div className="bank-form-grid">
                <Field label="CPR / settlement reference">
                  <input
                    maxLength={120}
                    value={review.reference || ''}
                    onChange={(e) => set('reference', e.target.value)}
                  />
                </Field>
                <Field label="Statement date">
                  <input
                    type="date"
                    value={review.date || ''}
                    onChange={(e) => set('date', e.target.value)}
                  />
                </Field>
                <Field label="Net payable from statement (PKR)">
                  <input
                    inputMode="decimal"
                    value={review.declared_net || ''}
                    placeholder="Final amount after deductions, e.g. 3016.80"
                    onChange={(e) => set('declared_net', e.target.value)}
                  />
                </Field>
                <Field label="Gross total from statement (optional)">
                  <input
                    inputMode="decimal"
                    value={review.declared_gross || ''}
                    onChange={(e) => set('declared_gross', e.target.value)}
                  />
                </Field>
              </div>
              <p className="bank-note">
                Net payable means the final payment after deductions. Enter a minus sign only when
                you owe the courier money. Gross is the amount before deductions.
              </p>
              <label className="bank-check">
                <input
                  type="checkbox"
                  checked={!!review.ownership_confirmed}
                  onChange={(e) => set('ownership_confirmed', e.target.checked)}
                />
                <span>
                  This statement belongs to my workspace and the selected courier. Currency is PKR.
                </span>
              </label>
            </fieldset>
            <details className="bank-evidence">
              <summary>What the reader found · source notes</summary>
              {statement.extracted.warnings?.map((w, i) => (
                <p key={i}>{w}</p>
              ))}
              {statement.extracted.summary_candidates?.map((c, i) => (
                <button key={i} onClick={() => setSelected({ page: c.page })}>
                  <small>Page {c.page}</small>
                  {c.text}
                </button>
              ))}
            </details>
          </section>
          <section id="shipment-details" className="bank-panel bank-section">
            <div className="bank-section-title">
              <span>02</span>
              <div>
                <h2>Check the orders in this PDF</h2>
                <p>
                  Compare tracking numbers and amounts with the original. Only open the editing
                  tools if something is missing or incorrect.
                </p>
              </div>
            </div>
            {!!rowCount && (
              <div className="bank-table-wrap bank-simple-preview">
                <table className="bank-table">
                  <caption>
                    {editable
                      ? 'Shipment amounts read from your PDF — not yet approved'
                      : 'Shipment amounts from this statement'}
                  </caption>
                  <thead>
                    <tr>
                      <th>Tracking number</th>
                      <th>Before deductions</th>
                      <th>Final amount in PDF</th>
                      <th>Original PDF</th>
                    </tr>
                  </thead>
                  <tbody>
                    {review.tables.flatMap((table, ti) =>
                      table.rows.map((row, ri) => {
                        const value = (role) => {
                          const index = table.columns.findIndex((column) => column.role === role)
                          return index < 0
                            ? 'Not listed'
                            : row.values[index] === ''
                              ? 'Needs checking'
                              : row.values[index]
                        }
                        return (
                          <tr key={`${ti}-${ri}`}>
                            <td>{value('tracking')}</td>
                            <td>{value('gross')}</td>
                            <td>{value('net')}</td>
                            <td>
                              <button
                                className="bank-text-link"
                                onClick={() =>
                                  setSelected({ page: row.page || table.page || 1, bbox: row.bbox })
                                }
                              >
                                View page {row.page || table.page || 1}
                              </button>
                            </td>
                          </tr>
                        )
                      }),
                    )}
                  </tbody>
                </table>
              </div>
            )}
            {!!unknownColumns && (
              <p className="bank-callout">
                We need your help with {unknownColumns} column headings. Choose what each one means
                in the editing tools below. Do not guess a tax or deduction.
              </p>
            )}
            <details className="bank-evidence bank-advanced" open={unknownColumns > 0 || !rowCount}>
              <summary>Edit shipment details & column meanings</summary>
              <p className="bank-note">
                Gross means the amount included in <em>this</em> settlement—not automatically the
                order’s full COD. Upfront/reserve figures stay informational unless the statement
                shows they affect this payment. Use positive column amounts; roles determine
                deductions and credits. Blank is not zero.
              </p>
              <fieldset disabled={!editable || busy} className="bank-fieldset">
                {review.tables?.map((table, ti) => (
                  <div className="bank-mapped-table" key={ti}>
                    <div className="bank-subheading">
                      <strong>
                        Table {ti + 1} · {table.rows.length} rows
                      </strong>
                      {editable && (
                        <div className="bank-actions">
                          <Button
                            variant="secondary"
                            onClick={() =>
                              tableEdit(ti, (t) => ({
                                ...t,
                                columns: [
                                  ...t.columns,
                                  { label: `Extra ${t.columns.length + 1}`, role: 'unknown' },
                                ],
                                rows: t.rows.map((r) => ({ ...r, values: [...r.values, ''] })),
                              }))
                            }
                          >
                            Add column
                          </Button>
                          <Button
                            variant="secondary"
                            aria-label={`Remove table ${ti + 1}`}
                            onClick={() =>
                              edit({ ...review, tables: review.tables.filter((_, i) => i !== ti) })
                            }
                          >
                            <Trash2 size={15} />
                          </Button>
                        </div>
                      )}
                    </div>
                    <div className="bank-table-wrap">
                      <table className="bank-table bank-edit-table">
                        <thead>
                          <tr>
                            {table.columns.map((col, ci) => (
                              <th key={ci}>
                                <input
                                  aria-label={`Table ${ti + 1} column ${ci + 1} name`}
                                  value={col.label}
                                  maxLength={160}
                                  onChange={(e) =>
                                    tableEdit(ti, (t) => ({
                                      ...t,
                                      columns: t.columns.map((c, i) =>
                                        i === ci ? { ...c, label: e.target.value } : c,
                                      ),
                                    }))
                                  }
                                />
                                <Select
                                  aria-label={`Meaning of ${col.label} in table ${ti + 1}`}
                                  value={col.role}
                                  onChange={(e) => mapRole(ti, ci, e.target.value)}
                                >
                                  {columnRoles.map(([value, label]) => (
                                    <option key={value} value={value}>
                                      {label}
                                    </option>
                                  ))}
                                </Select>
                              </th>
                            ))}
                            <th>Matching & source</th>
                          </tr>
                        </thead>
                        <tbody>
                          {table.rows.map((row, ri) => (
                            <tr key={ri}>
                              {row.values.map((v, ci) => (
                                <td key={ci}>
                                  <input
                                    aria-label={`Table ${ti + 1} row ${ri + 1} ${table.columns[ci].label}`}
                                    value={v}
                                    maxLength={500}
                                    onChange={(e) =>
                                      tableEdit(ti, (t) => ({
                                        ...t,
                                        rows: t.rows.map((r, i) =>
                                          i === ri
                                            ? {
                                                ...r,
                                                values: r.values.map((cell, j) =>
                                                  j === ci ? e.target.value : cell,
                                                ),
                                              }
                                            : r,
                                        ),
                                      }))
                                    }
                                  />
                                </td>
                              ))}
                              <td>
                                <label className="bank-check bank-external">
                                  <input
                                    type="checkbox"
                                    checked={!!row.external}
                                    onChange={(e) =>
                                      tableEdit(ti, (t) => ({
                                        ...t,
                                        rows: t.rows.map((r, i) =>
                                          i === ri ? { ...r, external: e.target.checked } : r,
                                        ),
                                      }))
                                    }
                                  />
                                  <span>My order, not in platform</span>
                                </label>
                                <div className="bank-actions">
                                  <button
                                    type="button"
                                    className="bank-text-link"
                                    onClick={() =>
                                      setSelected({
                                        page: row.page || table.page || 1,
                                        bbox: row.bbox,
                                      })
                                    }
                                  >
                                    Source p.{row.page || table.page || 1}
                                  </button>
                                  {editable && (
                                    <button
                                      type="button"
                                      className="bank-text-link"
                                      aria-label={`Remove table ${ti + 1} row ${ri + 1}`}
                                      onClick={() =>
                                        tableEdit(ti, (t) => ({
                                          ...t,
                                          rows: t.rows.filter((_, i) => i !== ri),
                                        }))
                                      }
                                    >
                                      <Trash2 size={15} />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {editable && (
                      <Button
                        variant="secondary"
                        onClick={() =>
                          tableEdit(ti, (t) => ({
                            ...t,
                            rows: [
                              ...t.rows,
                              {
                                values: t.columns.map(() => ''),
                                page: selected.page,
                                external: false,
                              },
                            ],
                          }))
                        }
                      >
                        <Plus size={15} /> Add shipment row
                      </Button>
                    )}
                  </div>
                ))}
                {editable && (
                  <Button
                    variant="secondary"
                    onClick={() =>
                      edit({
                        ...review,
                        tables: [
                          ...(review.tables || []),
                          {
                            page: selected.page,
                            columns: [
                              { label: 'Tracking number', role: 'tracking' },
                              { label: 'Settlement gross', role: 'gross' },
                              { label: 'Courier charges', role: 'fee' },
                              { label: 'Net amount', role: 'net' },
                            ],
                            rows: [
                              { values: ['', '', '', ''], page: selected.page, external: false },
                            ],
                          },
                        ],
                      })
                    }
                  >
                    <Plus size={16} /> Add a table manually
                  </Button>
                )}
              </fieldset>
            </details>
          </section>
          <section className="bank-panel bank-section">
            <div className="bank-section-title">
              <span>+</span>
              <div>
                <h2>Any extra deductions or credits?</h2>
                <p>
                  Only use this if the PDF has a separate charge or credit not already included
                  above. Otherwise, leave it unchanged.
                </p>
              </div>
            </div>
            <details
              className="bank-evidence bank-advanced"
              open={!!review.adjustments?.length || !!review.checks?.length}
            >
              <summary>
                Add or review extra charges & total checks
                {review.adjustments?.length ? ` (${review.adjustments.length} added)` : ''}
              </summary>
              <fieldset disabled={!editable || busy} className="bank-fieldset">
                {(review.adjustments || []).map((item, i) => (
                  <div className="bank-adjustment" key={i}>
                    <Field label="Adjustment name">
                      <input
                        value={item.label}
                        maxLength={160}
                        onChange={(e) =>
                          set(
                            'adjustments',
                            review.adjustments.map((a, j) =>
                              j === i ? { ...a, label: e.target.value } : a,
                            ),
                          )
                        }
                      />
                    </Field>
                    <Field label="Signed amount (− deducted / + credited)">
                      <input
                        inputMode="decimal"
                        value={item.amount}
                        onChange={(e) =>
                          set(
                            'adjustments',
                            review.adjustments.map((a, j) =>
                              j === i ? { ...a, amount: e.target.value } : a,
                            ),
                          )
                        }
                      />
                    </Field>
                    <Field label="Accounting meaning">
                      <Select
                        value={item.kind}
                        onChange={(e) =>
                          set(
                            'adjustments',
                            review.adjustments.map((a, j) =>
                              j === i ? { ...a, kind: e.target.value } : a,
                            ),
                          )
                        }
                      >
                        <option value="expense">Courier expense / refund</option>
                        <option value="nonexpense">Withholding / reserve / cash adjustment</option>
                      </Select>
                    </Field>
                    <Field label="Order-cost allocation">
                      <Select
                        value={item.allocation}
                        disabled={item.kind !== 'expense'}
                        onChange={(e) =>
                          set(
                            'adjustments',
                            review.adjustments.map((a, j) =>
                              j === i ? { ...a, allocation: e.target.value } : a,
                            ),
                          )
                        }
                      >
                        <option value="none">Leave unallocated</option>
                        <option value="equal">Equal per shipment</option>
                        <option value="gross">Proportion of settlement gross</option>
                      </Select>
                    </Field>
                    {editable && (
                      <Button
                        variant="secondary"
                        aria-label={`Remove adjustment ${i + 1}`}
                        onClick={() =>
                          set(
                            'adjustments',
                            review.adjustments.filter((_, j) => j !== i),
                          )
                        }
                      >
                        <Trash2 size={16} />
                      </Button>
                    )}
                  </div>
                ))}
                {editable && (
                  <Button
                    variant="secondary"
                    onClick={() =>
                      set('adjustments', [
                        ...(review.adjustments || []),
                        { label: '', amount: '', kind: 'nonexpense', allocation: 'none' },
                      ])
                    }
                  >
                    <Plus size={15} /> Add shared adjustment
                  </Button>
                )}
                <p className="bank-note">
                  A tax deduction is not automatically a business expense. Shared expense allocation
                  is labelled <strong>Allocated</strong>, not courier-reported. Non-expense
                  deductions affect payable, not profit.
                </p>
                <details className="bank-evidence">
                  <summary>Independent column-total checks (recommended)</summary>
                  <p>
                    Copy a column label and its statement total, e.g. Shipping Charges = 420.00.
                    Each must match the sum of that column across all pages.
                  </p>
                  {(review.checks || []).map((c, i) => (
                    <div className="bank-check-row" key={i}>
                      <input
                        aria-label={`Check ${i + 1} column label`}
                        placeholder="Exact column label"
                        value={c.label}
                        onChange={(e) =>
                          set(
                            'checks',
                            review.checks.map((a, j) =>
                              j === i ? { ...a, label: e.target.value } : a,
                            ),
                          )
                        }
                      />
                      <input
                        aria-label={`Check ${i + 1} total`}
                        placeholder="Total from PDF"
                        value={c.amount}
                        onChange={(e) =>
                          set(
                            'checks',
                            review.checks.map((a, j) =>
                              j === i ? { ...a, amount: e.target.value } : a,
                            ),
                          )
                        }
                      />
                      {editable && (
                        <Button
                          variant="secondary"
                          aria-label={`Remove check ${i + 1}`}
                          onClick={() =>
                            set(
                              'checks',
                              review.checks.filter((_, j) => j !== i),
                            )
                          }
                        >
                          <Trash2 size={15} />
                        </Button>
                      )}
                    </div>
                  ))}
                  {editable && (
                    <Button
                      variant="secondary"
                      onClick={() =>
                        set('checks', [...(review.checks || []), { label: '', amount: '' }])
                      }
                    >
                      Add total check
                    </Button>
                  )}
                </details>
              </fieldset>
            </details>
          </section>
          <section id="payment-confirm" className="bank-panel bank-section">
            <div className="bank-section-title">
              <span>03</span>
              <div>
                <h2>Save your checks, then approve</h2>
                <p>
                  First click Save & check. Fix any issues shown here, then Confirm settlement.
                  After approval, choose the bank where you received the payment.
                </p>
              </div>
            </div>
            <fieldset disabled={!editable || busy} className="bank-fieldset">
              <label className="bank-check">
                <input
                  type="checkbox"
                  checked={!!review.update_costs}
                  onChange={(e) => set('update_costs', e.target.checked)}
                />
                <span>
                  <strong>Also update order profit using these actual courier charges</strong>
                  <small>
                    Optional. Tick only if this PDF includes ALL courier costs for these shipments,
                    including returns and expense taxes. Do not tick for an advance or a single
                    extra fee. Product purchase costs stay unchanged.
                  </small>
                </span>
              </label>
              {review.update_costs && (
                <label className="bank-check">
                  <input
                    type="checkbox"
                    checked={!!review.replace_costs}
                    onChange={(e) => set('replace_costs', e.target.checked)}
                  />
                  <span>
                    Replace previously recorded courier charges with these full charges, instead of
                    adding them again.
                  </span>
                </label>
              )}
              <Field label="Your notes (optional)">
                <textarea
                  maxLength={2000}
                  value={review.notes || ''}
                  onChange={(e) => set('notes', e.target.value)}
                  placeholder="For example: corrected one tracking number after checking the PDF."
                />
              </Field>
              <label className="bank-check">
                <input
                  type="checkbox"
                  checked={!!review.source_confirmed}
                  onChange={(e) => set('source_confirmed', e.target.checked)}
                />
                <span>
                  I checked all source pages, these {rowCount} shipment rows, the totals and the
                  meaning of every deduction. Editing values resets this confirmation.
                </span>
              </label>
            </fieldset>
            <div className="bank-reconcile">
              <div>
                <span>Calculated gross</span>
                <strong>{validation.gross ? money(validation.gross) : '—'}</strong>
              </div>
              <div>
                <span>Calculated CPR net</span>
                <strong>{validation.net ? money(validation.net) : '—'}</strong>
              </div>
              <div>
                <span>Matched orders</span>
                <strong>
                  {validation.matched ?? '—'} / {validation.row_count ?? rowCount}
                </strong>
              </div>
            </div>
            {dirty && (
              <p className="bank-callout">
                Unsaved changes. The amounts and checks below are from the last saved review.
              </p>
            )}
            {!!errors.length && (
              <div className="bank-error" role="alert">
                <strong>{errors.length} checks need attention</strong>
                <p>
                  Nothing has been approved yet. Correct the items below, then click Save & check
                  again.
                </p>
                <ul>
                  {errors.slice(0, 40).map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
                {errors.length > 40 && (
                  <p>Fix these first, then save to recheck the remaining errors.</p>
                )}
              </div>
            )}
            {!!warnings.length && (
              <div className="bank-callout">
                {warnings.slice(0, 20).map((w, i) => (
                  <p key={i}>{w}</p>
                ))}
              </div>
            )}
            {validation.rows?.length > 0 && (
              <details className="bank-evidence">
                <summary>See calculated costs & order matches</summary>
                <div className="bank-table-wrap">
                  <table className="bank-table">
                    <thead>
                      <tr>
                        <th>Tracking</th>
                        <th>Matched order</th>
                        <th>Row net</th>
                        <th>Courier expense</th>
                        <th>Basis</th>
                      </tr>
                    </thead>
                    <tbody>
                      {validation.rows.map((r) => (
                        <tr key={r.key}>
                          <td>{r.tracking}</td>
                          <td>
                            {r.order_id ? (
                              <Link to={`/orders/${r.order_id}`}>{r.order_number}</Link>
                            ) : (
                              'Outside platform'
                            )}
                          </td>
                          <td>{money(r.net)}</td>
                          <td>
                            {money(r.cost)}
                            {r.previous_cost !== null && (
                              <small>Previous {money(r.previous_cost)}</small>
                            )}
                          </td>
                          <td>{r.basis === 'ALLOCATED' ? 'Allocated by rule' : 'CPR row'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            )}
            {error && (
              <p className="bank-error" role="alert">
                {error}
              </p>
            )}
            {editable && (
              <div className="bank-review-actions">
                <Button variant="secondary" loading={busy && modal !== 'confirm'} onClick={save}>
                  <Save size={16} /> Save & check
                </Button>
                <Button
                  disabled={dirty || !validation.valid || busy}
                  onClick={() => setModal('confirm')}
                >
                  <CheckCheck size={17} /> Confirm settlement
                </Button>
              </div>
            )}
          </section>
        </div>
      </div>
      {modal === 'confirm' && (
        <Modal title="Confirm this verified settlement?" onClose={() => !busy && setModal('')}>
          <div className="bank-form">
            <p>
              Record a courier payable of <strong>{money(validation.net)}</strong> for{' '}
              <strong>{review.reference}</strong>.
            </p>
            <p>
              {review.update_costs
                ? `${validation.matched} matched orders will use the reviewed complete courier-cost snapshots. Allocated expenses remain labelled.`
                : 'Order courier-cost estimates will not change.'}
            </p>
            <p className="bank-callout">
              No money is added to your bank. Record the actual bank movement separately when
              verified.
            </p>
            {error && (
              <p className="bank-error" role="alert">
                {error}
              </p>
            )}
            <Button loading={busy} onClick={confirm}>
              Confirm payable & selected cost updates
            </Button>
          </div>
        </Modal>
      )}
      {modal === 'cash' &&
        (accounts.isLoading ? (
          <Modal title="Loading accounts" onClose={() => setModal('')}>
            <Loading />
          </Modal>
        ) : accounts.error ? (
          <Modal title="Accounts unavailable" onClose={() => setModal('')}>
            <ErrorState error={accounts.error} retry={accounts.refetch} />
          </Modal>
        ) : (
          <CashModal
            statement={statement}
            accounts={accounts.data || []}
            onClose={() => setModal('')}
            onSaved={invalidate}
          />
        ))}
      {modal === 'reverse' && (
        <ReversalModal
          title="Reverse this settlement confirmation?"
          onClose={() => setModal('')}
          onReverse={async ({ reason }) => {
            await post(`settlement-imports/${statement.id}/reverse/`, { revision, reason })
            invalidate()
            toast.success('Settlement reversed. Original evidence retained.')
          }}
        />
      )}
    </>
  )
}
