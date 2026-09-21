import { useState, useRef } from "react";
import { Link } from "react-router-dom";
import { useExpenses } from "../context/ExpensesContext.jsx";
import WalletCards from "../components/money-manager/WalletCards.jsx";
import ExpenseForm from "../components/money-manager/ExpenseForm.jsx";
import ExpenseList from "../components/money-manager/ExpenseList.jsx";
import AnalyticsView from "../components/money-manager/AnalyticsView.jsx";
import TransferModal from "../components/money-manager/TransferModal.jsx";
import {
  PlusCircle,
  ListOrdered,
  PieChart,
  Download,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  SlidersHorizontal,
} from "lucide-react";

export default function MoneyManager() {
  const {
    expenses,
    isLoading,
    downloadBackup,
    downloadCSV,
    importBackup,
  } = useExpenses();

  const [activeTab, setActiveTab] = useState("form"); // "form" | "history" | "analytics"
  const [transferConfig, setTransferConfig] = useState(null);
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

  return (
    <div className="money-manager-page">
      <div className="page-header-row">
        <div>
          <h1 className="page-title">Money manager</h1>
          <p className="page-subtitle">
            Hamyon, Naqd, Plastik karta va Dollar oddiy balanslarini boshqaring, kundalik xarajat va daromadlarni hisoblab boring.
          </p>
        </div>

        {/* Eksport & Import & Control panel asboblar paneli */}
        <div className="backup-toolbar">
          <Link
            to="/control"
            className="btn btn--primary backup-btn"
            title="Asosiy (rezerv) balanslar va nazorat paneli"
          >
            <SlidersHorizontal size={15} />
            <span className="backup-btn__label">Control panel</span>
          </Link>
          <button
            type="button"
            className="btn btn--subtle backup-btn"
            onClick={downloadCSV}
            title="Excel (CSV) fayl sifatida yuklab olish"
          >
            <FileSpreadsheet size={15} />
            <span className="backup-btn__label">Excel</span>
          </button>
          <button
            type="button"
            className="btn btn--subtle backup-btn"
            onClick={downloadBackup}
            title="JSON nusxa yuklab olish"
          >
            <Download size={15} />
            <span className="backup-btn__label">Zaxira</span>
          </button>
          <button
            type="button"
            className="btn btn--subtle backup-btn"
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
          className={`money-tab-btn ${activeTab === "history" ? "is-active" : ""}`}
          onClick={() => setActiveTab("history")}
        >
          <ListOrdered size={16} />
          <span className="tab-label-full">Amallar tarixi ({expenses.length})</span>
          <span className="tab-label-short">Tarix ({expenses.length})</span>
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
      </div>

      {/* Tanlangan bo'lim */}
      {isLoading ? (
        <p className="ledger-empty">Yuklanmoqda...</p>
      ) : activeTab === "form" ? (
        <div className="tab-content-fade">
          <ExpenseForm />
          <div className="section-divider">
            <span>Oxirgi amallar</span>
          </div>
          <ExpenseList expenses={expenses.slice(0, 5)} />
        </div>
      ) : activeTab === "history" ? (
        <div className="tab-content-fade">
          <ExpenseList expenses={expenses} />
        </div>
      ) : (
        <div className="tab-content-fade">
          <AnalyticsView />
        </div>
      )}

      {/* Tezkor hisoblararo o'tkazma modali */}
      {transferConfig && (
        <TransferModal
          initialFrom={transferConfig.from}
          initialTo={transferConfig.to}
          onClose={() => setTransferConfig(null)}
        />
      )}
    </div>
  );
}
