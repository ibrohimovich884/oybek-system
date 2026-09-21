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
  Wallet,
  BadgeDollarSign,
  Sparkles,
  Layers,
  Tag,
} from "lucide-react";
import { useExpenses } from "../../context/ExpensesContext.jsx";
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  QUICK_TEMPLATES,
  WALLET_CONFIG,
} from "../../constants/money.js";
import { formatSum, formatDollar, toLocalDatetimeInput } from "../../utils/format.js";
import CategoryIcon from "./CategoryIcon.jsx";

export default function ExpenseForm({ initialType = "expense", initialFrom = "hamyon", initialTo = "naqd" }) {
  const { addExpense, currentBalances, rateInfo } = useExpenses();

  const [type, setType] = useState(initialType); // "expense" | "income" | "transfer"
  const [paymentMethod, setPaymentMethod] = useState("hamyon"); // "hamyon" | "naqd" | "karta" | "dollar"
  const [fromWallet, setFromWallet] = useState(initialFrom);
  const [toWallet, setToWallet] = useState(initialTo);
  const [category, setCategory] = useState("Qorin uchun");
  const [subcategory, setSubcategory] = useState("Ichimlik");
  const [customCategory, setCustomCategory] = useState("");
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [customSubcategory, setCustomSubcategory] = useState("");
  const [isCustomSubcategory, setIsCustomSubcategory] = useState(false);
  const [amount, setAmount] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState("");
  const [location, setLocation] = useState("");
  const [spentAt, setSpentAt] = useState(toLocalDatetimeInput(new Date()));
  const [isSubmitting, setIsSubmitting] = useState(false);

  const amountId = useId();
  const quantityId = useId();
  const reasonId = useId();
  const locationId = useId();
  const spentAtId = useId();

  const categories = type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const currentCategoryObj = categories.find((c) => c.id === category);

  const handleTypeChange = (newType) => {
    setType(newType);
    if (newType === "income") {
      setCategory("Oylik maosh");
      setSubcategory("Oylik");
    } else if (newType === "expense") {
      setCategory("Qorin uchun");
      setSubcategory("Ichimlik");
    }
  };

  const handleSwapTransfer = () => {
    setFromWallet(toWallet);
    setToWallet(fromWallet);
  };

  const addQuickAmount = (val) => {
    setAmount((prev) => {
      const current = Number(prev) || 0;
      return String(current + val);
    });
  };

  const handleCategorySelect = (catId) => {
    setCategory(catId);
    const catObj = categories.find((c) => c.id === catId);
    if (catObj && catObj.subcategories?.length) {
      setSubcategory(catObj.subcategories[0]);
    }
    setIsCustomCategory(false);
    setIsCustomSubcategory(false);
  };

  const handleApplyTemplate = (tmpl) => {
    setType(tmpl.type);
    setAmount(String(tmpl.amount));
    setQuantity(tmpl.quantity || 1);
    setCategory(tmpl.category);
    setSubcategory(tmpl.subcategory || (tmpl.category === "Oziq-ovqat" ? "Ichimlik" : "Ovqat"));
    setIsCustomCategory(false);
    setCustomCategory("");
    setIsCustomSubcategory(false);
    setCustomSubcategory("");
    setPaymentMethod(tmpl.paymentMethod || tmpl.wallet || "naqd");
    setReason(tmpl.reason);
    setLocation(tmpl.location || "");
    setSpentAt(toLocalDatetimeInput(new Date()));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) return;

    const numQuantity = Math.max(1, Number(quantity) || 1);
    const resolvedCategory = isCustomCategory && customCategory.trim() ? customCategory.trim() : category;
    const resolvedSubcategory = isCustomSubcategory && customSubcategory.trim() ? customSubcategory.trim() : subcategory;

    setIsSubmitting(true);
    try {
      if (type === "transfer") {
        await addExpense({
          type: "transfer",
          amount: numAmount,
          quantity: 1,
          fromWallet,
          toWallet,
          paymentMethod: fromWallet,
          category: "O'tkazma",
          subcategory: "O'tkazma",
          reason: reason || `${WALLET_CONFIG[fromWallet].label}dan ${WALLET_CONFIG[toWallet].label}ga o'tkazma`,
          location: location || "Bank / Bankomat",
          spentAt,
        });
      } else {
        await addExpense({
          type,
          amount: numAmount,
          quantity: numQuantity,
          paymentMethod,
          wallet: paymentMethod,
          category: resolvedCategory,
          subcategory: resolvedSubcategory,
          reason,
          location,
          spentAt,
        });
      }

      // Tozalash
      setAmount("");
      setQuantity(1);
      setReason("");
      setLocation("");
      setCustomCategory("");
      setIsCustomCategory(false);
      setCustomSubcategory("");
      setIsCustomSubcategory(false);
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
                {(tmpl.paymentMethod || tmpl.wallet) === "naqd" ? "Naqd" : "Karta"}
              </span>
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className={`expense-form-custom form--type-${type}`}>
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

        {/* To'lov usuli / Hamyon tanlash yoki O'tkazma oqimi */}
        {type === "transfer" ? (
          <div className="transfer-flow-card">
            <div className="transfer-step">
              <span className="transfer-step__label">Qayerdan chiqadi:</span>
              <div className="transfer-step__selector" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                {[
                  { id: "hamyon", name: "Hamyon", icon: Wallet, bal: currentBalances.hamyon, isDollar: false },
                  { id: "naqd", name: "Naqd pul", icon: Banknote, bal: currentBalances.naqd, isDollar: false },
                  { id: "karta", name: "Plastik karta", icon: CreditCard, bal: currentBalances.karta, isDollar: false },
                  { id: "dollar", name: "Dollar ($)", icon: BadgeDollarSign, bal: currentBalances.dollar, isDollar: true },
                ].map((item) => {
                  const Icon = item.icon;
                  const isActive = fromWallet === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className={`transfer-wallet-btn ${isActive ? `is-active is-${item.id}` : ""}`}
                      onClick={() => {
                        setFromWallet(item.id);
                        if (toWallet === item.id) {
                          setToWallet(item.id === "hamyon" ? "naqd" : "hamyon");
                        }
                      }}
                    >
                      <Icon size={16} />
                      <div className="transfer-wallet-btn__info">
                        <span className="transfer-wallet-btn__name">{item.name}</span>
                        <span className="transfer-wallet-btn__bal mono">
                          {item.isDollar ? formatDollar(item.bal) : formatSum(item.bal)}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="button"
              className="transfer-swap-circle"
              onClick={handleSwapTransfer}
              title="Yo'nalishni almashtirish"
            >
              <ArrowRightLeft size={18} />
            </button>

            <div className="transfer-step">
              <span className="transfer-step__label">Qayerga tushadi:</span>
              <div className="transfer-step__selector" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                {[
                  { id: "hamyon", name: "Hamyon", icon: Wallet, bal: currentBalances.hamyon, isDollar: false },
                  { id: "naqd", name: "Naqd pul", icon: Banknote, bal: currentBalances.naqd, isDollar: false },
                  { id: "karta", name: "Plastik karta", icon: CreditCard, bal: currentBalances.karta, isDollar: false },
                  { id: "dollar", name: "Dollar ($)", icon: BadgeDollarSign, bal: currentBalances.dollar, isDollar: true },
                ].map((item) => {
                  const Icon = item.icon;
                  const isActive = toWallet === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className={`transfer-wallet-btn ${isActive ? `is-active is-${item.id}` : ""}`}
                      onClick={() => {
                        setToWallet(item.id);
                        if (fromWallet === item.id) {
                          setFromWallet(item.id === "hamyon" ? "naqd" : "hamyon");
                        }
                      }}
                    >
                      <Icon size={16} />
                      <div className="transfer-wallet-btn__info">
                        <span className="transfer-wallet-btn__name">{item.name}</span>
                        <span className="transfer-wallet-btn__bal mono">
                          {item.isDollar ? formatDollar(item.bal) : formatSum(item.bal)}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="wallet-picker-row">
            <label className="expense-form__label">
              {type === "income" ? "Qaysi hisobga tushdi?" : "Qaysi hisobdan to'landi?"}
            </label>
            <div className="wallet-select-group" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 8 }}>
              {[
                { id: "hamyon", label: "Hamyon", icon: Wallet, bal: currentBalances.hamyon, isDollar: false },
                { id: "naqd", label: "Naqd pul", icon: Banknote, bal: currentBalances.naqd, isDollar: false },
                { id: "karta", label: "Plastik karta", icon: CreditCard, bal: currentBalances.karta, isDollar: false },
                { id: "dollar", label: "Dollar ($)", icon: BadgeDollarSign, bal: currentBalances.dollar, isDollar: true },
              ].map((w) => {
                const Icon = w.icon;
                const isSelected = paymentMethod === w.id;
                return (
                  <button
                    key={w.id}
                    type="button"
                    className={`wallet-choice-btn ${isSelected ? `is-selected is-${w.id}` : ""}`}
                    onClick={() => setPaymentMethod(w.id)}
                  >
                    <Icon size={16} />
                    <span>{w.label}</span>
                    <span className="wallet-choice-btn__bal mono">
                      ({w.isDollar ? formatDollar(w.bal) : formatSum(w.bal)})
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Kategoriyalar (O'tkazma bo'lmasa) */}
        {type !== "transfer" && (
          <div className="category-picker">
            <div className="category-picker__header">
              <label className="expense-form__label">
                {type === "income" ? "Daromad toifasi (kategoriya)" : "Xarajat toifasi (kategoriya)"}
              </label>
              <button
                type="button"
                className="btn btn--subtle btn-toggle-custom"
                onClick={() => setIsCustomCategory(!isCustomCategory)}
              >
                <Tag size={12} />
                <span>{isCustomCategory ? "Ro'yxatdan tanlash" : "+ O'z toifam"}</span>
              </button>
            </div>

            {isCustomCategory ? (
              <div className="custom-category-box">
                <input
                  type="text"
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  placeholder={type === "income" ? "Daromad toifasi nomini kiriting..." : "Toifa nomini kiriting (masalan: Oziq-ovqat, Ta'lim...)"}
                  className="expense-form__input"
                  autoFocus
                />
              </div>
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
                      data-cat={cat.id}
                    >
                      {cat.emoji ? (
                        <span className="category-pill__emoji">{cat.emoji}</span>
                      ) : (
                        <CategoryIcon iconName={cat.icon} color={isSelected ? "var(--text)" : "var(--text-muted)"} size={15} />
                      )}
                      <span>{cat.label}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Kichik kategoriya (subcategory) - Faqat xarajat uchun */}
            {type === "expense" && currentCategoryObj?.subcategories?.length > 0 && (
              <div className="subcategory-section">
                <div className="subcategory-section__header">
                  <label className="expense-form__label subcategory-label">
                    <Tag size={12} />
                    <span>Kichik toifa (aniq nima):</span>
                  </label>
                  <button
                    type="button"
                    className="btn btn--subtle btn-toggle-custom"
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
                    placeholder="Aniq nima olinganini yozing..."
                    className="expense-form__input"
                  />
                ) : (
                  <div className="subcategory-chips">
                    {currentCategoryObj.subcategories.map((sub) => {
                      const isSubSelected = subcategory === sub;
                      return (
                        <button
                          key={sub}
                          type="button"
                          className={`subcategory-chip ${isSubSelected ? "is-active" : ""}`}
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

        {/* Tezkor summa qo'shish qatori */}
        <div className="quick-amount-row">
          <span className="quick-amount-label">Tezkor summa:</span>
          <div className="quick-amount-chips">
            {(type === "income"
              ? [50000, 100000, 500000, 1000000, 2000000]
              : type === "transfer"
              ? [10000, 50000, 100000, 200000, 500000]
              : [5000, 10000, 20000, 50000, 100000]
            ).map((val) => (
              <button
                key={val}
                type="button"
                className="quick-amount-chip mono"
                onClick={() => addQuickAmount(val)}
              >
                +{formatSum(val).replace(" so'm", "")}
              </button>
            ))}
            {type === "transfer" && currentBalances[fromWallet] > 0 && (
              <button
                type="button"
                className="quick-amount-chip quick-amount-chip--all mono"
                onClick={() => setAmount(String(currentBalances[fromWallet]))}
              >
                Barchasi ({formatSum(currentBalances[fromWallet]).replace(" so'm", "")})
              </button>
            )}
          </div>
        </div>

        {/* Summa, Soni va Izoh */}
        <div className="form-fields-grid">
          <div className="expense-form__field">
            <label htmlFor={amountId} className="expense-form__label">
              Miqdor (amount) <span className="field-required">*</span>
            </label>
            <div className="input-with-preview">
              <input
                id={amountId}
                type="number"
                min="1"
                step="any"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Masalan: 10000"
                className="expense-form__input mono expense-form__input--amount"
                required
              />
              {amount ? (
                <span className="amount-preview mono">{formatSum(Number(amount))}</span>
              ) : null}
            </div>
          </div>

          <div className="expense-form__field">
            <label htmlFor={quantityId} className="expense-form__label">
              <Layers size={13} style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }} />
              Soni (quantity)
            </label>
            <input
              id={quantityId}
              type="number"
              min="1"
              step="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="1"
              className="expense-form__input mono"
            />
          </div>

          <div className="expense-form__field">
            <label htmlFor={reasonId} className="expense-form__label">
              <FileText size={13} style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }} />
              {type === "transfer" ? "O'tkazma maqsadi" : type === "income" ? "Daromad manbai" : "Nima olindi / Sabab (reason)"}
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
                  : "Flesh, Kola, Tushlik..."
              }
              className="expense-form__input"
            />
          </div>

          <div className="expense-form__field">
            <label htmlFor={locationId} className="expense-form__label">
              <MapPin size={13} style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }} />
              Joy / Muassasa (location)
            </label>
            <input
              id={locationId}
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Gulbahordagi Havas, Korzinka..."
              className="expense-form__input"
            />
          </div>

          <div className="expense-form__field">
            <label htmlFor={spentAtId} className="expense-form__label">
              <Calendar size={13} style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }} />
              Sarflangan vaqt (spentAt - qo'lda kiritiladi)
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
                setQuantity(1);
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

