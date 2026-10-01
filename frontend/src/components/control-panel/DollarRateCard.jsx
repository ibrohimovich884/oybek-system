import { useState, useMemo } from "react";
import {
  RefreshCw,
  Edit3,
  RotateCcw,
  Check,
  BadgeDollarSign,
  ArrowRightLeft,
  Calculator,
} from "lucide-react";
import { useExpenses } from "../../context/ExpensesContext.jsx";
import { formatRate, formatDollar, formatSum, formatDateTime } from "../../utils/format.js";

export default function DollarRateCard() {
  const {
    rateInfo,
    loadCbuRate,
    setManualUsdRate,
    resetManualUsdRate,
  } = useExpenses();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isEditingRate, setIsEditingRate] = useState(false);
  const [manualRateInput, setManualRateInput] = useState(String(rateInfo?.rate || 12850));

  // Tezkor valyuta kalkulyatori holati
  const [showCalculator, setShowCalculator] = useState(false);
  const [calcDirection, setCalcDirection] = useState("usd_to_uzs"); // 'usd_to_uzs' | 'uzs_to_usd'
  const [calcAmount, setCalcAmount] = useState("100");

  const currentRate = rateInfo?.rate || 12850;

  const handleRefreshCbu = async () => {
    setIsRefreshing(true);
    await loadCbuRate();
    setTimeout(() => setIsRefreshing(false), 400);
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

  // Konvertor natijasi
  const convertedResult = useMemo(() => {
    const val = Number(calcAmount);
    if (isNaN(val) || val <= 0) return 0;
    if (calcDirection === "usd_to_uzs") {
      return val * currentRate;
    } else {
      return val / currentRate;
    }
  }, [calcAmount, calcDirection, currentRate]);

  return (
    <div className="control-card control-card--dollar-rate">
      {/* Sarlavha qatori */}
      <div className="control-card__header">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            className="control-card__icon-wrapper"
            style={{
              background: "var(--dollar-soft)",
              color: "var(--dollar)",
              width: 34,
              height: 34,
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <BadgeDollarSign size={19} />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <h4 className="control-card__title" style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700 }}>
                AQSH Dollari Kursi
              </h4>
              <span className={`badge ${rateInfo.isManual ? "badge--warning" : "badge--success"}`} style={{ fontSize: "0.68rem", padding: "1px 6px" }}>
                {rateInfo.isManual ? "Qoʻlda" : "CBU.uz"}
              </span>
            </div>
            <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
              {rateInfo.isManual
                ? "Foydalanuvchi kursi faol"
                : `Yangilangan: ${formatDateTime(rateInfo.updatedAt)}`}
            </span>
          </div>
        </div>

        {/* Amallar: Kalkulyator, Qo'lda o'zgartirish, Yangilash */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <button
            type="button"
            className={`btn btn--xs ${showCalculator ? "btn--primary" : "btn--subtle"}`}
            onClick={() => setShowCalculator(!showCalculator)}
            title="Tezkor valyuta kalkulyatori"
            aria-label="Kalkulyator"
            style={{ padding: "5px 9px", fontSize: "0.76rem" }}
          >
            <Calculator size={13} />
            <span className="hidden-mobile-sm">Kalkulyator</span>
          </button>

          <button
            type="button"
            className="btn btn--subtle btn--xs"
            onClick={handleRefreshCbu}
            disabled={isRefreshing}
            title="CBU kursini yangilash"
            aria-label="Yangilash"
            style={{ padding: "5px 8px" }}
          >
            <RefreshCw size={13} className={isRefreshing ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Asosiy kurs ko'rsatkichi (Ixcham va aniq) */}
      <div className="dollar-rate-compact-row">
        <div className="dollar-rate-value-wrap">
          <div className="mono dollar-rate-main-num">
            1 $ = {formatRate(currentRate)}
          </div>
          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
            soʻm
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {rateInfo.isManual && (
            <button
              type="button"
              className="btn btn--ghost btn--xs"
              onClick={handleResetManual}
              title="CBU rasmiy kursiga qaytarish"
              style={{ fontSize: "0.72rem", color: "var(--warning)", padding: "4px 6px" }}
            >
              <RotateCcw size={12} />
              <span>CBUga qaytish</span>
            </button>
          )}

          <button
            type="button"
            className="btn-link"
            onClick={() => {
              setManualRateInput(String(currentRate));
              setIsEditingRate(!isEditingRate);
            }}
            style={{
              fontSize: "0.76rem",
              color: "var(--accent)",
              background: "none",
              border: "none",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              padding: "4px",
            }}
          >
            <Edit3 size={13} />
            <span>{isEditingRate ? "Yopish" : "Tahrirlash"}</span>
          </button>
        </div>
      </div>

      {/* Kursni qo'lda o'zgartirish formasi (Faqat ochilganda) */}
      {isEditingRate && (
        <form onSubmit={handleSaveManualRate} className="dollar-edit-rate-form animate-fade-in">
          <span style={{ fontSize: "0.76rem", color: "var(--text-muted)" }}>
            Yangi kursni kiriting (1 USD):
          </span>
          <div style={{ display: "flex", gap: 8, alignItems: "center", width: "100%" }}>
            <input
              type="number"
              step="any"
              value={manualRateInput}
              onChange={(e) => setManualRateInput(e.target.value)}
              placeholder="Masalan: 12850"
              className="field-input mono"
              style={{ flex: 1, padding: "8px 12px", fontSize: "0.95rem" }}
              required
            />
            <button type="submit" className="btn btn--primary btn--sm" style={{ padding: "8px 14px" }}>
              <Check size={14} />
              <span>Saqlash</span>
            </button>
          </div>
        </form>
      )}

      {/* Qulaylik: Tezkor Valyuta Kalkulyatori (Mobil uchun juda qulay) */}
      {showCalculator && (
        <div className="dollar-calc-widget animate-fade-in">
          <div className="dollar-calc-widget__header">
            <span style={{ fontSize: "0.76rem", fontWeight: 700, color: "var(--text-muted)" }}>
              Tezkor Konvertor
            </span>
            <button
              type="button"
              className="dollar-calc-direction-toggle"
              onClick={() =>
                setCalcDirection(
                  calcDirection === "usd_to_uzs" ? "uzs_to_usd" : "usd_to_uzs"
                )
              }
              title="Yo'nalishni almashtirish"
            >
              <span>{calcDirection === "usd_to_uzs" ? "$ ➔ so'm" : "so'm ➔ $"}</span>
              <ArrowRightLeft size={12} />
            </button>
          </div>

          <div className="dollar-calc-body">
            <div className="dollar-calc-input-wrap">
              <input
                type="number"
                min="0"
                step="any"
                value={calcAmount}
                onChange={(e) => setCalcAmount(e.target.value)}
                placeholder="0"
                className="field-input mono dollar-calc-input"
              />
              <span className="dollar-calc-unit mono">
                {calcDirection === "usd_to_uzs" ? "$" : "so'm"}
              </span>
            </div>

            <div className="dollar-calc-result mono">
              <span className="dollar-calc-result-equal">=</span>
              <span className="dollar-calc-result-value">
                {calcDirection === "usd_to_uzs"
                  ? formatSum(convertedResult)
                  : formatDollar(convertedResult)}
              </span>
            </div>
          </div>

          {/* Tezkor preset tugmalari */}
          <div className="dollar-calc-presets">
            {calcDirection === "usd_to_uzs" ? (
              <>
                {["10", "50", "100", "500", "1000"].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    className={`dollar-calc-preset-chip ${calcAmount === preset ? "is-active" : ""}`}
                    onClick={() => setCalcAmount(preset)}
                  >
                    ${preset}
                  </button>
                ))}
              </>
            ) : (
              <>
                {["100000", "500000", "1000000", "5000000"].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    className={`dollar-calc-preset-chip ${calcAmount === preset ? "is-active" : ""}`}
                    onClick={() => setCalcAmount(preset)}
                  >
                    {Number(preset) >= 1000000
                      ? `${Number(preset) / 1000000} mln`
                      : `${Number(preset) / 1000} ming`}
                  </button>
                ))}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
