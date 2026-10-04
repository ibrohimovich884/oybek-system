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
  ChevronDown,
  ChevronUp,
  Sparkles,
  Check,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext.jsx";
import Loader from "../common/Loader.jsx";

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
  const [showOptionalFields, setShowOptionalFields] = useState(false);

  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [remainingAttempts, setRemainingAttempts] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [lockCountdown, setLockCountdown] = useState(0);
  const [loadingSeconds, setLoadingSeconds] = useState(0);

  const cardRef = useRef(null);
  const loginInputRef = useRef(null);
  const regEmailInputRef = useRef(null);

  // Yuklanish vaqti hisoblagichi (sovuq server uyg'onishini ko'rsatish)
  useEffect(() => {
    let t;
    if (isLoading) {
      setLoadingSeconds(0);
      t = setInterval(() => {
        setLoadingSeconds((s) => s + 1);
      }, 1000);
    } else {
      setLoadingSeconds(0);
    }
    return () => clearInterval(t);
  }, [isLoading]);

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

  // Parol mosligi tekshiruvi
  const passwordsMatch = regPassword.length >= 6 && regConfirmPassword.length > 0 && regPassword === regConfirmPassword;
  const passwordsMismatch = regConfirmPassword.length > 0 && regPassword !== regConfirmPassword;

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

    if (!email.includes("@") || !email.includes(".")) {
      setErrorMsg("Iltimos, toʻgʻri email kiriting (masalan: foydalanuvchi@gmail.com)");
      return;
    }

    if (!password || password.length < 6) {
      setErrorMsg("Parol kamida 6 ta belgidan iborat boʻlishi kerak!");
      return;
    }

    if (password !== confirm) {
      setErrorMsg("Kiritilgan parollar bir-biriga mos kelmadi!");
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
        ref={cardRef}
        className={`login-card ${isShaking ? "is-shaking" : ""} ${isSuccess ? "is-success" : ""} ${
          isLocked ? "is-locked-card" : ""
        } ${activeTab === "register" ? "login-card--register" : ""}`}
        style={{ position: "relative" }}
      >
        {isLoading && (
          <Loader
            variant="overlay"
            size="lg"
            text={activeTab === "register" ? "Roʻyxatdan oʻtkazilmoqda..." : "Tizimga kirilmoqda..."}
            subtext={
              loadingSeconds > 4
                ? `Server uygʻonmoqda (${loadingSeconds}s)... Render servisida bir oz vaqt olishi mumkin`
                : "30 kunlik xavfsiz sessiya tekshirilmoqda"
            }
            blur="5px"
          />
        )}
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
              <Unlock size={26} className="text-income animate-bounce" />
            ) : isLocked ? (
              <ShieldAlert size={26} style={{ color: "#ef4444" }} className="animate-pulse" />
            ) : activeTab === "register" ? (
              <UserPlus size={26} className="text-income" />
            ) : (
              <Lock size={26} className="text-income" />
            )}
          </div>

          <div className="login-brand-meta">
            <h1 className="login-brand-title">
              OYBEK <span>SysteM</span>
            </h1>
            <p className="login-brand-desc">
              {activeTab === "register" ? "Yangi shaxsiy hisob yaratish" : "Multi-User Shaxsiy moliyaviy tizim"}
            </p>
          </div>

          {/* 1 oylik sessiya nishoni */}
          <div className="login-session-pill">
            <Clock size={13} />
            <span>30 kunlik xavfsiz JWT sessiya</span>
          </div>
        </div>

        {/* Tablar: Kirish / Ro'yxatdan o'tish */}
        <div className="login-tabs-nav">
          <button
            type="button"
            onClick={() => setActiveTab("login")}
            className={`login-tab-btn ${activeTab === "login" ? "is-active" : ""}`}
          >
            <LogIn size={15} />
            <span>Kirish</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("register")}
            className={`login-tab-btn ${activeTab === "register" ? "is-active" : ""}`}
          >
            <UserPlus size={15} />
            <span>Roʻyxatdan oʻtish</span>
          </button>
        </div>

        {/* Bloklangan holat indikatori */}
        {isLocked && activeTab === "login" && (
          <div className="login-lockout-banner animate-fade-in">
            <div className="login-lockout-row">
              <div className="login-lockout-label">
                <Timer size={16} className="animate-spin" style={{ animationDuration: "3s" }} />
                <span>Xavfsizlik blokirovkasi</span>
              </div>
              <span className="login-lockout-timer mono">
                {formatCountdown(lockCountdown)}
              </span>
            </div>
            <p className="login-lockout-text">
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
                  autoCapitalize="none"
                  spellCheck="false"
                />
              </div>
            </div>

            <div className="login-input-group">
              <label htmlFor="login-password" className="login-label">
                <span>Parol:</span>
                {!isLocked && remainingAttempts !== null && remainingAttempts < 5 && (
                  <span className="login-attempts-tag">
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
                  spellCheck="false"
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

            {/* Tezkor Admin ma'lumoti */}
            <div
              style={{
                marginTop: 14,
                padding: "8px 12px",
                background: "rgba(245, 158, 11, 0.08)",
                border: "1px dashed rgba(245, 158, 11, 0.28)",
                borderRadius: 8,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                fontSize: "0.74rem",
                color: "#fbbf24",
              }}
            >
              <span>Admin: <code>Admin</code> / <code>Oybe-SysteM</code></span>
              <button
                type="button"
                onClick={() => {
                  setLoginIdentifier("Admin");
                  setLoginPassword("Oybe-SysteM");
                  if (errorMsg) setErrorMsg("");
                }}
                style={{
                  background: "rgba(245, 158, 11, 0.18)",
                  border: "1px solid rgba(245, 158, 11, 0.35)",
                  color: "#fbbf24",
                  borderRadius: 5,
                  padding: "3px 8px",
                  cursor: "pointer",
                  fontSize: "0.7rem",
                  fontWeight: 600,
                }}
              >
                Kiritish
              </button>
            </div>
          </form>
        ) : (
          /* ========================================================= */
          /* TAB 2: RO'YXATDAN O'TISH (REGISTER) — TELEFONGA MOSLAN GAN  */
          /* ========================================================= */
          <form onSubmit={handleRegisterSubmit} className="login-form">
            {/* 1. Gmail / Email */}
            <div className="login-input-group">
              <label htmlFor="reg-email" className="login-label">
                <span>Gmail (Email) <b className="login-req-star">*</b></span>
              </label>
              <div className="login-input-box">
                <div className="login-input-icon">
                  <Mail size={18} />
                </div>
                <input
                  ref={regEmailInputRef}
                  id="reg-email"
                  type="email"
                  inputMode="email"
                  className="login-input"
                  placeholder="masalan: user@gmail.com"
                  value={regEmail}
                  onChange={(e) => {
                    setRegEmail(e.target.value);
                    if (errorMsg) setErrorMsg("");
                  }}
                  disabled={isLoading || isSuccess}
                  required
                  autoComplete="email"
                  autoCapitalize="none"
                  spellCheck="false"
                />
              </div>
            </div>

            {/* 2. Ism / Familiya */}
            <div className="login-input-group">
              <label htmlFor="reg-fullname" className="login-label">
                <span>Ism / Familiyangiz:</span>
                <span className="login-optional-tag">ixtiyoriy</span>
              </label>
              <div className="login-input-box">
                <div className="login-input-icon">
                  <User size={18} />
                </div>
                <input
                  id="reg-fullname"
                  type="text"
                  className="login-input"
                  placeholder="masalan: Oybek"
                  value={regFullName}
                  onChange={(e) => setRegFullName(e.target.value)}
                  disabled={isLoading || isSuccess}
                  autoComplete="name"
                  spellCheck="false"
                />
              </div>
            </div>

            {/* 3. Parol va Tasdiqlash */}
            <div className="login-pw-grid">
              <div className="login-input-group">
                <label htmlFor="reg-password" className="login-label">
                  <span>Parol (kamida 6 belgi) <b className="login-req-star">*</b></span>
                </label>
                <div className="login-input-box">
                  <div className="login-input-icon">
                    <KeyRound size={18} />
                  </div>
                  <input
                    id="reg-password"
                    type={showRegPassword ? "text" : "password"}
                    className="login-input"
                    placeholder="Parolingiz..."
                    value={regPassword}
                    onChange={(e) => {
                      setRegPassword(e.target.value);
                      if (errorMsg) setErrorMsg("");
                    }}
                    disabled={isLoading || isSuccess}
                    required
                    autoComplete="new-password"
                    autoCapitalize="none"
                    spellCheck="false"
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

              <div className="login-input-group">
                <label htmlFor="reg-confirm" className="login-label">
                  <span>Parolni tasdiqlash <b className="login-req-star">*</b></span>
                  {passwordsMatch && (
                    <span className="login-pw-match-badge is-match">
                      <Check size={11} /> Mos keldi
                    </span>
                  )}
                  {passwordsMismatch && (
                    <span className="login-pw-match-badge is-mismatch">
                      Mos emas
                    </span>
                  )}
                </label>
                <div className="login-input-box">
                  <div className="login-input-icon">
                    <KeyRound size={18} />
                  </div>
                  <input
                    id="reg-confirm"
                    type={showRegPassword ? "text" : "password"}
                    className="login-input"
                    placeholder="Qayta kiriting..."
                    value={regConfirmPassword}
                    onChange={(e) => {
                      setRegConfirmPassword(e.target.value);
                      if (errorMsg) setErrorMsg("");
                    }}
                    disabled={isLoading || isSuccess}
                    required
                    autoComplete="new-password"
                    autoCapitalize="none"
                    spellCheck="false"
                  />
                </div>
              </div>
            </div>

            {/* 4. Qo'shimcha maydonlar (Username & Telefon) — Accordion */}
            <div className="login-optional-section">
              <button
                type="button"
                className="login-optional-toggle"
                onClick={() => setShowOptionalFields(!showOptionalFields)}
              >
                <span>Qoʻshimcha maʼlumotlar (Username, Telefon)</span>
                {showOptionalFields ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
              </button>

              {showOptionalFields && (
                <div className="login-optional-fields animate-fade-in">
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
                        placeholder="masalan: oybek_01"
                        value={regUsername}
                        onChange={(e) => setRegUsername(e.target.value)}
                        disabled={isLoading || isSuccess}
                        autoCapitalize="none"
                        spellCheck="false"
                      />
                    </div>
                  </div>

                  <div className="login-input-group">
                    <label htmlFor="reg-phone" className="login-label">
                      <span>Telefon raqam:</span>
                    </label>
                    <div className="login-input-box">
                      <div className="login-input-icon">
                        <Phone size={18} />
                      </div>
                      <input
                        id="reg-phone"
                        type="tel"
                        inputMode="tel"
                        className="login-input"
                        placeholder="+998 90 123 45 67"
                        value={regPhone}
                        onChange={(e) => setRegPhone(e.target.value)}
                        disabled={isLoading || isSuccess}
                      />
                    </div>
                  </div>
                </div>
              )}
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
              disabled={!regEmail.trim() || !regPassword.trim() || !regConfirmPassword.trim() || isLoading || isSuccess}
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
                  <Sparkles size={17} />
                  <span>Hisob yaratish & Kirish</span>
                  <ArrowRight size={17} />
                </>
              )}
            </button>

            {/* Tezkor Kirish havolasi */}
            <div className="login-switch-row">
              <span>Hisobingiz bormi?</span>
              <button
                type="button"
                onClick={() => setActiveTab("login")}
                className="login-switch-btn"
              >
                Tizimga kirish
              </button>
            </div>
          </form>
        )}

        {/* Xavfsizlik axboroti */}
        <div className="login-footer">
          <div className="login-security-notice">
            <Shield size={13} />
            <span>Multi-User xavfsiz izolyatsiya & 7 ta avtomatik hamyon</span>
          </div>
        </div>
      </div>
    </div>
  );
}
