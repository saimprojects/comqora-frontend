import { useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  ArrowUp,
  ArrowLeft,
  ArrowUpRight,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Database,
  History,
  Landmark,
  LoaderCircle,
  MessageSquarePlus,
  PanelLeft,
  PackageSearch,
  ShieldCheck,
  Sparkles,
  Square,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { api, patch, post } from '../../lib/api'
import { useAuth } from '../auth/AuthContext'
import { Button, ErrorState, Loading } from '../../components/ui'
import MessageText from './MessageText'
import './manager.css'

const starters = [
  {
    icon: Sparkles,
    title: 'Give me the business picture',
    note: 'Sales, realized profit and expenses',
    text: 'Pichlay 30 din ka business overview do. Realized aur expected profit separate batao, aur records ki basis explain karo.',
  },
  {
    icon: Landmark,
    title: 'Follow the money',
    note: 'Bank, wallets and courier settlements',
    text: 'Mere current bank aur wallet balances check karo. Confirmed courier settlements mein kitni payment receive hona baqi hai? Sources ke saath batao.',
  },
  {
    icon: PackageSearch,
    title: 'Check my inventory',
    note: 'Available stock and purchase history',
    text: 'Mere low-stock products aur available quantities check karo. Current inventory value bhi batao.',
  },
  {
    icon: History,
    title: 'Find an older record',
    note: 'Search beyond the current page',
    text: 'Mujhe aik puranay customer ke orders dhoondnay hain. Customer identify karne ke liye mujhse detail poochho.',
  },
]

const isActiveTurn = (turn) => ['QUEUED', 'RUNNING'].includes(turn.status)

function ResearchProgress({ turn }) {
  const [now, setNow] = useState(Date.now)
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])
  const seconds = Math.max(0, Math.floor((now - new Date(turn.created_at).getTime()) / 1000))
  return (
    <div className="manager-thinking" role="status">
      <LoaderCircle size={16} />
      <span>
        {turn.status === 'QUEUED'
          ? 'Queued for research…'
          : turn.steps.length
            ? `Researching your workspace · ${turn.steps.length} data steps`
            : 'Your Manager is thinking…'}
        <small className="manager-research-time">
          {Math.floor(seconds / 60)}m {seconds % 60}s · You can leave this chat and return later.
        </small>
      </span>
    </div>
  )
}

function safeUrl(url) {
  return (
    typeof url === 'string' &&
    /^\/(orders(?:\/[a-f0-9-]+)?|bank(?:\/[a-f0-9-]+)?|products|customers|inventory|categories|packaging|couriers|marketing|expenses|whatsapp|settings|analytics)$/.test(
      url,
    )
  )
}

