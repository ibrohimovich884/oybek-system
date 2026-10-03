import { useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useExpenses } from "../context/ExpensesContext.jsx";
import WalletCards from "../components/money-manager/WalletCards.jsx";
import ExpenseForm from "../components/money-manager/ExpenseForm.jsx";
import ExpenseRow from "../components/money-manager/ExpenseRow.jsx";
import EditTransactionModal from "../components/money-manager/EditTransactionModal.jsx";
import AnalyticsView from "../components/money-manager/AnalyticsView.jsx";
import TransferModal from "../components/money-manager/TransferModal.jsx";
import SecurityGate from "../components/security/SecurityGate.jsx";
import { formatSum, formatDollar } from "../utils/format.js";
import {
  PlusCircle,
  History,
  PieChart,
  Download,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Clock,
  RefreshCw,
} from "lucide-react";

export default function MoneyManager() {
  const navigate = useNavigate();
  const {
    regularExpenses,
    expenses,
    isLoading,
    deleteExpense,
    downloadBackup,
    downloadCSV,
    importBackup,
    syncStatus,
    triggerManualSync,
  } = useExpenses();

  const displayExpenses = regularExpenses || (expenses || []).filter((e) => !e.fromWallet?.includes("reserve") && !e.toWallet?.includes("reserve"));
  const recentFive = displayExpenses.slice(0, 5);

  const [activeTab, setActiveTab] = useState("form"); // "form" | "analytics"
  const [transferConfig, setTransferConfig] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [deleteTargetItem, setDeleteTargetItem] = useState(null);
  const [feedback, setFeedback] = useState(null); // { type: 'success' | 'error', message: string }
  const fileInputRef = useRef(null);

  const handleOpenTransfer = (from, to) => {
    setTransferConfig({ from, to });
  };

  const handleFileImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target.result;
        const res = await importBackup(text);
        if (res.success) {
          setFeedback({
            type: "success",
            message: "Ma'lumotlar muvaffaqiyatli tiklandi!",
          });
        } else {
          setFeedback({
            type: "error",
            message: "Faylni yuklashda xatolik: " + res.error,
          });
        }
      } catch (err) {
        setFeedback({
          type: "error",
          message: "Faylni o'qishda xatolik yuz berdi.",
        });
      }
      setTimeout(() => setFeedback(null), 4000);
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const unsyncedCount = (expenses || []).filter((e) => e.synced === false).length;

  return (
    <div className="money-manager-page">
      <div className="page-header-row">
        <div>
          <h1 className="page-title">Money manager</h1>
          <p className="page-subtitle">
            Hamyon, Naqd, Plastik karta va Dollar oddiy balanslarini boshqaring, kundalik xarajat va daromadlarni hisoblab boring.
          </p>
        </div>

        {/* Eksport & Import asboblar paneli */}
        <div className="backup-toolbar">
          <Link
            to="/history"
            className="btn btn--subtle btn--sm backup-btn"
            title="Barcha tranzaksiyalar tarixiga o'tish"
          >
            <History size={15} />
            <span className="backup-btn__label">To'liq tarix</span>
          </Link>
          <button
            type="button"
            className="btn btn--subtle btn--sm backup-btn"
            onClick={downloadCSV}
            title="Excel (CSV) fayl sifatida yuklab olish"
          >
            <FileSpreadsheet size={15} />
            <span className="backup-btn__label">Excel</span>
          </button>
          <button
            type="button"
            className="btn btn--subtle btn--sm backup-btn"
            onClick={downloadBackup}
            title="JSON nusxa yuklab olish"
          >
            <Download size={15} />
            <span className="backup-btn__label">Zaxira</span>
          </button>
          <button
            type="button"
            className="btn btn--subtle btn--sm backup-btn"
            onClick={() => fileInputRef.current?.click()}
            title="JSON zaxira faylidan tiklash"
          >
            <Upload size={15} />
            <span className="backup-btn__label">Tiklash</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            style={{ display: "none" }}
            onChange={handleFileImport}
          />
        </div>
      </div>

      {/* Xabar bildirishnomasi */}
      {feedback && (
        <div className={`feedback-alert feedback-alert--${feedback.type}`}>
          {feedback.type === "success" ? (
            <CheckCircle2 size={16} />
          ) : (
            <AlertCircle size={16} />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Oflayn / Kutilayotgan sinxronizatsiya holati */}
      {unsyncedCount > 0 && (
        <div className="sync-pending-banner">
          <div className="sync-pending-banner__left">
            <Clock size={16} className="text-warning animate-pulse" />
            <div>
              <span className="sync-pending-banner__title">
                {unsyncedCount} ta amal faqat qurilma xotirasida
              </span>
              <span className="sync-pending-banner__sub">
                Server DB bilan aloqa bo'lganda avtomatik sinxronlanadi.
              </span>
            </div>
          </div>
          <button
            type="button"
            className="btn btn--subtle btn--xs"
            onClick={() => triggerManualSync()}
            disabled={syncStatus?.isSyncing}
          >
            <RefreshCw size={13} className={syncStatus?.isSyncing ? "animate-spin" : ""} />
            <span>{syncStatus?.isSyncing ? "Sinxronlanmoqda..." : "DBga yozish"}</span>
          </button>
        </div>
      )}

      {/* Hamyonlar va Balans kartalari */}
      <WalletCards onOpenTransfer={handleOpenTransfer} />

      {/* Asosiy ko'rinish tablari */}
      <div className="money-tabs">
        <button
          type="button"
          className={`money-tab-btn ${activeTab === "form" ? "is-active" : ""}`}
          onClick={() => setActiveTab("form")}
        >
          <PlusCircle size={16} />
          <span className="tab-label-full">Yangi amal kiritish</span>
          <span className="tab-label-short">Yangi amal</span>
        </button>

        <button
          type="button"
          className={`money-tab-btn ${activeTab === "analytics" ? "is-active" : ""}`}
          onClick={() => setActiveTab("analytics")}
        >
          <PieChart size={16} />
          <span className="tab-label-full">Tahlil & Statistika</span>
          <span className="tab-label-short">Tahlil</span>
        </button>

        <Link
          to="/history"
          className="money-tab-btn money-tab-btn--history-link"
          title="Barcha tranzaksiyalarni ko'rish va qidirish sahifasiga o'tish"
        >
          <History size={16} />
          <span className="tab-label-full">To'liq tarix & Qidiruv ({displayExpenses.length})</span>
          <span className="tab-label-short">Tarix ({displayExpenses.length})</span>
          <ArrowRight size={13} style={{ opacity: 0.7 }} />
        </Link>
      </div>

      {/* Tanlangan bo'lim */}
      {isLoading ? (
        <p className="ledger-empty">Yuklanmoqda...</p>
      ) : activeTab === "form" ? (
        <div className="tab-content-fade">
          <ExpenseForm />

          {/* Oxirgi 5 ta amal bo'limi */}
          <div className="money-recent-section">
            <div className="section-header-row" style={{ marginTop: 24, marginBottom: 12 }}>
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-muted" />
                <h3 className="section-title" style={{ fontSize: "1.05rem" }}>
                  Oxirgi 5 ta amal
                </h3>
                <span className="text-muted" style={{ fontSize: "0.8rem" }}>
                  (Tezkor ko'rinish)
                </span>
              </div>

              {displayExpenses.length > 5 && (
                <Link to="/history" className="btn btn--subtle btn--xs">
                  <span>Barchasi ({displayExpenses.length})</span>
                  <ArrowRight size={13} />
                </Link>
              )}
            </div>

            {recentFive.length === 0 ? (
              <div className="ledger-empty">
                <p>Hozircha tranzaksiyalar kiritilmagan.</p>
              </div>
            ) : (
              <div className="ledger-card">
                <div className="ledger">
                  {recentFive.map((expense) => (
                    <ExpenseRow
                      key={expense.id}
                      expense={expense}
                      onEdit={(item) => setEditingItem(item)}
                      onDelete={() => setDeleteTargetItem(expense)}
                    />
                  ))}
                </div>

                {/* To'liq tarix sahifasiga o'tish tugmasi */}
                <div className="money-history-cta">
                  <Link to="/history" className="money-history-cta__btn">
                    <History size={16} />
                    <span>
                      Barcha {displayExpenses.length} ta tranzaksiyalarni ko'rish, qidirish va filtrlash
                    </span>
                    <ArrowRight size={15} />
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="tab-content-fade">
          <AnalyticsView />
        </div>
      )}

      {/* Tahrirlash modali */}
      {editingItem && (
        <EditTransactionModal
          item={editingItem}
          onClose={() => setEditingItem(null)}
        />
      )}

      {/* Tezkor hisoblararo o'tkazma modali */}
      {transferConfig && (
        <TransferModal
          initialFrom={transferConfig.from}
          initialTo={transferConfig.to}
          onClose={() => setTransferConfig(null)}
        />
      )}

      {/* Amalni o'chirish uchun Xavfsiz PIN modali */}
      <SecurityGate
        isModal={true}
        isOpen={Boolean(deleteTargetItem)}
        isDanger={true}
        title="Amalni Oʻchirish"
        subtitle={
          deleteTargetItem
            ? `${deleteTargetItem.currency === "USD" || deleteTargetItem.paymentMethod === "dollar" ? formatDollar(deleteTargetItem.amount) : formatSum(deleteTargetItem.amount)} miqdoridagi amalni (${deleteTargetItem.reason || deleteTargetItem.category || "tranzaksiya"}) oʻchirish uchun 4 xonali PIN parolni kiriting`
            : "Ushbu amalni oʻchirish uchun 4 xonali maxfiy parolni kiriting"
        }
        onSuccess={() => {
          if (deleteTargetItem) {
            deleteExpense(deleteTargetItem.id);
            setDeleteTargetItem(null);
          }
        }}
        onCancel={() => setDeleteTargetItem(null)}
      />
    </div>
  );
}
