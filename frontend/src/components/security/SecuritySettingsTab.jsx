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
  Clock,
  LogOut,
  SlidersHorizontal,
  Trash2,
  ToggleLeft,
  ToggleRight,
  User,
} from "lucide-react";
import { useSecurity } from "../../context/SecurityContext.jsx";
import { useAuth } from "../../context/AuthContext.jsx";

export default function SecuritySettingsTab() {
  const {
    pin,
    defaultPin,
    hasCustomPin,
    isControlPanelLockEnabled,
    setControlPanelLockEnabled,
    isTransactionsLockEnabled,
    setTransactionsLockEnabled,
    setPinDirectly,
    changePin,
    resetPinToDefault,
    lockAll,
  } = useSecurity();

  const { user, logout, daysRemaining } = useAuth();

  // Parol o'zgartirish / o'rnatish formasi
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

  const handleSavePin = (e) => {
    e.preventDefault();
    setFeedback(null);

    if (hasCustomPin && currentPinInput.length !== 4) {
      setFeedback({
        type: "error",
        message: "Joriy parolni to'liq 4 ta raqam shaklida kiriting!",
      });
      return;
    }

    if (newPinInput.length !== 4) {
      setFeedback({
        type: "error",
        message: "Yangi parol roppa-rosa 4 ta raqamdan iborat bo'lishi kerak!",
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
    let result;
    if (hasCustomPin) {
      result = changePin(currentPinInput, newPinInput);
    } else {
      result = setPinDirectly(newPinInput);
    }
    setIsSubmitting(false);

    if (result.success) {
      setFeedback({
        type: "success",
        message: "Tabriklaymiz! Shaxsiy 4 xonali PIN parolingiz muvaffaqiyatli saqlandi.",
      });
      setCurrentPinInput("");
      setNewPinInput("");
      setConfirmPinInput("");
    } else {
      setFeedback({
        type: "error",
        message: result.message || "Parolni saqlashda xatolik yuz berdi.",
      });
    }
  };

  const handleResetDefault = () => {
    if (
      window.confirm(
        "Parolni standart holatga (2580) qaytarishni tasdiqlaysizmi?"
      )
    ) {
      const res = resetPinToDefault();
      if (res.success) {
        setFeedback({
          type: "success",
          message: "Parol standart holatga (2580) tiklandi.",
        });
        setCurrentPinInput("");
        setNewPinInput("");
        setConfirmPinInput("");
      }
    }
  };

  const handleToggleControlPanelLock = () => {
    const nextVal = !isControlPanelLockEnabled;
    setControlPanelLockEnabled(nextVal);
    setFeedback({
      type: "success",
      message: nextVal
        ? hasCustomPin
          ? "Control panelni qulflash faollashtirildi! Kirishda shaxsiy 4 xonali PIN soʻraladi."
          : "Control panelni qulflash faollashtirildi! Standart PIN: 2580. Quyida oʻzingiz uchun shaxsiy PIN oʻrnatib olishingiz mumkin."
        : "Control panelni qulflash oʻchirildi. Endi erkin kirish mumkin (PIN talab etilmaydi).",
    });
  };

  const handleToggleTransactionsLock = () => {
    const nextVal = !isTransactionsLockEnabled;
    setTransactionsLockEnabled(nextVal);
    setFeedback({
      type: "success",
      message: nextVal
        ? hasCustomPin
          ? "Tranzaksiyalar va qarzlarni oʻchirish himoyasi yoqildi! Oʻchirishda shaxsiy PIN soʻraladi."
          : "Oʻchirish himoyasi yoqildi! Standart PIN: 2580. Quyida oʻzingiz uchun shaxsiy PIN oʻrnatib olishingiz mumkin."
        : "Oʻchirish himoyasi oʻchirildi. Tranzaksiya va qarzlar oddiy tasdiqlash bilan oʻchiriladi (PIN talab etilmaydi).",
    });
  };

  const handleLockAllSessions = () => {
    lockAll();
    setFeedback({
      type: "success",
      message: "Barcha xavfsiz bo'limlar sessiyasi qulflandi!",
    });
  };

  const userName = user?.fullName || user?.name || "Foydalanuvchi";
  const userEmail = user?.email || (user?.username ? `@${user.username}` : "");

  return (
    <div className="tab-pane animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Sarlavha & Multi-User profil ma'lumoti */}
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
              Multi-user shaxsiy xavfsizlik sozlamalari va PIN kod boshqaruvi
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "5px 10px",
                borderRadius: 8,
                background: "rgba(52, 211, 153, 0.1)",
                border: "1px solid rgba(52, 211, 153, 0.25)",
                fontSize: "0.75rem",
                color: "#34d399",
              }}
            >
              <User size={13} />
              <span>{userName}</span>
            </div>

            <button
              type="button"
              className="cp-lock-btn"
              onClick={handleLockAllSessions}
              title="Barcha himoyalangan sessiyalarni qayta qulflash"
            >
              <Lock size={13} />
              <span>Sessiyani qulflash</span>
            </button>

            <button
              type="button"
              className="cp-lock-btn"
              onClick={() => logout()}
              style={{
                color: "var(--danger, #f87171)",
                borderColor: "rgba(239, 68, 68, 0.35)",
                background: "rgba(239, 68, 68, 0.08)",
              }}
              title="Hisobdan chiqish (Log out)"
            >
              <LogOut size={13} />
              <span>Hisobdan chiqish</span>
            </button>
          </div>
        </div>

        {/* Xabardor qilish */}
        <div
          style={{
            marginTop: 14,
            padding: "8px 12px",
            borderRadius: 8,
            background: "rgba(255, 255, 255, 0.03)",
            border: "1px dashed rgba(52, 211, 153, 0.25)",
            fontSize: "0.76rem",
            color: "rgba(245, 243, 236, 0.75)",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Info size={15} color="#34d399" style={{ flexShrink: 0 }} />
          <span>
            Barcha parollar va sozlamalar qurilmangizning <strong>localStorage</strong> xotirasida har bir akkaunt uchun alohida saqlanadi.
          </span>
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

      {/* 2 TA ASOSIY HIMOYANI O'CHIRIB-YOQISH (DEFAULT: O'CHIQ) */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(290px, 1fr))", gap: 14 }}>
        {/* 1. Control Panel Qulfi */}
        <div
          className="security-settings-card"
          style={{
            borderColor: isControlPanelLockEnabled ? "rgba(52, 211, 153, 0.45)" : "rgba(255, 255, 255, 0.08)",
            boxShadow: isControlPanelLockEnabled ? "0 0 25px rgba(16, 185, 129, 0.12)" : undefined,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  background: isControlPanelLockEnabled ? "rgba(16, 185, 129, 0.2)" : "rgba(255, 255, 255, 0.05)",
                  border: `1px solid ${isControlPanelLockEnabled ? "rgba(52, 211, 153, 0.4)" : "rgba(255, 255, 255, 0.1)"}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: isControlPanelLockEnabled ? "#34d399" : "var(--text-muted)",
                }}
              >
                <SlidersHorizontal size={18} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: "0.98rem", fontWeight: 700, color: "#f5f3ec" }}>
                  Control Panel Qulfi
                </h3>
                <span
                  style={{
                    fontSize: "0.72rem",
                    fontWeight: 600,
                    color: isControlPanelLockEnabled ? "#34d399" : "var(--text-muted)",
                  }}
                >
                  {isControlPanelLockEnabled ? "Faol (PIN soʻraladi)" : "Oʻchirilgan (Erkin kirish)"}
                </span>
              </div>
            </div>

            {/* Toggle switch tugmasi */}
            <button
              type="button"
              onClick={handleToggleControlPanelLock}
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                padding: 4,
                color: isControlPanelLockEnabled ? "#34d399" : "rgba(255, 255, 255, 0.3)",
                transition: "all 0.2s ease",
              }}
              title={isControlPanelLockEnabled ? "Qulfni o'chirish" : "Qulfni yoqish"}
              aria-label="Control panel qulfi"
            >
              {isControlPanelLockEnabled ? (
                <ToggleRight size={38} className="text-accent" />
              ) : (
                <ToggleLeft size={38} />
              )}
            </button>
          </div>

          <p style={{ margin: "10px 0 0 0", fontSize: "0.78rem", color: "var(--text-muted)", lineHeight: 1.45 }}>
            Boshqaruv paneliga kirishda 4 xonali PIN talab qilish. Standart holatda oʻchiq boʻlib, erkin kiriladi.
          </p>
        </div>

        {/* 2. Tranzaksiyalar va Qarzlarni O'chirish Qulfi */}
        <div
          className="security-settings-card"
          style={{
            borderColor: isTransactionsLockEnabled ? "rgba(52, 211, 153, 0.45)" : "rgba(255, 255, 255, 0.08)",
            boxShadow: isTransactionsLockEnabled ? "0 0 25px rgba(16, 185, 129, 0.12)" : undefined,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  background: isTransactionsLockEnabled ? "rgba(16, 185, 129, 0.2)" : "rgba(255, 255, 255, 0.05)",
                  border: `1px solid ${isTransactionsLockEnabled ? "rgba(52, 211, 153, 0.4)" : "rgba(255, 255, 255, 0.1)"}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: isTransactionsLockEnabled ? "#34d399" : "var(--text-muted)",
                }}
              >
                <Trash2 size={18} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: "0.98rem", fontWeight: 700, color: "#f5f3ec" }}>
                  Oʻchirish Qulfi (Hodisalar)
                </h3>
                <span
                  style={{
                    fontSize: "0.72rem",
                    fontWeight: 600,
                    color: isTransactionsLockEnabled ? "#34d399" : "var(--text-muted)",
                  }}
                >
                  {isTransactionsLockEnabled ? "Faol (PIN soʻraladi)" : "Oʻchirilgan (Oddiy oʻchirish)"}
                </span>
              </div>
            </div>

            {/* Toggle switch tugmasi */}
            <button
              type="button"
              onClick={handleToggleTransactionsLock}
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                padding: 4,
                color: isTransactionsLockEnabled ? "#34d399" : "rgba(255, 255, 255, 0.3)",
                transition: "all 0.2s ease",
              }}
              title={isTransactionsLockEnabled ? "O'chirish himoyasini o'chirish" : "O'chirish himoyasini yoqish"}
              aria-label="O'chirish himoyasi"
            >
              {isTransactionsLockEnabled ? (
                <ToggleRight size={38} className="text-accent" />
              ) : (
                <ToggleLeft size={38} />
              )}
            </button>
          </div>

          <p style={{ margin: "10px 0 0 0", fontSize: "0.78rem", color: "var(--text-muted)", lineHeight: 1.45 }}>
            Kundalik xarajatlar, oʻtkazmalar, zaxira amallari yoki qarzlarni oʻchirishda 4 xonali PIN talab qilish.
          </p>
        </div>
      </div>

      {/* SHAXSIY PIN PAROL BELGILASH / TAHRIRLASH */}
      <div className="security-settings-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <KeyRound size={18} color="#34d399" />
              <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700, color: "#f5f3ec" }}>
                {hasCustomPin ? "Shaxsiy PIN Parolni Oʻzgartirish" : "Shaxsiy 4 Xonali PIN Belgilash"}
              </h3>
            </div>
            <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--text-muted)", lineHeight: 1.45 }}>
              {hasCustomPin
                ? "Siz oʻzingizning shaxsiy 4 xonali parolingizdan foydalanmoqdasiz."
                : "Hozircha standart PIN (2580) faol. Oʻzingiz uchun shaxsiy 4 xonali kod oʻrnatib oling."}
            </p>
          </div>

          <div
            style={{
              padding: "4px 10px",
              borderRadius: 8,
              background: hasCustomPin ? "rgba(16, 185, 129, 0.15)" : "rgba(245, 158, 11, 0.15)",
              border: `1px solid ${hasCustomPin ? "rgba(52, 211, 153, 0.3)" : "rgba(245, 158, 11, 0.3)"}`,
              fontSize: "0.72rem",
              fontWeight: 600,
              color: hasCustomPin ? "#34d399" : "var(--warning)",
            }}
          >
            {hasCustomPin ? "Shaxsiy PIN faol" : "Standart PIN (2580)"}
          </div>
        </div>

        <form onSubmit={handleSavePin} style={{ maxWidth: 380, marginTop: 14 }}>
          {/* 1. Joriy parol (faqat agar custom PIN bo'lsa talab etiladi) */}
          {hasCustomPin && (
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
          )}

          {/* 2. Yangi 4 xonali PIN */}
          <div className="security-form-row">
            <label>
              <span>{hasCustomPin ? "Yangi 4 xonali PIN:" : "Shaxsiy 4 xonali PIN:"}</span>
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

          {/* 3. Takrorlash */}
          <div className="security-form-row">
            <label>
              <span>PIN kodni qayta kiriting:</span>
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
              disabled={isSubmitting || newPinInput.length !== 4 || confirmPinInput.length !== 4 || (hasCustomPin && currentPinInput.length !== 4)}
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
              <span>{hasCustomPin ? "Yangi parolni saqlash" : "PIN kodni saqlash"}</span>
            </button>

            {hasCustomPin && (
              <button
                type="button"
                className="btn btn--subtle btn--sm"
                onClick={handleResetDefault}
                title="Standart parolni (2580) qaytarish"
                style={{ display: "inline-flex", alignItems: "center", gap: 5 }}
              >
                <RotateCcw size={14} />
                <span>Standartga qaytarish</span>
              </button>
            )}
          </div>
        </form>
      </div>

      {/* 1 OYLIK JWT SESSIYA VA PROFIL */}
      <div className="security-settings-card" style={{ border: "1px solid rgba(52, 211, 153, 0.35)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <Clock size={18} color="#34d399" />
              <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700, color: "#f5f3ec" }}>
                1 Oylik Xavfsiz JWT Sessiya
              </h3>
            </div>
            <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--text-muted)", lineHeight: 1.4 }}>
              Hisob: <strong>{userName}</strong> {userEmail ? `(${userEmail})` : ""}. JWT Bearer token bilan shifrlangan.
            </p>
          </div>

          <button
            type="button"
            className="btn btn--subtle btn--sm"
            onClick={() => {
              if (window.confirm("Hisobdan chiqishni tasdiqlaysizmi?")) {
                logout();
              }
            }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              background: "rgba(239, 68, 68, 0.15)",
              borderColor: "rgba(239, 68, 68, 0.35)",
              color: "#fca5a5",
            }}
            title="Hisobdan chiqish"
          >
            <LogOut size={14} />
            <span>Hisobdan chiqish</span>
          </button>
        </div>

        <div className="settings-kpi-grid-4" style={{ marginTop: 14 }}>
          <div className="settings-kpi-box">
            <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", display: "block" }}>
              JWT Token:
            </span>
            <strong style={{ fontSize: "0.92rem", color: "#34d399", display: "block", marginTop: 3 }}>
              Faol (Bearer)
            </strong>
            <span style={{ fontSize: "0.68rem", color: "var(--text-dim)" }}>
              Multi-user scoped
            </span>
          </div>

          <div className="settings-kpi-box">
            <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", display: "block" }}>
              Sessiya muddati:
            </span>
            <strong className="mono" style={{ fontSize: "0.92rem", color: "var(--text)", display: "block", marginTop: 3 }}>
              30 kun (1 oy)
            </strong>
            <span style={{ fontSize: "0.68rem", color: "var(--text-dim)" }}>
              Avtomatik yangilanadi
            </span>
          </div>

          <div className="settings-kpi-box">
            <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", display: "block" }}>
              Qolgan vaqt:
            </span>
            <strong className="mono" style={{ fontSize: "0.92rem", color: "#34d399", display: "block", marginTop: 3 }}>
              ~{daysRemaining} kun
            </strong>
            <span style={{ fontSize: "0.68rem", color: "var(--text-dim)" }}>
              Avto-logout gacha
            </span>
          </div>

          <div className="settings-kpi-box">
            <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", display: "block" }}>
              Control Panel:
            </span>
            <strong style={{ fontSize: "0.92rem", color: isControlPanelLockEnabled ? "#34d399" : "var(--text-muted)", display: "block", marginTop: 3 }}>
              {isControlPanelLockEnabled ? "Qulflangan" : "Ochiq (Erkin)"}
            </strong>
            <span style={{ fontSize: "0.68rem", color: "var(--text-dim)" }}>
              {isControlPanelLockEnabled ? "PIN talab qilinadi" : "PIN soʻralmaydi"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