function ActionCard({ action, onChanged }) {
  const [busy, setBusy] = useState(false)
  async function decide(decision) {
    setBusy(true)
    try {
      await post(`assistant/actions/${action.id}/`, { decision })
      await onChanged()
      if (decision === 'confirm') toast.success('Proposal processed. Check its status below.')
    } catch (error) {
      toast.error(error.message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <section className="manager-action">
      <div className="manager-action-title">
        <ShieldCheck size={18} />
        <strong>{action.kind.replaceAll('_', ' ')}</strong>
        <span>{action.status.replaceAll('_', ' ')}</span>
      </div>
      <dl>
        {Object.entries(action.review || action.payload).map(([key, value]) => (
          <div key={key}>
            <dt>{key.replaceAll('_', ' ')}</dt>
            <dd>{typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}</dd>
          </div>
        ))}
      </dl>
      {action.status === 'PENDING' && (
        <>
          <p>
            Nothing has changed yet. Review every field before confirming. This proposal expires in
            20 minutes.
            {action.kind === 'create_order' &&
              ' Stock availability, courier charges and packaging costs are rechecked at confirmation. Your normal configured order notifications may also be queued.'}
            {action.kind === 'record_bank_movement' &&
              ' This records a ledger movement; it does not transfer money.'}
          </p>
          <div className="manager-action-buttons">
            <Button loading={busy} onClick={() => decide('confirm')}>
              <Check size={15} /> Confirm & apply
            </Button>
            <Button variant="secondary" disabled={busy} onClick={() => decide('cancel')}>
              <X size={15} /> Cancel
            </Button>
          </div>
        </>
      )}
      {action.status === 'APPLIED' && (
        <p>
          <Check size={15} /> Applied successfully.{' '}
          {safeUrl(action.result?.url) && (
            <Link to={action.result.url}>
              Open {action.result.label} <ArrowUpRight size={14} />
            </Link>
          )}
        </p>
      )}
      {action.status === 'EXPIRED' && <p>Not applied. Ask your Manager for a fresh proposal.</p>}
    </section>
  )
}

export default function Manager() {
  const { user } = useAuth()
  const client = useQueryClient()
  const [conversation, setConversation] = useState('')
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [stopping, setStopping] = useState(false)
  const [sendError, setSendError] = useState('')
  const [historyPage, setHistoryPage] = useState(1)
  const [messagePage, setMessagePage] = useState(1)
  const [retryRequest, setRetryRequest] = useState(null)
  const [historyOpen, setHistoryOpen] = useState(false)
  const historyToggle = useRef(null)
  const bottom = useRef(null)
  const input = useRef(null)
  const config = useQuery({
    queryKey: ['manager-config'],
    queryFn: () => api('assistant/config/'),
    retry: false,
  })
  const history = useQuery({
    queryKey: ['manager-history', historyPage],
    queryFn: () => api(`assistant/conversations/?page=${historyPage}`),
  })
  const thread = useQuery({
    queryKey: ['manager-thread', conversation, messagePage],
    queryFn: () => api(`assistant/conversations/${conversation}/?page=${messagePage}`),
    enabled: !!conversation,
    refetchInterval: (query) => (busy || query.state.data?.turns.some(isActiveTurn) ? 2000 : false),
  })
  const turns = thread.data?.turns || []
  const lastTurnStatus = turns.at(-1)?.status
  const running = busy || turns.some(isActiveTurn)
  const name = config.data?.name || `${user?.workspace_name || 'Your business'}'s Manager`
  useEffect(() => {
    document.title = `${name} · Comqora`
  }, [name])
  useEffect(() => {
    if (!historyOpen) return
    function closeHistory(event) {
      if (event.key === 'Escape') {
        setHistoryOpen(false)
        historyToggle.current?.focus()
      }
    }
    window.addEventListener('keydown', closeHistory)
    return () => window.removeEventListener('keydown', closeHistory)
  }, [historyOpen])
  useEffect(() => {
    bottom.current?.scrollIntoView?.({ behavior: 'smooth', block: 'end' })
  }, [conversation, turns.length, lastTurnStatus])
  async function refresh() {
    await Promise.all([
      client.invalidateQueries({ queryKey: ['manager-thread'] }),
      client.invalidateQueries({ queryKey: ['manager-history'] }),
    ])
  }
  function select(id) {
    setHistoryOpen(false)
    setConversation(id)
    setMessagePage(1)
    setSendError('')
    setRetryRequest(null)
    setDraft('')
  }
  async function send(e) {
    e.preventDefault()
    if (!draft.trim() || running || !config.data?.ready) return
    const question = draft.trim()
    setBusy(true)
    setSendError('')
    setMessagePage(1)
    let id = conversation
    try {
      if (!id) {
        const created = await post('assistant/conversations/')
        id = created.id
        setConversation(id)
      }
      const key =
        retryRequest?.question === question && retryRequest.conversation === id
          ? retryRequest.key
          : crypto.randomUUID()
      setRetryRequest({ question, conversation: id, key })
      const result = await post(`assistant/conversations/${id}/send/`, {
        question,
        request_key: key,
      })
      setDraft('')
      setRetryRequest(null)
      if (result.status === 'ERROR') toast.error(result.error)
    } catch (error) {
      setSendError(error.message)
    } finally {
      await refresh()
      setBusy(false)
    }
  }
  async function archive() {
    try {
      await patch(`assistant/conversations/${conversation}/`, { archived: true })
      select('')
      await refresh()
    } catch (error) {
      toast.error(error.message)
    }
  }
  async function stopResearch() {
    setStopping(true)
    try {
      await post(`assistant/conversations/${conversation}/cancel/`)
      await refresh()
    } catch (error) {
      toast.error(error.message)
    } finally {
      setStopping(false)
    }
  }
  if (config.isPending) return <Loading />
  if (config.error) return <ErrorState error={config.error} retry={config.refetch} />
  return (
    <div className={`manager-page ${historyOpen ? 'manager-history-open' : ''}`}>
      <div className="manager-shell">
        {historyOpen && (
          <button
            className="manager-history-backdrop"
            aria-label="Close conversations"
            onClick={() => setHistoryOpen(false)}
          />
        )}
        <aside
          id="manager-conversations"
          className="manager-history"
          aria-label="Manager conversations"
        >
          <Link className="manager-back" to="/dashboard">
            <ArrowLeft size={15} /> Back to workspace
          </Link>
          <div className="manager-identity">
            <Sparkles size={18} />
            <h1>{name}</h1>
          </div>
          <Button variant="secondary" onClick={() => select('')} disabled={busy}>
            <MessageSquarePlus size={16} /> New conversation
          </Button>
          <div className="manager-history-label">
            YOUR CONVERSATIONS <span>Private to you</span>
          </div>
          {history.error ? (
            <ErrorState error={history.error} retry={history.refetch} />
          ) : (
            <div className="manager-history-items">
              {history.data?.results.map((item) => (
                <button
                  key={item.id}
                  disabled={busy}
                  className={item.id === conversation ? 'active' : ''}
                  onClick={() => select(item.id)}
                  title={item.title}
                >
                  <span>{item.title}</span>
                  <small>
                    {new Date(item.updated_at).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </small>
                </button>
              ))}
              {!history.data?.results.length && (
                <p>
                  No conversations yet.
                  <br />
                  Start with a question.
                </p>
              )}
            </div>
          )}
          <div className="manager-pages">
            <button
              disabled={historyPage === 1}
              onClick={() => setHistoryPage((p) => p - 1)}
              aria-label="Previous conversations"
            >
              <ChevronLeft size={16} />
            </button>
            <span>Page {historyPage}</span>
            <button
              disabled={!history.data?.next_page}
              onClick={() => setHistoryPage((p) => p + 1)}
              aria-label="Older conversations"
            >
              <ChevronRight size={16} />
            </button>
          </div>
          <details className="manager-disclosure">
            <summary>
              <Database size={15} /> How your data is used
            </summary>
            <p>{config.data.notice}</p>
          </details>
        </aside>
        <section className="manager-chat" aria-label="Business assistant chat">
          <div className="manager-chat-toolbar">
            <button
              ref={historyToggle}
              className="manager-history-toggle"
              aria-label="Show conversations"
              aria-controls="manager-conversations"
              aria-expanded={historyOpen}
              onClick={() => setHistoryOpen((open) => !open)}
            >
              <PanelLeft size={20} />
            </button>
            <span>
              <Sparkles size={16} /> {conversation ? thread.data?.title || 'Conversation' : name}
            </span>
            {!config.data.ready && <small>Temporarily unavailable</small>}
            {conversation && (
              <button onClick={archive} disabled={running}>
                Archive chat
              </button>
            )}
          </div>
          <div className="manager-messages" aria-live="polite" aria-relevant="additions text">
            {thread.error && <ErrorState error={thread.error} retry={thread.refetch} />}
            {conversation && thread.isPending ? (
              <Loading />
            ) : !turns.length && !busy ? (
              <div className="manager-welcome">
                <div className="manager-orb">
                  <Sparkles size={30} />
                </div>
                <span className="manager-eyebrow">THE DETAILS. THE BIG PICTURE.</span>
                <h2>
                  What can I help you
                  <br />
                  understand today?
                </h2>
                <p>
                  Your orders, inventory and finances—one conversation.
                  <br />
                  Ask in English, Urdu or Roman Urdu.
                </p>
                <div className="manager-starters">
                  {starters.map(({ icon: Icon, title, note, text }) => (
                    <button
                      key={title}
                      onClick={() => {
                        setDraft(text)
                        input.current?.focus()
                      }}
                    >
                      <Icon size={20} />
                      <strong>{title}</strong>
                      <span>{note}</span>
                      <ArrowUpRight size={15} />
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
            {(thread.data?.older_page || messagePage > 1) && (
              <div className="manager-pages">
                <button
                  disabled={!thread.data?.older_page || running}
                  onClick={() => setMessagePage((p) => p + 1)}
                >
                  Older messages
                </button>
                <span>Page {messagePage}</span>
                <button
                  disabled={messagePage === 1 || running}
                  onClick={() => setMessagePage((p) => p - 1)}
                >
                  Newer messages
                </button>
              </div>
            )}
            {turns.map((turn) => (
              <article className="manager-turn" key={turn.id}>
                <div className="manager-question">
                  <small>You</small>
                  <p>{turn.question}</p>
                </div>
                <div className="manager-response">
                  <div className="manager-response-label">
                    <Sparkles size={16} />
                    <strong>{name}</strong>
                    <small>{turn.model_name}</small>
                  </div>
                  {isActiveTurn(turn) ? (
                    <ResearchProgress turn={turn} />
                  ) : turn.status === 'CANCELLED' ? (
                    <p className="manager-composer-note">
                      Research stopped. Any in-flight provider request may still finish and be
                      billed, but its result will not be applied.
                    </p>
                  ) : turn.status === 'ERROR' ? (
                    <div className="manager-error" role="alert">
                      <CircleAlert size={18} />
                      <span>{turn.error}</span>
                    </div>
                  ) : (
                    <MessageText text={turn.answer} />
                  )}
                  {!!turn.steps.length && (
                    <details className="manager-evidence">
                      <summary>
                        {turn.steps.length} data steps ·{' '}
                        {new Date(turn.created_at).toLocaleString('en-GB')}
                      </summary>
                      <ul>
                        {turn.steps.map((step, i) => (
                          <li key={i}>
                            {step.tool.replaceAll('_', ' ')} <span>{step.status}</span>
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                  {!!turn.sources.length && (
                    <details className="manager-evidence">
                      <summary>Records consulted ({turn.sources.length})</summary>
                      <div className="manager-sources">
                        {turn.sources
                          .filter((s) => safeUrl(s.url))
                          .map((source, i) => (
                            <Link key={i} to={source.url}>
                              {source.label}
                              <ArrowUpRight size={12} />
                            </Link>
                          ))}
                      </div>
                    </details>
                  )}
                  {turn.actions.map((action) => (
                    <ActionCard key={action.id} action={action} onChanged={refresh} />
                  ))}
                </div>
              </article>
            ))}
            {busy && !turns.some(isActiveTurn) && (
              <p className="manager-thinking">
                <LoaderCircle size={16} /> Your Manager is investigating…
              </p>
            )}
            <div ref={bottom} />
          </div>
          <form className="manager-composer" onSubmit={send}>
            {!config.data.ready && (
              <p className="manager-composer-note" role="status">
                Your Manager is temporarily unavailable. Please try again later or contact support.
              </p>
            )}
            {sendError && (
              <p className="manager-error" role="alert">
                {sendError} If delivery was interrupted, sending the same message again safely
                checks its existing request.
              </p>
            )}
            <label className="sr-only" htmlFor="manager-question">
              Ask your Manager
            </label>
            <textarea
              ref={input}
              id="manager-question"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              maxLength={8000}
              rows={3}
              placeholder="Ask about any order, customer, purchase or balance…"
              disabled={running || !config.data.ready}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault()
                  e.currentTarget.form.requestSubmit()
                }
              }}
            />
            <div className="manager-composer-controls">
              {turns.some(isActiveTurn) && (
                <Button
                  variant="secondary"
                  type="button"
                  onClick={stopResearch}
                  loading={stopping}
                  className="manager-stop"
                >
                  <Square size={13} /> Stop research
                </Button>
              )}
              <span>{draft.length}/8000</span>
              <Button
                type="submit"
                disabled={running || !draft.trim() || !config.data.ready}
                aria-label="Send message"
              >
                {running ? <LoaderCircle size={18} /> : <ArrowUp size={18} />}
              </Button>
            </div>
            <p className="manager-composer-note">
              AI can make mistakes. Review sources and action details. Enter to send · Shift + Enter
              for a new line.
            </p>
          </form>
        </section>
      </div>
    </div>
  )
}
