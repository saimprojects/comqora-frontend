import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import Select from '../src/components/Select'

const previousScrollIntoView = Element.prototype.scrollIntoView
beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn()
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  if (previousScrollIntoView) Element.prototype.scrollIntoView = previousScrollIntoView
  else delete Element.prototype.scrollIntoView
  document.documentElement.scrollTop = 0
})

function rect(top, left = 100, width = 260, height = 44) {
  return { top, left, width, height, bottom: top + height, right: left + width, x: left, y: top }
}
function options() {
  return Array.from({ length: 12 }, (_, index) => (
    <option key={index} value={String(index)}>
      Customer {index}
    </option>
  ))
}

it('positions the portal before focusing search and explicitly prevents page scrolling', () => {
  const originalFocus = HTMLElement.prototype.focus
  const searchFocus = []
  vi.spyOn(HTMLElement.prototype, 'focus').mockImplementation(function (options) {
    if (this.closest('.select-search')) {
      const panel = this.closest('.select-panel')
      searchFocus.push({ options, position: panel.style.position, top: panel.style.top })
    }
    originalFocus.call(this, options)
  })
  render(<Select aria-label="Customers">{options()}</Select>)
  const trigger = screen.getByRole('combobox', { name: 'Customers' })
  vi.spyOn(trigger, 'getBoundingClientRect').mockReturnValue(rect(120))
  fireEvent.click(trigger)
  expect(searchFocus).toEqual([
    { options: { preventScroll: true }, position: 'fixed', top: '171px' },
  ])
  expect(document.activeElement).toBe(screen.getByRole('combobox', { name: 'Search Customers' }))
  expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled()
})

it('scrolls only its own option list during keyboard navigation, including inside a dialog', () => {
  render(
    <dialog open>
      <Select aria-label="Customers">{options()}</Select>
    </dialog>,
  )
  const dialog = document.querySelector('dialog')
  dialog.scrollTop = 300
  document.documentElement.scrollTop = 800
  fireEvent.click(screen.getByRole('combobox', { name: 'Customers' }))
  const search = screen.getByRole('combobox', { name: 'Search Customers' })
  const list = screen.getByRole('listbox')
  expect(dialog.contains(list)).toBe(true)
  Object.defineProperty(list, 'clientHeight', { configurable: true, value: 120 })
  vi.spyOn(list, 'getBoundingClientRect').mockReturnValue(rect(200, 0, 260, 120))
  screen.getAllByRole('option').forEach((option, index) => {
    vi.spyOn(option, 'getBoundingClientRect').mockImplementation(() =>
      rect(200 + index * 40 - list.scrollTop, 0, 260, 40),
    )
  })
  for (let index = 0; index < 5; index++) fireEvent.keyDown(search, { key: 'ArrowDown' })
  expect(list.scrollTop).toBe(120)
  for (let index = 0; index < 5; index++) fireEvent.keyDown(search, { key: 'ArrowUp' })
  expect(list.scrollTop).toBe(0)
  expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled()
  expect(dialog.scrollTop).toBe(300)
  expect(document.documentElement.scrollTop).toBe(800)
})

it('returns focus without scrolling after selecting or pressing Escape', () => {
  const focus = vi.spyOn(HTMLElement.prototype, 'focus')
  render(<Select aria-label="Customers">{options()}</Select>)
  const trigger = screen.getByRole('combobox', { name: 'Customers' })
  fireEvent.click(trigger)
  fireEvent.click(screen.getByRole('option', { name: 'Customer 2' }))
  expect(document.activeElement).toBe(trigger)
  expect(focus.mock.calls.at(-1)).toEqual([{ preventScroll: true }])
  fireEvent.click(trigger)
  fireEvent.keyDown(screen.getByRole('combobox', { name: 'Search Customers' }), { key: 'Escape' })
  expect(document.activeElement).toBe(trigger)
  expect(focus.mock.calls.at(-1)).toEqual([{ preventScroll: true }])
})

it('reopens at the start with a cleared search when opened by keyboard', () => {
  render(<Select aria-label="Customers">{options()}</Select>)
  const trigger = screen.getByRole('combobox', { name: 'Customers' })
  fireEvent.click(trigger)
  const search = screen.getByRole('combobox', { name: 'Search Customers' })
  fireEvent.change(search, { target: { value: 'Customer 9' } })
  fireEvent.keyDown(search, { key: 'Escape' })
  fireEvent.keyDown(trigger, { key: 'ArrowDown' })
  expect(screen.getByRole('combobox', { name: 'Search Customers' }).value).toBe('')
  expect(screen.getAllByRole('option')).toHaveLength(12)
  expect(screen.getByRole('listbox').scrollTop).toBe(0)
})

it('flips above near the viewport edge and follows external scrolling without refocusing', () => {
  vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(360)
  vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(720)
  const focus = vi.spyOn(HTMLElement.prototype, 'focus')
  render(<Select aria-label="Customers">{options()}</Select>)
  const trigger = screen.getByRole('combobox', { name: 'Customers' })
  const bounds = vi.spyOn(trigger, 'getBoundingClientRect').mockReturnValue(rect(620, 280, 200))
  fireEvent.click(trigger)
  const panel = document.querySelector('.select-panel')
  expect(panel.style.top).toBe('auto')
  expect(panel.style.bottom).toBe('107px')
  expect(panel.style.left).toBe('112px')
  expect(panel.style.width).toBe('240px')
  const focusCount = focus.mock.calls.length
  bounds.mockReturnValue(rect(120, 100, 200))
  fireEvent.scroll(document)
  expect(panel.style.top).toBe('171px')
  expect(panel.style.bottom).toBe('auto')
  expect(focus).toHaveBeenCalledTimes(focusCount)
})
