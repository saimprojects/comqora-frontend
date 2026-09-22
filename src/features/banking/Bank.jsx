import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowDownLeft,
  ArrowUpRight,
  FileCheck2,
  Landmark,
  Plus,
  Upload,
  Wallet,
  Undo2,
} from 'lucide-react'
import { toast } from 'sonner'
import { api, all, post } from '../../lib/api'
import { date, money, today } from '../../lib/format'
import {
  Badge,
  Button,
  Empty,
  ErrorState,
  Field,
  Loading,
  Modal,
  PageHeading,
  StatCard,
} from '../../components/ui'
import Select from '../../components/Select'
import SearchField from '../../components/SearchField'
import { useAuth } from '../auth/AuthContext'
import './banking.css'
import PrintPreview from '../printing/PrintPreview'

export function FinanceGate({ children }) {
  const { user } = useAuth()
  return ['owner', 'manager'].includes(user?.role) ? (
    children
  ) : (
    <Empty
      title="Financial access is restricted"
      description="Your workspace owner or manager can review bank accounts and private settlement documents."
    />
  )
}

export function CashModal({ statement, expense, accounts, onClose, onSaved }) {
  const remaining = expense ? `-${expense.bank_remaining}` : statement?.remaining_amount || ''
  const [form, setForm] = useState({
    account: '',
    amount: remaining.replace('-', ''),
    direction: remaining.startsWith('-') ? 'OUT' : 'IN',
    date: today(),
    reference: '',
    notes: '',
  })
  const [requestKey] = useState(() => crypto.randomUUID())
  const selectedAccount = accounts.find((account) => account.id === form.account)
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('')
  const set = (key) => (event) => setForm({ ...form, [key]: event.target.value })
  async function submit(event) {
    event.preventDefault()
    if (!selectedAccount) {
      setError('Choose the bank or wallet for this payment first.')
      return
    }
    setBusy(true)
    setError('')
    try {
      await post('bank-entries/', {
        account: form.account,
        amount: `${form.direction === 'OUT' ? '-' : ''}${form.amount}`,
        date: form.date,
        reference: form.reference,
        notes: form.notes,
        statement: statement?.id || null,
        expense: expense?.id || null,
        request_key: requestKey,
      })
      toast.success('Bank movement recorded.')
      onSaved()
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <Modal
      title={
        expense
          ? 'Record expense payment'
          : statement
            ? 'Record the bank settlement'
            : 'Record a bank movement'
      }
      onClose={() => !busy && onClose()}
    >
      <form className="bank-form" onSubmit={submit}>
        <p className="bank-note">
          Only record money you have verified in your bank or wallet. A CPR is not proof of receipt.
          Manual entries change cash balance, not order profit.
        </p>
        {expense && (
          <div className="bank-callout">
            {expense.name} · Payment left to record: {money(expense.bank_remaining)}. This records
            money already paid; it does not pay the bill or deduct the expense from profit again. If
            already entered in the bank ledger, do not record it twice.
          </div>
        )}
        {statement && (
          <div className="bank-callout">
            {statement.reference} · Remaining {money(remaining)}
          </div>
        )}
        {accounts.length > 1 && (
          <p className="bank-note">
            You have multiple accounts. Which bank or wallet should this payment be recorded in?
          </p>
        )}
        <Field label={form.direction === 'OUT' ? 'Paid from account' : 'Received in account'}>
          <Select required aria-label="Account" value={form.account} onChange={set('account')}>
            <option value="">Choose bank or wallet</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
                {a.last_four ? ` · ending ${a.last_four}` : ''}
              </option>
            ))}
          </Select>
        </Field>
        {!accounts.length && <p role="alert">Add a bank account first.</p>}
        {selectedAccount && (
          <p className="bank-callout">
            This payment will be recorded only in {selectedAccount.name}
            {selectedAccount.last_four ? ` (ending ${selectedAccount.last_four})` : ''}.
          </p>
        )}
        <div className="bank-form-grid">
          <Field label="Direction">
            <Select
              aria-label="Direction"
              value={form.direction}
              onChange={set('direction')}
              disabled={!!statement || !!expense}
            >
              <option value="IN">Money received</option>
              <option value="OUT">Money paid out</option>
            </Select>
          </Field>
          <Field label="Amount (PKR)">
            <input
              required
              inputMode="decimal"
              type="number"
              step="0.01"
              min="0.01"
              value={form.amount}
              onChange={set('amount')}
            />
          </Field>
        </div>
        <div className="bank-form-grid">
          <Field label="Bank date">
            <input required type="date" value={form.date} onChange={set('date')} />
          </Field>
          <Field label="Unique bank transaction reference">
            <input required maxLength={150} value={form.reference} onChange={set('reference')} />
          </Field>
        </div>
        <Field label="Notes">
          <textarea maxLength={500} value={form.notes} onChange={set('notes')} />
        </Field>
        {error && (
          <p className="bank-error" role="alert">
            {error}
          </p>
        )}
        <Button loading={busy} disabled={!selectedAccount}>
          Confirm verified bank movement
        </Button>
      </form>
    </Modal>
  )
}

