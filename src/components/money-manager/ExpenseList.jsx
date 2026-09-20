import ExpenseRow from "./ExpenseRow.jsx";

export default function ExpenseList({ expenses }) {
  if (expenses.length === 0) {
    return <p className="ledger-empty">Hali xarajat qo'shilmagan.</p>;
  }

  return (
    <div className="ledger">
      <div className="ledger__head">
        <span>Vaqti</span>
        <span>Summa</span>
        <span>Sabab</span>
        <span>Joyi</span>
        <span>Tahrir</span>
        <span></span>
      </div>
      {expenses.map((expense) => (
        <ExpenseRow key={expense.id} expense={expense} />
      ))}
    </div>
  );
}
