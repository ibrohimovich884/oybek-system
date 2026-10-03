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
  Mail,
  User,
  Phone,
  UserPlus,
  LogIn,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext.jsx";

export default function LoginScreen() {
  const { login, register, lockoutState } = useAuth();

  // Tab: 'login' | 'register'
  const [activeTab, setActiveTab] = useState("login");

  // Login maydonlari
  const [loginIdentifier, setLoginIdentifier] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Register maydonlari
  const [regEmail, setRegEmail] = useState("");
  const [regFullName, setRegFullName] = useState("");
  const [regUsername, setRegUsername] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirmPassword, setRegConfirmPassword] = useState("");
  const [showRegPassword, setShowRegPassword] = useState(false);

  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [remainingAttempts, setRemainingAttempts] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [lockCountdown, setLockCountdown] = useState(0);

  const loginInputRef = useRef(null);
  const regEmailInputRef = useRef(null);

  // Qolgan bloklash vaqtini hisoblash
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
    setErrorMsg("");
    setSuccessMsg("");
    if (activeTab === "login" && loginInputRef.current && !isLocked) {
      loginInputRef.current.focus();
    } else if (activeTab === "register" && regEmailInputRef.current) {
      regEmailInputRef.current.focus();
    }
  }, [activeTab, isLocked]);

  // Kirish funksiyasi
  const handleLoginSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!loginPassword.trim() || isLoading || isSuccess || isLocked) return;

    setErrorMsg("");
    setSuccessMsg("");
    setIsLoading(true);

    try {
      const res = await login(loginIdentifier.trim(), loginPassword.trim());
      if (res.success) {
        setIsSuccess(true);
        setRemainingAttempts(null);
        if (typeof window !== "undefined" && window.navigator?.vibrate) {
          window.navigator.vibrate([30, 40, 30]);
        }
      } else {
        setIsShaking(true);
        setErrorMsg(res.message || "Notoʻgʻri parol yoki login!");
        if (res.remainingAttempts !== undefined) {
          setRemainingAttempts(res.remainingAttempts);
        }

        if (typeof window !== "undefined" && window.navigator?.vibrate) {
          window.navigator.vibrate(150);
        }
        setTimeout(() => {
          setIsShaking(false);
          if (loginInputRef.current && !res.isLocked) {
            loginInputRef.current.focus();
          }
        }, 600);
      }
    } catch (err) {
      setIsShaking(true);
      setErrorMsg("Kirishda xatolik: " + err.message);
      setTimeout(() => setIsShaking(false), 600);
    } finally {
      setIsLoading(false);
    }
  };

  // Ro'yxatdan o'tish funksiyasi
  const handleRegisterSubmit = async (e) => {
    if (e) e.preventDefault();
    if (isLoading || isSuccess) return;

    setErrorMsg("");
    setSuccessMsg("");

    const email = regEmail.trim();
    const password = regPassword.trim();
    const confirm = regConfirmPassword.trim();
    const fullName = regFullName.trim();
    const username = regUsername.trim();
    const phone = regPhone.trim();

    if (!email) {
      setErrorMsg("Gmail (Email) kiritilishi shart!");
      return;
    }

    if (!email.includes("@")) {
      setErrorMsg("Iltimos, haqiqiy email kiriting (masalan: misol@gmail.com)");
      return;
    }

    if (!password || password.length < 6) {
      setErrorMsg("Parol kamida 6 ta belgidan iborat boʻlishi kerak!");
      return;
    }

    if (password !== confirm) {
      setErrorMsg("Parollar bir-biriga mos kelmadi!");
      return;
    }

    setIsLoading(true);

    try {
      const res = await register({
        email,
        password,
        fullName: fullName || email.split("@")[0],
        username: username || undefined,
        phoneNumber: phone || undefined,
      });

      if (res.success) {
        setIsSuccess(true);
        setSuccessMsg("Muvaffaqiyatli roʻyxatdan oʻtildi! Tizim yuklanmoqda...");
        if (typeof window !== "undefined" && window.navigator?.vibrate) {
          window.navigator.vibrate([30, 40, 30]);
        }
      } else {
        setIsShaking(true);
        setErrorMsg(res.message || "Roʻyxatdan oʻtishda xatolik yuz berdi");
        setTimeout(() => setIsShaking(false), 600);
      }
    } catch (err) {
      setIsShaking(true);
      setErrorMsg("Xatolik: " + err.message);
      setTimeout(() => setIsShaking(false), 600);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCountdown = (totalSec) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  return (
    <div className="login-screen-wrapper">
      <div className="login-bg-glow" />
      <div className="login-bg-pattern" />

      <div
        className={`login-card ${isShaking ? "is-shaking" : ""} ${isSuccess ? "is-success" : ""} ${
          isLocked ? "is-locked-card" : ""
        }`}
        style={{ maxWidth: activeTab === "register" ? 460 : 420 }}
      >
        {/* Yuqori brend belgisi */}
        <div className="login-header">
          <div
            className="login-badge-aura"
            style={{
              borderColor: isLocked ? "rgba(239, 68, 68, 0.6)" : undefined,
              background: isLocked
                ? "radial-gradient(circle, rgba(239, 68, 68, 0.25) 0%, rgba(127, 29, 29, 0.45) 100%)"
                : undefined,
            }}
          >
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
            <p className="login-brand-desc">Multi-User Shaxsiy moliyaviy tizim</p>
          </div>

          {/* 1 oylik sessiya nishoni */}
          <div className="login-session-pill">
            <Clock size={13} />
            <span>30 kunlik xavfsiz JWT sessiya</span>
          </div>
        </div>

        {/* Tablar: Kirish / Ro'yxatdan o'tish */}
        <div
          style={{
            display: "flex",
            background: "rgba(255, 255, 255, 0.04)",
            padding: 4,
            borderRadius: 12,
            border: "1px solid rgba(255, 255, 255, 0.08)",
            marginBottom: 20,
            gap: 4,
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab("login")}
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 7,
              padding: "9px 12px",
              borderRadius: 9,
              fontSize: "0.86rem",
              fontWeight: activeTab === "login" ? 700 : 500,
              background: activeTab === "login" ? "rgba(16, 185, 129, 0.22)" : "transparent",
              color: activeTab === "login" ? "#34d399" : "rgba(245, 243, 236, 0.6)",
              border: activeTab === "login" ? "1px solid rgba(52, 211, 153, 0.35)" : "1px solid transparent",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
          >
            <LogIn size={15} />
            <span>Kirish</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("register")}
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 7,
              padding: "9px 12px",
              borderRadius: 9,
              fontSize: "0.86rem",
              fontWeight: activeTab === "register" ? 700 : 500,
              background: activeTab === "register" ? "rgba(16, 185, 129, 0.22)" : "transparent",
              color: activeTab === "register" ? "#34d399" : "rgba(245, 243, 236, 0.6)",
              border: activeTab === "register" ? "1px solid rgba(52, 211, 153, 0.35)" : "1px solid transparent",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
          >
            <UserPlus size={15} />
            <span>Roʻyxatdan oʻtish</span>
          </button>
        </div>

        {/* Bloklangan holat indikatori */}
        {isLocked && activeTab === "login" && (
          <div
            className="login-lockout-banner animate-fade-in"
            style={{
              marginBottom: 16,
              padding: "12px 14px",
              borderRadius: 14,
              background: "rgba(239, 68, 68, 0.18)",
              border: "1px solid rgba(239, 68, 68, 0.45)",
              color: "#fca5a5",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700, fontSize: "0.88rem", color: "#f87171" }}>
                <Timer size={16} className="animate-spin" style={{ animationDuration: "3s" }} />
                <span>Xavfsizlik blokirovkasi</span>
              </div>
              <span
                className="mono"
                style={{
                  fontSize: "1.1rem",
                  fontWeight: 800,
                  color: "#ffffff",
                  background: "rgba(239, 68, 68, 0.4)",
                  padding: "2px 8px",
                  borderRadius: 8,
                  border: "1px solid rgba(239, 68, 68, 0.6)",
                }}
              >
                {formatCountdown(lockCountdown)}
              </span>
            </div>
            <p style={{ margin: 0, fontSize: "0.76rem", lineHeight: 1.4, color: "rgba(254, 202, 202, 0.9)" }}>
              Ketma-ket xato urinishlar sababli tizim vaqtincha toʻxtatildi. Taymer tugagach qayta urinib koʻring.
            </p>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 1: KIRISH (LOGIN)                                     */}
        {/* ========================================================= */}
        {activeTab === "login" ? (
          <form onSubmit={handleLoginSubmit} className="login-form">
            <div className="login-input-group">
              <label htmlFor="login-ident" className="login-label">
                <span>Gmail / Username / Telefon:</span>
              </label>
              <div className="login-input-box" style={{ opacity: isLocked ? 0.6 : 1 }}>
                <div className="login-input-icon">
                  <Mail size={18} />
                </div>
                <input
                  ref={loginInputRef}
                  id="login-ident"
                  type="text"
                  className="login-input"
                  placeholder="masalan: user@gmail.com"
                  value={loginIdentifier}
                  onChange={(e) => {
                    setLoginIdentifier(e.target.value);
                    if (errorMsg) setErrorMsg("");
                  }}
                  disabled={isLoading || isSuccess || isLocked}
                  autoComplete="username"
                />
              </div>
            </div>

            <div className="login-input-group">
              <label htmlFor="login-password" className="login-label">
                <span>Parol:</span>
                {!isLocked && remainingAttempts !== null && remainingAttempts < 5 && (
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
                  id="login-password"
                  type={showLoginPassword ? "text" : "password"}
                  className="login-input"
                  placeholder={isLocked ? `Kuting (${lockCountdown}s)...` : "Parolingizni kiriting..."}
                  value={loginPassword}
                  onChange={(e) => {
                    setLoginPassword(e.target.value);
                    if (errorMsg) setErrorMsg("");
                  }}
                  disabled={isLoading || isSuccess || isLocked}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="login-toggle-pw"
                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                  tabIndex={-1}
                  disabled={isLocked}
                  title={showLoginPassword ? "Parolni yashirish" : "Parolni ko'rsatish"}
                >
                  {showLoginPassword ? <EyeOff size={18} /> : <Eye size={18} />}
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

            <button
              type="submit"
              className="login-submit-btn"
              disabled={!loginPassword.trim() || isLoading || isSuccess || isLocked}
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
        ) : (
          /* ========================================================= */
          /* TAB 2: RO'YXATDAN O'TISH (REGISTER)                       */
          /* ========================================================= */
          <form onSubmit={handleRegisterSubmit} className="login-form">
            <div className="login-input-group">
              <label htmlFor="reg-email" className="login-label">
                <span>Gmail (Email) * :</span>
              </label>
              <div className="login-input-box">
                <div className="login-input-icon">
                  <Mail size={18} />
                </div>
                <input
                  ref={regEmailInputRef}
                  id="reg-email"
                  type="email"
                  className="login-input"
                  placeholder="masalan: user@gmail.com"
                  value={regEmail}
                  onChange={(e) => {
                    setRegEmail(e.target.value);
                    if (errorMsg) setErrorMsg("");
                  }}
                  disabled={isLoading || isSuccess}
                  required
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div className="login-input-group">
                <label htmlFor="reg-fullname" className="login-label">
                  <span>Ism / Familiya:</span>
                </label>
                <div className="login-input-box">
                  <div className="login-input-icon">
                    <User size={18} />
                  </div>
                  <input
                    id="reg-fullname"
                    type="text"
                    className="login-input"
                    placeholder="Oybek"
                    value={regFullName}
                    onChange={(e) => setRegFullName(e.target.value)}
                    disabled={isLoading || isSuccess}
                  />
                </div>
              </div>

              <div className="login-input-group">
                <label htmlFor="reg-username" className="login-label">
                  <span>Username:</span>
                </label>
                <div className="login-input-box">
                  <div className="login-input-icon">
                    <User size={18} />
                  </div>
                  <input
                    id="reg-username"
                    type="text"
                    className="login-input"
                    placeholder="oybek_01"
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value)}
                    disabled={isLoading || isSuccess}
                  />
                </div>
              </div>
            </div>

            <div className="login-input-group">
              <label htmlFor="reg-phone" className="login-label">
                <span>Telefon raqam (zaxira):</span>
              </label>
              <div className="login-input-box">
                <div className="login-input-icon">
                  <Phone size={18} />
                </div>
                <input
                  id="reg-phone"
                  type="tel"
                  className="login-input"
                  placeholder="+998 90 123 45 67"
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value)}
                  disabled={isLoading || isSuccess}
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div className="login-input-group">
                <label htmlFor="reg-password" className="login-label">
                  <span>Parol * :</span>
                </label>
                <div className="login-input-box">
                  <div className="login-input-icon">
                    <KeyRound size={18} />
                  </div>
                  <input
                    id="reg-password"
                    type={showRegPassword ? "text" : "password"}
                    className="login-input"
                    placeholder="Kamida 6 belgi"
                    value={regPassword}
                    onChange={(e) => {
                      setRegPassword(e.target.value);
                      if (errorMsg) setErrorMsg("");
                    }}
                    disabled={isLoading || isSuccess}
                    required
                  />
                </div>
              </div>

              <div className="login-input-group">
                <label htmlFor="reg-confirm" className="login-label">
                  <span>Tasdiqlash * :</span>
                </label>
                <div className="login-input-box">
                  <div className="login-input-icon">
                    <KeyRound size={18} />
                  </div>
                  <input
                    id="reg-confirm"
                    type={showRegPassword ? "text" : "password"}
                    className="login-input"
                    placeholder="Qayta kiriting"
                    value={regConfirmPassword}
                    onChange={(e) => {
                      setRegConfirmPassword(e.target.value);
                      if (errorMsg) setErrorMsg("");
                    }}
                    disabled={isLoading || isSuccess}
                    required
                  />
                  <button
                    type="button"
                    className="login-toggle-pw"
                    onClick={() => setShowRegPassword(!showRegPassword)}
                    tabIndex={-1}
                    title={showRegPassword ? "Parolni yashirish" : "Parolni ko'rsatish"}
                  >
                    {showRegPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </div>

            {/* Xatolik / Muvaffaqiyat xabari */}
            {errorMsg && (
              <div className="login-feedback-error animate-fade-in">
                <AlertCircle size={15} />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="login-feedback-success animate-fade-in">
                <CheckCircle2 size={15} />
                <span>{successMsg}</span>
              </div>
            )}

            <button
              type="submit"
              className="login-submit-btn"
              disabled={!regEmail.trim() || !regPassword.trim() || isLoading || isSuccess}
            >
              {isLoading ? (
                <>
                  <div className="login-spinner" />
                  <span>Roʻyxatdan oʻtkazilmoqda...</span>
                </>
              ) : isSuccess ? (
                <>
                  <ShieldCheck size={18} />
                  <span>Tayyor!</span>
                </>
              ) : (
                <>
                  <span>Roʻyxatdan oʻtish</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>
        )}

        {/* Xavfsizlik axboroti */}
        <div className="login-footer">
          <div className="login-security-notice">
            <Shield size={13} />
            <span>Multi-User izolyatsiya & 7 ta avtomatik hamyon</span>
          </div>
        </div>
      </div>
    </div>
  );
}
