import { useMemo } from "react";
import { useExpenses } from "../../context/ExpensesContext.jsx";
import { formatSum } from "../../utils/format.js";
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  WALLET_CONFIG,
} from "../../constants/money.js";
import CategoryIcon from "./CategoryIcon.jsx";
import { TrendingDown, TrendingUp, PieChart, Wallet, CreditCard, Award } from "lucide-react";

export default function AnalyticsView() {
  const { expenses, currentBalances } = useExpenses();

  // Statistika hisoblash
  const stats = useMemo(() => {
    let expenseSum = 0;
    let incomeSum = 0;
    const categoryTotals = {};
    const subcategoryTotals = {};
    const walletSpending = { naqd: 0, karta: 0 };
    let maxExpense = null;

    expenses.forEach((item) => {
      const amt = Number(item.amount || 0);
      if (item.type === "expense") {
        expenseSum += amt;
        const cat = item.category || "Boshqa";
        if (!categoryTotals[cat]) {
          categoryTotals[cat] = { amount: 0, count: 0 };
        }
        categoryTotals[cat].amount += amt;
        categoryTotals[cat].count += 1;

        const sub = item.subcategory || "Boshqa";
        if (!subcategoryTotals[sub]) {
          subcategoryTotals[sub] = { amount: 0, count: 0, category: cat };
        }
        subcategoryTotals[sub].amount += amt;
        subcategoryTotals[sub].count += 1;

        const method = item.paymentMethod || item.wallet || "naqd";
        if (method === "naqd") {
          walletSpending.naqd += amt;
        } else {
          walletSpending.karta += amt;
        }

        if (!maxExpense || amt > maxExpense.amount) {
          maxExpense = item;
        }
      } else if (item.type === "income") {
        incomeSum += amt;
      }
    });

    const categoryList = Object.keys(categoryTotals)
      .map((catId) => {
        const catObj =
          EXPENSE_CATEGORIES.find((c) => c.id === catId) || {
            label: catId,
            icon: "Package",
            color: "#a39c8e",
          };
        const total = categoryTotals[catId].amount;
        const percentage = expenseSum > 0 ? ((total / expenseSum) * 100).toFixed(1) : 0;
        return {
          id: catId,
          ...catObj,
          total,
          count: categoryTotals[catId].count,
          percentage: Number(percentage),
        };
      })
      .sort((a, b) => b.total - a.total);

    const subcategoryList = Object.keys(subcategoryTotals)
      .map((subName) => {
        const total = subcategoryTotals[subName].amount;
        const percentage = expenseSum > 0 ? ((total / expenseSum) * 100).toFixed(1) : 0;
        return {
          name: subName,
          category: subcategoryTotals[subName].category,
          total,
          count: subcategoryTotals[subName].count,
          percentage: Number(percentage),
        };
      })
      .sort((a, b) => b.total - a.total);

    return {
      expenseSum,
      incomeSum,
      categoryList,
      subcategoryList,
      walletSpending,
      maxExpense,
      avgExpense:
        categoryList.reduce((acc, c) => acc + c.count, 0) > 0
          ? Math.round(expenseSum / categoryList.reduce((acc, c) => acc + c.count, 0))
          : 0,
    };
  }, [expenses]);

  if (!expenses.length) {
    return (
      <div className="analytics-empty">
        <PieChart size={36} color="var(--text-muted)" />
        <p>Hozircha tahlil qilish uchun xarajatlar kiritilmagan.</p>
        <span className="field-hint">Xarajat yoki daromad kiritsangiz, bu yerda grafiklar va foizlar shakllanadi.</span>
      </div>
    );
  }

  return (
    <div className="analytics-container">
      {/* Tezkor metrikalar */}
      <div className="analytics-summary-grid">
        <div className="stat-card">
          <div className="stat-card__title">
            <TrendingDown size={16} color="var(--expense)" />
            <span>Jami xarajat</span>
          </div>
          <div className="stat-card__value mono" style={{ color: "var(--expense)" }}>
            {formatSum(stats.expenseSum)}
          </div>
          <span className="stat-card__sub">
            O'rtacha xarajat: <strong className="mono">{formatSum(stats.avgExpense)}</strong>
          </span>
        </div>

        <div className="stat-card">
          <div className="stat-card__title">
            <TrendingUp size={16} color="var(--accent)" />
            <span>Jami daromad</span>
          </div>
          <div className="stat-card__value mono" style={{ color: "var(--accent)" }}>
            +{formatSum(stats.incomeSum)}
          </div>
          <span className="stat-card__sub">
            Sof tejamkorlik:{" "}
            <strong className="mono" style={{ color: stats.incomeSum >= stats.expenseSum ? "var(--accent)" : "var(--expense)" }}>
              {stats.incomeSum >= stats.expenseSum ? "+" : ""}
              {formatSum(stats.incomeSum - stats.expenseSum)}
            </strong>
          </span>
        </div>

        <div className="stat-card">
          <div className="stat-card__title">
            <Award size={16} color="var(--warning)" />
            <span>Eng katta xarajat</span>
          </div>
          <div className="stat-card__value mono">
            {stats.maxExpense ? formatSum(stats.maxExpense.amount) : "—"}
          </div>
          <span className="stat-card__sub">
            {stats.maxExpense ? stats.maxExpense.reason || "Kiritilgan sababsiz" : "Mavjud emas"}
          </span>
        </div>
      </div>

      {/* Hamyonlar bo'yicha sarflanish nisbati */}
      <div className="analytics-section">
        <h3 className="analytics-section__title">
          Hamyonlar bo'yicha xarajatlar nisbati
        </h3>
        <div className="wallet-spending-split">
          <div className="wallet-spend-item">
            <div className="wallet-spend-item__head">
              <div className="wallet-spend-item__name">
                <CreditCard size={15} color="var(--karta)" />
                <span>Plastik karta</span>
              </div>
              <span className="mono">{formatSum(stats.walletSpending.karta)}</span>
            </div>
            <div className="progress-bar-bg">
              <div
                className="progress-bar-fill progress-bar-fill--karta"
                style={{
                  width: `${
                    stats.expenseSum > 0
                      ? ((stats.walletSpending.karta / stats.expenseSum) * 100).toFixed(1)
                      : 0
                  }%`,
                }}
              />
            </div>
          </div>

          <div className="wallet-spend-item">
            <div className="wallet-spend-item__head">
              <div className="wallet-spend-item__name">
                <Wallet size={15} color="var(--naqd)" />
                <span>Naqd pul</span>
              </div>
              <span className="mono">{formatSum(stats.walletSpending.naqd)}</span>
            </div>
            <div className="progress-bar-bg">
              <div
                className="progress-bar-fill progress-bar-fill--naqd"
                style={{
                  width: `${
                    stats.expenseSum > 0
                      ? ((stats.walletSpending.naqd / stats.expenseSum) * 100).toFixed(1)
                      : 0
                  }%`,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Kategoriyalar tahlili */}
      <div className="analytics-section">
        <h3 className="analytics-section__title">
          Kategoriyalar bo'yicha xarajat taqsimoti
        </h3>
        <div className="category-stats-list">
          {stats.categoryList.map((cat) => (
            <div key={cat.id} className="cat-stat-row">
              <div className="cat-stat-row__info">
                <div className="cat-stat-row__badge" style={{ backgroundColor: `${cat.color}22` }}>
                  <CategoryIcon iconName={cat.icon} color={cat.color} size={15} />
                </div>
                <div className="cat-stat-row__labels">
                  <span className="cat-stat-row__name">{cat.label}</span>
                  <span className="cat-stat-row__count">{cat.count} ta to'lov</span>
                </div>
              </div>

              <div className="cat-stat-row__bar-wrapper">
                <div className="progress-bar-bg">
                  <div
                    className="progress-bar-fill"
                    style={{
                      width: `${cat.percentage}%`,
                      backgroundColor: cat.color,
                    }}
                  />
                </div>
              </div>

              <div className="cat-stat-row__numbers">
                <span className="cat-stat-row__amount mono">{formatSum(cat.total)}</span>
                <span className="cat-stat-row__percent mono">{cat.percentage}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Kichik kategoriyalar (Subcategories) bo'yicha tahlil */}
      {stats.subcategoryList?.length > 0 && (
        <div className="analytics-section">
          <h3 className="analytics-section__title">
            Kichik kategoriyalar (subcategories) bo'yicha xarajatlar
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
            {stats.subcategoryList.map((sub, idx) => (
              <div
                key={idx}
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  padding: "10px 14px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontWeight: 600, fontSize: "0.88rem", color: "var(--text)" }}>
                    {sub.name}
                  </span>
                  <span style={{ fontSize: "0.75rem", color: "var(--accent)" }} className="mono">
                    {sub.percentage}%
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 2 }}>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                    {sub.category} ({sub.count} ta)
                  </span>
                  <span style={{ fontWeight: 600, fontSize: "0.85rem" }} className="mono">
                    {formatSum(sub.total)}
                  </span>
                </div>
                <div className="progress-bar-bg" style={{ height: 4, marginTop: 4 }}>
                  <div
                    className="progress-bar-fill"
                    style={{
                      width: `${sub.percentage}%`,
                      backgroundColor: "var(--accent)",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
