import { useState } from "react";
import { X, Check, Trash2, History, Code, Copy, Layers, Tag } from "lucide-react";
import { useExpenses } from "../../context/ExpensesContext.jsx";
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  WALLET_CONFIG,
} from "../../constants/money.js";
import { formatSum, toLocalDatetimeInput, formatDateTime } from "../../utils/format.js";
import CategoryIcon from "./CategoryIcon.jsx";

export default function EditTransactionModal({ item, onClose }) {
  const { updateExpense, deleteExpense } = useExpenses();

  const [type, setType] = useState(item.type || "expense");
  const [paymentMethod, setPaymentMethod] = useState(item.paymentMethod || item.wallet || "naqd");
  const [fromWallet, setFromWallet] = useState(item.fromWallet || "karta");
  const [toWallet, setToWallet] = useState(item.toWallet || "naqd");
  const [category, setCategory] = useState(item.category === "Oziq-ovqat" ? "Qorin uchun" : (item.category || "Qorin uchun"));
  const [subcategory, setSubcategory] = useState(item.subcategory || ((item.category === "Qorin uchun" || item.category === "Oziq-ovqat") ? "Ichimlik" : ""));
  const [customCategory, setCustomCategory] = useState("");
  const [isCustomCategory, setIsCustomCategory] = useState(
    ![...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES].some((c) => c.id === item.category)
  );
  const [customSubcategory, setCustomSubcategory] = useState("");
  const [isCustomSubcategory, setIsCustomSubcategory] = useState(false);
  const [amount, setAmount] = useState(String(item.amount || ""));
  const [quantity, setQuantity] = useState(item.quantity || 1);
  const [reason, setReason] = useState(item.reason || "");
  const [location, setLocation] = useState(item.location || "");
  const [spentAt, setSpentAt] = useState(toLocalDatetimeInput(item.spentAt));
  const [isSaving, setIsSaving] = useState(false);
  const [showJson, setShowJson] = useState(false);
  const [copied, setCopied] = useState(false);

  const categories = type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const currentCategoryObj = categories.find((c) => c.id === category);

  const handleCategorySelect = (catId) => {
    setCategory(catId);
    const catObj = categories.find((c) => c.id === catId);
    if (catObj && catObj.subcategories?.length) {
      setSubcategory(catObj.subcategories[0]);
    }
    setIsCustomCategory(false);
    setIsCustomSubcategory(false);
  };

  const resolvedCategory = isCustomCategory && customCategory.trim() ? customCategory.trim() : category;
  const resolvedSubcategory = isCustomSubcategory && customSubcategory.trim() ? customSubcategory.trim() : subcategory;

  const currentJsonPayload = {
    id: item.id,
    amount: Number(amount) || item.amount,
    category: type === "transfer" ? "O'tkazma" : resolvedCategory,
    subcategory: type === "transfer" ? "O'tkazma" : resolvedSubcategory,
    reason,
    location,
    paymentMethod,
    quantity: Number(quantity) || 1,
    spentAt: spentAt ? (spentAt.length === 16 ? `${spentAt}:00+05:00` : spentAt) : item.spentAt,
    createdAt: item.createdAt,
    edits: item.edits || [],
  };

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(currentJsonPayload, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) return;

    const numQuantity = Math.max(1, Number(quantity) || 1);

    setIsSaving(true);
    try {
      await updateExpense(item.id, {
        type,
        amount: numAmount,
        quantity: numQuantity,
        paymentMethod,
        wallet: paymentMethod,
        fromWallet: type === "transfer" ? fromWallet : null,
        toWallet: type === "transfer" ? toWallet : null,
        category: type === "transfer" ? "O'tkazma" : resolvedCategory,
        subcategory: type === "transfer" ? "O'tkazma" : resolvedSubcategory,
        reason,
        location,
        spentAt: spentAt || item.spentAt,
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
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 580 }}>
        <div className="modal-header">
          <div>
            <h3 className="modal-title">Tranzaksiyani tahrirlash</h3>
            <p className="modal-subtitle">
              ID: <span className="mono" style={{ fontSize: "0.78rem" }}>{item.id}</span>
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button
              type="button"
              className={`btn btn--subtle ${showJson ? "is-active" : ""}`}
              onClick={() => setShowJson(!showJson)}
              title="JSON kodini ko'rish"
              style={{ fontSize: "0.78rem", padding: "4px 8px" }}
            >
              <Code size={14} />
              <span>JSON</span>
            </button>
            <button type="button" className="btn-icon" onClick={onClose}>
              <X size={18} />
            </button>
          </div>
        </div>

        {/* JSON ko'rish bloki */}
        {showJson && (
          <div style={{ margin: "0 0 16px 0", background: "var(--surface-3)", padding: 12, borderRadius: 8, border: "1px solid var(--border-subtle)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span className="field-hint" style={{ fontWeight: 600 }}>Aniqlangan JSON strukturasi:</span>
              <button
                type="button"
                className="btn btn--subtle"
                style={{ fontSize: "0.75rem", padding: "2px 8px" }}
                onClick={handleCopyJson}
              >
                <Copy size={12} />
                <span>{copied ? "Nusxalandi!" : "Nusxa olish"}</span>
              </button>
            </div>
            <pre className="mono" style={{ margin: 0, fontSize: "0.78rem", maxHeight: 180, overflow: "auto", color: "var(--accent)" }}>
              {JSON.stringify(currentJsonPayload, null, 2)}
            </pre>
          </div>
        )}

        <form onSubmit={handleSubmit} className={`modal-form form--type-${type}`}>
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

          {/* To'lov usuli (paymentMethod) */}
          {type === "transfer" ? (
            <div className="transfer-selectors">
              <div className="expense-form__field">
                <label className="expense-form__label">Qayerdan</label>
                <select
                  value={fromWallet}
                  onChange={(e) => setFromWallet(e.target.value)}
                  className="expense-form__input"
                >
                  <option value="hamyon">Hamyon</option>
                  <option value="naqd">Naqd pul</option>
                  <option value="karta">Plastik karta</option>
                  <option value="dollar">AQSH Dollari ($)</option>
                </select>
              </div>
              <div className="expense-form__field">
                <label className="expense-form__label">Qayerga</label>
                <select
                  value={toWallet}
                  onChange={(e) => setToWallet(e.target.value)}
                  className="expense-form__input"
                >
                  <option value="hamyon">Hamyon</option>
                  <option value="naqd">Naqd pul</option>
                  <option value="karta">Plastik karta</option>
                  <option value="dollar">AQSH Dollari ($)</option>
                </select>
              </div>
            </div>
          ) : (
            <div className="expense-form__field">
              <label className="expense-form__label">To'lov usuli / Hisob (paymentMethod)</label>
              <div className="wallet-select-group" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: 8 }}>
                {[
                  { id: "hamyon", label: "Hamyon" },
                  { id: "naqd", label: "Naqd pul" },
                  { id: "karta", label: "Plastik karta" },
                  { id: "dollar", label: "Dollar ($)" },
                ].map((w) => (
                  <button
                    key={w.id}
                    type="button"
                    className={`wallet-choice-btn ${paymentMethod === w.id ? `is-selected is-${w.id}` : ""}`}
                    onClick={() => setPaymentMethod(w.id)}
                  >
                    {w.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Kategoriya */}
          {type !== "transfer" && (
            <div className="expense-form__field">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <label className="expense-form__label" style={{ margin: 0 }}>Kategoriya (category)</label>
                <button
                  type="button"
                  className="btn btn--subtle"
                  style={{ fontSize: "0.75rem", padding: "2px 8px" }}
                  onClick={() => setIsCustomCategory(!isCustomCategory)}
                >
                  <Tag size={12} />
                  <span>{isCustomCategory ? "Ro'yxatdan tanlash" : "+ Boshqa kategoriya"}</span>
                </button>
              </div>

              {isCustomCategory ? (
                <input
                  type="text"
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  placeholder="Kategoriya nomini kiriting (masalan: Oziq-ovqat, Transport...)"
                  className="expense-form__input"
                />
              ) : (
                <div className="category-pills">
                  {categories.map((cat) => {
                    const isSelected = category === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        className={`category-pill ${isSelected ? "is-active" : ""}`}
                        onClick={() => handleCategorySelect(cat.id)}
                      >
                        {cat.emoji ? (
                          <span style={{ marginRight: 4 }}>{cat.emoji}</span>
                        ) : (
                          <CategoryIcon iconName={cat.icon} color={isSelected ? "var(--text)" : "var(--text-muted)"} size={14} />
                        )}
                        <span>{cat.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Kichik kategoriya (subcategory) */}
              {currentCategoryObj?.subcategories?.length > 0 && (
                <div
                  style={{
                    marginTop: 10,
                    padding: "8px 12px",
                    background: "var(--surface-2)",
                    border: "1px dashed var(--border-subtle)",
                    borderRadius: 8,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <span style={{ fontSize: "0.75rem", color: "var(--accent)", fontWeight: 500 }}>
                      Kichik kategoriya (subcategory):
                    </span>
                    <button
                      type="button"
                      className="btn btn--subtle"
                      style={{ fontSize: "0.7rem", padding: "1px 6px" }}
                      onClick={() => setIsCustomSubcategory(!isCustomSubcategory)}
                    >
                      <span>{isCustomSubcategory ? "Ro'yxatdan tanlash" : "+ Boshqa"}</span>
                    </button>
                  </div>

                  {isCustomSubcategory ? (
                    <input
                      type="text"
                      value={customSubcategory}
                      onChange={(e) => setCustomSubcategory(e.target.value)}
                      placeholder="Kichik kategoriya nomini kiriting..."
                      className="expense-form__input"
                      style={{ fontSize: "0.82rem" }}
                    />
                  ) : (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {currentCategoryObj.subcategories.map((sub) => {
                        const isSubSelected = subcategory === sub;
                        return (
                          <button
                            key={sub}
                            type="button"
                            className={`category-pill ${isSubSelected ? "is-active" : ""}`}
                            onClick={() => setSubcategory(sub)}
                          >
                            <span>{sub}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Summa va Soni */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 120px", gap: 12 }}>
            <div className="expense-form__field">
              <label className="expense-form__label">Miqdor (amount so'm)</label>
              <input
                type="number"
                min="1"
                step="any"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="expense-form__input mono"
                required
              />
              {amount && <span className="field-hint">{formatSum(Number(amount))}</span>}
            </div>

            <div className="expense-form__field">
              <label className="expense-form__label">
                <Layers size={13} style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }} />
                Soni (quantity)
              </label>
              <input
                type="number"
                min="1"
                step="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="expense-form__input mono"
                required
              />
            </div>
          </div>

          {/* Izoh / Sabab */}
          <div className="expense-form__field">
            <label className="expense-form__label">Nima olindi / Sabab (reason)</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Masalan: Flesh"
              className="expense-form__input"
            />
          </div>

          {/* Joy */}
          <div className="expense-form__field">
            <label className="expense-form__label">Joy / Manzil (location)</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Masalan: Gulbahordagi Havas"
              className="expense-form__input"
            />
          </div>

          {/* Sana (spentAt) - qo'lda kiritiladi */}
          <div className="expense-form__field">
            <label className="expense-form__label">Sarflangan vaqt (spentAt - qo'lda kiritiladi)</label>
            <input
              type="datetime-local"
              value={spentAt}
              onChange={(e) => setSpentAt(e.target.value)}
              className="expense-form__input mono"
            />
            {item.createdAt && (
              <span className="field-hint" style={{ fontSize: "0.74rem" }}>
                Yaratilgan: {item.createdAt}
              </span>
            )}
          </div>

          {/* Tahrirlash tarixi (Edits History) */}
          {Array.isArray(item.edits) && item.edits.length > 0 && (
            <div style={{ marginTop: 12, padding: 10, background: "var(--surface-2)", borderRadius: 8, border: "1px solid var(--border-subtle)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6, fontSize: "0.82rem", fontWeight: 600 }}>
                <History size={14} color="var(--accent)" />
                <span>O'zgarishlar tarixi ({item.edits.length}):</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {item.edits.map((ed, idx) => (
                  <div key={idx} style={{ fontSize: "0.78rem", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 8px", background: "var(--surface-3)", borderRadius: 4 }}>
                    <span>
                      <strong style={{ color: "var(--warning)" }}>{ed.field}</strong>: "{String(ed.from)}" ➔ <strong style={{ color: "var(--income)" }}>"{String(ed.to)}"</strong>
                    </span>
                    <span className="mono field-hint" style={{ fontSize: "0.72rem" }}>
                      {ed.editedAt}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

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

