import { Edit2, Trash2, ArrowRightLeft } from "lucide-react";
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

export default function ExpenseRow({ expense, onEdit, onDelete }) {
  const isIncome = expense.type === "income";
  const isTransfer = expense.type === "transfer";

  const catObj = CATEGORY_MAP[expense.category] || {
    label: expense.category || "Boshqa",
    icon: "Package",
    color: "#a39c8e",
  };

  const walletInfo = WALLET_CONFIG[expense.wallet] || WALLET_CONFIG.karta;

  return (
    <div className={`ledger-row ledger-row--${expense.type || "expense"}`}>
      {/* Sana */}
      <span className="ledger-row__date mono" title={expense.spentAt}>
        {formatDateTime(expense.spentAt)}
      </span>

      {/* Turi va Hamyon */}
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
            className={`badge badge--wallet badge--${expense.wallet || "karta"}`}
            title={walletInfo.label}
          >
            {walletInfo.shortLabel}
          </span>
        )}
      </div>

      {/* Kategoriya */}
      <div className="ledger-row__category">
        {isTransfer ? (
          <div className="category-tag category-tag--transfer">
            <ArrowRightLeft size={14} color="#818cf8" />
            <span>O'tkazma</span>
          </div>
        ) : (
          <div className="category-tag" style={{ borderColor: `${catObj.color}40` }}>
            <CategoryIcon iconName={catObj.icon} color={catObj.color} size={14} />
            <span>{catObj.label}</span>
          </div>
        )}
      </div>

      {/* Sabab & Joy */}
      <div className="ledger-row__desc">
        <span className="ledger-row__reason">{expense.reason || "—"}</span>
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
          title="Tahrirlash"
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