export function ReversalModal({ title, onClose, onReverse, bank = false }) {
  const [reason, setReason] = useState(''),
    [entryDate, setEntryDate] = useState(today())
  const [requestKey] = useState(() => crypto.randomUUID())
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('')
  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await onReverse({ reason, date: entryDate, request_key: requestKey })
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <Modal title={title} onClose={() => !busy && onClose()}>
      <form className="bank-form" onSubmit={submit}>
        <p className="bank-note">
          This corrects the platform record; it does not move money at your bank. The original
          record and reversal remain in the audit trail.
        </p>
        <Field label="Reason for reversal">
          <textarea
            required
            maxLength={500}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </Field>
        {bank && (
          <Field label="Reversal date">
            <input
              required
              type="date"
              value={entryDate}
              onChange={(e) => setEntryDate(e.target.value)}
            />
          </Field>
        )}
        {error && (
          <p className="bank-error" role="alert">
            {error}
          </p>
        )}
        <Button loading={busy}>Confirm reversal</Button>
      </form>
    </Modal>
  )
}

function AccountModal({ onClose, onSaved }) {
  const [form, setForm] = useState({
    name: '',
    kind: 'BANK',
    last_four: '',
    opening_balance: '0.00',
    opening_date: today(),
  })
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('')
  const set = (key) => (event) => setForm({ ...form, [key]: event.target.value })
  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await post('bank-accounts/', form)
      onSaved()
      onClose()
      toast.success('Account added.')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <Modal title="Add a bank or wallet" onClose={() => !busy && onClose()}>
      <form className="bank-form" onSubmit={submit}>
        <p className="bank-note">
          A private cash register for this workspace—not a connection to your bank. Opening balances
          are retained; correct later mistakes with an adjustment entry.
        </p>
        <Field label="Account name">
          <input
            required
            maxLength={100}
            placeholder="Business current account"
            value={form.name}
            onChange={set('name')}
          />
        </Field>
        <div className="bank-form-grid">
          <Field label="Account type">
            <Select value={form.kind} onChange={set('kind')}>
              <option value="BANK">Bank account</option>
              <option value="WALLET">Mobile wallet</option>
              <option value="CASH">Cash</option>
            </Select>
          </Field>
          <Field label="Last four digits (optional)">
            <input
              maxLength={4}
              inputMode="numeric"
              value={form.last_four}
              onChange={set('last_four')}
            />
          </Field>
        </div>
        <div className="bank-form-grid">
          <Field label="Opening balance (PKR)">
            <input
              required
              type="number"
              step="0.01"
              value={form.opening_balance}
              onChange={set('opening_balance')}
            />
          </Field>
          <Field label="Opening balance date">
            <input required type="date" value={form.opening_date} onChange={set('opening_date')} />
          </Field>
        </div>
        {error && (
          <p className="bank-error" role="alert">
            {error}
          </p>
        )}
        <Button loading={busy}>Create account</Button>
      </form>
    </Modal>
  )
}

