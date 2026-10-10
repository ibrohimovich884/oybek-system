// DB qatoridagi snake_case ustunlarni frontend kutayotgan camelCase
// shaklga o'giradi.
export function mapExpenseRow(row, edits = []) {
  return {
    id: row.id,
    type: row.type,
    amount: Number(row.amount),
    targetAmount: row.target_amount != null ? Number(row.target_amount) : (row.type === "transfer" ? Number(row.amount) : null),
    currency: row.currency,
    category: row.category,
    subcategory: row.subcategory,
    reason: row.reason,
    location: row.location,
    paymentMethod: row.payment_method,
    wallet: row.wallet,
    fromWallet: row.from_wallet,
    toWallet: row.to_wallet,
    quantity: row.quantity,
    exchangeRateAtTime: row.exchange_rate_at_time ? Number(row.exchange_rate_at_time) : null,
    debtId: row.debt_id || null,
    spentAt: row.spent_at,
    createdAt: row.created_at,
    edits: edits.map((edit) => ({
      field: edit.field,
      from: edit.from_value,
      to: edit.to_value,
      editedAt: edit.edited_at,
    })),
  };
}
