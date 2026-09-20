import { Link } from "react-router-dom";
import NotificationBanner from "../components/notifications/NotificationBanner.jsx";
import { useExpenses } from "../context/ExpensesContext.jsx";
import { formatSum } from "../utils/format.js";
import ExpenseRow from "../components/money-manager/ExpenseRow.jsx";
import {
  Wallet,
  CreditCard,
  Banknote,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  PlusCircle,
  PieChart,
  History,
} from "lucide-react";

const DEMO_NOTIFICATION = {
  title: "Money Manager yangilandi",
  body: "Naqd pul va Plastik karta hisoblari kiritildi. Endi barcha daromadlar, xarajatlar va tahlillarni telefoningizdan qulay kuzatib borishingiz mumkin.",
};

export default function Home() {
  const { currentBalances, expenses, deleteExpense } = useExpenses();
  const recentExpenses = expenses.slice(0, 4);

  return (
    <div className="home-page">
      <div className="home-header">
        <div>
          <h1 className="page-title">Bosh sahifa</h1>
          <p className="page-subtitle">
            Shaxsiy tizim: moliyaviy hisob-kitoblar va yangilanishlar markazi.
          </p>
        </div>
      </div>

      <NotificationBanner
        title={DEMO_NOTIFICATION.title}
        body={DEMO_NOTIFICATION.body}
      />

      {/* Tezkor harakatlar (Quick actions) */}
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

        <Link to="/money" className="quick-action-card">
          <div className="quick-action-card__icon quick-action-card__icon--info">
            <PieChart size={20} />
          </div>
          <div className="quick-action-card__text">
            <span className="quick-action-card__title">Tahlil ko'rish</span>
            <span className="quick-action-card__sub">Statistika va taqsimot</span>
          </div>
        </Link>
      </div>

      {/* Moliyaviy umumiy ko'rinish */}
      <section className="home-section">
        <div className="section-header-row">
          <h2 className="section-title">Moliya holati</h2>
          <Link to="/money" className="btn btn--subtle">
            <span>Money manager</span>
            <ArrowRight size={14} />
          </Link>
        </div>

        <div className="wallet-grid">
          <div className="wallet-card wallet-card--total">
            <div className="wallet-card__header">
              <div className="wallet-card__icon-wrapper wallet-card__icon-wrapper--accent">
                <Wallet size={18} />
              </div>
              <span className="wallet-card__tag">Umumiy balans</span>
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

          <div className="wallet-card wallet-card--karta">
            <div className="wallet-card__header">
              <div className="wallet-card__icon-wrapper wallet-card__icon-wrapper--karta">
                <CreditCard size={18} />
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

          <div className="wallet-card wallet-card--naqd">
            <div className="wallet-card__header">
              <div className="wallet-card__icon-wrapper wallet-card__icon-wrapper--naqd">
                <Banknote size={18} />
              </div>
              <span className="wallet-card__label">Naqd pul</span>
            </div>
            <div className="wallet-card__amount mono">
              {formatSum(currentBalances.naqd)}
            </div>
            <div className="wallet-card__footer">
              <span className="field-hint">Hamyon mablag'i</span>
            </div>
          </div>
        </div>
      </section>

      {/* Oxirgi amallar */}
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
              <span>Birinchi xarajatni kiritish</span>
            </Link>
          </div>
        ) : (
          <div className="ledger">
            <div className="ledger__head">
              <span>Vaqt</span>
              <span>Hisob</span>
              <span>Kategoriya</span>
              <span>Izoh / Joy</span>
              <span style={{ textAlign: "right" }}>Miqdor</span>
              <span style={{ textAlign: "right" }}>Amallar</span>
            </div>
            {recentExpenses.map((expense) => (
              <ExpenseRow
                key={expense.id}
                expense={expense}
                onDelete={deleteExpense}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
