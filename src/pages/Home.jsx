import { Link } from "react-router-dom";
import NotificationBanner from "../components/notifications/NotificationBanner.jsx";
import { useExpenses } from "../context/ExpensesContext.jsx";
import { formatSum, formatDollar } from "../utils/format.js";
import ExpenseRow from "../components/money-manager/ExpenseRow.jsx";
import {
  Wallet,
  CreditCard,
  Banknote,
  BadgeDollarSign,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  PlusCircle,
  PieChart,
  History,
  SlidersHorizontal,
  HandCoins,
} from "lucide-react";

const DEMO_NOTIFICATION = {
  title: "Tizim yangilandi: Qarz daftarchasi qo'shildi",
  body: "Berilgan va olingan qarzlar hisobi, qisman qaytarishlar, CBU kursi va shaxsiy eslatmalar to'liq faollashtirildi.",
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

        <Link to="/control" className="quick-action-card">
          <div className="quick-action-card__icon" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>
            <SlidersHorizontal size={20} />
          </div>
          <div className="quick-action-card__text">
            <span className="quick-action-card__title">Control panel</span>
            <span className="quick-action-card__sub">Rezervlar & Dollar kursi</span>
          </div>
        </Link>

        <Link to="/debts" className="quick-action-card">
          <div className="quick-action-card__icon" style={{ background: "rgba(56, 189, 248, 0.15)", color: "#38bdf8" }}>
            <HandCoins size={20} />
          </div>
          <div className="quick-action-card__text">
            <span className="quick-action-card__title">Qarz daftari</span>
            <span className="quick-action-card__sub">Kutilayotgan pullar</span>
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
          <h2 className="section-title">Moliya holati (Kundalik erkin)</h2>
          <div style={{ display: "flex", gap: 8 }}>
            <Link to="/control" className="btn btn--ghost btn--sm">
              <SlidersHorizontal size={14} />
              <span>Control panel</span>
            </Link>
            <Link to="/money" className="btn btn--subtle btn--sm">
              <span>Money manager</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>

        <div className="wallet-grid">
          {/* Hamyon */}
          <div className="wallet-card wallet-card--hamyon">
            <div className="wallet-card__header">
              <div className="wallet-card__icon-wrapper wallet-card__icon-wrapper--hamyon">
                <Wallet size={18} />
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
                <Banknote size={18} />
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

          {/* Dollar */}
          <div className="wallet-card wallet-card--dollar">
            <div className="wallet-card__header">
              <div className="wallet-card__icon-wrapper wallet-card__icon-wrapper--dollar">
                <BadgeDollarSign size={18} />
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
