import React, { useState } from "react";
import {
  X,
  Phone,
  Calendar,
  Clock,
  MapPin,
  HelpCircle,
  FileText,
  DollarSign,
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle2,
  AlertCircle,
  Database,
  Trash2,
  Edit3,
  PlusCircle,
  Copy,
  Check,
  HeartHandshake,
  User,
} from "lucide-react";
import { formatSum, formatDollar } from "../../utils/format.js";
import { DEBT_TYPES, DEBT_TYPE_LABELS, DEBT_STATUS_LABELS } from "../../constants/debts.js";
import { WALLET_CONFIG } from "../../constants/money.js";
import SecurityGate from "../security/SecurityGate.jsx";

export default function DebtDetailModal({
  isOpen,
  onClose,
  debt,
  onOpenRepay,
  onOpenForgive,
  onOpenPersonHistory,
  onOpenEdit,
  onDeleteDebt,
  onSettleDebt,
}) {
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [showSecurityDelete, setShowSecurityDelete] = useState(false);

  if (!isOpen || !debt) return null;

  const isGiven = debt.type === DEBT_TYPES.GIVEN;
  const isUsd = debt.currency === "USD";
  const formatFn = isUsd ? formatDollar : formatSum;

  const totalAmount = Number(debt.amount || 0);
  const payments = debt.payments || [];
  const paidAmount = payments.reduce((acc, p) => acc + (p.isForgiven ? 0 : Number(p.amount || 0)), 0);
  const forgivenAmount = payments.reduce((acc, p) => acc + (p.isForgiven ? Number(p.amount || 0) : 0), 0);
  const isForgiven = debt.status === "forgiven";
  const isSettled = debt.status === "settled" || isForgiven || (totalAmount - paidAmount - forgivenAmount <= 0);
  const remainingAmount = isSettled ? 0 : Math.max(0, totalAmount - paidAmount - forgivenAmount);
  const percentPaid =
    totalAmount > 0 ? Math.min(100, Math.round(((paidAmount + forgivenAmount) / totalAmount) * 100)) : 0;

  // Qaytish muddati tekshiruvi
  let dueDateText = "Muddatsiz (belgilanmagan)";
  let isOverdue = false;
  let daysLeft = null;
  if (!debt.isDueDateUnknown && debt.dueDate) {
    const due = new Date(debt.dueDate);
    const now = new Date();
    dueDateText = due.toLocaleDateString("uz-UZ", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const diffTime = due.getTime() - now.getTime();
    daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (!isSettled && daysLeft < 0) {
      isOverdue = true;
    }
  }

  const createdDateText = debt.date || debt.createdAt
    ? new Date(debt.date || debt.createdAt).toLocaleDateString("uz-UZ", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Noma'lum";

  const statusCfg = DEBT_STATUS_LABELS[debt.status] || DEBT_STATUS_LABELS.pending;
  const typeCfg = DEBT_TYPE_LABELS[debt.type] || DEBT_TYPE_LABELS.given;
  const walletCfg = WALLET_CONFIG[debt.wallet];

  const handleCopyPhone = () => {
    if (!debt.contact) return;
    navigator.clipboard.writeText(debt.contact);
    setCopiedPhone(true);
    setTimeout(() => setCopiedPhone(false), 2000);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content modal-content--wide debt-detail-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-mobile-handle" />

        {/* Modal Header */}
        <div className="modal-header debt-detail-header">
          <div className="debt-detail-header__user">
            <div
              className={`debt-detail-avatar ${
                isGiven ? "debt-detail-avatar--given" : "debt-detail-avatar--taken"
              }`}
            >
              {debt.personName ? debt.personName.charAt(0).toUpperCase() : "?"}
            </div>
            <div className="debt-detail-header__text">
              <div className="debt-detail-header__name-row">
                <h3 className="debt-detail-name">{debt.personName}</h3>
                {onOpenPersonHistory && (
                  <button
                    type="button"
                    className="btn btn--xs btn--ghost"
                    style={{
                      padding: "2px 8px",
                      fontSize: "0.72rem",
                      color: "var(--accent)",
                      borderColor: "rgba(78, 184, 150, 0.3)",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                    onClick={() => {
                      onClose();
                      onOpenPersonHistory(debt.personName);
                    }}
                    title="Ushbu shaxsning barcha qarzlari tarixini ko'rish"
                  >
                    <User size={11} />
                    <span>Shaxs tarixi</span>
                  </button>
                )}
                {debt.synced ? (
                  <span className="badge badge--db-synced debt-db-badge" title="Server bazasida saqlangan">
                    <Database size={9} />
                    <span>DB</span>
                  </span>
                ) : (
                  <span
                    className="badge badge--db-pending debt-db-badge"
                    title="Xotirada saqlangan"
                  >
                    <Clock size={9} />
                    <span>Xotira</span>
                  </span>
                )}
              </div>
              <div className="debt-detail-header__badges">
                <span
                  className={`debt-type-pill ${
                    isGiven ? "debt-type-pill--given" : "debt-type-pill--taken"
                  }`}
                >
                  {isGiven ? <ArrowUpRight size={12} /> : <ArrowDownLeft size={12} />}
                  <span>{typeCfg.label}</span>
                </span>

                <span
                  className="debt-status-pill"
                  style={{
                    color: statusCfg.color,
                    backgroundColor: statusCfg.bg,
                    borderColor: statusCfg.border,
                  }}
                >
                  {statusCfg.label}
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Yopish"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body (Scrollable) */}
        <div className="modal-body debt-detail-body">
          {/* Voz kechilgan qarz uchun maxsus bildirishnoma banneri */}
          {isForgiven && (
            <div
              style={{
                background: "rgba(168, 85, 247, 0.12)",
                border: "1px solid rgba(168, 85, 247, 0.35)",
                borderRadius: "var(--radius-md)",
                padding: "12px 16px",
                display: "flex",
                alignItems: "center",
                gap: "12px",
                marginBottom: "14px",
              }}
            >
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "8px",
                  background: "rgba(168, 85, 247, 0.25)",
                  color: "#c084fc",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <HeartHandshake size={18} />
              </div>
              <div style={{ fontSize: "0.82rem", lineHeight: 1.4 }}>
                <strong style={{ color: "#c084fc", display: "block" }}>
                  Ushbu qarzdan voz kechilgan (Kechib yuborilgan)
                </strong>
                <span style={{ color: "var(--text-muted)" }}>
                  Qarz oluvchidan bu pul qaytib olinmaydi va qarz daftarda to'liq yopilgan.
                </span>
              </div>
            </div>
          )}

          {/* 1. Moliya Ko'rsatkichlari (Katta karta) */}
          <div
            className={`debt-detail-sum-card ${
              isOverdue ? "debt-detail-sum-card--overdue" : ""
            }`}
          >
            <div className="debt-detail-sum-row">
              <div>
                <span className="debt-detail-sum-label">
                  {isGiven ? "Menga qaytishi kerak" : "Qaytarishim kerak bo'lgan qoldiq"}
                </span>
                <div
                  className={`debt-detail-sum-val mono ${
                    isSettled
                      ? "debt-detail-sum-val--settled"
                      : isGiven
                      ? "debt-detail-sum-val--given"
                      : "debt-detail-sum-val--taken"
                  }`}
                >
                  {isSettled ? "To'liq yopilgan" : formatFn(remainingAmount)}
                </div>
              </div>

              <div className="debt-detail-initial-block">
                <span className="debt-detail-initial-label">Boshlang'ich qarz</span>
                <div className="debt-detail-initial-val mono">
                  {formatFn(totalAmount)}
                </div>
                {paidAmount > 0 && (
                  <span className="debt-detail-paid-tag mono">
                    To'landi: {formatFn(paidAmount)} ({percentPaid}%)
                  </span>
                )}
              </div>
            </div>

            {/* Progress bar */}
            {!isSettled && (
              <div className="debt-detail-progress-wrap">
                <div className="debt-detail-progress-track">
                  <div
                    className="debt-detail-progress-fill"
                    style={{
                      width: `${percentPaid}%`,
                      background: isGiven ? "var(--accent)" : "var(--income)",
                    }}
                  />
                </div>
                <div className="debt-detail-progress-meta">
                  <span>To'landi: <strong className="mono">{formatFn(paidAmount)}</strong> ({percentPaid}%)</span>
                  <span>Qoldiq: <strong className="mono">{formatFn(remainingAmount)}</strong></span>
                </div>
              </div>
            )}
          </div>

          {/* 2. Aloqa va Tezkor harakatlar (agar telefon bo'lsa) */}
          {debt.contact && (
            <div className="debt-detail-contact-card">
              <div className="debt-detail-contact-left">
                <div className="debt-detail-contact-icon">
                  <Phone size={15} />
                </div>
                <div className="debt-detail-contact-info">
                  <span className="debt-detail-contact-lbl">Telefon / Aloqa</span>
                  <div className="debt-detail-contact-val">{debt.contact}</div>
                </div>
              </div>

              <div className="debt-detail-contact-actions">
                <button
                  type="button"
                  className="btn btn--xs btn--ghost"
                  onClick={handleCopyPhone}
                  title="Nusxa olish"
                >
                  {copiedPhone ? <Check size={13} color="var(--income)" /> : <Copy size={13} />}
                  <span>{copiedPhone ? "Nusxalandi" : "Nusxa"}</span>
                </button>

                <a
                  href={`tel:${debt.contact.replace(/[^\d+]/g, "")}`}
                  className="btn btn--xs btn--primary"
                  style={{ textDecoration: "none" }}
                >
                  <Phone size={13} />
                  <span>Qo'ng'iroq</span>
                </a>
              </div>
            </div>
          )}

          {/* 3. Tafsilotlar jadvali (Grid) */}
          <div className="debt-detail-grid">
            {/* Berilgan/Olingan vaqt */}
            <div className="debt-detail-info-card">
              <div className="debt-detail-info-icon">
                <Calendar size={15} />
              </div>
              <div className="debt-detail-info-content">
                <span className="debt-detail-info-lbl">Sana va vaqt</span>
                <div className="debt-detail-info-val">{createdDateText}</div>
              </div>
            </div>

            {/* Qaytarish muddati */}
            <div className={`debt-detail-info-card ${isOverdue ? "debt-detail-info-card--overdue" : ""}`}>
              <div className="debt-detail-info-icon" style={{ color: isOverdue ? "var(--expense)" : "var(--accent)" }}>
                {isOverdue ? <AlertCircle size={15} /> : <Clock size={15} />}
              </div>
              <div className="debt-detail-info-content">
                <span className="debt-detail-info-lbl">
                  {isOverdue ? "Kechikkan muddat" : "Qaytarish muddati"}
                </span>
                <div className="debt-detail-info-val" style={{ color: isOverdue ? "var(--expense)" : "inherit" }}>
                  {dueDateText}
                </div>
                {isOverdue && daysLeft !== null && (
                  <span className="debt-detail-overdue-tag">
                    ⚠️ {Math.abs(daysLeft)} kun kechikmoqda!
                  </span>
                )}
                {!isOverdue && daysLeft !== null && daysLeft >= 0 && !isSettled && (
                  <span className="debt-detail-due-hint">
                    ({daysLeft === 0 ? "Bugun qaytarish kerak" : `${daysLeft} kun qoldi`})
                  </span>
                )}
              </div>
            </div>

            {/* Bog'langan hamyon */}
            <div className="debt-detail-info-card">
              <div className="debt-detail-info-icon" style={{ color: walletCfg?.color || "var(--text-muted)" }}>
                <Wallet size={15} />
              </div>
              <div className="debt-detail-info-content">
                <span className="debt-detail-info-lbl">Hamyon / Hisob</span>
                <div className="debt-detail-info-val">
                  {walletCfg ? walletCfg.label : "Naqd pul"}
                  <span className="debt-detail-curr-hint">
                    ({debt.currency || "UZS"})
                  </span>
                </div>
              </div>
            </div>

            {/* Joylashuv */}
            {debt.location && (
              <div className="debt-detail-info-card">
                <div className="debt-detail-info-icon" style={{ color: "var(--accent)" }}>
                  <MapPin size={15} />
                </div>
                <div className="debt-detail-info-content">
                  <span className="debt-detail-info-lbl">Joylashuv</span>
                  <div className="debt-detail-info-val">{debt.location}</div>
                </div>
              </div>
            )}
          </div>

          {/* 4. Sababi / Maqsadi */}
          {debt.reason && (
            <div className="debt-detail-reason-card">
              <div className="debt-detail-reason-header">
                <HelpCircle size={14} />
                <span>Qarz sababi / maqsadi:</span>
              </div>
              <div className="debt-detail-reason-body">
                {debt.reason}
              </div>
            </div>
          )}

          {/* 5. Shaxsiy eslatma (O'zim uchun izoh) */}
          {debt.personalNote && (
            <div className="debt-detail-note-card">
              <div className="debt-detail-note-header">
                <FileText size={14} />
                <span>O'zim uchun eslatma:</span>
              </div>
              <div className="debt-detail-note-body">
                {debt.personalNote}
              </div>
            </div>
          )}

          {/* 6. To'lovlar Tarixi */}
          <div className="debt-detail-payments-wrap">
            <div className="debt-detail-payments-header">
              <div className="debt-detail-payments-title">
                <CheckCircle2 size={16} color="var(--accent)" />
                <h4>To'lovlar tarixi ({payments.length})</h4>
              </div>

              {!isSettled && (
                <button
                  type="button"
                  className="btn btn--xs btn--primary"
                  onClick={() => {
                    onClose();
                    onOpenRepay(debt);
                  }}
                >
                  <PlusCircle size={13} />
                  <span>+ To'lov qo'shish</span>
                </button>
              )}
            </div>

            {payments.length > 0 ? (
              <div className="debt-detail-payments-list">
                {payments.map((p, idx) => (
                  <div key={p.id || idx} className="debt-detail-payment-item">
                    <div className="debt-detail-payment-left">
                      <div className="debt-detail-payment-date">
                        <span>
                          {new Date(p.date).toLocaleDateString("uz-UZ", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                        {p.wallet && (
                          <span className="debt-detail-payment-wallet">
                            ({WALLET_CONFIG[p.wallet]?.shortLabel || p.wallet})
                          </span>
                        )}
                      </div>
                      {p.note && (
                        <span className="debt-detail-payment-note">
                          {p.note}
                        </span>
                      )}
                    </div>

                    <span className="debt-detail-payment-amount mono">
                      +{formatFn(p.amount)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="debt-detail-payments-empty">
                Hozircha hech qanday to'lov qayd etilmagan.
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer (Amallar) */}
        <div className="modal-footer debt-detail-footer">
          <div className="debt-detail-footer-left">
            <button
              type="button"
              className="btn btn--sm btn--ghost debt-detail-btn-delete"
              onClick={() => setShowSecurityDelete(true)}
              title="Qarz yozuvini o'chirish"
            >
              <Trash2 size={15} />
              <span>O'chirish</span>
            </button>

            <button
              type="button"
              className="btn btn--sm btn--ghost"
              onClick={() => {
                onClose();
                onOpenEdit(debt);
              }}
              title="Ma'lumotlarni tahrirlash"
            >
              <Edit3 size={15} />
              <span>Tahrirlash</span>
            </button>
          </div>

          <div className="debt-detail-footer-right">
            {!isSettled ? (
              <>
                {onOpenForgive && (
                  <button
                    type="button"
                    className="btn btn--sm debt-detail-btn-forgive"
                    onClick={() => {
                      onClose();
                      onOpenForgive(debt);
                    }}
                    title="Qarzdan voz kechish (Kechvorish / Halol qilish)"
                  >
                    <HeartHandshake size={15} />
                    <span>Voz kechish</span>
                  </button>
                )}

                <button
                  type="button"
                  className="btn btn--sm btn--ghost debt-detail-btn-settle"
                  onClick={() => {
                    onSettleDebt(debt.id, {
                      amount: remainingAmount,
                      wallet: debt.wallet,
                      affectBalance: false,
                    });
                    onClose();
                  }}
                  title="Qarzni to'liq yopildi deb hisoblash"
                >
                  <CheckCircle2 size={15} />
                  <span>Yopildi</span>
                </button>

                <button
                  type="button"
                  className="btn btn--sm btn--primary debt-detail-btn-pay"
                  onClick={() => {
                    onClose();
                    onOpenRepay(debt);
                  }}
                >
                  <PlusCircle size={15} />
                  <span>{isGiven ? "To'lov qabul qilish" : "To'lov qilish"}</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                className="btn btn--sm btn--ghost"
                onClick={onClose}
              >
                <span>Yopish</span>
              </button>
            )}
          </div>
        </div>

        {/* Xavfsiz Parol bilan O'chirish Modali */}
        <SecurityGate
          isModal={true}
          isOpen={showSecurityDelete}
          isDanger={true}
          title="Qarzni Oʻchirish"
          subtitle={`"${debt.personName}"ga tegishli ${formatFn(totalAmount)} miqdoridagi qarzni oʻchirish uchun 4 xonali PIN parolni kiriting`}
          onSuccess={() => {
            onDeleteDebt(debt.id);
            setShowSecurityDelete(false);
            onClose();
          }}
          onCancel={() => setShowSecurityDelete(false)}
        />
      </div>
    </div>
  );
}
