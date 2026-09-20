import { useState, useMemo } from "react";
import ExpenseRow from "./ExpenseRow.jsx";
import EditTransactionModal from "./EditTransactionModal.jsx";
import { useExpenses } from "../../context/ExpensesContext.jsx";
import { formatSum } from "../../utils/format.js";
import { Search, Filter, Calendar, XCircle } from "lucide-react";

export default function ExpenseList({ expenses }) {
  const { deleteExpense } = useExpenses();

  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all"); // "all" | "expense" | "income" | "transfer"
  const [walletFilter, setWalletFilter] = useState("all"); // "all" | "karta" | "naqd"
  const [dateFilter, setDateFilter] = useState("all"); // "all" | "today" | "week" | "month"
  const [editingItem, setEditingItem] = useState(null);

  // Filtratsiya
  const filteredExpenses = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfWeek.getDate() - ((startOfWeek.getDay() + 6) % 7)); // Dushanba
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    return expenses.filter((item) => {
      // Type filtri
      if (typeFilter !== "all" && item.type !== typeFilter) {
        return false;
      }

      // Wallet / paymentMethod filtri
      if (walletFilter !== "all") {
        if (item.type === "transfer") {
          if (item.fromWallet !== walletFilter && item.toWallet !== walletFilter) {
            return false;
          }
        } else {
          const method = item.paymentMethod || item.wallet || "naqd";
          if (method !== walletFilter) {
            return false;
          }
        }
      }

      // Sana filtri
      if (dateFilter !== "all" && item.spentAt) {
        const itemDate = new Date(item.spentAt);
        if (dateFilter === "today" && itemDate < startOfToday) return false;
        if (dateFilter === "week" && itemDate < startOfWeek) return false;
        if (dateFilter === "month" && itemDate < startOfMonth) return false;
      }

      // Qidiruv (Sabab, Joy, Kategoriya yoki Kichik kategoriya)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesReason = (item.reason || "").toLowerCase().includes(query);
        const matchesLocation = (item.location || "").toLowerCase().includes(query);
        const matchesCategory = (item.category || "").toLowerCase().includes(query);
        const matchesSubcategory = (item.subcategory || "").toLowerCase().includes(query);
        if (!matchesReason && !matchesLocation && !matchesCategory && !matchesSubcategory) {
          return false;
        }
      }

      return true;
    });
  }, [expenses, typeFilter, walletFilter, dateFilter, searchQuery]);

  const filteredStats = useMemo(() => {
    let expenseSum = 0;
    let incomeSum = 0;
    filteredExpenses.forEach((item) => {
      const amt = Number(item.amount || 0);
      if (item.type === "expense") expenseSum += amt;
      if (item.type === "income") incomeSum += amt;
    });
    return { expenseSum, incomeSum, count: filteredExpenses.length };
  }, [filteredExpenses]);

  const hasActiveFilters =
    searchQuery.trim() !== "" ||
    typeFilter !== "all" ||
    walletFilter !== "all" ||
    dateFilter !== "all";

  const clearFilters = () => {
    setSearchQuery("");
    setTypeFilter("all");
    setWalletFilter("all");
    setDateFilter("all");
  };

  return (
    <div className="expenses-ledger-section">
      {/* Filtrlash paneli */}
      <div className="filter-bar">
        {/* Qidiruv input */}
        <div className="search-box">
          <Search size={15} className="search-box__icon" />
          <input
            type="text"
            placeholder="Sabab, joy, kategoriya yoki kichik kategoriya qidirish..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-box__input"
          />
          {searchQuery && (
            <button
              type="button"
              className="search-box__clear"
              onClick={() => setSearchQuery("")}
            >
              <XCircle size={14} />
            </button>
          )}
        </div>

        <div className="filter-controls">
          {/* Turi bo'yicha */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">Barcha amallar</option>
            <option value="expense">Faqat xarajatlar</option>
            <option value="income">Faqat daromadlar</option>
            <option value="transfer">Faqat o'tkazmalar</option>
          </select>

          {/* Hamyon bo'yicha */}
          <select
            value={walletFilter}
            onChange={(e) => setWalletFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">Barcha hisoblar</option>
            <option value="karta">Plastik karta</option>
            <option value="naqd">Naqd pul</option>
          </select>

          {/* Vaqt bo'yicha */}
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">Barcha vaqt</option>
            <option value="today">Bugun</option>
            <option value="week">Shu hafta</option>
            <option value="month">Shu oy</option>
          </select>

          {hasActiveFilters && (
            <button
              type="button"
              className="btn btn--ghost filter-clear-btn"
              onClick={clearFilters}
              title="Filtrlarni tozalash"
            >
              Tozalash
            </button>
          )}
        </div>
      </div>

      {/* Filtr natijasi sarhisobi */}
      {hasActiveFilters && (
        <div className="filter-summary-chip">
          <span>
            Filtr bo'yicha: <strong>{filteredStats.count} ta</strong> amal topildi.
            {filteredStats.expenseSum > 0 && (
              <> Xarajat: <strong className="mono">-{formatSum(filteredStats.expenseSum)}</strong></>
            )}
            {filteredStats.incomeSum > 0 && (
              <> | Daromad: <strong className="mono">+{formatSum(filteredStats.incomeSum)}</strong></>
            )}
          </span>
        </div>
      )}

      {/* Jadval */}
      <div className="ledger">
        <div className="ledger__head">
          <span>Vaqt</span>
          <span>Hisob</span>
          <span>Kategoriya</span>
          <span>Izoh / Joy</span>
          <span style={{ textAlign: "right" }}>Miqdor</span>
          <span style={{ textAlign: "right" }}>Amallar</span>
        </div>

        {filteredExpenses.length === 0 ? (
          <div className="ledger-empty">
            <p>Hech qanday tranzaksiya topilmadi.</p>
            {hasActiveFilters && (
              <button
                type="button"
                className="btn btn--ghost"
                onClick={clearFilters}
              >
                Filtrlarni bekor qilish
              </button>
            )}
          </div>
        ) : (
          filteredExpenses.map((expense) => (
            <ExpenseRow
              key={expense.id}
              expense={expense}
              onEdit={(item) => setEditingItem(item)}
              onDelete={deleteExpense}
            />
          ))
        )}
      </div>

      {/* Tahrirlash modali */}
      {editingItem && (
        <EditTransactionModal
          item={editingItem}
          onClose={() => setEditingItem(null)}
        />
      )}
    </div>
  );
}
