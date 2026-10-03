import { useState, useEffect, useRef } from "react";
import {
  Lock,
  Unlock,
  KeyRound,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Clock,
  CheckCircle2,
  Shield,
  ShieldAlert,
  Timer,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext.jsx";

export default function LoginScreen() {
  const { login, lockoutState } = useAuth();
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [remainingAttempts, setRemainingAttempts] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [lockCountdown, setLockCountdown] = useState(0);
  const inputRef = useRef(null);

  // Qolgan vaqtni sekundlarda hisoblash
  useEffect(() => {
    if (!lockoutState?.lockUntil) {
      setLockCountdown(0);
      return;
    }

    const updateCountdown = () => {
      const now = Date.now();
      const diffMs = lockoutState.lockUntil - now;
      if (diffMs > 0) {
        setLockCountdown(Math.ceil(diffMs / 1000));
      } else {
        setLockCountdown(0);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 500);
    return () => clearInterval(interval);
  }, [lockoutState?.lockUntil]);

  const isLocked = lockCountdown > 0;

  useEffect(() => {
    // Agar qulflanmagan bo'lsa inputga fokus qilish
    if (inputRef.current && !isLocked) {
      inputRef.current.focus();
    }
  }, [isLocked]);

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!password.trim() || isLoading || isSuccess || isLocked) return;

    setErrorMsg("");
    setIsLoading(true);

    try {
      const res = await login(password.trim());
      if (res.success) {
        setIsSuccess(true);
        setRemainingAttempts(null);
        if (typeof window !== "undefined" && window.navigator?.vibrate) {
          window.navigator.vibrate([30, 40, 30]);
        }
      } else {
        setIsShaking(true);
        setErrorMsg(res.message || "Noto'g'ri parol! Qayta urinib ko'ring.");
        if (res.remainingAttempts !== undefined) {
          setRemainingAttempts(res.remainingAttempts);
        }

        if (typeof window !== "undefined" && window.navigator?.vibrate) {
          window.navigator.vibrate(150);
        }
        setTimeout(() => {
          setIsShaking(false);
          if (inputRef.current && !res.isLocked) {
            inputRef.current.focus();
            inputRef.current.select();
          }
        }, 600);
      }
    } catch (err) {
      setIsShaking(true);
      setErrorMsg("Kirishda xatolik yuz berdi: " + err.message);
      setTimeout(() => setIsShaking(false), 600);
    } finally {
      setIsLoading(false);
    }
  };

  // Sekundlarni formatlash (00:29)
  const formatCountdown = (totalSec) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  return (
    <div className="login-screen-wrapper">
      {/* Background ambient lighting */}
      <div className="login-bg-glow" />
      <div className="login-bg-pattern" />

      <div className={`login-card ${isShaking ? "is-shaking" : ""} ${isSuccess ? "is-success" : ""} ${isLocked ? "is-locked-card" : ""}`}>
        {/* Yuqori brend belgisi */}
        <div className="login-header">
          <div className="login-badge-aura" style={{ borderColor: isLocked ? "rgba(239, 68, 68, 0.6)" : undefined, background: isLocked ? "radial-gradient(circle, rgba(239, 68, 68, 0.25) 0%, rgba(127, 29, 29, 0.45) 100%)" : undefined }}>
            {isSuccess ? (
              <Unlock size={28} className="text-income animate-bounce" />
            ) : isLocked ? (
              <ShieldAlert size={28} style={{ color: "#ef4444" }} className="animate-pulse" />
            ) : (
              <Lock size={28} className="text-income" />
            )}
          </div>

          <div className="login-brand-meta">
            <h1 className="login-brand-title">
              OYBEK <span>SysteM</span>
            </h1>
            <p className="login-brand-desc">Shaxsiy moliyaviy va operatsion tizim</p>
          </div>

          {/* 1 oylik sessiya nishoni */}
          <div className="login-session-pill">
            <Clock size={13} />
            <span>1 oylik xavfsiz JWT sessiya (30 kun)</span>
          </div>
        </div>

        {/* Bloklangan holat indikatori (Countdown Banner) */}
        {isLocked && (
          <div className="login-lockout-banner animate-fade-in" style={{ marginBottom: 16, padding: "12px 14px", borderRadius: 14, background: "rgba(239, 68, 68, 0.18)", border: "1px solid rgba(239, 68, 68, 0.45)", color: "#fca5a5" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700, fontSize: "0.88rem", color: "#f87171" }}>
                <Timer size={16} className="animate-spin" style={{ animationDuration: "3s" }} />
                <span>Xavfsizlik blokirovkasi</span>
              </div>
              <span className="mono" style={{ fontSize: "1.1rem", fontWeight: 800, color: "#ffffff", background: "rgba(239, 68, 68, 0.4)", padding: "2px 8px", borderRadius: 8, border: "1px solid rgba(239, 68, 68, 0.6)" }}>
                {formatCountdown(lockCountdown)}
              </span>
            </div>
            <p style={{ margin: 0, fontSize: "0.76rem", lineHeight: 1.4, color: "rgba(254, 202, 202, 0.9)" }}>
              Ketma-ket xato urinishlar sababli tizim vaqtincha toʻxtatildi. Taymer tugagach qayta urinib koʻring.
            </p>
          </div>
        )}

        {/* Kirish formasi */}
        <form onSubmit={handleSubmit} className="login-form">
          <div className="login-input-group">
            <label htmlFor="sys-password" className="login-label">
              <span>Tizim paroli:</span>
              {!isLocked && remainingAttempts !== null && remainingAttempts < 3 && (
                <span style={{ fontSize: "0.72rem", color: remainingAttempts === 1 ? "#ef4444" : "#f59e0b", fontWeight: 600 }}>
                  Qolgan urinish: {remainingAttempts} ta
                </span>
              )}
            </label>

            <div className="login-input-box" style={{ opacity: isLocked ? 0.6 : 1 }}>
              <div className="login-input-icon">
                <KeyRound size={18} />
              </div>

              <input
                ref={inputRef}
                id="sys-password"
                type={showPassword ? "text" : "password"}
                className="login-input"
                placeholder={isLocked ? `Kuting (${lockCountdown}s)...` : "Parolni kiriting..."}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errorMsg) setErrorMsg("");
                }}
                disabled={isLoading || isSuccess || isLocked}
                autoComplete="current-password"
                required
              />

              <button
                type="button"
                className="login-toggle-pw"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                disabled={isLocked}
                title={showPassword ? "Parolni yashirish" : "Parolni ko'rsatish"}
                aria-label={showPassword ? "Parolni yashirish" : "Parolni ko'rsatish"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Xatolik / Muvaffaqiyat xabari */}
          {errorMsg && !isLocked && (
            <div className="login-feedback-error animate-fade-in">
              <AlertCircle size={15} />
              <span>{errorMsg}</span>
            </div>
          )}

          {isSuccess && (
            <div className="login-feedback-success animate-fade-in">
              <CheckCircle2 size={15} />
              <span>Kirish tasdiqlandi! Tizim ochilmoqda...</span>
            </div>
          )}

          {/* Kirish tugmasi */}
          <button
            type="submit"
            className="login-submit-btn"
            disabled={!password.trim() || isLoading || isSuccess || isLocked}
            style={{
              background: isLocked ? "rgba(239, 68, 68, 0.25)" : undefined,
              borderColor: isLocked ? "rgba(239, 68, 68, 0.4)" : undefined,
              color: isLocked ? "#fca5a5" : undefined,
            }}
          >
            {isLoading ? (
              <>
                <div className="login-spinner" />
                <span>Tekshirilmoqda...</span>
              </>
            ) : isSuccess ? (
              <>
                <ShieldCheck size={18} />
                <span>Xush kelibsiz!</span>
              </>
            ) : isLocked ? (
              <>
                <Timer size={18} />
                <span>Bloklangan ({lockCountdown}s)</span>
              </>
            ) : (
              <>
                <span>Tizimga kirish</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        {/* Xavfsizlik axboroti */}
        <div className="login-footer">
          <div className="login-security-notice">
            <Shield size={13} />
            <span>Progressiv himoya (30s ➔ 60s ➔ 120s ➔ 300s) & JWT Bearer</span>
          </div>
        </div>
      </div>
    </div>
  );
}

