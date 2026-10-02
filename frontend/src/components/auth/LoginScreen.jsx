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
} from "lucide-react";
import { useAuth } from "../../context/AuthContext.jsx";

export default function LoginScreen() {
  const { login } = useAuth();
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    // Sahifa yuklanganda inputga fokus qilish
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!password.trim() || isLoading || isSuccess) return;

    setErrorMsg("");
    setIsLoading(true);

    try {
      const res = await login(password.trim());
      if (res.success) {
        setIsSuccess(true);
        if (typeof window !== "undefined" && window.navigator?.vibrate) {
          window.navigator.vibrate([30, 40, 30]);
        }
      } else {
        setIsShaking(true);
        setErrorMsg(res.message || "Noto'g'ri parol! Qayta urinib ko'ring.");
        if (typeof window !== "undefined" && window.navigator?.vibrate) {
          window.navigator.vibrate(150);
        }
        setTimeout(() => {
          setIsShaking(false);
          if (inputRef.current) {
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

  return (
    <div className="login-screen-wrapper">
      {/* Background ambient lighting */}
      <div className="login-bg-glow" />
      <div className="login-bg-pattern" />

      <div className={`login-card ${isShaking ? "is-shaking" : ""} ${isSuccess ? "is-success" : ""}`}>
        {/* Yuqori brend belgisi */}
        <div className="login-header">
          <div className="login-badge-aura">
            {isSuccess ? (
              <Unlock size={28} className="text-income animate-bounce" />
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

        {/* Kirish formasi */}
        <form onSubmit={handleSubmit} className="login-form">
          <div className="login-input-group">
            <label htmlFor="sys-password" className="login-label">
              <span>Tizim paroli:</span>
            </label>

            <div className="login-input-box">
              <div className="login-input-icon">
                <KeyRound size={18} />
              </div>

              <input
                ref={inputRef}
                id="sys-password"
                type={showPassword ? "text" : "password"}
                className="login-input"
                placeholder="Parolni kiriting..."
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errorMsg) setErrorMsg("");
                }}
                disabled={isLoading || isSuccess}
                autoComplete="current-password"
                required
              />

              <button
                type="button"
                className="login-toggle-pw"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                title={showPassword ? "Parolni yashirish" : "Parolni ko'rsatish"}
                aria-label={showPassword ? "Parolni yashirish" : "Parolni ko'rsatish"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Xatolik / Muvaffaqiyat xabari */}
          {errorMsg && (
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
            disabled={!password.trim() || isLoading || isSuccess}
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
            <span>JWT Bearer bilan toʻliq shifrlangan xavfsiz tizim</span>
          </div>
        </div>
      </div>
    </div>
  );
}
