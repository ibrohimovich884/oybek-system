import { useState } from "react";
import { X, Check, Trash2 } from "lucide-react";
import { useExpenses } from "../../context/ExpensesContext.jsx";
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  WALLET_CONFIG,
} from "../../constants/money.js";
import { formatSum } from "../../utils/format.js";
import CategoryIcon from "./CategoryIcon.jsx";

function toLocalDatetimeInput(date) {
  if (!date) return "";
  const d = new Date(date);
  const pad = (n) => String(n).padStart(2, "0");
  const yyyy = d.getFullYear();
  const MM = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mm = pad(d.getMinutes());
  return `${yyyy}-${MM}-${dd}T${hh}:${mm}`;
}

export default function EditTransactionModal({ item, onClose }) {
  const { updateExpense, deleteExpense } = useExpenses();

  const [type, setType] = useState(item.type || "expense");
  const [wallet, setWallet] = useState(item.wallet || "karta");
  const [fromWallet, setFromWallet] = useState(item.fromWallet || "karta");
  const [toWallet, setToWallet] = useState(item.toWallet || "naqd");
  const [category, setCategory] = useState(item.category || "food");
  const [amount, setAmount] = useState(String(item.amount || ""));
  const [reason, setReason] = useState(item.reason || "");
  const [location, setLocation] = useState(item.location || "");
  const [spentAt, setSpentAt] = useState(toLocalDatetimeInput(item.spentAt));
  const [isSaving, setIsSaving] = useState(false);

  const categories = type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) return;

    setIsSaving(true);
    try {
      await updateExpense(item.id, {
        type,
        amount: numAmount,
        wallet,
        fromWallet: type === "transfer" ? fromWallet : null,
        toWallet: type === "transfer" ? toWallet : null,
        category: type === "transfer" ? "transfer" : category,
        reason,
        location,
        spentAt: spentAt ? new Date(spentAt).toISOString() : new Date().toISOString(),
      });
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm("Rostdan ham ushbu yozuvni o'chirmoqchimisiz?")) {
      await deleteExpense(item.id);
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3 className="modal-title">Tranzaksiyani tahrirlash</h3>
            <p className="modal-subtitle">
              Kiritilgan ma'lumotlarni o'zgartiring va saqlang
            </p>
          </div>
          <button type="button" className="btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          {/* Turi */}
          <div className="expense-form__field">
            <label className="expense-form__label">Turi</label>
            <div className="type-toggle-group">
              <button
                type="button"
                className={`type-toggle-btn ${type === "expense" ? "is-active is-expense" : ""}`}
                onClick={() => setType("expense")}
              >
                Xarajat
              </button>
              <button
                type="button"
                className={`type-toggle-btn ${type === "income" ? "is-active is-income" : ""}`}
                onClick={() => setType("income")}
              >
                Daromad
              </button>
              <button
                type="button"
                className={`type-toggle-btn ${type === "transfer" ? "is-active is-transfer" : ""}`}
                onClick={() => setType("transfer")}
              >
                O'tkazma
              </button>
            </div>
          </div>

          {/* Hamyon */}
          {type === "transfer" ? (
            <div className="transfer-selectors">
              <div className="expense-form__field">
                <label className="expense-form__label">Qayerdan</label>
                <select
                  value={fromWallet}
                  onChange={(e) => setFromWallet(e.target.value)}
                  className="expense-form__input"
                >
                  <option value="karta">Plastik karta</option>
                  <option value="naqd">Naqd pul</option>
                </select>
              </div>
              <div className="expense-form__field">
                <label className="expense-form__label">Qayerga</label>
                <select
                  value={toWallet}
                  onChange={(e) => setToWallet(e.target.value)}
                  className="expense-form__input"
                >
                  <option value="naqd">Naqd pul</option>
                  <option value="karta">Plastik karta</option>
                </select>
              </div>
            </div>
          ) : (
            <div className="expense-form__field">
              <label className="expense-form__label">Hisob / Hamyon</label>
              <div className="wallet-select-group">
                <button
                  type="button"
                  className={`wallet-choice-btn ${wallet === "karta" ? "is-selected is-karta" : ""}`}
                  onClick={() => setWallet("karta")}
                >
                  Plastik karta
                </button>
                <button
                  type="button"
                  className={`wallet-choice-btn ${wallet === "naqd" ? "is-selected is-naqd" : ""}`}
                  onClick={() => setWallet("naqd")}
                >
                  Naqd pul
                </button>
              </div>
            </div>
          )}

          {/* Kategoriya */}
          {type !== "transfer" && (
            <div className="expense-form__field">
              <label className="expense-form__label">Kategoriya</label>
              <div className="category-pills">
                {categories.map((cat) => {
                  const isSelected = category === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      className={`category-pill ${isSelected ? "is-active" : ""}`}
                      onClick={() => setCategory(cat.id)}
                      style={
                        isSelected
                          ? { borderColor: cat.color, backgroundColor: `${cat.color}22` }
                          : {}
                      }
                    >
                      <CategoryIcon iconName={cat.icon} color={isSelected ? cat.color : "#a39c8e"} size={14} />
                      <span>{cat.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Summa */}
          <div className="expense-form__field">
            <label className="expense-form__label">Miqdor (so'm)</label>
            <input
              type="number"
              min="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="expense-form__input mono"
              required
            />
            {amount && <span className="field-hint">{formatSum(Number(amount))}</span>}
          </div>

          {/* Izoh */}
          <div className="expense-form__field">
            <label className="expense-form__label">Sabab / Izoh</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="expense-form__input"
            />
          </div>

          {/* Joy */}
          <div className="expense-form__field">
            <label className="expense-form__label">Joy / Muassasa</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="expense-form__input"
            />
          </div>

          {/* Sana */}
          <div className="expense-form__field">
            <label className="expense-form__label">Sana va vaqt</label>
            <input
              type="datetime-local"
              value={spentAt}
              onChange={(e) => setSpentAt(e.target.value)}
              className="expense-form__input mono"
            />
          </div>

          <div className="modal-actions">
            <button
              type="button"
              className="btn btn--danger"
              onClick={handleDelete}
            >
              <Trash2 size={15} />
              <span>O'chirish</span>
            </button>
            <div className="modal-actions-right">
              <button type="button" className="btn" onClick={onClose}>
                Bekor qilish
              </button>
              <button type="submit" className="btn btn--primary" disabled={isSaving}>
                <Check size={16} />
                <span>Saqlash</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
