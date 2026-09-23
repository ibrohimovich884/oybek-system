import { Edit2, Trash2, ArrowRightLeft, History, Layers, MapPin, Database, Clock } from "lucide-react";
import { formatDateTime, formatSum, formatDollar } from "../../utils/format.js";
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  WALLET_CONFIG,
} from "../../constants/money.js";
import CategoryIcon from "./CategoryIcon.jsx";

const CATEGORY_MAP = {};
[...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES].forEach((c) => {
  CATEGORY_MAP[c.id] = c;
});
if (CATEGORY_MAP["Qorin uchun"]) {
  CATEGORY_MAP["Oziq-ovqat"] = CATEGORY_MAP["Qorin uchun"];
}

export default function ExpenseRow({ expense, onEdit, onDelete }) {
  const isIncome = expense.type === "income";
  const isTransfer = expense.type === "transfer";

  const catObj = CATEGORY_MAP[expense.category] || {
    label: expense.category || "Boshqa",
    icon: "Package",
    color: "#a39c8e",
  };

  const paymentMethod = expense.paymentMethod || expense.wallet || "naqd";
  const walletInfo = WALLET_CONFIG[paymentMethod] || WALLET_CONFIG.naqd;
  const quantity = expense.quantity || 1;
  const hasEdits = Array.isArray(expense.edits) && expense.edits.length > 0;

  return (
    <div className={`ledger-row ledger-row--${expense.type || "expense"}`}>
      {/* 1 & 2. Sana va To'lov usuli */}
      <div className="ledger-cell ledger-cell--meta">
        <div className="ledger-cell--date">
          <span className="ledger-row__date mono" title={`spentAt: ${expense.spentAt}\ncreatedAt: ${expense.createdAt || 'N/A'}`}>
            {formatDateTime(expense.spentAt)}
          </span>
        </div>

        <div className="ledger-cell--wallet">
          <div className="ledger-row__wallet-badge" style={{ display: "inline-flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
            {isTransfer ? (
              <span className="badge badge--transfer" title="Hisoblararo o'tkazma">
                <ArrowRightLeft size={11} />
                <span>
                  {WALLET_CONFIG[expense.fromWallet]?.shortLabel || "Karta"} →{" "}
                  {WALLET_CONFIG[expense.toWallet]?.shortLabel || "Naqd"}
                </span>
              </span>
            ) : (
              <span
                className={`badge badge--wallet badge--${paymentMethod}`}
                title={`To'lov usuli: ${walletInfo.label}`}
              >
                {walletInfo.shortLabel}
              </span>
            )}

            {/* DB saqlanganlik holati nishoni (Icon) */}
            {expense.synced ? (
              <span
                className="badge badge--db-synced"
                title="Server maʼlumotlar bazasida (DB) saqlangan"
              >
                <Database size={10} className="badge--db-icon" />
                <span>DB</span>
              </span>
            ) : (
              <span
                className="badge badge--db-pending"
                title="Hozircha faqat xotirada, internet ulanganda DBga avtomatik saqlanadi"
              >
                <Clock size={10} className="badge--db-icon" />
                <span>Xotirada</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 3. Kategoriya va Kichik Kategoriya (Subcategory) */}
      <div className="ledger-cell ledger-cell--category">
        {isTransfer ? (
          <div className="category-tag category-tag--transfer">
            <ArrowRightLeft size={13} color="var(--transfer)" />
            <span>O'tkazma</span>
          </div>
        ) : (
          <div className="ledger-cat-group">
            <div className="category-tag">
              {catObj.emoji ? (
                <span className="cat-emoji">{catObj.emoji}</span>
              ) : (
                <CategoryIcon iconName={catObj.icon} color="var(--text)" size={13} />
              )}
              <span className="cat-name">{catObj.label}</span>
            </div>
            {expense.subcategory && (
              <span
                className="subcat-pill"
                title={`Kichik kategoriya: ${expense.subcategory}`}
              >
                <span className="subcat-arrow">↳</span>
                <span className="subcat-text">{expense.subcategory}</span>
              </span>
            )}
          </div>
        )}
      </div>

      {/* 4. Sabab, Soni & Joy */}
      <div className="ledger-cell ledger-cell--desc">
        <div className="ledger-desc-row">
          <span className="ledger-row__reason" title={expense.reason || ""}>
            {expense.reason || "—"}
          </span>
          {quantity > 1 && (
            <span
              className="badge badge--qty"
              title={`Soni: ${quantity}`}
            >
              <Layers size={10} />
              <span>{quantity} dona</span>
            </span>
          )}
          {hasEdits && (
            <span
              className="badge badge--edited"
              title={`${expense.edits.length} marta tahrirlangan`}
            >
              <History size={10} />
              <span>tahrirlangan ({expense.edits.length})</span>
            </span>
          )}
        </div>
        {expense.location && (
          <div className="ledger-row__location" title={expense.location}>
            <MapPin size={11} className="location-pin" />
            <span>{expense.location}</span>
          </div>
        )}
      </div>

      {/* 5. Miqdor */}
      <div
        className={`ledger-cell ledger-cell--amount mono ${
          isIncome
            ? "ledger-row__amount--income"
            : isTransfer
            ? "ledger-row__amount--transfer"
            : "ledger-row__amount--expense"
        }`}
      >
        <div className="ledger-amount-val">
          {isIncome ? "+" : isTransfer ? "⇄ " : "-"}
          {expense.currency === "USD" || paymentMethod === "dollar"
            ? formatDollar(expense.amount)
            : formatSum(expense.amount)}
        </div>
        {(expense.currency === "USD" || paymentMethod === "dollar") && expense.exchangeRateAtTime && (
          <span className="ledger-amount-sub">
            ~ {formatSum(expense.amount * expense.exchangeRateAtTime)}
          </span>
        )}
      </div>

      {/* 6. Harakatlar */}
      <div className="ledger-cell ledger-cell--actions">
        <button
          type="button"
          className="btn-icon"
          title="Tahrirlash / JSON ko'rish"
          onClick={() => onEdit && onEdit(expense)}
        >
          <Edit2 size={14} />
        </button>
        <button
          type="button"
          className="btn-icon btn-icon--danger"
          title="O'chirish"
          onClick={() => onDelete && onDelete(expense.id)}
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}
