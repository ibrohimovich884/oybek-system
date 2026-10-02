import { useState } from "react";
import {
  X,
  Sliders,
  Volume2,
  VolumeX,
  Bell,
  HandCoins,
  Wallet,
  Database,
  DollarSign,
  RotateCcw,
  Check,
  ShieldAlert,
} from "lucide-react";
import { formatSum } from "../../utils/format.js";

export default function NotificationSettingsModal({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  browserPermission,
  onRequestPermission,
  onResetDismissed,
  onTestSound,
}) {
  const [resetSuccess, setResetSuccess] = useState(false);

  if (!isOpen) return null;

  const handleReset = () => {
    onResetDismissed();
    setResetSuccess(true);
    setTimeout(() => setResetSuccess(false), 3000);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card modal-card--md notif-settings-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header">
          <div className="modal-header__left">
            <div className="modal-icon-badge modal-icon-badge--accent">
              <Sliders size={18} />
            </div>
            <div>
              <h2 className="modal-title">Bildirishnoma sozlamalari</h2>
              <p className="modal-subtitle">
                Ogohlantirish turlari va signal parametrlarini moslashtiring
              </p>
            </div>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Yopish"
          >
            <X size={18} />
          </button>
        </div>

        <div className="notif-settings-body">
          {/* 1. Ovoz va Brauzer signallari */}
          <div className="notif-settings-section">
            <h3 className="notif-settings-title">Ovoz & Brauzer signallari</h3>

            {/* Ovoz */}
            <div className="notif-setting-row">
              <div className="notif-setting-info">
                <div className="notif-setting-name">
                  {settings.soundEnabled ? (
                    <Volume2 size={16} className="text-accent" />
                  ) : (
                    <VolumeX size={16} className="text-muted" />
                  )}
                  <span>Ovozli signal</span>
                </div>
                <p className="notif-setting-desc">
                  Yangi bildirishnoma qo'shilganda qisqa ohang chalinadi
                </p>
              </div>
              <div className="flex items-center gap-2">
                {settings.soundEnabled && (
                  <button
                    type="button"
                    className="btn btn--subtle btn--xs"
                    onClick={onTestSound}
                  >
                    Sinab ko'rish
                  </button>
                )}
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={settings.soundEnabled}
                    onChange={(e) =>
                      onUpdateSettings({ soundEnabled: e.target.checked })
                    }
                  />
                  <span className="toggle-slider" />
                </label>
              </div>
            </div>

            {/* Brauzer Push */}
            <div className="notif-setting-row">
              <div className="notif-setting-info">
                <div className="notif-setting-name">
                  <Bell size={16} className="text-accent" />
                  <span>Brauzer bildirishnomalari (Push)</span>
                </div>
                <p className="notif-setting-desc">
                  Ilova fonga o'tganda ham brauzer xabarnomalari chiqarish
                </p>
              </div>
              <div>
                {browserPermission === "granted" ? (
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={settings.browserPushEnabled}
                      onChange={(e) =>
                        onUpdateSettings({
                          browserPushEnabled: e.target.checked,
                        })
                      }
                    />
                    <span className="toggle-slider" />
                  </label>
                ) : (
                  <button
                    type="button"
                    className="btn btn--primary btn--xs"
                    onClick={onRequestPermission}
                  >
                    Ruxsat berish
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* 2. Avtomatik tahlil va ogohlantirishlar */}
          <div className="notif-settings-section">
            <h3 className="notif-settings-title">Avtomatik aqlli eslatmalar</h3>

            {/* Qarzlar */}
            <div className="notif-setting-row">
              <div className="notif-setting-info">
                <div className="notif-setting-name">
                  <HandCoins size={16} className="text-accent" />
                  <span>Qarz qaytarish muddatlari</span>
                </div>
                <p className="notif-setting-desc">
                  Muddati yaqinlashgan yoki o'tib ketgan qarzlar bo'yicha ogohlantirish
                </p>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={settings.debtAlertsEnabled}
                  onChange={(e) =>
                    onUpdateSettings({ debtAlertsEnabled: e.target.checked })
                  }
                />
                <span className="toggle-slider" />
              </label>
            </div>

            {/* Kam balans */}
            <div className="notif-setting-row">
              <div className="notif-setting-info">
                <div className="notif-setting-name">
                  <Wallet size={16} className="text-accent" />
                  <span>Kam qolgan balans ogohlantirishi</span>
                </div>
                <p className="notif-setting-desc">
                  Hamyon yoki karta balansi belgilangan miqdordan kam qolsa
                </p>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={settings.balanceAlertsEnabled}
                  onChange={(e) =>
                    onUpdateSettings({
                      balanceAlertsEnabled: e.target.checked,
                    })
                  }
                />
                <span className="toggle-slider" />
              </label>
            </div>

            {/* Kam balans chegarasi */}
            {settings.balanceAlertsEnabled && (
              <div className="notif-setting-subrow">
                <label className="form-label">
                  Minimal chegara miqdori (so'm):
                </label>
                <div className="notif-threshold-inputs">
                  {[20000, 50000, 100000, 200000].map((val) => (
                    <button
                      key={val}
                      type="button"
                      className={`notif-threshold-btn ${
                        Number(settings.lowBalanceThresholdUZS) === val
                          ? "is-active"
                          : ""
                      }`}
                      onClick={() =>
                        onUpdateSettings({ lowBalanceThresholdUZS: val })
                      }
                    >
                      {formatSum(val)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Kurs tebranishi */}
            <div className="notif-setting-row">
              <div className="notif-setting-info">
                <div className="notif-setting-name">
                  <DollarSign size={16} className="text-accent" />
                  <span>Dollar kursi axborotnomasi</span>
                </div>
                <p className="notif-setting-desc">
                  Markaziy Bank kunlik rasmiy kursi haqida bildirishnoma
                </p>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={settings.rateAlertsEnabled}
                  onChange={(e) =>
                    onUpdateSettings({ rateAlertsEnabled: e.target.checked })
                  }
                />
                <span className="toggle-slider" />
              </label>
            </div>

            {/* Sinxronizatsiya */}
            <div className="notif-setting-row">
              <div className="notif-setting-info">
                <div className="notif-setting-name">
                  <Database size={16} className="text-accent" />
                  <span>Sinxronizatsiya va DB holati</span>
                </div>
                <p className="notif-setting-desc">
                  Oflayn navbatdagi amallar va baza aloqasi holati
                </p>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={settings.syncAlertsEnabled}
                  onChange={(e) =>
                    onUpdateSettings({ syncAlertsEnabled: e.target.checked })
                  }
                />
                <span className="toggle-slider" />
              </label>
            </div>
          </div>

          {/* 3. Yashirilgan bildirishnomalarni qayta tiklash */}
          <div className="notif-settings-section">
            <h3 className="notif-settings-title">Qayta tiklash</h3>
            <div className="flex items-center justify-between gap-3">
              <p className="notif-setting-desc">
                Avval o'chirilgan yoki yashirilgan tizim bildirishnomalarini qayta ko'rsatish
              </p>
              <button
                type="button"
                className="btn btn--secondary btn--sm"
                onClick={handleReset}
              >
                {resetSuccess ? (
                  <>
                    <Check size={14} className="text-income" />
                    <span>Tiklandi!</span>
                  </>
                ) : (
                  <>
                    <RotateCcw size={14} />
                    <span>Tiklash</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="modal-actions">
          <button type="button" className="btn btn--primary" onClick={onClose}>
            Saqlash va yopish
          </button>
        </div>
      </div>
    </div>
  );
}
