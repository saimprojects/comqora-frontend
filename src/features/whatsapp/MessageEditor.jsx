import { useRef, useState } from 'react'
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  List,
  Sparkles,
  CheckCheck,
  MessageCircle,
} from 'lucide-react'
import { Field } from '../../components/ui'
import './whatsapp.css'

const orderStyles = {
  Signature:
    '*{store}*\nOrder update for {customer}\n\n*Order:* {order_number}\n*Status:* {status}\n*Courier:* {courier}\n*Tracking:* {tracking_id}\n\nThank you for choosing us.',
  Friendly:
    'Hi {customer} 👋\n\nYour order *{order_number}* is now *{status}*.\nTracking: {tracking_id}\nCourier: {courier}\n\nWith thanks,\n*{store}*',
  Minimal: '*{store} · Order update*\n{order_number} — *{status}*\nTracking: {tracking_id}',
  'Care first':
    'Hello {customer},\n\n*An update from {store}* 💬\nYour order *{order_number}* is currently *{status}*.\n\n*Delivery partner:* {courier}\n*Tracking number:* {tracking_id}\n\n_Questions? Reply here and our team will help._',
}

function formatted(text) {
  return text.split(/(\*[^*\n]+\*|_[^_\n]+_|~[^~\n]+~|`[^`\n]+`)/g).map((part, i) => {
    if (part.startsWith('*') && part.endsWith('*'))
      return <strong key={i}>{part.slice(1, -1)}</strong>
    if (part.startsWith('_') && part.endsWith('_')) return <em key={i}>{part.slice(1, -1)}</em>
    if (part.startsWith('~') && part.endsWith('~')) return <s key={i}>{part.slice(1, -1)}</s>
    if (part.startsWith('`') && part.endsWith('`')) return <code key={i}>{part.slice(1, -1)}</code>
    return part
  })
}
const campaignStyles = {
  'New arrivals':
    '*Fresh arrivals are here* ✨\n\nDiscover our latest collection, selected with you in mind.\n\n_Reply to ask about availability or place your order._',
  'Product spotlight':
    '*Your next favourite*\n\nTake a closer look at our featured picks.\n\n*Interested?* Reply and our team will help you order.',
  'Store announcement':
    '*A little update from our team*\n\nAdd your announcement here.\n\nThank you for being part of our community.',
}

export default function MessageEditor({
  value,
  onChange,
  label = 'Message',
  name,
  order = false,
  maxLength = 2000,
  variables,
  placeholders,
  previewStatus,
}) {
  const input = useRef(null)
  const [candidate, setCandidate] = useState('')
  const templates = order ? orderStyles : campaignStyles
  const sample = {
    store: 'Your brand',
    customer: 'Ayesha',
    order_number: 'CQ-1042',
    status: previewStatus || 'out for delivery',
    courier: 'Your courier',
    tracking_id: 'PK123456789',
    ...variables,
  }
  const preview = (text) => text.replace(/\{(\w+)\}/g, (token, key) => sample[key] ?? token)
  function insert(text, selection = 0) {
    const el = input.current,
      start = el.selectionStart,
      end = el.selectionEnd
    const next = value.slice(0, start) + text + value.slice(end)
    if (next.length > maxLength) return
    onChange(next)
    requestAnimationFrame(() => {
      el.focus({ preventScroll: true })
      el.setSelectionRange(start + text.length - selection, start + text.length - selection)
    })
  }
  function wrap(marker) {
    const el = input.current
    insert(marker + (value.slice(el.selectionStart, el.selectionEnd) || 'text') + marker)
  }
  return (
    <div className="wa-composer">
      <div className="wa-composer-heading">
        <Sparkles size={19} />
        <div>
          <strong>Make it sound like your brand</strong>
          <p>Start with a style, or write your own. Everything below is editable.</p>
        </div>
      </div>
      <div className="wa-template-gallery" aria-label="Message styles">
        {Object.entries(templates).map(([key, text], i) => (
          <button
            type="button"
            key={key}
            className={`wa-template-card wa-template-tone-${i % 3}`}
            aria-pressed={candidate === key}
            onClick={() => setCandidate(key)}
          >
            <span>{key}</span>
            <small>
              {preview(text)
                .replace(/[*_~]/g, '')
                .split('\n')
                .filter(Boolean)
                .slice(0, 2)
                .join(' · ')}
            </small>
          </button>
        ))}
        <button
          type="button"
          className="wa-template-card"
          aria-pressed={!candidate}
          onClick={() => {
            setCandidate('')
            input.current.focus({ preventScroll: true })
          }}
        >
          <span>Custom message</span>
          <small>Your words. Your brand voice. Keep editing the message below.</small>
        </button>
      </div>
      {candidate && (
        <div className="wa-template-choice">
          <div className="wa-formatted">{formatted(preview(templates[candidate]))}</div>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              const text = templates[candidate]
              const next = variables
                ? text.replace(/\{(\w+)\}/g, (token, key) => variables[key] ?? token)
                : text
              if (next.length <= maxLength) {
                onChange(next)
                setCandidate('')
              }
            }}
          >
            Use this template
          </button>
          <small>Replaces the current text. It does not send a message.</small>
        </div>
      )}
      <div className="wa-composer-grid">
        <div className="wa-write-pane">
          <div className="wa-format-toolbar" role="group" aria-label="Message formatting">
            {[
              [Bold, 'Bold', '*'],
              [Italic, 'Italic', '_'],
              [Strikethrough, 'Strikethrough', '~'],
              [Code, 'Monospace', '`'],
            ].map(([Icon, title, marker]) => (
              <button
                key={title}
                type="button"
                title={title}
                aria-label={title}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => wrap(marker)}
              >
                <Icon size={17} />
              </button>
            ))}
            <button
              type="button"
              aria-label="Add bullet"
              title="Add bullet"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => insert('\n• ')}
            >
              <List size={18} />
            </button>
            <button
              type="button"
              aria-label="Add sparkle emoji"
              title="Add sparkle emoji"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => insert('✨')}
            >
              ✨
            </button>
          </div>
          <Field label={label}>
            <textarea
              ref={input}
              name={name}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              rows="9"
              required
              maxLength={maxLength}
            />
          </Field>
          <div className="wa-editor-meta">
            <small>Select words, then tap a formatting button.</small>
            <small>
              {value.length}/{maxLength}
            </small>
          </div>
          {order && !variables && (
            <div className="wa-variable-chips">
              <small>Insert customer / order details:</small>
              {(placeholders || Object.keys(sample)).map((key) => (
                <button
                  type="button"
                  key={key}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => insert(`{${key}}`)}
                >
                  {key.replaceAll('_', ' ')}
                </button>
              ))}
            </div>
          )}
        </div>
        <aside className="wa-chat-preview" aria-label="Message preview">
          <div className="wa-chat-header">
            <MessageCircle size={23} />
            <div>
              <strong>{sample.store}</strong>
              <small>WhatsApp-style preview · sample data</small>
            </div>
          </div>
          <div className="wa-chat-surface">
            <div className="wa-chat-bubble">
              <div className="wa-formatted">
                {formatted(preview(value)) || 'Your message preview appears here…'}
              </div>
              <span className="wa-chat-time">
                Preview <CheckCheck size={14} />
              </span>
            </div>
          </div>
          <p>
            Text formatting is sent to WhatsApp; these background colours are preview styling only.
            Actual appearance may differ. Campaign products and media are added separately.
          </p>
        </aside>
      </div>
    </div>
  )
}
