import { useMemo } from "react";
import { useExpenses } from "../context/ExpensesContext.jsx";
import ExpenseForm from "../components/money-manager/ExpenseForm.jsx";
import ExpenseList from "../components/money-manager/ExpenseList.jsx";
import { formatSum } from "../utils/format.js";

export default function MoneyManager() {
  const { expenses, isLoading, downloadBackup } = useExpenses();

  const total = useMemo(
    () => expenses.reduce((sum, expense) => sum + expense.amount, 0),
    [expenses]
  );

  return (
    <>
      <h1 className="page-title">Money manager</h1>
      <p className="page-subtitle">
        Kunlik xarajatlaringizni yozib boring — miqdori, sababi, joyi va vaqti.
      </p>

      <ExpenseForm />

      <div className="toolbar">
        <span className="toolbar__summary">
          Jami: <span className="mono">{formatSum(total)}</span>
        </span>
        <button type="button" className="btn" onClick={downloadBackup}>
          JSON backup yuklab olish
        </button>
      </div>

      {isLoading ? (
        <p className="ledger-empty">Yuklanmoqda...</p>
      ) : (
        <ExpenseList expenses={expenses} />
      )}
    </>
  );
}
