import { useState } from "react";
import {
  User,
  Phone,
  Calendar,
  MapPin,
  HelpCircle,
  FileText,
  Clock,
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle2,
  Trash2,
  ChevronDown,
  ChevronUp,
  PlusCircle,
  AlertCircle,
} from "lucide-react";
import { formatSum, formatDollar } from "../../utils/format.js";
import { WALLET_CONFIG } from "../../constants/money.js";
import {
  DEBT_TYPES,
  DEBT_TYPE_LABELS,
  DEBT_STATUS_LABELS,
} from "../../constants/debts.js";

export default function DebtCard({
  debt,
  onOpenRepay,
  onDeleteDebt,
  onSettleDebt,
}) {
  const [showPayments, setShowPayments] = useState(false);

  const isGiven = debt.type === DEBT_TYPES.GIVEN;
  const isUsd = debt.currency === "USD";
  const formatFn = isUsd ? formatDollar : formatSum;

  const totalAmount = Number(debt.amount || 0);
  const payments = debt.payments || [];
  const paidAmount = payments.reduce((acc, p) => acc + Number(p.amount || 0), 0);
  const remainingAmount = Math.max(0, totalAmount - paidAmount);
  const percentPaid = totalAmount > 0 ? Math.min(100, Math.round((paidAmount / totalAmount) * 100)) : 0;
  const isSettled = debt.status === "settled" || remainingAmount === 0;

  const statusInfo = DEBT_STATUS_LABELS[debt.status] || DEBT_STATUS_LABELS.pending;
  const typeLabels = DEBT_TYPE_LABELS[debt.type] || DEBT_TYPE_LABELS.given;

  // Qaytish muddati tekshiruvi
  let dueDateText = "Muddati noma'lum";
  let isOverdue = false;
  if (!debt.isDueDateUnknown && debt.dueDate) {
    const due = new Date(debt.dueDate);
    const now = new Date();
    dueDateText = due.toLocaleDateString("uz-UZ", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
    if (!isSettled && due < now) {
      isOverdue = true;
    }
  }

  const walletCfg = WALLET_CONFIG[debt.wallet];

  return (
    <div
      className={`debt-card ${isSettled ? "debt-card--settled" : ""}`}
      style={{
        background: "var(--surface)",
        borderRadius: "var(--radius-md)",
        border: isSettled ? "1px solid var(--border)" : isOverdue ? "1px solid var(--expense)" : "1px solid var(--border)",
        padding: 16,
        display: "flex",
        flexDirection: "column",
        gap: 12,
        transition: "border-color 0.15s ease",
      }}
    >
      {/* Header: Shaxs, Turi & Status */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              background: isGiven ? "rgba(56, 189, 248, 0.12)" : "rgba(245, 158, 11, 0.12)",
              color: isGiven ? "#38bdf8" : "#f59e0b",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 700,
              fontSize: "1.1rem",
              flexShrink: 0,
            }}
          >
            {debt.personName ? debt.personName.charAt(0).toUpperCase() : "?"}
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              <h4 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700, color: "var(--text)" }}>
                {debt.personName}
              </h4>
              {debt.contact && (
                <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                  • {debt.contact}
                </span>
              )}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 3,
                  fontSize: "0.72rem",
                  fontWeight: 600,
                  color: isGiven ? "#38bdf8" : "#f59e0b",
                  background: isGiven ? "rgba(56, 189, 248, 0.1)" : "rgba(245, 158, 11, 0.1)",
                  padding: "2px 6px",
                  borderRadius: 4,
                }}
              >
                {isGiven ? <ArrowUpRight size={12} /> : <ArrowDownLeft size={12} />}
                {typeLabels.shortLabel}
              </span>

              <span
                style={{
                  fontSize: "0.72rem",
                  fontWeight: 600,
                  color: statusInfo.color,
                  background: statusInfo.bg,
                  padding: "2px 6px",
                  borderRadius: 4,
                  border: `1px solid ${statusInfo.border}`,
                }}
              >
                {statusInfo.label}
              </span>
            </div>
          </div>
        </div>

        {/* Summa va qoldiq */}
        <div style={{ textAlign: "right" }}>
          <div className="mono" style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text)" }}>
            {formatFn(totalAmount)}
          </div>
          {!isSettled && paidAmount > 0 && (
            <div style={{ fontSize: "0.78rem", color: "var(--accent)" }}>
              Qoldiq: <span className="mono font-semibold">{formatFn(remainingAmount)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Progress Bar (agar qisman to'langan bo'lsa) */}
      {!isSettled && (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <div
            style={{
              width: "100%",
              height: 6,
              background: "var(--surface-sunken)",
              borderRadius: 3,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${percentPaid}%`,
                height: "100%",
                background: "var(--accent)",
                borderRadius: 3,
                transition: "width 0.3s ease",
              }}
            />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.72rem", color: "var(--text-muted)" }}>
            <span>To'landi: <strong className="mono">{formatFn(paidAmount)}</strong> ({percentPaid}%)</span>
            <span>Qoldiq: <strong className="mono">{formatFn(remainingAmount)}</strong></span>
          </div>
        </div>
      )}

      {/* Tafsilotlar paneli */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 8,
          fontSize: "0.82rem",
          background: "var(--surface-sunken)",
          padding: "8px 12px",
          borderRadius: "var(--radius-sm)",
        }}
      >
        {/* Berilgan/Olingan vaqt & hisob */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--text-muted)" }}>
          <Calendar size={14} style={{ flexShrink: 0 }} />
          <span>
            {new Date(debt.date || debt.createdAt).toLocaleDateString("uz-UZ", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
            {walletCfg && ` • ${walletCfg.shortLabel}`}
          </span>
        </div>

        {/* Qaytarish vaqti */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            color: isOverdue ? "var(--expense)" : "var(--text-muted)",
            fontWeight: isOverdue ? 600 : 400,
          }}
        >
          {isOverdue ? <AlertCircle size={14} style={{ flexShrink: 0 }} /> : <Clock size={14} style={{ flexShrink: 0 }} />}
          <span>
            {isOverdue ? "Muddati o'tgan: " : "Qaytarish: "}
            {dueDateText}
          </span>
        </div>

        {/* Joy */}
        {debt.location && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--text-muted)" }}>
            <MapPin size={14} style={{ flexShrink: 0 }} />
            <span>{debt.location}</span>
          </div>
        )}

        {/* Sabab/Maqsad */}
        {debt.reason && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--text-muted)" }}>
            <HelpCircle size={14} style={{ flexShrink: 0 }} />
            <span>{debt.reason}</span>
          </div>
        )}
      </div>

      {/* O'zim uchun eslatma (Izoh) */}
      {debt.personalNote && (
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 6,
            fontSize: "0.8rem",
            color: "var(--text-muted)",
            background: "rgba(234, 179, 8, 0.08)",
            borderLeft: "3px solid var(--warning)",
            padding: "6px 10px",
            borderRadius: "0 4px 4px 0",
          }}
        >
          <FileText size={13} style={{ marginTop: 2, flexShrink: 0, color: "var(--warning)" }} />
          <div>
            <strong style={{ color: "var(--text)" }}>Izoh (O'zim uchun): </strong>
            <span>{debt.personalNote}</span>
          </div>
        </div>
      )}

      {/* To'lovlar tarixi akkordioni */}
      {payments.length > 0 && (
        <div style={{ borderTop: "1px dashed var(--border)", paddingTop: 8 }}>
          <button
            type="button"
            className="btn btn--ghost btn--xs"
            onClick={() => setShowPayments(!showPayments)}
            style={{ width: "100%", justifyContent: "space-between", padding: "4px 0", color: "var(--accent)" }}
          >
            <span>To'lovlar tarixi ({payments.length} ta)</span>
            {showPayments ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {showPayments && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 6 }}>
              {payments.map((p) => (
                <div
                  key={p.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    fontSize: "0.78rem",
                    padding: "4px 8px",
                    background: "var(--surface-sunken)",
                    borderRadius: 4,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <CheckCircle2 size={13} color="var(--accent)" />
                    <span>
                      {new Date(p.date).toLocaleDateString("uz-UZ", { month: "short", day: "numeric" })}
                      {p.note && ` — ${p.note}`}
                    </span>
                  </div>
                  <span className="mono font-semibold" style={{ color: "var(--accent)" }}>
                    +{formatFn(p.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Pastki boshqaruv tugmalari */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4, borderTop: "1px solid var(--border)", paddingTop: 10 }}>
        <button
          type="button"
          className="btn btn--ghost btn--xs text-muted"
          onClick={() => {
            if (window.confirm(`${debt.personName}ga tegishli qarz qaydini o'chirishni tasdiqlaysizmi?`)) {
              onDeleteDebt(debt.id);
            }
          }}
          title="O'chirish"
          style={{ color: "var(--text-muted)" }}
        >
          <Trash2 size={14} />
          <span>O'chirish</span>
        </button>

        <div style={{ display: "flex", gap: 6 }}>
          {!isSettled && (
            <>
              <button
                type="button"
                className="btn btn--ghost btn--xs"
                onClick={() => onSettleDebt(debt.id, { amount: remainingAmount, wallet: debt.wallet, affectBalance: false })}
                title="Qolgan qismini to'liq yopish deb belgilash"
              >
                <CheckCircle2 size={14} />
                <span>Yopildi</span>
              </button>

              <button
                type="button"
                className="btn btn--primary btn--xs"
                onClick={() => onOpenRepay(debt)}
                style={{
                  background: isGiven ? "#0284c7" : "#d97706",
                  color: "#fff",
                }}
              >
                <PlusCircle size={14} />
                <span>{isGiven ? "To'lov qabul qilish" : "To'lov qilish"}</span>
              </button>
            </>
          )}

          {isSettled && (
            <span style={{ fontSize: "0.8rem", color: "var(--income)", display: "flex", alignItems: "center", gap: 4, fontWeight: 600 }}>
              <CheckCircle2 size={14} />
              To'liq yopilgan
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
