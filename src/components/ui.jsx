import { cloneElement, isValidElement, useEffect, useId, useRef } from 'react'
import { AlertCircle, ArrowUpRight, LoaderCircle, PackageOpen, X } from 'lucide-react'
export function Button({ children, variant = 'primary', loading, ...props }) {
  return (
    <button
      {...props}
      disabled={loading || props.disabled}
      className={`btn btn-${variant} ${props.className || ''}`}
    >
      {loading && <LoaderCircle size={16} className="animate-spin" />}
      {children}
    </button>
  )
}
export function Badge({ status }) {
  return (
    <span className={`badge badge-${status.toLowerCase()}`}>
      <i />
      {status.toLowerCase().replaceAll('_', ' ')}
    </span>
  )
}
export function Empty({
  title = 'Nothing here yet',
  description = 'Your workspace is ready. Add your first record to get started.',
  action,
}) {
  return (
    <div className="empty">
      <div className="empty-icon">
        <PackageOpen size={27} />
      </div>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  )
}
export function Loading() {
  return (
    <div className="loading-state">
      <LoaderCircle className="animate-spin" size={24} />
      <span>Getting everything ready…</span>
    </div>
  )
}
export function ErrorState({ error, retry }) {
  return (
    <div className="error-state">
      <AlertCircle size={24} />
      <h3>We couldn’t load this page</h3>
      <p>{error.message}</p>
      {retry && <Button onClick={retry}>Try again</Button>}
    </div>
  )
}
export function PageHeading({ eyebrow, title, description, actions }) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      <div className="page-actions">{actions}</div>
    </div>
  )
}
export function StatCard({ label, value, detail, icon, accent }) {
  return (
    <div className={`stat-card ${accent ? 'stat-accent' : ''}`}>
      <div className="stat-top">
        <span>{label}</span>
        <span className="stat-icon">{icon}</span>
      </div>
      <strong>{value}</strong>
      <div className="stat-detail">
        {accent ? <ArrowUpRight size={14} /> : <span className="tiny-dot" />}
        {detail}
      </div>
    </div>
  )
}
export function Field({ label, children, hint }) {
  const generated = useId()
  const id = children?.props?.id || generated
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {isValidElement(children) ? cloneElement(children, { id }) : children}
      {hint && <small>{hint}</small>}
    </div>
  )
}
export function Modal({ title, description, onClose, children, wide = false }) {
  const titleId = useId()
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    el?.showModal()
    return () => {
      el?.close()
      document.body.style.overflow = previousOverflow
    }
  }, [])
  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      className={`modal ${wide ? 'modal-wide' : ''}`}
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="modal-inner">
        <div className="modal-heading">
          <div>
            <h2 id={titleId}>{title}</h2>
            {description && <p>{description}</p>}
          </div>
          <button type="button" className="icon-button" aria-label="Close dialog" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </dialog>
  )
}
