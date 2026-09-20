import { Edit2, Trash2, ArrowRightLeft, History, Layers } from "lucide-react";
import { formatDateTime, formatSum } from "../../utils/format.js";
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
      {/* Sana va To'lov usuli (desktopda 2 ta alohida ustun, mobilda bitta meta bloki) */}
      <div className="ledger-row__meta">
        <span className="ledger-row__date mono" title={`spentAt: ${expense.spentAt}\ncreatedAt: ${expense.createdAt || 'N/A'}`}>
          {formatDateTime(expense.spentAt)}
        </span>

        <div className="ledger-row__wallet-badge">
          {isTransfer ? (
            <span className="badge badge--transfer" title="Hisoblararo o'tkazma">
              <ArrowRightLeft size={12} />
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
        </div>
      </div>

      {/* Kategoriya va Kichik Kategoriya (Subcategory) */}
      <div className="ledger-row__category">
        {isTransfer ? (
          <div className="category-tag category-tag--transfer">
            <ArrowRightLeft size={14} color="var(--transfer)" />
            <span>O'tkazma</span>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 3, alignItems: "flex-start" }}>
            <div className="category-tag">
              {catObj.emoji ? (
                <span style={{ fontSize: "0.92rem", lineHeight: 1 }}>{catObj.emoji}</span>
              ) : (
                <CategoryIcon iconName={catObj.icon} color="var(--text)" size={14} />
              )}
              <span>{catObj.label}</span>
            </div>
            {expense.subcategory && (
              <span
                style={{
                  fontSize: "0.72rem",
                  color: "var(--accent)",
                  background: "var(--accent-soft)",
                  padding: "1px 6px",
                  borderRadius: 4,
                  border: "1px solid var(--accent-border)",
                  whiteSpace: "nowrap",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 3,
                }}
                title={`Kichik kategoriya: ${expense.subcategory}`}
              >
                <span>↳</span>
                <span>{expense.subcategory}</span>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Sabab, Soni & Joy */}
      <div className="ledger-row__desc">
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <span className="ledger-row__reason">{expense.reason || "—"}</span>
          {quantity > 1 && (
            <span
              className="badge"
              style={{ background: "var(--karta-soft)", color: "var(--karta)", borderColor: "var(--karta-border)", fontSize: "0.72rem", padding: "1px 6px" }}
              title={`Soni: ${quantity}`}
            >
              <Layers size={10} />
              <span>{quantity} dona</span>
            </span>
          )}
          {hasEdits && (
            <span
              className="badge"
              style={{ background: "var(--warning-soft)", color: "var(--warning)", borderColor: "var(--warning-border)", fontSize: "0.7rem", padding: "1px 6px" }}
              title={`${expense.edits.length} marta tahrirlangan`}
            >
              <History size={10} />
              <span>tahrirlangan ({expense.edits.length})</span>
            </span>
          )}
        </div>
        {expense.location && (
          <span className="ledger-row__location">📍 {expense.location}</span>
        )}
      </div>

      {/* Miqdor */}
      <div
        className={`ledger-row__amount mono ${
          isIncome
            ? "ledger-row__amount--income"
            : isTransfer
            ? "ledger-row__amount--transfer"
            : "ledger-row__amount--expense"
        }`}
      >
        {isIncome ? "+" : isTransfer ? "⇄ " : "-"}
        {formatSum(expense.amount)}
      </div>

      {/* Harakatlar */}
      <div className="ledger-row__actions">
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
