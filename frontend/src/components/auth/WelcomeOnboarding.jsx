import { useState, useMemo } from "react";
import {
  Wallet,
  Banknote,
  CreditCard,
  DollarSign,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Shield,
  RotateCcw,
  Check,
  Zap,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext.jsx";
import { useExpenses } from "../../context/ExpensesContext.jsx";
import { formatSum, formatDollar } from "../../utils/format.js";
import Loader from "../common/Loader.jsx";

export default function WelcomeOnboarding() {
  const { user, completeWelcome } = useAuth();
  const { rateInfo, updateWallets } = useExpenses();

  // 4 ta asosiy hamyon uchun boshlang'ich summalar
  const [hamyon, setHamyon] = useState("0");
  const [naqd, setNaqd] = useState("0");
  const [karta, setKarta] = useState("0");
  const [dollar, setDollar] = useState("0");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [activeInput, setActiveInput] = useState(null);

  const currentUsdRate = rateInfo?.rate || 12850;

  // Hisob-kitoblar
  const numHamyon = Math.max(0, Number(hamyon) || 0);
  const numNaqd = Math.max(0, Number(naqd) || 0);
  const numKarta = Math.max(0, Number(karta) || 0);
  const numDollar = Math.max(0, Number(dollar) || 0);

  const totalUZS = useMemo(() => numHamyon + numNaqd + numKarta, [numHamyon, numNaqd, numKarta]);
  const dollarInUZS = useMemo(() => numDollar * currentUsdRate, [numDollar, currentUsdRate]);
  const grandTotalUZS = useMemo(() => totalUZS + dollarInUZS, [totalUZS, dollarInUZS]);

  const handleResetZero = () => {
    setHamyon("0");
    setNaqd("0");
    setKarta("0");
    setDollar("0");
  };

  const handleQuickPreset = (amountUZS) => {
    setKarta(String(amountUZS));
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (isSubmitting || isSuccess) return;

    setIsSubmitting(true);

    const payload = {
      hamyon: numHamyon,
      naqd: numNaqd,
      karta: numKarta,
      dollar: numDollar,
    };

    try {
      // 1. WalletsContext yangilash
      if (updateWallets) {
        await updateWallets(payload).catch((e) => console.warn("updateWallets warning:", e));
      }

      // 2. AuthContext va backend/localStorage da welcome ni yakunlash
      await completeWelcome(payload);

      setIsSuccess(true);
      if (typeof window !== "undefined" && window.navigator?.vibrate) {
        window.navigator.vibrate([30, 50, 40]);
      }
    } catch (err) {
      console.error("Welcome submit error:", err);
      // Fallback
      if (completeWelcome) {
        await completeWelcome(payload).catch(() => {});
      }
      setIsSuccess(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const userName = user?.fullName || user?.full_name || user?.name || user?.username || "Foydalanuvchi";

  return (
    <div className="login-screen-wrapper" style={{ minHeight: "100vh", padding: "20px 14px 40px" }}>
      <div className="login-bg-glow" />
      <div className="login-bg-pattern" />

      <div
        className={`login-card ${isSuccess ? "is-success" : ""}`}
        style={{
          maxWidth: "680px",
          width: "100%",
          padding: "24px 20px",
          background: "var(--surface)",
          position: "relative",
          borderRadius: "16px",
          border: "1px solid var(--border)",
        }}
      >
        {isSubmitting && (
          <Loader
            variant="overlay"
            size="lg"
            text="Hisoblar sozlanmoqda..."
            subtext="4 ta asosiy hamyon boshlang'ich balansi saqlanmoqda"
            blur="5px"
          />
        )}

        {/* Header / Intro */}
        <div style={{ textAlign: "center", marginBottom: "20px" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "5px 12px",
              borderRadius: "20px",
              background: "rgba(16, 185, 129, 0.12)",
              border: "1px solid rgba(16, 185, 129, 0.3)",
              color: "#34d399",
              fontSize: "0.8rem",
              fontWeight: "600",
              marginBottom: "10px",
            }}
          >
            <Sparkles size={14} />
            <span>Yangi foydalanuvchi xush kelibsiz!</span>
          </div>

          <h1
            style={{
              fontSize: "1.45rem",
              fontWeight: "800",
              color: "var(--text)",
              margin: "0 0 6px",
              letterSpacing: "-0.02em",
            }}
          >
            Salom, <span style={{ color: "#34d399" }}>{userName}</span>!
          </h1>
          <p
            style={{
              fontSize: "0.88rem",
              color: "var(--text-muted)",
              lineHeight: 1.5,
              maxWidth: "520px",
              margin: "0 auto",
            }}
          >
            Tizimga muvaffaqiyatli roʻyxatdan oʻtdingiz. Moliyangizni toʻgʻri hisoblash uchun quyidagi{" "}
            <strong style={{ color: "var(--text)" }}>4 ta asosiy hamyon</strong>ingizning boshlangʻich summalarini kiriting.
          </p>
        </div>

        {/* 1 marta ko'rsatilishi haqida eslatma banneri */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "10px",
            padding: "10px 14px",
            borderRadius: "10px",
            background: "rgba(56, 189, 248, 0.08)",
            border: "1px solid rgba(56, 189, 248, 0.22)",
            marginBottom: "20px",
            fontSize: "0.8rem",
            color: "var(--text-muted)",
          }}
        >
          <Shield size={18} style={{ color: "#38bdf8", flexShrink: 0, marginTop: "2px" }} />
          <div style={{ lineHeight: 1.45 }}>
            <span style={{ color: "#38bdf8", fontWeight: "700" }}>Bir martalik dastlabki sozlash: </span>
            Ushbu oyna faqat roʻyxatdan oʻtganingizda 1 marta chiqadi va saqlangandan soʻng qaytib ochilmaydi.
          </div>
        </div>

        {/* Form: 4 ta asosiy hamyon */}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "14px",
            }}
          >
            {/* 1. Hamyon (Kundalik) */}
            <div
              style={{
                background: "var(--surface-raised, rgba(255, 255, 255, 0.03))",
                border: activeInput === "hamyon" ? "1px solid #10b981" : "1px solid var(--border)",
                borderRadius: "12px",
                padding: "14px",
                transition: "all 0.2s ease",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "8px",
                      background: "rgba(16, 185, 129, 0.15)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#10b981",
                    }}
                  >
                    <Wallet size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: "0.9rem", fontWeight: "700", color: "var(--text)" }}>1. Hamyon</div>
                    <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>Kundalik mayda choʻntak puli</div>
                  </div>
                </div>
                <span style={{ fontSize: "0.72rem", fontWeight: "600", color: "#10b981", background: "rgba(16, 185, 129, 0.1)", padding: "2px 6px", borderRadius: "4px" }}>
                  UZS
                </span>
              </div>

              <div style={{ position: "relative" }}>
                <input
                  id="welcome-hamyon"
                  type="number"
                  min="0"
                  step="any"
                  className="expense-form__input mono"
                  style={{
                    width: "100%",
                    fontSize: "1.05rem",
                    fontWeight: "700",
                    padding: "10px 12px",
                    borderRadius: "8px",
                    border: "1px solid var(--border)",
                    background: "var(--surface-input, rgba(0,0,0,0.2))",
                    color: "var(--text)",
                  }}
                  value={hamyon}
                  onFocus={() => setActiveInput("hamyon")}
                  onBlur={() => setActiveInput(null)}
                  onChange={(e) => setHamyon(e.target.value)}
                  placeholder="0"
                  required
                />
              </div>
              <div style={{ marginTop: "6px", fontSize: "0.75rem", color: "var(--text-muted)", display: "flex", justifyContent: "space-between" }}>
                <span>Koʻrinishi:</span>
                <span className="mono" style={{ color: "#10b981", fontWeight: "600" }}>{formatSum(numHamyon)}</span>
              </div>
            </div>

            {/* 2. Naqd pul */}
            <div
              style={{
                background: "var(--surface-raised, rgba(255, 255, 255, 0.03))",
                border: activeInput === "naqd" ? "1px solid #eab308" : "1px solid var(--border)",
                borderRadius: "12px",
                padding: "14px",
                transition: "all 0.2s ease",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "8px",
                      background: "rgba(234, 179, 8, 0.15)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#eab308",
                    }}
                  >
                    <Banknote size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: "0.9rem", fontWeight: "700", color: "var(--text)" }}>2. Naqd pul</div>
                    <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>Qoʻldagi yoki uydagi naqd mablagʻ</div>
                  </div>
                </div>
                <span style={{ fontSize: "0.72rem", fontWeight: "600", color: "#eab308", background: "rgba(234, 179, 8, 0.1)", padding: "2px 6px", borderRadius: "4px" }}>
                  UZS
                </span>
              </div>

              <div style={{ position: "relative" }}>
                <input
                  id="welcome-naqd"
                  type="number"
                  min="0"
                  step="any"
                  className="expense-form__input mono"
                  style={{
                    width: "100%",
                    fontSize: "1.05rem",
                    fontWeight: "700",
                    padding: "10px 12px",
                    borderRadius: "8px",
                    border: "1px solid var(--border)",
                    background: "var(--surface-input, rgba(0,0,0,0.2))",
                    color: "var(--text)",
                  }}
                  value={naqd}
                  onFocus={() => setActiveInput("naqd")}
                  onBlur={() => setActiveInput(null)}
                  onChange={(e) => setNaqd(e.target.value)}
                  placeholder="0"
                  required
                />
              </div>
              <div style={{ marginTop: "6px", fontSize: "0.75rem", color: "var(--text-muted)", display: "flex", justifyContent: "space-between" }}>
                <span>Koʻrinishi:</span>
                <span className="mono" style={{ color: "#eab308", fontWeight: "600" }}>{formatSum(numNaqd)}</span>
              </div>
            </div>

            {/* 3. Plastik karta */}
            <div
              style={{
                background: "var(--surface-raised, rgba(255, 255, 255, 0.03))",
                border: activeInput === "karta" ? "1px solid #38bdf8" : "1px solid var(--border)",
                borderRadius: "12px",
                padding: "14px",
                transition: "all 0.2s ease",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "8px",
                      background: "rgba(56, 189, 248, 0.15)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#38bdf8",
                    }}
                  >
                    <CreditCard size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: "0.9rem", fontWeight: "700", color: "var(--text)" }}>3. Plastik karta</div>
                    <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>Uzcard / Humo bank hisoblari</div>
                  </div>
                </div>
                <span style={{ fontSize: "0.72rem", fontWeight: "600", color: "#38bdf8", background: "rgba(56, 189, 248, 0.1)", padding: "2px 6px", borderRadius: "4px" }}>
                  UZS
                </span>
              </div>

              <div style={{ position: "relative" }}>
                <input
                  id="welcome-karta"
                  type="number"
                  min="0"
                  step="any"
                  className="expense-form__input mono"
                  style={{
                    width: "100%",
                    fontSize: "1.05rem",
                    fontWeight: "700",
                    padding: "10px 12px",
                    borderRadius: "8px",
                    border: "1px solid var(--border)",
                    background: "var(--surface-input, rgba(0,0,0,0.2))",
                    color: "var(--text)",
                  }}
                  value={karta}
                  onFocus={() => setActiveInput("karta")}
                  onBlur={() => setActiveInput(null)}
                  onChange={(e) => setKarta(e.target.value)}
                  placeholder="0"
                  required
                />
              </div>
              <div style={{ marginTop: "6px", fontSize: "0.75rem", color: "var(--text-muted)", display: "flex", justifyContent: "space-between" }}>
                <span>Koʻrinishi:</span>
                <span className="mono" style={{ color: "#38bdf8", fontWeight: "600" }}>{formatSum(numKarta)}</span>
              </div>
            </div>

            {/* 4. AQSH Dollari */}
            <div
              style={{
                background: "var(--surface-raised, rgba(255, 255, 255, 0.03))",
                border: activeInput === "dollar" ? "1px solid #22c55e" : "1px solid var(--border)",
                borderRadius: "12px",
                padding: "14px",
                transition: "all 0.2s ease",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "8px",
                      background: "rgba(34, 197, 94, 0.15)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#22c55e",
                    }}
                  >
                    <DollarSign size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: "0.9rem", fontWeight: "700", color: "var(--text)" }}>4. AQSH Dollari</div>
                    <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>Valyuta mablagʻi (USD)</div>
                  </div>
                </div>
                <span style={{ fontSize: "0.72rem", fontWeight: "600", color: "#22c55e", background: "rgba(34, 197, 94, 0.1)", padding: "2px 6px", borderRadius: "4px" }}>
                  USD ($)
                </span>
              </div>

              <div style={{ position: "relative" }}>
                <input
                  id="welcome-dollar"
                  type="number"
                  min="0"
                  step="any"
                  className="expense-form__input mono"
                  style={{
                    width: "100%",
                    fontSize: "1.05rem",
                    fontWeight: "700",
                    padding: "10px 12px",
                    borderRadius: "8px",
                    border: "1px solid var(--border)",
                    background: "var(--surface-input, rgba(0,0,0,0.2))",
                    color: "var(--text)",
                  }}
                  value={dollar}
                  onFocus={() => setActiveInput("dollar")}
                  onBlur={() => setActiveInput(null)}
                  onChange={(e) => setDollar(e.target.value)}
                  placeholder="0"
                  required
                />
              </div>
              <div style={{ marginTop: "6px", fontSize: "0.75rem", color: "var(--text-muted)", display: "flex", justifyContent: "space-between" }}>
                <span>Ekvivalent:</span>
                <span className="mono" style={{ color: "#22c55e", fontWeight: "600" }}>
                  {formatDollar(numDollar)} ≈ {formatSum(dollarInUZS)}
                </span>
              </div>
            </div>
          </div>

          {/* Tezkor tugmalar */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px", paddingTop: "4px" }}>
            <div style={{ display: "flex", gap: "6px" }}>
              <button
                type="button"
                className="btn btn--ghost"
                onClick={handleResetZero}
                style={{ fontSize: "0.75rem", padding: "4px 10px", height: "auto" }}
              >
                <RotateCcw size={12} />
                <span>Barchasini 0 qilish</span>
              </button>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.74rem", color: "var(--text-muted)" }}>
              <span>CBU USD kursi:</span>
              <span className="mono" style={{ color: "var(--text)", fontWeight: "600" }}>
                {formatSum(currentUsdRate)}
              </span>
            </div>
          </div>

          {/* Jami hisob kartasi */}
          <div
            style={{
              marginTop: "10px",
              padding: "16px 18px",
              borderRadius: "12px",
              background: "linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(56, 189, 248, 0.08) 100%)",
              border: "1px solid rgba(16, 185, 129, 0.25)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "12px",
            }}
          >
            <div>
              <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: "700" }}>
                Jami Boshlangʻich Balans (Ekvivalent)
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: "8px", marginTop: "2px" }}>
                <span className="mono" style={{ fontSize: "1.35rem", fontWeight: "800", color: "#34d399" }}>
                  {formatSum(grandTotalUZS)}
                </span>
                {numDollar > 0 && (
                  <span className="mono" style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                    ({formatDollar(numDollar)} + {formatSum(totalUZS)})
                  </span>
                )}
              </div>
            </div>

            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textAlign: "right" }}>
              4 ta hamyon boʻyicha hisoblandi
            </div>
          </div>

          {/* Submit Action */}
          <div style={{ marginTop: "12px" }}>
            <button
              type="submit"
              className="login-submit-btn"
              disabled={isSubmitting || isSuccess}
              style={{
                width: "100%",
                padding: "14px 20px",
                fontSize: "1rem",
                fontWeight: "700",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                cursor: "pointer",
                borderRadius: "10px",
              }}
            >
              {isSubmitting ? (
                <>
                  <div className="login-spinner" />
                  <span>Saqlanmoqda...</span>
                </>
              ) : isSuccess ? (
                <>
                  <CheckCircle2 size={20} />
                  <span>Muvaffaqiyatli saqlandi! Tizim ochilmoqda...</span>
                </>
              ) : (
                <>
                  <Zap size={18} />
                  <span>Boshlangʻich balanslarni saqlash va Boshlash</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
