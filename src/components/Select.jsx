import {
  Children,
  Fragment,
  isValidElement,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown, Search } from 'lucide-react'

function flatten(children) {
  return Children.toArray(children).flatMap((child) =>
    isValidElement(child) && child.type === Fragment ? flatten(child.props.children) : [child],
  )
}
function textOf(children) {
  return Children.toArray(children)
    .map((child) => (isValidElement(child) ? textOf(child.props.children) : String(child)))
    .join('')
}

function panelPosition(element) {
  const rect = element.getBoundingClientRect()
  const above = window.innerHeight - rect.bottom < 260 && rect.top > 280
  const width = Math.min(Math.max(rect.width, 240), window.innerWidth - 16)
  return {
    position: 'fixed',
    width,
    minWidth: 0,
    left: Math.max(8, Math.min(rect.left, window.innerWidth - width - 8)),
    top: above ? 'auto' : rect.bottom + 7,
    bottom: above ? window.innerHeight - rect.top + 7 : 'auto',
    maxHeight: Math.max(100, (above ? rect.top : window.innerHeight - rect.bottom) - 16),
  }
}

/** Native form values plus a searchable, unclipped panel in the nearest dialog's top layer. */
export default function Select({
  children,
  value,
  defaultValue = '',
  onChange,
  name,
  required,
  disabled,
  id,
  'aria-label': label,
  className = '',
  ...props
}) {
  const generated = useId(),
    listId = `${generated}-list`,
    root = useRef(null),
    trigger = useRef(null),
    native = useRef(null),
    searchRef = useRef(null),
    optionsRef = useRef(null),
    panelRef = useRef(null)
  const [internal, setInternal] = useState(defaultValue),
    [open, setOpen] = useState(false),
    [search, setSearch] = useState(''),
    [active, setActive] = useState(0),
    [position, setPosition] = useState({})
  const current = String(value ?? internal ?? '')
  const options = flatten(children)
    .filter(isValidElement)
    .map((child) => ({
      value: String(child.props.value ?? textOf(child.props.children)),
      label: textOf(child.props.children),
      disabled: child.props.disabled,
    }))
  const shown = options.filter(
    (option) =>
      (!search.trim() || option.value !== '') &&
      option.label.toLowerCase().includes(search.trim().toLowerCase()),
  )
  const selected = options.find((option) => option.value === current)
  useLayoutEffect(() => {
    if (!open || document.activeElement !== searchRef.current) return
    const list = optionsRef.current
    const option = document.getElementById(`${listId}-${active}`)
    if (!list || !option) return
    // scrollIntoView can also scroll the page/dialog; move only this list instead.
    const top = list.getBoundingClientRect().top + list.clientTop
    const bottom = top + list.clientHeight
    const row = option.getBoundingClientRect()
    if (row.top < top) list.scrollTop -= top - row.top
    else if (row.bottom > bottom) list.scrollTop += row.bottom - bottom
  }, [open, active, listId, search])
  useLayoutEffect(() => {
    if (!open) return
    function place(e) {
      if (e?.type === 'scroll' && panelRef.current?.contains(e.target)) return
      if (trigger.current) setPosition(panelPosition(trigger.current))
    }
    searchRef.current?.focus({ preventScroll: true })
    function outside(e) {
      if (!root.current?.contains(e.target) && !panelRef.current?.contains(e.target)) setOpen(false)
    }
    document.addEventListener('pointerdown', outside)
    window.addEventListener('resize', place)
    document.addEventListener('scroll', place, true)
    return () => {
      document.removeEventListener('pointerdown', outside)
      window.removeEventListener('resize', place)
      document.removeEventListener('scroll', place, true)
    }
  }, [open])
  useEffect(() => {
    const form = native.current?.form
    const reset = () => {
      setInternal(defaultValue)
      setOpen(false)
      setSearch('')
    }
    form?.addEventListener('reset', reset)
    return () => form?.removeEventListener('reset', reset)
  }, [defaultValue])
  function show() {
    // Commit fixed viewport coordinates with the portal's very first render, before focus.
    setPosition(panelPosition(trigger.current))
    setSearch('')
    setActive(0)
    setOpen(true)
  }
  function choose(option) {
    if (!option || option.disabled) return
    setInternal(option.value)
    onChange?.({
      target: { value: option.value, name },
      currentTarget: { value: option.value, name },
    })
    setOpen(false)
    setSearch('')
    trigger.current?.focus({ preventScroll: true })
  }
  function keydown(e) {
    if (e.key === 'Escape' && open) {
      e.preventDefault()
      e.stopPropagation()
      setOpen(false)
      trigger.current?.focus({ preventScroll: true })
    }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      if (!open) {
        show()
      } else
        setActive((index) =>
          Math.max(0, Math.min(shown.length - 1, index + (e.key === 'ArrowDown' ? 1 : -1))),
        )
    }
    if (e.key === 'Enter' && open) {
      e.preventDefault()
      choose(shown[active])
    }
    if (e.key === 'Tab') setOpen(false)
  }
  return (
    <div className={`smart-select ${className}`} ref={root} onKeyDown={keydown}>
      <select
        ref={native}
        className="native-select-proxy"
        aria-hidden="true"
        tabIndex={-1}
        name={name}
        required={required}
        disabled={disabled}
        value={current}
        onChange={(e) => choose(options.find((o) => o.value === e.target.value))}
        onInvalid={() => trigger.current?.focus()}
      >
        {children}
      </select>
      <button
        {...props}
        id={id}
        ref={trigger}
        type="button"
        role="combobox"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        disabled={disabled}
        className={`select-trigger ${!current ? 'placeholder' : ''}`}
        onClick={() => {
          if (open) setOpen(false)
          else show()
        }}
      >
        <span>{selected?.label || 'Select an option'}</span>
        <ChevronDown size={17} />
      </button>
      {open &&
        createPortal(
          <div ref={panelRef} className="select-panel" style={position}>
            <div className="select-search">
              <Search size={16} />
              <input
                ref={searchRef}
                aria-label={`Search ${label || name || 'options'}`}
                aria-controls={listId}
                aria-activedescendant={shown[active] ? `${listId}-${active}` : undefined}
                role="combobox"
                aria-expanded="true"
                autoComplete="off"
                placeholder="Type to search…"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setActive(0)
                }}
              />
            </div>
            <div
              ref={optionsRef}
              id={listId}
              role="listbox"
              aria-label={label || name || 'Options'}
              className="select-options"
            >
              {shown.map((option, index) => (
                <button
                  type="button"
                  tabIndex={-1}
                  id={`${listId}-${index}`}
                  key={option.value}
                  role="option"
                  aria-selected={option.value === current}
                  disabled={option.disabled}
                  className={index === active ? 'highlighted' : ''}
                  onMouseEnter={() => setActive(index)}
                  onClick={() => choose(option)}
                >
                  <span>{option.label}</span>
                  {option.value === current && <Check size={16} />}
                </button>
              ))}
              {!shown.length && (
                <p className="select-no-results">No matches. Try a different search.</p>
              )}
            </div>
          </div>,
          root.current?.closest('dialog') || document.body,
        )}
    </div>
  )
}
