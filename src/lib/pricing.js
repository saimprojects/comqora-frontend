import Decimal from 'decimal.js-light'

const decimal = (value) => new Decimal(value || 0)
const rounded = (value) => value.toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
export function orderPreview({
  items,
  products = [],
  packaging = [],
  shipping = 0,
  discount = 0,
  ads = 0,
  other = [],
  mode = 'ABSORB',
}) {
  const subtotal = items.reduce(
    (sum, item) =>
      sum.plus(
        decimal(products.find((p) => p.id === item.product)?.selling_price).times(
          item.quantity || 0,
        ),
      ),
    decimal(0),
  )
  const packagingCost = packaging.reduce(
    (sum, pack) => sum.plus(rounded(decimal(pack.unit_cost).times(pack.quantity || 0))),
    decimal(0),
  )
  const charges = rounded(
    other.reduce(
      (sum, cost) => sum.plus(decimal(cost.amount)),
      decimal(shipping).plus(packagingCost).plus(decimal(ads)),
    ),
  )
  const net = subtotal.minus(decimal(discount)).plus(mode === 'ADD' ? charges : 0)
  return { subtotal: subtotal.toNumber(), charges: charges.toNumber(), netSale: net.toNumber() }
}
export function landedPreview({ quantity, amount, mode, transport = 0, imports = 0, other = [] }) {
  if (Number(quantity) <= 0) return 0
  const extra = other.reduce(
    (sum, cost) => sum.plus(decimal(cost.amount)),
    decimal(transport).plus(decimal(imports)),
  )
  const base = mode === 'TOTAL' ? decimal(amount).div(quantity) : decimal(amount)
  return rounded(base.plus(extra.div(quantity))).toNumber()
}
