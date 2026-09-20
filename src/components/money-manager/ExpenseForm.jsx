import { useState } from "react";
import { useExpenses } from "../../context/ExpensesContext.jsx";

function nowForInput() {
  // datetime-local input "YYYY-MM-DDTHH:mm" formatini kutadi
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

const EMPTY_FORM = {
  amount: "",
  reason: "",
  location: "",
  spentAt: nowForInput(),
  plannedAt: "",
};

export default function ExpenseForm() {
  const { addExpense } = useExpenses();
  const [form, setForm] = useState(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);

  function handleChange(field) {
    return (event) => {
      setForm((prev) => ({ ...prev, [field]: event.target.value }));
    };
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!form.amount || Number(form.amount) <= 0) return;

    setIsSaving(true);
    await addExpense({
      amount: form.amount,
      reason: form.reason,
      location: form.location,
      spentAt: new Date(form.spentAt).toISOString(),
      plannedAt: form.plannedAt ? new Date(form.plannedAt).toISOString() : null,
    });
    setForm({ ...EMPTY_FORM, spentAt: nowForInput() });
    setIsSaving(false);
  }

  return (
    <form className="expense-form" onSubmit={handleSubmit}>
      <div className="expense-form__field">
        <label className="expense-form__label" htmlFor="amount">
          Miqdori (so'm)
        </label>
        <input
          id="amount"
          type="number"
          min="0"
          step="500"
          className="expense-form__input"
          value={form.amount}
          onChange={handleChange("amount")}
          placeholder="5000"
          required
        />
      </div>

      <div className="expense-form__field">
        <label className="expense-form__label" htmlFor="location">
          Qayerda
        </label>
        <input
          id="location"
          type="text"
          className="expense-form__input"
          value={form.location}
          onChange={handleChange("location")}
          placeholder="Korzinka, Chilonzor"
        />
      </div>

      <div className="expense-form__field expense-form__field--full">
        <label className="expense-form__label" htmlFor="reason">
          Nima uchun
        </label>
        <input
          id="reason"
          type="text"
          className="expense-form__input"
          value={form.reason}
          onChange={handleChange("reason")}
          placeholder="Tushlik, transport, kitob..."
        />
      </div>

      <div className="expense-form__field">
        <label className="expense-form__label" htmlFor="spentAt">
          Ishlatilgan vaqti
        </label>
        <input
          id="spentAt"
          type="datetime-local"
          className="expense-form__input"
          value={form.spentAt}
          onChange={handleChange("spentAt")}
          required
        />
      </div>

      <div className="expense-form__field">
        <label className="expense-form__label" htmlFor="plannedAt">
          Belgilangan vaqti (ixtiyoriy)
        </label>
        <input
          id="plannedAt"
          type="datetime-local"
          className="expense-form__input"
          value={form.plannedAt}
          onChange={handleChange("plannedAt")}
        />
      </div>

      <div className="expense-form__actions">
        <button type="submit" className="btn btn--primary" disabled={isSaving}>
          {isSaving ? "Saqlanmoqda..." : "Qo'shish"}
        </button>
      </div>
    </form>
  );
}