function ImportModal({ couriers, onClose }) {
  const navigate = useNavigate(),
    client = useQueryClient()
  const [courier, setCourier] = useState(''),
    [file, setFile] = useState(null)
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('')
  async function submit(e) {
    e.preventDefault()
    setError('')
    if (!file || file.size > 8 * 1024 * 1024) {
      setError('Choose an original PDF, Excel or CSV statement of at most 8 MB.')
      return
    }
    setBusy(true)
    try {
      const data = new FormData()
      data.append('courier', courier)
      data.append('file', file)
      const result = await api('settlement-imports/', { method: 'POST', body: data })
      client.invalidateQueries({ queryKey: ['bank'] })
      if (result.duplicate)
        toast.info('This statement was already uploaded. Opening its existing review.')
      navigate(`/bank/${result.id}`)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <Modal title="Upload your courier payment statement" onClose={() => !busy && onClose()}>
      <form className="bank-form" onSubmit={submit}>
        <p className="bank-note">
          Choose the courier and their CPR / payment statement. We read PDF, Excel and CSV exports,
          then prepare a review for you. Uploading does not change your bank balance.
        </p>
        <Field label="Courier issuing this statement">
          <Select
            required
            aria-label="Courier issuing this statement"
            value={courier}
            onChange={(e) => setCourier(e.target.value)}
          >
            <option value="">Select your courier</option>
            {couriers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
        {!couriers.length && <p>Add the courier in your workspace first.</p>}
        <label className="bank-upload">
          <Upload size={28} />
          <strong>{file?.name || 'Choose the original CPR / payment statement'}</strong>
          <span>PDF, XLSX, XLS, CSV or TSV · up to 8 MB · 1,000 shipment rows</span>
          <input
            required
            aria-label="CPR payment statement"
            type="file"
            accept="application/pdf,.pdf,.xlsx,.xls,.csv,.tsv,text/csv,text/tab-separated-values"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
        </label>
        <p className="bank-note">
          Tip: use the original export from your courier portal. Text-based PDF, Excel and CSV files
          give the most reliable result; photos and scanned PDFs may need manual entry. Only your
          workspace owner and managers can view this document.
        </p>
        {error && (
          <p className="bank-error" role="alert">
            {error}
          </p>
        )}
        <Button loading={busy} disabled={!courier || !file}>
          Upload & read statement
        </Button>
      </form>
    </Modal>
  )
}

export default function Bank() {
  return (
    <FinanceGate>
      <BankWorkspace />
    </FinanceGate>
  )
}

function BankWorkspace() {
  const client = useQueryClient()
  const [tab, setTab] = useState('imports'),
    [modal, setModal] = useState(''),
    [reversing, setReversing] = useState(null)
  const [search, setSearch] = useState(''),
    [page, setPage] = useState(1)
  const summary = useQuery({
    queryKey: ['bank', 'summary'],
    queryFn: () => api('bank-accounts/summary/'),
    refetchInterval: 15000,
  })
  const accounts = useQuery({ queryKey: ['bank', 'accounts'], queryFn: () => all('bank-accounts') })
  const couriers = useQuery({
    queryKey: ['bank', 'couriers'],
    queryFn: () => all('couriers'),
    enabled: modal === 'import',
  })
  const list = useQuery({
    queryKey: ['bank', tab, search, page],
    queryFn: () =>
      api(
        `${tab === 'imports' ? 'settlement-imports' : 'bank-entries'}/?page=${page}&page_size=20&search=${encodeURIComponent(search)}`,
      ),
    enabled: tab !== 'accounts',
    refetchInterval: tab === 'imports' ? 5000 : false,
  })
  const refresh = () => {
    client.invalidateQueries({ queryKey: ['bank'] })
    client.invalidateQueries({ queryKey: ['analytics'] })
    client.invalidateQueries({ queryKey: ['expenses'] })
  }
  const activeError = summary.error || accounts.error
  if (activeError) return <ErrorState error={activeError} retry={refresh} />
  if (!summary.data || !accounts.data) return <Loading />
  const records = list.data?.results || []
  return (
    <div className="bank-workspace">
      <PageHeading
        eyebrow="MONEY, WITH A PAPER TRAIL"
        title="Every rupee. Reconciled."
        description="Turn courier statements into verified settlements—and keep actual cash separate."
        actions={
          <>
            <Button variant="secondary" onClick={() => setModal('print')}>
              Print bank statement
            </Button>
            <Button variant="secondary" onClick={() => setModal('account')}>
              <Plus size={18} /> Add account
            </Button>
            <Button onClick={() => setModal('import')}>
              <Upload size={18} /> Import CPR
            </Button>
          </>
        }
      />
      <div className="bank-stats">
        <StatCard
          label="Recorded cash balance"
          value={money(summary.data.balance)}
          detail="Opening balances + verified movements"
          icon={<Landmark size={20} />}
          accent
        />
        <StatCard
          label="Awaiting bank receipt"
          value={money(summary.data.awaiting_receipt)}
          detail="Confirmed CPRs · not received yet"
          icon={<ArrowDownLeft size={20} />}
        />
        <StatCard
          label="Payable to couriers"
          value={money(summary.data.payable_to_couriers)}
          detail="Negative settlements still unpaid"
          icon={<ArrowUpRight size={20} />}
        />
        <StatCard
          label="Ready to review"
          value={summary.data.review_count}
          detail="No financial changes until approval"
          icon={<FileCheck2 size={20} />}
        />
      </div>
      <div className="bank-flow">
        <span>
          <b>01</b> Import statement
        </span>
        <i>→</i>
        <span>
          <b>02</b> Check orders & amounts
        </span>
        <i>→</i>
        <span>
          <b>03</b> Approve statement
        </span>
        <i>→</i>
        <span>
          <b>04</b> Record bank receipt
        </span>
      </div>
      <section className="bank-panel">
        <div className="bank-tabs" role="tablist" aria-label="Bank sections">
          {[
            ['imports', 'Payment statements'],
            ['accounts', 'Accounts'],
            ['entries', 'Cash ledger'],
          ].map(([key, name]) => (
            <button
              key={key}
              role="tab"
              aria-selected={tab === key}
              className={tab === key ? 'active' : ''}
              onClick={() => {
                setTab(key)
                setSearch('')
                setPage(1)
              }}
            >
              {name}
            </button>
          ))}
        </div>
        {tab === 'imports' && (
          <div className="bank-list-help">
            <FileCheck2 size={24} aria-hidden="true" />
            <div>
              <strong>Your courier payments, one statement at a time</strong>
              <p>
                Upload a statement → check the details → approve → choose your bank and record the
                payment you actually received.
              </p>
              <small>
                “Confirmed” means the statement is approved. It does not mean money has reached your
                bank.
              </small>
            </div>
          </div>
        )}
        {tab !== 'accounts' && (
          <div className="bank-toolbar">
            <SearchField
              label={tab === 'imports' ? 'Search statements' : 'Search bank entries'}
              placeholder={
                tab === 'imports' ? 'Reference, courier or PDF name…' : 'Bank reference or account…'
              }
              value={search}
              onValueChange={(v) => {
                setSearch(v)
                setPage(1)
              }}
            />
            {tab === 'entries' && (
              <Button variant="secondary" onClick={() => setModal('cash')}>
                <Plus size={17} /> Record movement
              </Button>
            )}
          </div>
        )}
        {tab === 'accounts' ? (
          <div className="bank-accounts">
            {accounts.data.map((a) => (
              <article className="bank-account-card" key={a.id}>
                <div className="bank-account-top">
                  <Wallet size={22} />
                  <span>
                    {a.kind}
                    {a.last_four && ` · •••• ${a.last_four}`}
                  </span>
                </div>
                <h3>{a.name}</h3>
                <strong>{money(a.balance)}</strong>
                <p>
                  Opening {money(a.opening_balance)} · {date(a.opening_date)}
                </p>
              </article>
            ))}
            {!accounts.data.length && (
              <Empty
                title="Your cash, in one place"
                description="Add a business bank account, mobile wallet or cash account to start."
                action={<Button onClick={() => setModal('account')}>Add your first account</Button>}
              />
            )}
          </div>
        ) : list.error ? (
          <ErrorState error={list.error} retry={list.refetch} />
        ) : list.isLoading ? (
          <Loading />
        ) : !records.length ? (
          <Empty
            title={
              tab === 'imports' ? 'A clearer picture starts with one PDF' : 'No bank movements yet'
            }
            description={
              tab === 'imports'
                ? 'Import a CPR from any courier. Review first; your bank balance stays untouched.'
                : 'Record real money received or paid. Courier receivables remain separate until settled.'
            }
            action={
              tab === 'imports' && (
                <Button onClick={() => setModal('import')}>Import a statement</Button>
              )
            }
          />
        ) : (
          <>
            <div className="bank-table-wrap">
              <table className="bank-table">
                <thead>
                  <tr>
                    {(tab === 'imports'
                      ? [
                          'Statement',
                          'Courier',
                          'What’s next?',
                          'Final payment',
                          'Recorded at bank',
                          '',
                        ]
                      : ['Movement', 'Account', 'Bank date', 'Amount', 'Record', '']
                    ).map((h, i) => (
                      <th key={i}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {records.map((r) =>
                    tab === 'imports' ? (
                      <tr key={r.id}>
                        <td>
                          <Link to={`/bank/${r.id}`}>{r.reference || r.filename}</Link>
                          <small>{date(r.created_at)}</small>
                        </td>
                        <td>{r.courier_name}</td>
                        <td>
                          <Badge status={r.status} />
                          <small>
                            {
                              {
                                QUEUED: 'Waiting to read statement',
                                PROCESSING: 'Reading your statement',
                                REVIEW: 'Check details & approve',
                                ERROR: 'Open to see what went wrong',
                                VOID: 'Reversed — kept for your records',
                                CONFIRMED: Number(r.remaining_amount)
                                  ? 'Record payment when received'
                                  : 'No remaining payment',
                              }[r.status]
                            }
                          </small>
                        </td>
                        <td>{r.net_amount === null ? 'Not confirmed' : money(r.net_amount)}</td>
                        <td>{money(r.received_amount)}</td>
                        <td>
                          <Link className="btn btn-secondary" to={`/bank/${r.id}`}>
                            {r.status === 'REVIEW'
                              ? 'Review details'
                              : r.status === 'CONFIRMED'
                                ? 'View payment'
                                : 'Open'}{' '}
                            <ArrowUpRight size={15} />
                          </Link>
                        </td>
                      </tr>
                    ) : (
                      <tr key={r.id}>
                        <td>
                          {r.reference}
                          <small>
                            {r.expense_name
                              ? `Expense: ${r.expense_name}`
                              : r.statement_reference || 'Manual movement'}
                          </small>
                        </td>
                        <td>{r.account_name}</td>
                        <td>{date(r.date)}</td>
                        <td
                          className={r.amount.startsWith('-') ? 'bank-negative' : 'bank-positive'}
                        >
                          {money(r.amount)}
                        </td>
                        <td>{r.reversal_of ? 'Reversal' : r.reversed ? 'Reversed' : 'Recorded'}</td>
                        <td>
                          {!r.reversal_of && !r.reversed && (
                            <Button
                              variant="secondary"
                              aria-label={`Reverse ${r.reference}`}
                              onClick={() => setReversing(r)}
                            >
                              <Undo2 size={15} /> Reverse
                            </Button>
                          )}
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
            <div className="bank-pagination">
              <span>{list.data.count} records</span>
              <Button
                variant="secondary"
                disabled={!list.data.previous}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </Button>
              <span>Page {page}</span>
              <Button
                variant="secondary"
                disabled={!list.data.next}
                onClick={() => setPage(page + 1)}
              >
                Next
              </Button>
            </div>
          </>
        )}
      </section>
      {modal === 'account' && <AccountModal onClose={() => setModal('')} onSaved={refresh} />}
      {modal === 'print' && <PrintPreview kind="bank" onClose={() => setModal('')} />}
      {modal === 'import' &&
        (couriers.isLoading ? (
          <Modal title="Loading couriers" onClose={() => setModal('')}>
            <Loading />
          </Modal>
        ) : couriers.error ? (
          <Modal title="Couriers unavailable" onClose={() => setModal('')}>
            <ErrorState error={couriers.error} retry={couriers.refetch} />
          </Modal>
        ) : (
          <ImportModal couriers={couriers.data || []} onClose={() => setModal('')} />
        ))}
      {modal === 'cash' && (
        <CashModal accounts={accounts.data} onClose={() => setModal('')} onSaved={refresh} />
      )}
      {reversing && (
        <ReversalModal
          bank
          title="Reverse this bank entry?"
          onClose={() => setReversing(null)}
          onReverse={async (data) => {
            await post(`bank-entries/${reversing.id}/reverse/`, data)
            refresh()
            toast.success('Reversal recorded.')
          }}
        />
      )}
    </div>
  )
}
