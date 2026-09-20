import { useState, useId } from "react";
import {
  Plus,
  Minus,
  ArrowRightLeft,
  Calendar,
  MapPin,
  FileText,
  CreditCard,
  Banknote,
  Sparkles,
} from "lucide-react";
import { useExpenses } from "../../context/ExpensesContext.jsx";
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  QUICK_TEMPLATES,
  WALLET_CONFIG,
} from "../../constants/money.js";
import { formatSum } from "../../utils/format.js";
import CategoryIcon from "./CategoryIcon.jsx";

function toLocalDatetimeInput(date) {
  const d = date || new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const yyyy = d.getFullYear();
  const MM = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mm = pad(d.getMinutes());
  return `${yyyy}-${MM}-${dd}T${hh}:${mm}`;
}

export default function ExpenseForm({ initialType = "expense", initialFrom = "karta", initialTo = "naqd" }) {
  const { addExpense, currentBalances } = useExpenses();

  const [type, setType] = useState(initialType); // "expense" | "income" | "transfer"
  const [wallet, setWallet] = useState("karta");
  const [fromWallet, setFromWallet] = useState(initialFrom);
  const [toWallet, setToWallet] = useState(initialTo);
  const [category, setCategory] = useState("food");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [location, setLocation] = useState("");
  const [spentAt, setSpentAt] = useState(toLocalDatetimeInput(new Date()));
  const [isSubmitting, setIsSubmitting] = useState(false);

  const amountId = useId();
  const reasonId = useId();
  const locationId = useId();
  const spentAtId = useId();

  const categories = type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  const handleTypeChange = (newType) => {
    setType(newType);
    if (newType === "income") {
      setCategory("salary");
    } else if (newType === "expense") {
      setCategory("food");
    }
  };

  const handleApplyTemplate = (tmpl) => {
    setType(tmpl.type);
    setAmount(String(tmpl.amount));
    setCategory(tmpl.category);
    setWallet(tmpl.wallet);
    setReason(tmpl.reason);
    setSpentAt(toLocalDatetimeInput(new Date()));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) return;

    setIsSubmitting(true);
    try {
      if (type === "transfer") {
        await addExpense({
          type: "transfer",
          amount: numAmount,
          fromWallet,
          toWallet,
          category: "transfer",
          reason: reason || `${WALLET_CONFIG[fromWallet].label}dan ${WALLET_CONFIG[toWallet].label}ga o'tkazma`,
          location: location || "Bank / Bankomat",
          spentAt: new Date(spentAt).toISOString(),
        });
      } else {
        await addExpense({
          type,
          amount: numAmount,
          wallet,
          category,
          reason,
          location,
          spentAt: new Date(spentAt).toISOString(),
        });
      }

      // Tozalash
      setAmount("");
      setReason("");
      setLocation("");
      setSpentAt(toLocalDatetimeInput(new Date()));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="expense-panel">
      {/* Tezkor shablonlar (Quick chips) */}
      <div className="quick-templates">
        <div className="quick-templates__title">
          <Sparkles size={14} />
          <span>Tezkor shablonlar:</span>
        </div>
        <div className="quick-templates__list">
          {QUICK_TEMPLATES.map((tmpl, idx) => (
            <button
              key={idx}
              type="button"
              className="quick-chip"
              onClick={() => handleApplyTemplate(tmpl)}
            >
              <span>{tmpl.label}</span>
              <span className="quick-chip__wallet">
                {tmpl.wallet === "naqd" ? "Naqd" : "Karta"}
              </span>
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="expense-form-custom">
        {/* Turi tanlash: Xarajat | Daromad | O'tkazma */}
        <div className="type-toggle-group">
          <button
            type="button"
            className={`type-toggle-btn ${type === "expense" ? "is-active is-expense" : ""}`}
            onClick={() => handleTypeChange("expense")}
          >
            <Minus size={16} />
            <span>Xarajat</span>
          </button>
          <button
            type="button"
            className={`type-toggle-btn ${type === "income" ? "is-active is-income" : ""}`}
            onClick={() => handleTypeChange("income")}
          >
            <Plus size={16} />
            <span>Daromad</span>
          </button>
          <button
            type="button"
            className={`type-toggle-btn ${type === "transfer" ? "is-active is-transfer" : ""}`}
            onClick={() => handleTypeChange("transfer")}
          >
            <ArrowRightLeft size={16} />
            <span>O'tkazma</span>
          </button>
        </div>

        {/* Hamyon / Manba tanlash */}
        {type === "transfer" ? (
          <div className="transfer-selectors">
            <div className="expense-form__field">
              <label className="expense-form__label">Qayerdan (Chiqish)</label>
              <div className="wallet-select-group">
                <button
                  type="button"
                  className={`wallet-choice-btn ${fromWallet === "karta" ? "is-selected" : ""}`}
                  onClick={() => {
                    setFromWallet("karta");
                    setToWallet("naqd");
                  }}
                >
                  <CreditCard size={16} />
                  <span>Karta ({formatSum(currentBalances.karta)})</span>
                </button>
                <button
                  type="button"
                  className={`wallet-choice-btn ${fromWallet === "naqd" ? "is-selected" : ""}`}
                  onClick={() => {
                    setFromWallet("naqd");
                    setToWallet("karta");
                  }}
                >
                  <Banknote size={16} />
                  <span>Naqd ({formatSum(currentBalances.naqd)})</span>
                </button>
              </div>
            </div>

            <div className="expense-form__field">
              <label className="expense-form__label">Qayerga (Qabul qiluvchi)</label>
              <div className="wallet-select-group">
                <button
                  type="button"
                  className={`wallet-choice-btn ${toWallet === "naqd" ? "is-selected" : ""}`}
                  onClick={() => {
                    setToWallet("naqd");
                    setFromWallet("karta");
                  }}
                >
                  <Banknote size={16} />
                  <span>Naqd pulga</span>
                </button>
                <button
                  type="button"
                  className={`wallet-choice-btn ${toWallet === "karta" ? "is-selected" : ""}`}
                  onClick={() => {
                    setToWallet("karta");
                    setFromWallet("naqd");
                  }}
                >
                  <CreditCard size={16} />
                  <span>Plastik kartaga</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="wallet-picker-row">
            <label className="expense-form__label">
              {type === "expense" ? "Qaysi hisobdan to'landi?" : "Qaysi hisobga tushdi?"}
            </label>
            <div className="wallet-select-group">
              <button
                type="button"
                className={`wallet-choice-btn ${wallet === "karta" ? "is-selected is-karta" : ""}`}
                onClick={() => setWallet("karta")}
              >
                <CreditCard size={16} />
                <span>Plastik karta</span>
                <span className="wallet-choice-btn__bal mono">
                  ({formatSum(currentBalances.karta)})
                </span>
              </button>
              <button
                type="button"
                className={`wallet-choice-btn ${wallet === "naqd" ? "is-selected is-naqd" : ""}`}
                onClick={() => setWallet("naqd")}
              >
                <Banknote size={16} />
                <span>Naqd pul</span>
                <span className="wallet-choice-btn__bal mono">
                  ({formatSum(currentBalances.naqd)})
                </span>
              </button>
            </div>
          </div>
        )}

        {/* Kategoriyalar (O'tkazma bo'lmasa) */}
        {type !== "transfer" && (
          <div className="category-picker">
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
                    <CategoryIcon iconName={cat.icon} color={isSelected ? cat.color : "#a39c8e"} size={15} />
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Summa va Izoh */}
        <div className="form-fields-grid">
          <div className="expense-form__field">
            <label htmlFor={amountId} className="expense-form__label">
              Miqdor (so'm) <span className="field-required">*</span>
            </label>
            <div className="input-with-preview">
              <input
                id={amountId}
                type="number"
                min="1"
                step="500"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Masalan: 35000"
                className="expense-form__input mono expense-form__input--amount"
                required
              />
              {amount ? (
                <span className="amount-preview mono">{formatSum(Number(amount))}</span>
              ) : null}
            </div>
          </div>

          <div className="expense-form__field">
            <label htmlFor={reasonId} className="expense-form__label">
              <FileText size={13} style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }} />
              {type === "transfer" ? "O'tkazma maqsadi" : type === "income" ? "Daromad manbai" : "Nima xarid qilindi / Sabab"}
            </label>
            <input
              id={reasonId}
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={
                type === "transfer"
                  ? "Bankomatdan naqd olish"
                  : type === "income"
                  ? "Oylik avans, keshbek yoki sovg'a"
                  : "Tushlik, kantselyariya, benzin..."
              }
              className="expense-form__input"
            />
          </div>

          <div className="expense-form__field">
            <label htmlFor={locationId} className="expense-form__label">
              <MapPin size={13} style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }} />
              Joy / Muassasa (ixtiyoriy)
            </label>
            <input
              id={locationId}
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Korzinka, Rayhon, Payme..."
              className="expense-form__input"
            />
          </div>

          <div className="expense-form__field">
            <label htmlFor={spentAtId} className="expense-form__label">
              <Calendar size={13} style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }} />
              Sana va vaqt
            </label>
            <input
              id={spentAtId}
              type="datetime-local"
              value={spentAt}
              onChange={(e) => setSpentAt(e.target.value)}
              className="expense-form__input mono"
            />
          </div>
        </div>

        {/* Tugmalar */}
        <div className="expense-form__actions">
          {(amount || reason || location) && (
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => {
                setAmount("");
                setReason("");
                setLocation("");
              }}
            >
              Tozalash
            </button>
          )}
          <button
            type="submit"
            className={`btn btn--primary ${type === "income" ? "btn--income" : type === "transfer" ? "btn--transfer" : ""}`}
            disabled={isSubmitting || !amount}
          >
            {type === "income" ? (
              <>
                <Plus size={16} />
                <span>Daromadni kiritish</span>
              </>
            ) : type === "transfer" ? (
              <>
                <ArrowRightLeft size={16} />
                <span>O'tkazmani amalga oshirish</span>
              </>
            ) : (
              <>
                <Minus size={16} />
                <span>Xarajatni saqlash</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
