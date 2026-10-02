import { Link } from "react-router-dom";
import { useExpenses } from "../context/ExpensesContext.jsx";
import { useNotifications } from "../context/NotificationsContext.jsx";
import { formatSum, formatDollar } from "../utils/format.js";
import {
  PlusCircle,
  HandCoins,
  SlidersHorizontal,
  PieChart,
  TrendingDown,
  TrendingUp,
  ArrowRight,
  Activity,
  Layers,
  Bell,
  AlertTriangle,
} from "lucide-react";

export default function Home() {
  const { currentBalances, debts } = useExpenses();
  const { notifications, unreadCount } = useNotifications();

  const pendingDebtsCount = (debts || []).filter((d) => d.status !== "settled").length;

  const urgentNotification = notifications.find(
    (n) => !n.isRead && n.priority === "high"
  ) || notifications.find((n) => !n.isRead);

  const todayStr = new Date().toLocaleDateString("uz-UZ", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const netFlowUZS = (currentBalances.totalIncomeUZS || 0) - (currentBalances.totalExpenseUZS || 0);

  return (
    <div className="home-page home-page--minimal">
      {/* Sarlavha qismi */}
      <div className="home-header">
        <div className="home-header__top">
          <span className="home-header__date">{todayStr}</span>
          <div className="flex items-center justify-between">
            <h1 className="page-title">Bosh sahifa</h1>
            <Link
              to="/notifications"
              className="home-header__notif-btn"
              title="Bildirishnomalar markazi"
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="home-header__notif-pill">{unreadCount}</span>
              )}
            </Link>
          </div>
          <p className="page-subtitle">
            Shaxsiy moliyaviy hisob-kitoblar va tizim umumiy holati
          </p>
        </div>
      </div>

      {/* Muhim / yangi bildirishnoma mavjud bo'lsa yuqorida mini banner */}
      {urgentNotification && (
        <Link
          to={urgentNotification.actionUrl || "/notifications"}
          className={`home-notif-banner ${
            urgentNotification.priority === "high"
              ? "home-notif-banner--high"
              : ""
          }`}
        >
          <div className="home-notif-banner__icon">
            {urgentNotification.priority === "high" ? (
              <AlertTriangle size={17} />
            ) : (
              <Bell size={17} />
            )}
          </div>
          <div className="home-notif-banner__content">
            <span className="home-notif-banner__title">
              {urgentNotification.title}
            </span>
            <span className="home-notif-banner__desc">
              {urgentNotification.message}
            </span>
          </div>
          <ArrowRight size={15} className="home-notif-banner__arrow" />
        </Link>
      )}

      {/* Tezkor harakatlar (Quick actions) - 375px+ ekranlarga to'liq mos */}
      <div className="home-quick-actions home-quick-actions--minimal">
        <Link to="/money" className="quick-action-card">
          <div className="quick-action-card__icon quick-action-card__icon--primary">
            <PlusCircle size={20} />
          </div>
          <div className="quick-action-card__text">
            <span className="quick-action-card__title">Amal kiritish</span>
            <span className="quick-action-card__sub">Xarajat / kirim</span>
          </div>
        </Link>

        <Link to="/debts" className="quick-action-card">
          <div className="quick-action-card__icon quick-action-card__icon--debts">
            <HandCoins size={20} />
          </div>
          <div className="quick-action-card__text">
            <span className="quick-action-card__title">Qarz daftari</span>
            <span className="quick-action-card__sub">
              {pendingDebtsCount > 0 ? `${pendingDebtsCount} ta kutilayotgan` : "Barcha qarzlar"}
            </span>
          </div>
        </Link>

        <Link to="/notifications" className="quick-action-card">
          <div className="quick-action-card__icon quick-action-card__icon--warning">
            <Bell size={20} />
          </div>
          <div className="quick-action-card__text">
            <span className="quick-action-card__title">Bildirishnomalar</span>
            <span className="quick-action-card__sub">
              {unreadCount > 0 ? `${unreadCount} ta yangi xabar` : "Barcha eslatmalar"}
            </span>
          </div>
        </Link>

        <Link to="/control" className="quick-action-card">
          <div className="quick-action-card__icon quick-action-card__icon--control">
            <SlidersHorizontal size={20} />
          </div>
          <div className="quick-action-card__text">
            <span className="quick-action-card__title">Boshqaruv</span>
            <span className="quick-action-card__sub">Zaxiralar & Kurs</span>
          </div>
        </Link>
      </div>


      {/* Umumiy kirim-chiqim oqimi (Yagona asosiy sarhisob) */}
      <section className="home-section">
        <div className="home-flow-card home-flow-card--hero">
          <div className="home-flow-card__header">
            <div className="flex items-center gap-2">
              <Activity size={16} className="text-accent" />
              <span className="home-flow-card__title">Umumiy mablag' oqimi</span>
            </div>
            <Link to="/money" className="btn btn--subtle btn--xs">
              <span>Money manager</span>
              <ArrowRight size={12} />
            </Link>
          </div>

          <div className="home-flow-card__body home-flow-card__body--grid">
            {/* Jami tushum */}
            <div className="home-flow-stat home-flow-stat--income">
              <div className="home-flow-stat__label">
                <TrendingUp size={15} />
                <span>Jami tushum (Kirim)</span>
              </div>
              <div className="home-flow-stat__value mono">
                +{formatSum(currentBalances.totalIncomeUZS || 0)}
              </div>
              {currentBalances.totalIncomeUSD > 0 && (
                <div className="home-flow-stat__sub mono">
                  +{formatDollar(currentBalances.totalIncomeUSD)}
                </div>
              )}
            </div>

            {/* Jami xarajat */}
            <div className="home-flow-stat home-flow-stat--expense">
              <div className="home-flow-stat__label">
                <TrendingDown size={15} />
                <span>Jami xarajat (Chiqim)</span>
              </div>
              <div className="home-flow-stat__value mono">
                -{formatSum(currentBalances.totalExpenseUZS || 0)}
              </div>
              {currentBalances.totalExpenseUSD > 0 && (
                <div className="home-flow-stat__sub mono">
                  -{formatDollar(currentBalances.totalExpenseUSD)}
                </div>
              )}
            </div>

            {/* Sof farq / Balans oqimi */}
            <div className="home-flow-stat home-flow-stat--net">
              <div className="home-flow-stat__label">
                <Layers size={15} />
                <span>Sof farq (Qoldiq oqimi)</span>
              </div>
              <div className={`home-flow-stat__value mono ${netFlowUZS >= 0 ? "text-income" : "text-expense"}`}>
                {netFlowUZS >= 0 ? "+" : ""}{formatSum(netFlowUZS)}
              </div>
              <div className="home-flow-stat__sub text-muted">
                {netFlowUZS >= 0 ? "Ijobiy balans" : "Xarajat ustun"}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pastki qism: Ilova versiyasi 1.1v */}
      <footer className="home-footer-version">
        <span className="home-version-pill">
          OYBEK SysteM · versiya 1.1v
        </span>
      </footer>
    </div>
  );
}
