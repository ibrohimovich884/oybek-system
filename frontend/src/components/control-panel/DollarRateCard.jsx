import { useState } from "react";
import {
  TrendingUp,
  RefreshCw,
  Edit3,
  RotateCcw,
  Check,
  History,
  BadgeDollarSign,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { useExpenses } from "../../context/ExpensesContext.jsx";
import { formatRate, formatDollar, formatSum, formatDateTime } from "../../utils/format.js";

export default function DollarRateCard() {
  const {
    rateInfo,
    loadCbuRate,
    setManualUsdRate,
    resetManualUsdRate,
    dollarRateHistory,
  } = useExpenses();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isEditingRate, setIsEditingRate] = useState(false);
  const [manualRateInput, setManualRateInput] = useState(String(rateInfo?.rate || 12850));
  const [showFullHistory, setShowFullHistory] = useState(false);

  const handleRefreshCbu = async () => {
    setIsRefreshing(true);
    await loadCbuRate();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleSaveManualRate = async (e) => {
    e.preventDefault();
    const num = Number(manualRateInput);
    if (!num || num <= 0) return;
    await setManualUsdRate(num);
    setIsEditingRate(false);
  };

  const handleResetManual = async () => {
    await resetManualUsdRate();
    setIsEditingRate(false);
  };

  const displayedHistory = showFullHistory
    ? dollarRateHistory
    : dollarRateHistory.slice(0, 5);

  return (
    <div className="control-card control-card--dollar-rate">
      <div className="control-card__header">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div className="control-card__icon-wrapper" style={{ background: "var(--dollar-soft)", color: "var(--dollar)" }}>
            <BadgeDollarSign size={20} />
          </div>
          <div>
            <h4 className="control-card__title">AQSH Dollari Kursi (CBU.uz)</h4>
            <span className="control-card__subtitle">
              {rateInfo.isManual ? "Foydalanuvchi tomonidan qo'lda o'rnatilgan" : "Markaziy Bank rasmiy kursi"}
            </span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {rateInfo.isManual && (
            <button
              type="button"
              className="btn btn--subtle"
              onClick={handleResetManual}
              title="CBU rasmiy kursiga qaytarish"
              style={{ fontSize: "0.78rem", padding: "4px 8px" }}
            >
              <RotateCcw size={13} />
              <span>CBU ga qaytarish</span>
            </button>
          )}

          <button
            type="button"
            className="btn btn--subtle"
            onClick={handleRefreshCbu}
            disabled={isRefreshing}
            title="CBU kursini qayta yuklash"
            style={{ fontSize: "0.78rem", padding: "4px 8px" }}
          >
            <RefreshCw size={13} className={isRefreshing ? "animate-spin" : ""} />
            <span>Yangilash</span>
          </button>
        </div>
      </div>

      {/* Joriy Kurs Ko'rsatkichi */}
      <div className="dollar-rate-display" style={{ padding: "16px 0", borderBottom: "1px solid var(--border)" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
          <div className="mono" style={{ fontSize: "2rem", fontWeight: 700, color: "var(--dollar)" }}>
            1 USD = {formatRate(rateInfo.rate)}
          </div>
          <span className={`badge ${rateInfo.isManual ? "badge--warning" : "badge--success"}`}>
            {rateInfo.isManual ? "Qo'lda kiritilgan" : "CBU Rasmiy"}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8, fontSize: "0.8rem", color: "var(--text-muted)" }}>
          <span>So'nggi yangilanish: {formatDateTime(rateInfo.updatedAt)}</span>
          <button
            type="button"
            className="btn-link"
            onClick={() => {
              setManualRateInput(String(rateInfo.rate));
              setIsEditingRate(!isEditingRate);
            }}
            style={{ fontSize: "0.8rem", color: "var(--accent)", background: "none", border: "none", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4 }}
          >
            <Edit3 size={13} />
            <span>{isEditingRate ? "Yopish" : "Kursni qo'lda o'zgartirish"}</span>
          </button>
        </div>

        {/* Qo'lda o'zgartirish formasi */}
        {isEditingRate && (
          <form onSubmit={handleSaveManualRate} style={{ marginTop: 12, display: "flex", gap: 8, alignItems: "center" }}>
            <input
              type="number"
              step="any"
              value={manualRateInput}
              onChange={(e) => setManualRateInput(e.target.value)}
              placeholder="Masalan: 12850"
              className="expense-form__input mono"
              style={{ maxWidth: 180, padding: "6px 10px" }}
              required
            />
            <button type="submit" className="btn btn--primary" style={{ padding: "6px 14px" }}>
              <Check size={14} />
              <span>Saqlash</span>
            </button>
          </form>
        )}
      </div>

      {/* Kurslar va Dollar Operatsiyalari Tarixi */}
      <div className="dollar-rate-history-section" style={{ marginTop: 14 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.85rem", fontWeight: 600 }}>
            <History size={14} />
            <span>Dollar amallari & kurslar tarixi ({dollarRateHistory.length})</span>
          </div>
          {dollarRateHistory.length > 5 && (
            <button
              type="button"
              className="btn-link"
              onClick={() => setShowFullHistory(!showFullHistory)}
              style={{ fontSize: "0.78rem", color: "var(--accent)", background: "none", border: "none", cursor: "pointer" }}
            >
              {showFullHistory ? "Kamroq ko'rsatish" : `Barchasini ko'rish (${dollarRateHistory.length})`}
            </button>
          )}
        </div>

        {displayedHistory.length === 0 ? (
          <div style={{ padding: "14px", textAlign: "center", color: "var(--text-muted)", fontSize: "0.82rem", background: "var(--surface-hover)", borderRadius: 8 }}>
            Hozircha dollar bo'yicha operatsiyalar tarixi mavjud emas. Dollar hisobida xarajat yoki o'tkazma qilinganda ushbu jadvalda saqlanadi.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {displayedHistory.map((rec) => {
              const isKirim = rec.direction === "kirim";
              return (
                <div
                  key={rec.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "8px 12px",
                    background: "var(--surface-hover)",
                    borderRadius: 6,
                    border: "1px solid var(--border)",
                    fontSize: "0.8rem",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div
                      style={{
                        padding: 4,
                        borderRadius: 4,
                        background: isKirim ? "var(--income-soft)" : "var(--danger-soft)",
                        color: isKirim ? "var(--income)" : "var(--danger)",
                      }}
                    >
                      {isKirim ? <ArrowDownRight size={14} /> : <ArrowUpRight size={14} />}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, color: "var(--text)" }}>{rec.note || "Dollar amali"}</div>
                      <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                        {formatDateTime(rec.occurredAt)} • Kurs: <span className="mono">{formatRate(rec.exchangeRateAtTime)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mono" style={{ textAlign: "right", fontWeight: 700, color: isKirim ? "var(--income)" : "var(--text)" }}>
                    {isKirim ? "+" : "-"}{formatDollar(rec.amount)}
                    <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 400 }}>
                      ~ {formatSum(rec.amount * rec.exchangeRateAtTime)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
