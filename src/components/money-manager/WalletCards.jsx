import { useState } from "react";
import { Wallet, CreditCard, Banknote, ArrowRightLeft, Settings2, TrendingDown, TrendingUp } from "lucide-react";
import { useExpenses } from "../../context/ExpensesContext.jsx";
import { formatSum } from "../../utils/format.js";
import InitialBalanceModal from "./InitialBalanceModal.jsx";

export default function WalletCards({ onOpenTransfer }) {
  const { currentBalances } = useExpenses();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  return (
    <>
      <div className="wallet-grid">
        {/* Umumiy Balans */}
        <div className="wallet-card wallet-card--total">
          <div className="wallet-card__header">
            <div className="wallet-card__icon-wrapper wallet-card__icon-wrapper--accent">
              <Wallet size={20} />
            </div>
            <span className="wallet-card__tag">Umumiy mablag'</span>
            <button
              type="button"
              className="wallet-card__btn-settings"
              title="Boshlang'ich balanslarni o'zgartirish"
              onClick={() => setIsSettingsOpen(true)}
            >
              <Settings2 size={16} />
              <span>Sozlash</span>
            </button>
          </div>
          <div className="wallet-card__amount mono">
            {formatSum(currentBalances.total)}
          </div>
          <div className="wallet-card__footer">
            <span className="wallet-card__stat wallet-card__stat--income">
              <TrendingUp size={14} />
              <span>+{formatSum(currentBalances.totalIncome)}</span>
            </span>
            <span className="wallet-card__stat wallet-card__stat--expense">
              <TrendingDown size={14} />
              <span>-{formatSum(currentBalances.totalExpense)}</span>
            </span>
          </div>
        </div>

        {/* Plastik karta */}
        <div className="wallet-card wallet-card--karta">
          <div className="wallet-card__header">
            <div className="wallet-card__icon-wrapper wallet-card__icon-wrapper--karta">
              <CreditCard size={20} />
            </div>
            <span className="wallet-card__label">Plastik karta</span>
            <span className="wallet-card__badge">Uzcard / Humo</span>
          </div>
          <div className="wallet-card__amount mono">
            {formatSum(currentBalances.karta)}
          </div>
          <div className="wallet-card__actions">
            <button
              type="button"
              className="btn btn--subtle"
              onClick={() => onOpenTransfer && onOpenTransfer("karta", "naqd")}
              title="Kartadan naqdga yechish"
            >
              <ArrowRightLeft size={14} />
              <span>Naqdga yechish</span>
            </button>
          </div>
        </div>

        {/* Naqd pul */}
        <div className="wallet-card wallet-card--naqd">
          <div className="wallet-card__header">
            <div className="wallet-card__icon-wrapper wallet-card__icon-wrapper--naqd">
              <Banknote size={20} />
            </div>
            <span className="wallet-card__label">Naqd pul</span>
            <span className="wallet-card__badge">Hamyon</span>
          </div>
          <div className="wallet-card__amount mono">
            {formatSum(currentBalances.naqd)}
          </div>
          <div className="wallet-card__actions">
            <button
              type="button"
              className="btn btn--subtle"
              onClick={() => onOpenTransfer && onOpenTransfer("naqd", "karta")}
              title="Kartaga pul solish"
            >
              <ArrowRightLeft size={14} />
              <span>Kartaga solish</span>
            </button>
          </div>
        </div>
      </div>

      {isSettingsOpen && (
        <InitialBalanceModal onClose={() => setIsSettingsOpen(false)} />
      )}
    </>
  );
}
