import { Link } from "react-router-dom";
import NotificationBanner from "../components/notifications/NotificationBanner.jsx";
import { useExpenses } from "../context/ExpensesContext.jsx";
import { formatSum } from "../utils/format.js";
import { Wallet, CreditCard, ArrowRight, TrendingDown, TrendingUp } from "lucide-react";

const DEMO_NOTIFICATION = {
  title: "Money Manager yangilandi",
  body: "Naqd pul (30 000 so'm) va Plastik karta (100 000 so'm) hisoblari kiritildi. Endi daromadlar, o'tkazmalar va tahlil grafiklarni ham kuzatib borishingiz mumkin.",
};

export default function Home() {
  const { currentBalances, expenses } = useExpenses();

  return (
    <>
      <h1 className="page-title">Bosh sahifa</h1>
      <p className="page-subtitle">
        Shaxsiy tizim: moliyaviy hisob-kitoblar va yangilanishlar markazi.
      </p>

      <NotificationBanner
        title={DEMO_NOTIFICATION.title}
        body={DEMO_NOTIFICATION.body}
      />

      {/* Tezkor moliyaviy umumiy ko'rinish */}
      <div style={{ marginTop: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, margin: 0 }}>Moliya holati</h2>
          <Link to="/money" className="btn btn--subtle">
            <span>Money managerga o'tish</span>
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
                <Wallet size={18} />
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
      </div>
    </>
  );
}
