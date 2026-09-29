import { Link } from "react-router-dom";
import { useExpenses } from "../context/ExpensesContext.jsx";
import { formatSum, formatDollar, formatDateTime } from "../utils/format.js";
import {
  Wallet,
  CreditCard,
  Banknote,
  BadgeDollarSign,
  ArrowRight,
  PlusCircle,
  PieChart,
  HandCoins,
  History,
  ArrowRightLeft,
} from "lucide-react";
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  WALLET_CONFIG,
} from "../constants/money.js";
import CategoryIcon from "../components/money-manager/CategoryIcon.jsx";

const CATEGORY_MAP = {};
[...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES].forEach((c) => {
  CATEGORY_MAP[c.id] = c;
});
if (CATEGORY_MAP["Qorin uchun"]) {
  CATEGORY_MAP["Oziq-ovqat"] = CATEGORY_MAP["Qorin uchun"];
}

export default function Home() {
  const { currentBalances, expenses } = useExpenses();
  const recentExpenses = expenses.slice(0, 5);

  const todayStr = new Date().toLocaleDateString("uz-UZ", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="home-page">
      {/* Sarlavha qismi */}
      <div className="home-header">
        <div className="home-header__top">
          <span className="home-header__date">{todayStr}</span>
          <h1 className="page-title">Bosh sahifa</h1>
          <p className="page-subtitle">
            Shaxsiy moliyaviy hisob-kitoblar, hamyonlar va qarzlar holati
          </p>
        </div>
      </div>

      {/* Tezkor harakatlar (Quick actions) - 375px ga mos */}
      <div className="home-quick-actions">
        <Link to="/money" className="quick-action-card">
          <div className="quick-action-card__icon quick-action-card__icon--primary">
            <PlusCircle size={20} />
          </div>
          <div className="quick-action-card__text">
            <span className="quick-action-card__title">Amal kiritish</span>
            <span className="quick-action-card__sub">Xarajat yoki daromad</span>
          </div>
        </Link>

        <Link to="/debts" className="quick-action-card">
          <div className="quick-action-card__icon quick-action-card__icon--debts">
            <HandCoins size={20} />
          </div>
          <div className="quick-action-card__text">
            <span className="quick-action-card__title">Qarz daftari</span>
            <span className="quick-action-card__sub">Kutilayotgan pullar</span>
          </div>
        </Link>

        <Link to="/money" className="quick-action-card quick-action-card--analytics">
          <div className="quick-action-card__icon quick-action-card__icon--info">
            <PieChart size={20} />
          </div>
          <div className="quick-action-card__text">
            <span className="quick-action-card__title">Tahlil & Statistika</span>
            <span className="quick-action-card__sub">Grafik va hisobotlar</span>
          </div>
        </Link>
      </div>

      {/* Moliyaviy umumiy ko'rinish (Kundalik erkin) */}
      <section className="home-section">
        <div className="section-header-row">
          <div>
            <h2 className="section-title">Moliya holati (Kundalik)</h2>
            <span className="section-desc">Erkin foydalanishdagi qoldiqlar</span>
          </div>
          <Link to="/money" className="btn btn--subtle btn--sm">
            <span>Money manager</span>
            <ArrowRight size={14} />
          </Link>
        </div>

        <div className="wallet-grid wallet-grid--home">
          {/* Hamyon */}
          <div className="wallet-card wallet-card--hamyon">
            <div className="wallet-card__header">
              <div className="wallet-card__icon-wrapper wallet-card__icon-wrapper--hamyon">
                <Wallet size={17} />
              </div>
              <span className="wallet-card__label">Hamyon</span>
            </div>
            <div className="wallet-card__amount mono">
              {formatSum(currentBalances.hamyon)}
            </div>
            <div className="wallet-card__footer">
              <span className="field-hint">Kundalik erkin</span>
            </div>
          </div>

          {/* Naqd pul */}
          <div className="wallet-card wallet-card--naqd">
            <div className="wallet-card__header">
              <div className="wallet-card__icon-wrapper wallet-card__icon-wrapper--naqd">
                <Banknote size={17} />
              </div>
              <span className="wallet-card__label">Naqd pul</span>
            </div>
            <div className="wallet-card__amount mono">
              {formatSum(currentBalances.naqd)}
            </div>
            <div className="wallet-card__footer">
              <span className="field-hint">Kundalik naqd</span>
            </div>
          </div>

          {/* Plastik karta */}
          <div className="wallet-card wallet-card--karta">
            <div className="wallet-card__header">
              <div className="wallet-card__icon-wrapper wallet-card__icon-wrapper--karta">
                <CreditCard size={17} />
              </div>
              <span className="wallet-card__label">Plastik karta</span>
            </div>
            <div className="wallet-card__amount mono">
              {formatSum(currentBalances.karta)}
            </div>
            <div className="wallet-card__footer">
              <span className="field-hint">Uzcard / Humo</span>
            </div>
          </div>

          {/* Dollar */}
          <div className="wallet-card wallet-card--dollar">
            <div className="wallet-card__header">
              <div className="wallet-card__icon-wrapper wallet-card__icon-wrapper--dollar">
                <BadgeDollarSign size={17} />
              </div>
              <span className="wallet-card__label">AQSH Dollari</span>
            </div>
            <div className="wallet-card__amount mono">
              {formatDollar(currentBalances.dollar)}
            </div>
            <div className="wallet-card__footer">
              <span className="field-hint">Valyuta hisobi</span>
            </div>
          </div>
        </div>
      </section>

      {/* Oxirgi amallar (Mobil 375px ga to'liq mos ro'yxat) */}
      <section className="home-section">
        <div className="section-header-row">
          <div className="flex items-center gap-2">
            <History size={16} className="text-muted" />
            <h2 className="section-title">So'nggi amallar</h2>
          </div>
          {expenses.length > 0 && (
            <Link to="/money" className="btn btn--ghost btn--sm">
              <span>Barchasi ({expenses.length})</span>
              <ArrowRight size={14} />
            </Link>
          )}
        </div>

        {recentExpenses.length === 0 ? (
          <div className="home-empty-card">
            <p>Hozircha xarajat yoki daromadlar kiritilmagan.</p>
            <Link to="/money" className="btn btn--primary">
              <PlusCircle size={15} />
              <span>Birinchi amalni kiritish</span>
            </Link>
          </div>
        ) : (
          <div className="home-recent-feed">
            {recentExpenses.map((expense) => {
              const isIncome = expense.type === "income";
              const isTransfer = expense.type === "transfer";
              const catObj = CATEGORY_MAP[expense.category] || {
                label: expense.category || "Boshqa",
                icon: "Package",
              };
              const paymentMethod = expense.paymentMethod || expense.wallet || "naqd";
              const walletInfo = WALLET_CONFIG[paymentMethod] || WALLET_CONFIG.naqd;

              return (
                <div key={expense.id} className="home-tx-item">
                  <div className="home-tx-icon-col">
                    {isTransfer ? (
                      <div className="home-tx-icon home-tx-icon--transfer">
                        <ArrowRightLeft size={16} />
                      </div>
                    ) : catObj.emoji ? (
                      <div className="home-tx-icon home-tx-icon--emoji">
                        <span>{catObj.emoji}</span>
                      </div>
                    ) : (
                      <div className="home-tx-icon">
                        <CategoryIcon iconName={catObj.icon} size={16} />
                      </div>
                    )}
                  </div>

                  <div className="home-tx-info">
                    <div className="home-tx-title-row">
                      <span className="home-tx-title">
                        {expense.reason || catObj.label}
                      </span>
                    </div>
                    <div className="home-tx-meta">
                      <span className="home-tx-date">{formatDateTime(expense.spentAt)}</span>
                      <span className="home-tx-dot">·</span>
                      {isTransfer ? (
                        <span className="home-tx-badge home-tx-badge--transfer">
                          {WALLET_CONFIG[expense.fromWallet]?.shortLabel || "Karta"} → {WALLET_CONFIG[expense.toWallet]?.shortLabel || "Naqd"}
                        </span>
                      ) : (
                        <span className={`home-tx-badge home-tx-badge--${paymentMethod}`}>
                          {walletInfo.shortLabel}
                        </span>
                      )}
                      {expense.subcategory && (
                        <>
                          <span className="home-tx-dot">·</span>
                          <span className="home-tx-subcat">{expense.subcategory}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div
                    className={`home-tx-amount mono ${
                      isIncome
                        ? "home-tx-amount--income"
                        : isTransfer
                        ? "home-tx-amount--transfer"
                        : "home-tx-amount--expense"
                    }`}
                  >
                    <span>
                      {isIncome ? "+" : isTransfer ? "⇄ " : "-"}
                      {expense.currency === "USD" || paymentMethod === "dollar"
                        ? formatDollar(expense.amount)
                        : formatSum(expense.amount)}
                    </span>
                  </div>
                </div>
              );
            })}

            <div className="home-recent-feed__footer">
              <Link to="/money" className="home-view-all-link">
                <span>Money Managerda barcha amallarni ko'rish</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
