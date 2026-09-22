import { Plus, Minus, Trash2 } from 'lucide-react'
import { Button, Field } from './ui'

export function Segmented({ label, value, onChange, options }) {
  return (
    <div className="segment-field">
      <span className="control-label">{label}</span>
      <div className="segmented" role="group" aria-label={label}>
        {options.map(([key, text]) => (
          <button
            key={key}
            type="button"
            aria-pressed={value === key}
            className={value === key ? 'selected' : ''}
            onClick={() => onChange(key)}
          >
            {text}
          </button>
        ))}
      </div>
    </div>
  )
}
export function Quantity({ value, onChange, label, min = 0, step = 1 }) {
  return (
    <div className="quantity-stepper">
      <button
        type="button"
        aria-label={`Decrease ${label}`}
        disabled={Number(value) <= min}
        onClick={() =>
          onChange(String(Math.max(min, Math.round((Number(value) - step) * 100) / 100)))
        }
      >
        <Minus size={15} />
      </button>
      <input
        aria-label={label}
        type="number"
        min={min}
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <button
        type="button"
        aria-label={`Increase ${label}`}
        onClick={() => onChange(String(Math.round((Number(value) + step) * 100) / 100))}
      >
        <Plus size={15} />
      </button>
    </div>
  )
}
export function CostsEditor({ value, onChange, percentages = false, label = 'Other costs' }) {
  const update = (index, change) =>
    onChange(value.map((row, i) => (i === index ? { ...row, ...change } : row)))
  return (
    <section className="costs-editor">
      <div className="section-title">
        <h3>{label}</h3>
        <Button
          type="button"
          variant="secondary"
          disabled={value.length >= 30}
          onClick={() =>
            onChange([
              ...value,
              { name: '', amount: '0', ...(percentages ? { kind: 'FIXED' } : {}) },
            ])
          }
        >
          <Plus size={14} />
          Add charge
        </Button>
      </div>
      {value.map((row, index) => (
        <div className="custom-cost-row" key={index}>
          <Field label={`Charge ${index + 1}`}>
            <input
              required
              maxLength={80}
              placeholder="e.g. Fuel surcharge"
              value={row.name}
              onChange={(e) => update(index, { name: e.target.value })}
            />
          </Field>
          {percentages && (
            <Segmented
              label={`Charge ${index + 1} type`}
              value={row.kind}
              onChange={(kind) => update(index, { kind })}
              options={[
                ['FIXED', 'PKR'],
                ['PERCENT', '%'],
              ]}
            />
          )}
          <Field label={percentages && row.kind === 'PERCENT' ? 'Percentage' : 'Amount (PKR)'}>
            <input
              required
              type="number"
              min="0"
              max={row.kind === 'PERCENT' ? 100 : 9999999999.99}
              step="0.01"
              value={row.amount}
              onChange={(e) => update(index, { amount: e.target.value })}
            />
          </Field>
          <button
            type="button"
            className="icon-button"
            aria-label={`Remove charge ${index + 1}`}
            onClick={() => onChange(value.filter((_, i) => i !== index))}
          >
            <Trash2 size={17} />
          </button>
        </div>
      ))}
      <small className="muted">
        {percentages
          ? 'Each percentage applies to base shipping + extra weight, independently. Taxes and other fees are not compounded.'
          : 'These amounts are total costs, not per-unit costs.'}
      </small>
    </section>
  )
}
