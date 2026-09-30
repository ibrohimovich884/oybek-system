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
  ExternalLink,
} from "lucide-react";
import { formatSum, formatDollar } from "../../utils/format.js";
import { DEBT_TYPES, DEBT_TYPE_LABELS, DEBT_STATUS_LABELS } from "../../constants/debts.js";
import { WALLET_CONFIG } from "../../constants/money.js";

export default function DebtDetailModal({
  isOpen,
  onClose,
  debt,
  onOpenRepay,
  onOpenEdit,
  onDeleteDebt,
  onSettleDebt,
}) {
  const [copiedPhone, setCopiedPhone] = useState(false);

  if (!isOpen || !debt) return null;

  const isGiven = debt.type === DEBT_TYPES.GIVEN;
  const isUsd = debt.currency === "USD";
  const formatFn = isUsd ? formatDollar : formatSum;

  const totalAmount = Number(debt.amount || 0);
  const payments = debt.payments || [];
  const paidAmount = payments.reduce((acc, p) => acc + Number(p.amount || 0), 0);
  const remainingAmount = Math.max(0, totalAmount - paidAmount);
  const percentPaid =
    totalAmount > 0 ? Math.min(100, Math.round((paidAmount / totalAmount) * 100)) : 0;
  const isSettled = debt.status === "settled" || remainingAmount === 0;

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
        month: "long",
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
        style={{ maxWidth: 600, maxHeight: "90vh", display: "flex", flexDirection: "column" }}
      >
        <div className="modal-mobile-handle" />
        {/* Modal Header */}
        <div className="modal-header" style={{ paddingBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              className={`debt-detail-avatar ${
                isGiven ? "debt-detail-avatar--given" : "debt-detail-avatar--taken"
              }`}
            >
              {debt.personName ? debt.personName.charAt(0).toUpperCase() : "?"}
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 700, color: "var(--text)" }}>
                  {debt.personName}
                </h3>
                {debt.synced ? (
                  <span className="badge badge--db-synced" title="Server bazasida (DB) saqlangan">
                    <Database size={10} />
                    <span>DB</span>
                  </span>
                ) : (
                  <span
                    className="badge badge--db-pending"
                    title="Faqat xotirada, internet ulanganda serverga yuboriladi"
                  >
                    <Clock size={10} />
                    <span>Xotirada</span>
                  </span>
                )}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    fontSize: "0.78rem",
                    fontWeight: 600,
                    color: isGiven ? "var(--accent)" : "var(--warning)",
                    background: isGiven ? "rgba(78, 184, 150, 0.15)" : "rgba(245, 158, 11, 0.15)",
                    padding: "2px 8px",
                    borderRadius: 4,
                  }}
                >
                  {isGiven ? <ArrowUpRight size={13} /> : <ArrowDownLeft size={13} />}
                  {typeCfg.label}
                </span>

                <span
                  style={{
                    fontSize: "0.78rem",
                    fontWeight: 600,
                    color: statusCfg.color,
                    background: statusCfg.bg,
                    padding: "2px 8px",
                    borderRadius: 4,
                    border: `1px solid ${statusCfg.border}`,
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
        <div
          className="modal-body"
          style={{
            overflowY: "auto",
            padding: "16px 20px",
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          {/* 1. Moliya Ko'rsatkichlari (Katta karta) */}
          <div
            style={{
              background: "var(--surface-2)",
              borderRadius: "var(--radius-md)",
              border: isOverdue ? "1px solid var(--expense)" : "1px solid var(--border)",
              padding: 16,
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
              <div>
                <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  {isGiven ? "Menga qaytishi kerak" : "Qaytarishim kerak bo'lgan qoldiq"}
                </span>
                <div
                  className="mono"
                  style={{
                    fontSize: "1.75rem",
                    fontWeight: 800,
                    color: isSettled ? "var(--income)" : isGiven ? "var(--accent)" : "var(--expense)",
                    marginTop: 2,
                  }}
                >
                  {isSettled ? "To'liq yopilgan" : formatFn(remainingAmount)}
                </div>
              </div>

              <div style={{ textAlign: "right" }}>
                <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>Boshlang'ich qarz</span>
                <div className="mono" style={{ fontSize: "1.1rem", fontWeight: 600, color: "var(--text)" }}>
                  {formatFn(totalAmount)}
                </div>
                {paidAmount > 0 && (
                  <span style={{ fontSize: "0.78rem", color: "var(--income)", fontWeight: 600 }}>
                    To'langan: {formatFn(paidAmount)} ({percentPaid}%)
                  </span>
                )}
              </div>
            </div>

            {/* Progress bar */}
            {!isSettled && (
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                <div
                  style={{
                    width: "100%",
                    height: 8,
                    background: "var(--surface-3)",
                    borderRadius: 4,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${percentPaid}%`,
                      height: "100%",
                      background: isGiven ? "var(--accent)" : "var(--income)",
                      borderRadius: 4,
                      transition: "width 0.3s ease",
                    }}
                  />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                  <span>To'langan: <strong className="mono">{formatFn(paidAmount)}</strong> ({percentPaid}%)</span>
                  <span>Qoldiq: <strong className="mono">{formatFn(remainingAmount)}</strong></span>
                </div>
              </div>
            )}
          </div>

          {/* 2. Aloqa va Tezkor harakatlar (agar telefon bo'lsa) */}
          {debt.contact && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 14px",
                background: "var(--surface-sunken)",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 6,
                    background: "rgba(78, 184, 150, 0.15)",
                    color: "var(--accent)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Phone size={16} />
                </div>
                <div>
                  <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>Telefon / Aloqa:</span>
                  <div style={{ fontSize: "0.95rem", fontWeight: 600, color: "var(--text)" }}>
                    {debt.contact}
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", gap: 6 }}>
                <button
                  type="button"
                  className="btn btn--xs btn--ghost"
                  onClick={handleCopyPhone}
                  title="Raqamdan nusxa olish"
                >
                  {copiedPhone ? <Check size={14} color="var(--income)" /> : <Copy size={14} />}
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
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 10,
            }}
          >
            {/* Berilgan/Olingan vaqt */}
            <div className="debt-detail-info-card">
              <div className="debt-detail-info-icon" style={{ color: "var(--text-muted)" }}>
                <Calendar size={15} />
              </div>
              <div>
                <span className="debt-detail-info-lbl">Sana va vaqt</span>
                <div className="debt-detail-info-val">{createdDateText}</div>
              </div>
            </div>

            {/* Qaytarish muddati */}
            <div className={`debt-detail-info-card ${isOverdue ? "debt-detail-info-card--overdue" : ""}`}>
              <div className="debt-detail-info-icon" style={{ color: isOverdue ? "var(--expense)" : "var(--accent)" }}>
                {isOverdue ? <AlertCircle size={15} /> : <Clock size={15} />}
              </div>
              <div>
                <span className="debt-detail-info-lbl">
                  {isOverdue ? "Kechikkan muddat" : "Qaytarish muddati"}
                </span>
                <div className="debt-detail-info-val" style={{ color: isOverdue ? "var(--expense)" : "inherit" }}>
                  {dueDateText}
                </div>
                {isOverdue && daysLeft !== null && (
                  <span style={{ fontSize: "0.72rem", color: "var(--expense)", fontWeight: 600 }}>
                    ⚠️ {Math.abs(daysLeft)} kun kechikmoqda!
                  </span>
                )}
                {!isOverdue && daysLeft !== null && daysLeft >= 0 && !isSettled && (
                  <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
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
              <div>
                <span className="debt-detail-info-lbl">Hamyon / Hisob</span>
                <div className="debt-detail-info-val">
                  {walletCfg ? walletCfg.label : "Naqd pul"}
                  <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginLeft: 4 }}>
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
                <div>
                  <span className="debt-detail-info-lbl">Joy / Manzil</span>
                  <div className="debt-detail-info-val">{debt.location}</div>
                </div>
              </div>
            )}
          </div>

          {/* 4. Sababi / Maqsadi */}
          {debt.reason && (
            <div
              style={{
                padding: "10px 14px",
                background: "var(--surface-sunken)",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--text-muted)", fontSize: "0.75rem", marginBottom: 3 }}>
                <HelpCircle size={14} />
                <span>Qarz sababi / maqsadi:</span>
              </div>
              <div style={{ fontSize: "0.9rem", color: "var(--text)" }}>
                {debt.reason}
              </div>
            </div>
          )}

          {/* 5. Shaxsiy eslatma (O'zim uchun izoh) */}
          {debt.personalNote && (
            <div
              style={{
                padding: "10px 14px",
                background: "rgba(234, 179, 8, 0.08)",
                borderRadius: "var(--radius-sm)",
                borderLeft: "3px solid var(--warning)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--warning)", fontSize: "0.75rem", marginBottom: 3 }}>
                <FileText size={14} />
                <span style={{ fontWeight: 600 }}>O'zim uchun eslatma:</span>
              </div>
              <div style={{ fontSize: "0.88rem", color: "var(--text)" }}>
                {debt.personalNote}
              </div>
            </div>
          )}

          {/* 6. To'lovlar Tarixi */}
          <div style={{ borderTop: "1px solid var(--border)", paddingTop: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <CheckCircle2 size={16} color="var(--accent)" />
                <h4 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700, color: "var(--text)" }}>
                  To'lovlar tarixi ({payments.length})
                </h4>
              </div>

              {!isSettled && (
                <button
                  type="button"
                  className="btn btn--xs btn--primary"
                  onClick={() => {
                    onClose();
                    onOpenRepay(debt);
                  }}
                  style={{ display: "flex", alignItems: "center", gap: 4 }}
                >
                  <PlusCircle size={13} />
                  <span>+ Yangi to'lov</span>
                </button>
              )}
            </div>

            {payments.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {payments.map((p, idx) => (
                  <div
                    key={p.id || idx}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "8px 12px",
                      background: "var(--surface-sunken)",
                      borderRadius: "var(--radius-sm)",
                      border: "1px solid var(--border-subtle)",
                    }}
                  >
                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text)" }}>
                          {new Date(p.date).toLocaleDateString("uz-UZ", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                        {p.wallet && (
                          <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                            ({WALLET_CONFIG[p.wallet]?.shortLabel || p.wallet})
                          </span>
                        )}
                      </div>
                      {p.note && (
                        <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                          {p.note}
                        </span>
                      )}
                    </div>

                    <span className="mono font-semibold" style={{ fontSize: "0.95rem", color: "var(--income)" }}>
                      +{formatFn(p.amount)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div
                style={{
                  padding: "16px",
                  textAlign: "center",
                  background: "var(--surface-sunken)",
                  borderRadius: "var(--radius-sm)",
                  color: "var(--text-muted)",
                  fontSize: "0.82rem",
                }}
              >
                Hozircha hech qanday to'lov qayd etilmagan.
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer (Amallar) */}
        <div
          className="modal-footer"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 10,
            padding: "14px 20px",
            borderTop: "1px solid var(--border)",
            background: "var(--surface)",
          }}
        >
          {/* Chap amallar: O'chirish va Tahrirlash */}
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              className="btn btn--sm btn--ghost"
              style={{ color: "var(--expense)" }}
              onClick={() => {
                if (window.confirm(`${debt.personName}ga tegishli qarz yozuvini butunlay o'chirishni xohlaysizmi?`)) {
                  onDeleteDebt(debt.id);
                  onClose();
                }
              }}
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

          {/* O'ng amallar: To'lov yoki To'liq yopish */}
          <div style={{ display: "flex", gap: 8 }}>
            {!isSettled ? (
              <>
                <button
                  type="button"
                  className="btn btn--sm btn--ghost"
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
                  <span>Yopildi deb belgilash</span>
                </button>

                <button
                  type="button"
                  className="btn btn--sm btn--primary"
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
      </div>
    </div>
  );
}
