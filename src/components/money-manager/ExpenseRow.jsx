import { formatSum, formatDateTime } from "../../utils/format.js";
import { useExpenses } from "../../context/ExpensesContext.jsx";

export default function ExpenseRow({ expense }) {
  const { deleteExpense } = useExpenses();

  return (
    <div className="ledger-row">
      <span className="mono">{formatDateTime(expense.spentAt)}</span>
      <span className="ledger-row__amount mono">{formatSum(expense.amount)}</span>
      <span>{expense.reason || "—"}</span>
      <span>{expense.location || "—"}</span>
      <span className="ledger-row__edited">
        {expense.editedAt ? `tahrirlangan · ${formatDateTime(expense.editedAt)}` : ""}
      </span>
      <span className="ledger-row__actions">
        <button
          type="button"
          className="btn btn--ghost"
          onClick={() => deleteExpense(expense.id)}
        >
          O'chirish
        </button>
      </span>
    </div>
  );
}
