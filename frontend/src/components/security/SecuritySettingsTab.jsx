import { useState } from "react";
import {
  Shield,
  ShieldCheck,
  KeyRound,
  Lock,
  Unlock,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Info,
  Check,
} from "lucide-react";
import { useSecurity } from "../../context/SecurityContext.jsx";
import SecurityGate from "./SecurityGate.jsx";

export default function SecuritySettingsTab() {
  const {
    pin,
    hasCustomPin,
    changePin,
    resetPinToDefault,
    lockAll,
    lockScope,
    isUnlocked,
  } = useSecurity();

  // Parol o'zgartirish formasi
  const [currentPinInput, setCurrentPinInput] = useState("");
  const [newPinInput, setNewPinInput] = useState("");
  const [confirmPinInput, setConfirmPinInput] = useState("");
  const [feedback, setFeedback] = useState(null); // { type: 'success' | 'error', message: '' }
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Faqat raqamlarni qoldirish (maksimal 4 ta raqam)
  const handlePinInput = (setter) => (e) => {
    const val = e.target.value.replace(/\D/g, "").slice(0, 4);
    setter(val);
    if (feedback) setFeedback(null);
  };

  const handleSaveNewPin = (e) => {
    e.preventDefault();
    setFeedback(null);

    if (currentPinInput.length !== 4) {
      setFeedback({
        type: "error",
        message: "Joriy parolni to'liq 4 ta raqam shaklida kiriting!",
      });
      return;
    }

    if (newPinInput.length !== 4) {
      setFeedback({
        type: "error",
        message: "Yangi parol 4 ta raqamdan iborat bo'lishi kerak!",
      });
      return;
    }

    if (newPinInput !== confirmPinInput) {
      setFeedback({
        type: "error",
        message: "Yangi parol va tasdiqlovchi parol bir-biriga mos kelmadi!",
      });
      return;
    }

    setIsSubmitting(true);
    const result = changePin(currentPinInput, newPinInput);
    setIsSubmitting(false);

    if (result.success) {
      setFeedback({
        type: "success",
        message: "Tabriklaymiz! Yangi 4 xonali parolingiz muvaffaqiyatli saqlandi.",
      });
      setCurrentPinInput("");
      setNewPinInput("");
      setConfirmPinInput("");
    } else {
      setFeedback({
        type: "error",
        message: result.message || "Parolni o'zgartirishda xatolik yuz berdi.",
      });
    }
  };

  const handleResetDefault = () => {
    if (
      window.confirm(
        "Parolni standart holatiga qaytarishni tasdiqlaysizmi?"
      )
    ) {
      const res = resetPinToDefault();
      if (res.success) {
        setFeedback({
          type: "success",
          message: "Parol standart holatga tiklandi.",
        });
        setCurrentPinInput("");
        setNewPinInput("");
        setConfirmPinInput("");
      }
    }
  };

  const handleLockAllSessions = () => {
    lockAll();
    setFeedback({
      type: "success",
      message: "Barcha xavfsiz bo'limlar (Control Panel va Sozlamalar) qulflandi!",
    });
  };

  return (
    // Ushbu bo'limga kirishdan oldin ham universal SecurityGate parol so'raydi!
    <SecurityGate
      scope="settings_security"
      inline={true}
      title="Xavfsizlik Sozlamalari"
      subtitle="Parolni tahrirlash va xavfsizlikni boshqarish uchun joriy parolingizni kiriting"
      icon={<Lock size={26} color="#34d399" />}
      showBackButton={false}
    >
      <div className="tab-pane animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {/* Sarlavha kartasi */}
        <div className="security-settings-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <ShieldCheck size={20} color="#34d399" />
                <h2 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "#f5f3ec" }}>
                  Xavfsizlik va Parol Boshqaruvi
                </h2>
              </div>
              <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--text-muted)" }}>
                Control panel va shaxsiy boʻlimlar uchun maxfiy 4 xonali PIN kodni tahrirlash
              </p>
            </div>

            <button
              type="button"
              className="cp-lock-btn"
              onClick={handleLockAllSessions}
              title="Barcha himoyalangan sessiyalarni qayta qulflash"
            >
              <Lock size={13} />
              <span>Barchasini qulflash</span>
            </button>
          </div>

          {/* KPI ko'rsatkichlari */}
          <div className="settings-kpi-grid-4" style={{ marginTop: 16 }}>
            <div className="settings-kpi-box">
              <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", display: "block" }}>
                Himoya Holati:
              </span>
              <strong style={{ fontSize: "0.95rem", color: "#34d399", display: "block", marginTop: 3 }}>
                Faol (PIN)
              </strong>
              <span style={{ fontSize: "0.68rem", color: "var(--text-dim)" }}>
                {hasCustomPin ? "Shaxsiy parol" : "Standart parol"}
              </span>
            </div>

            <div className="settings-kpi-box">
              <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", display: "block" }}>
                Parol formati:
              </span>
              <strong className="mono" style={{ fontSize: "0.95rem", color: "var(--text)", display: "block", marginTop: 3 }}>
                4 ta raqam
              </strong>
              <span style={{ fontSize: "0.68rem", color: "var(--text-dim)" }}>
                Raqamli kod
              </span>
            </div>

            <div className="settings-kpi-box">
              <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", display: "block" }}>
                Control Panel:
              </span>
              <strong style={{ fontSize: "0.95rem", color: isUnlocked("control_panel") ? "#34d399" : "var(--warning)", display: "block", marginTop: 3 }}>
                {isUnlocked("control_panel") ? "Ochiq (Sessiya)" : "Qulflangan"}
              </strong>
              <span style={{ fontSize: "0.68rem", color: "var(--text-dim)" }}>
                {isUnlocked("control_panel") ? "Kirish ruxsat etilgan" : "Parol soʻraladi"}
              </span>
            </div>

            <div className="settings-kpi-box">
              <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", display: "block" }}>
                Dizayn Turi:
              </span>
              <strong style={{ fontSize: "0.95rem", color: "#34d399", display: "block", marginTop: 3 }}>
                Shaffof Blur
              </strong>
              <span style={{ fontSize: "0.68rem", color: "var(--text-dim)" }}>
                Yashil zumrad aura
              </span>
            </div>
          </div>
        </div>

        {/* Feedback xabari */}
        {feedback && (
          <div
            className={`settings-alert ${
              feedback.type === "success" ? "settings-alert--success" : "settings-alert--error"
            }`}
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              background:
                feedback.type === "success"
                  ? "rgba(16, 185, 129, 0.16)"
                  : "rgba(239, 68, 68, 0.16)",
              border: `1px solid ${feedback.type === "success" ? "#10b981" : "#ef4444"}`,
              color: "#f5f3ec",
              fontSize: "0.82rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {feedback.type === "success" ? (
                <CheckCircle2 size={16} color="#34d399" />
              ) : (
                <AlertTriangle size={16} color="#ef4444" />
              )}
              <span>{feedback.message}</span>
            </div>
            <button
              type="button"
              className="btn btn--ghost btn--xs"
              onClick={() => setFeedback(null)}
            >
              Yopish
            </button>
          </div>
        )}

        {/* Asosiy forma: Parolni tahrirlash (Edit PIN) */}
        <div className="security-settings-card">
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <KeyRound size={18} color="#34d399" />
            <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700, color: "#f5f3ec" }}>
              Parolni Tahrirlash (Oʻzgartirish)
            </h3>
          </div>
          <p style={{ margin: "0 0 16px 0", fontSize: "0.8rem", color: "var(--text-muted)", lineHeight: 1.45 }}>
            Xavfsizlikni taʼminlash uchun hozirgi parolingizni kiriting va yangi 4 xonali PIN kodni belgilang.
          </p>

          <form onSubmit={handleSaveNewPin} style={{ maxWidth: 380 }}>
            {/* 1. Joriy parol */}
            <div className="security-form-row">
              <label>
                <span>Joriy parol:</span>
              </label>
              <input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                className="security-pin-input"
                placeholder="••••"
                value={currentPinInput}
                onChange={handlePinInput(setCurrentPinInput)}
                autoComplete="off"
                required
              />
            </div>

            {/* 2. Yangi 4 xonali parol */}
            <div className="security-form-row">
              <label>
                <span>Yangi 4 xonali parol:</span>
                <span style={{ fontSize: "0.72rem", color: "var(--text-dim)" }}>
                  {newPinInput.length}/4 ta raqam
                </span>
              </label>
              <input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                className="security-pin-input"
                placeholder="••••"
                value={newPinInput}
                onChange={handlePinInput(setNewPinInput)}
                autoComplete="new-password"
                required
              />
            </div>

            {/* 3. Yangi parolni takrorlash */}
            <div className="security-form-row">
              <label>
                <span>Yangi parolni qayta kiriting:</span>
                {confirmPinInput && (
                  <span
                    style={{
                      fontSize: "0.72rem",
                      fontWeight: 600,
                      color: confirmPinInput === newPinInput ? "#34d399" : "#ef4444",
                    }}
                  >
                    {confirmPinInput === newPinInput ? "Mos keldi ✓" : "Mos emas ✗"}
                  </span>
                )}
              </label>
              <input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                className="security-pin-input"
                placeholder="••••"
                value={confirmPinInput}
                onChange={handlePinInput(setConfirmPinInput)}
                autoComplete="new-password"
                required
              />
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
              <button
                type="submit"
                className="btn btn--primary btn--sm"
                disabled={isSubmitting || newPinInput.length !== 4 || confirmPinInput.length !== 4}
                style={{
                  flex: 1,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  minHeight: 42,
                }}
              >
                <Check size={16} />
                <span>Yangi parolni saqlash</span>
              </button>

              {hasCustomPin && (
                <button
                  type="button"
                  className="btn btn--subtle btn--sm"
                  onClick={handleResetDefault}
                  title="Standart parolni qaytarish"
                  style={{ display: "inline-flex", alignItems: "center", gap: 5 }}
                >
                  <RotateCcw size={14} />
                  <span>Tiklash</span>
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Kelajakdagi kengaytirish va maslahat kartasi */}
        <div
          className="security-settings-card"
          style={{
            background: "rgba(16, 185, 129, 0.08)",
            border: "1px dashed rgba(52, 211, 153, 0.35)",
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 8,
                background: "rgba(16, 185, 129, 0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#34d399",
                flexShrink: 0,
              }}
            >
              <Sparkles size={18} />
            </div>
            <div>
              <strong style={{ fontSize: "0.95rem", color: "#f5f3ec", display: "block" }}>
                Kelajakdagi Kuchaytirilgan Xavfsizlik
              </strong>
              <p style={{ margin: "4px 0 0 0", fontSize: "0.78rem", color: "var(--text-muted)", lineHeight: 1.45 }}>
                Tizim arxitekturasi tayyorlandi. Keyingi bosqichda: 6+ xonali harfli-raqamli parollar,
                sessiya vaqti boʻyicha avto-qulflash hamda brauzer biometrikasi (Touch ID / Face ID) integratsiya qilinadi.
              </p>
            </div>
          </div>
        </div>
      </div>
    </SecurityGate>
  );
}
