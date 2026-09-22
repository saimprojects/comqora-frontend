import { useState } from 'react'
import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MessageEditor from '../src/features/whatsapp/MessageEditor'

afterEach(cleanup)
function Editor({ initial = 'Hello customer', ...props }) {
  const [value, setValue] = useState(initial)
  return <MessageEditor value={value} onChange={setValue} {...props} />
}
it('previews templates without replacing text until explicitly applied', async () => {
  const user = userEvent.setup()
  render(<Editor order />)
  await user.click(screen.getByRole('button', { name: /^Friendly/ }))
  expect(screen.getByLabelText('Message').value).toBe('Hello customer')
  await user.click(screen.getByRole('button', { name: 'Use this template' }))
  expect(screen.getByLabelText('Message').value).toContain('{customer}')
  expect(screen.getByLabelText('Message preview').textContent).toContain('Ayesha')
})
it('formats selected text and renders safe bold preview', async () => {
  const user = userEvent.setup()
  render(<Editor initial="Hello customer" />)
  const input = screen.getByLabelText('Message')
  input.focus()
  input.setSelectionRange(6, 14)
  await user.click(screen.getByRole('button', { name: 'Bold', exact: true }))
  expect(input.value).toBe('Hello *customer*')
  expect(within(screen.getByLabelText('Message preview')).getByText('customer').tagName).toBe(
    'STRONG',
  )
})
it('inserts placeholders at the cursor without submitting a form', async () => {
  const user = userEvent.setup(),
    submit = vi.fn((e) => e.preventDefault())
  render(
    <form onSubmit={submit}>
      <Editor order placeholders={['customer']} initial="Hi " />
    </form>,
  )
  const input = screen.getByLabelText('Message')
  input.focus()
  input.setSelectionRange(3, 3)
  await user.click(screen.getByRole('button', { name: 'customer', exact: true }))
  expect(input.value).toBe('Hi {customer}')
  expect(submit).not.toHaveBeenCalled()
})
it('does not inject HTML into preview or exceed formatting limits', async () => {
  const user = userEvent.setup()
  render(<Editor initial="<img src=x>" maxLength={11} />)
  const input = screen.getByLabelText('Message')
  fireEvent.select(input, { target: { selectionStart: 0, selectionEnd: 11 } })
  await user.click(screen.getByRole('button', { name: 'Bold', exact: true }))
  expect(input.value).toBe('<img src=x>')
  expect(screen.getByLabelText('Message preview').querySelector('img')).toBeNull()
})
