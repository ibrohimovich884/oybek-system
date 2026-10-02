import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  Lock,
  Unlock,
  Delete,
  RotateCcw,
  ArrowLeft,
  KeyRound,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { useSecurity } from "../../context/SecurityContext.jsx";

/**
 * Universal Xavfsizlik & Parol Komponenti (SecurityGate)
 *
 * Ishlatish usullari:
 * 1. Wrapper / Route darajasida:
 *    <SecurityGate scope="control_panel" title="Control Panel"> <ControlPanel /> </SecurityGate>
 * 2. Inline darajada:
 *    <SecurityGate scope="settings_security" inline={true}> <SecuritySettingsTab /> </SecurityGate>
 * 3. Modal / Tasdiqlash darajasida:
 *    <SecurityGate isModal={true} isOpen={isOpen} onSuccess={handleSuccess} onCancel={handleCancel} />
 */
export default function SecurityGate({
  scope,
  children,
  title = "Xavfsizlik Himoyasi",
  subtitle = "Davom etish uchun 4 xonali maxfiy parolni kiriting",
  icon: CustomIcon,
  inline = false,
  isModal = false,
  isOpen = true,
  onSuccess,
  onCancel,
  showBackButton = true,
  backUrl = "/",
}) {
  const navigate = useNavigate();
  const {
    verifyPin,
    isUnlocked,
    unlockScope,
  } = useSecurity();

  const [inputPin, setInputPin] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isShaking, setIsShaking] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const hiddenInputRef = useRef(null);

  // Hozirgi parollar uzunligi (4 ta belgi)
  const PIN_LENGTH = 4;

  const unlocked = scope ? isUnlocked(scope) : false;

  // Parol to'liq kiritilganda tekshirish
  const handleVerify = useCallback(
    (pinToTest) => {
      if (pinToTest.length !== PIN_LENGTH) return;

      const isValid = verifyPin(pinToTest);

      if (isValid) {
        setIsSuccess(true);
        setErrorMsg("");

        // Muvaffaqiyat tebranishi (agar qurilma qo'llab-quvvatlasa)
        if (typeof window !== "undefined" && window.navigator?.vibrate) {
          window.navigator.vibrate([30, 50, 30]);
        }

        setTimeout(() => {
          if (scope) {
            unlockScope(scope);
          }
          if (onSuccess) {
            onSuccess();
          }
          setIsSuccess(false);
          setInputPin("");
        }, 350);
      } else {
        // Noto'g'ri parol
        setIsShaking(true);
        setErrorMsg("Noto'g'ri parol! Qayta urinib ko'ring");

        if (typeof window !== "undefined" && window.navigator?.vibrate) {
          window.navigator.vibrate(150);
        }

        setTimeout(() => {
          setIsShaking(false);
          setInputPin("");
        }, 550);
      }
    },
    [PIN_LENGTH, verifyPin, scope, unlockScope, onSuccess]
  );

  // Raqam bosilganda
  const handleDigitPress = (digit) => {
    if (inputPin.length >= PIN_LENGTH || isSuccess) return;
    const next = inputPin + digit;
    setInputPin(next);
    setErrorMsg("");

    if (next.length === PIN_LENGTH) {
      handleVerify(next);
    }
  };

  // Oxirgi raqamni o'chirish (Backspace)
  const handleDeletePress = () => {
    if (inputPin.length === 0 || isSuccess) return;
    setInputPin((prev) => prev.slice(0, -1));
    setErrorMsg("");
  };

  // Butunlay tozalash (Clear)
  const handleClearPress = () => {
    setInputPin("");
    setErrorMsg("");
  };

  // Jismoniy klaviatura hodisalarini ushlash
  useEffect(() => {
    if (unlocked && !isModal) return;
    if (isModal && !isOpen) return;

    const handleKeyDown = (e) => {
      // 0-9 raqamlari
      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        handleDigitPress(e.key);
      } else if (e.key === "Backspace") {
        e.preventDefault();
        handleDeletePress();
      } else if (e.key === "Escape") {
        if (onCancel) {
          onCancel();
        } else {
          handleClearPress();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [inputPin, unlocked, isModal, isOpen]);

  // Agar allaqachon ochilgan bo'lsa (Wrapper rejimida)
  if (unlocked && !isModal) {
    return <>{children}</>;
  }

  // Agar modal rejimida bo'lsa va ochiq bo'lmasa
  if (isModal && !isOpen) {
    return null;
  }

  // Raqamlar klaviaturasi ma'lumotlari (1-9, C, 0, Backspace)
  const numpadKeys = [
    { digit: "1", sub: "" },
    { digit: "2", sub: "ABC" },
    { digit: "3", sub: "DEF" },
    { digit: "4", sub: "GHI" },
    { digit: "5", sub: "JKL" },
    { digit: "6", sub: "MNO" },
    { digit: "7", sub: "PQRS" },
    { digit: "8", sub: "TUV" },
    { digit: "9", sub: "WXYZ" },
    { type: "clear", label: "C", icon: RotateCcw },
    { digit: "0", sub: "+" },
    { type: "delete", label: "⌫", icon: Delete },
  ];

  const cardContent = (
    <div
      className={`security-card-glass ${isShaking ? "is-shaking" : ""} ${
        isSuccess ? "is-success" : ""
      } ${inline ? "security-inline-gate" : ""}`}
    >
      {/* Yuqori yoritilgan qalqon / qulf belgisi */}
      <div className="security-icon-badge">
        {isSuccess ? (
          <Unlock size={26} color="#34d399" />
        ) : CustomIcon ? (
          CustomIcon
        ) : (
          <Shield size={26} />
        )}
      </div>

      {/* Sarlavha & Tavsif */}
      <h2 className="security-title">
        <span>{title}</span>
        {isSuccess && <CheckCircle2 size={18} color="#34d399" />}
      </h2>
      <p className="security-subtitle">{subtitle}</p>

      {/* 4 Xonali PIN nuqtalar / indikator qutilari */}
      <div className="pin-indicators-container">
        {Array.from({ length: PIN_LENGTH }).map((_, idx) => {
          const isFilled = idx < inputPin.length;
          const isActive = idx === inputPin.length;
          const isErr = Boolean(errorMsg && isShaking);

          return (
            <div
              key={idx}
              className={`pin-dot-box ${isFilled ? "is-filled" : ""} ${
                isActive ? "is-active" : ""
              } ${isErr ? "is-error" : ""}`}
            >
              <div className="pin-dot-circle" />
            </div>
          );
        })}
      </div>

      {/* Xabar / ogohlantirish qatori */}
      <div
        className={`pin-feedback-msg ${
          errorMsg
            ? "is-error"
            : isSuccess
            ? "is-success"
            : ""
        }`}
      >
        {errorMsg ? (
          <>
            <AlertTriangle size={14} />
            <span>{errorMsg}</span>
          </>
        ) : isSuccess ? (
          <>
            <CheckCircle2 size={14} />
            <span>Qulf ochildi! Yo'naltirilmoqda...</span>
          </>
        ) : (
          <span>Klaviatura yoki sensorli tugmalardan foydalaning</span>
        )}
      </div>

      {/* Sensorli raqamlar klaviaturasi */}
      <div className="security-numpad">
        {numpadKeys.map((item, i) => {
          if (item.type === "clear") {
            const Icon = item.icon;
            return (
              <button
                key={i}
                type="button"
                className="numpad-btn numpad-btn--utility"
                onClick={handleClearPress}
                title="Tozalash"
                aria-label="Tozalash"
              >
                <Icon size={18} />
              </button>
            );
          }

          if (item.type === "delete") {
            const Icon = item.icon;
            return (
              <button
                key={i}
                type="button"
                className="numpad-btn numpad-btn--utility"
                onClick={handleDeletePress}
                title="O'chirish"
                aria-label="Oxirgi raqamni o'chirish"
              >
                <Icon size={19} />
              </button>
            );
          }

          return (
            <button
              key={i}
              type="button"
              className="numpad-btn"
              onClick={() => handleDigitPress(item.digit)}
            >
              <span className="numpad-digit">{item.digit}</span>
              {item.sub && <span className="numpad-sub">{item.sub}</span>}
            </button>
          );
        })}
      </div>

      {/* Pastki navigatsiya amallari */}
      <div className="security-actions-row">
        {onCancel ? (
          <button
            type="button"
            className="security-back-link"
            onClick={onCancel}
          >
            <ArrowLeft size={14} />
            <span>Bekor qilish</span>
          </button>
        ) : showBackButton ? (
          <button
            type="button"
            className="security-back-link"
            onClick={() => navigate(backUrl)}
          >
            <ArrowLeft size={14} />
            <span>Bosh sahifaga qaytish</span>
          </button>
        ) : (
          <div />
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: "0.72rem", color: "rgba(52, 211, 153, 0.7)" }}>
          <ShieldCheck size={13} />
          <span>4 xonali PIN</span>
        </div>
      </div>
    </div>
  );

  // Agar Modal rejimida bo'lsa
  if (isModal) {
    return (
      <div
        className="security-modal-backdrop"
        onClick={() => onCancel && onCancel()}
      >
        <div onClick={(e) => e.stopPropagation()}>{cardContent}</div>
      </div>
    );
  }

  // Agar Inline rejimida bo'lsa (masalan, Sozlamalar tabida)
  if (inline) {
    return <div style={{ width: "100%", maxWidth: 420, margin: "20px auto" }}>{cardContent}</div>;
  }

  // Standart Fullscreen overlay rejimida
  return (
    <div className="security-gate-wrapper animate-fade-in">
      <div className="security-fullscreen-overlay">{cardContent}</div>
    </div>
  );
}
