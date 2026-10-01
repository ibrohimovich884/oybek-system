import { useState } from "react";
import {
  Shield,
  Edit2,
  ArrowRightLeft,
  History,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { formatSum, formatDollar, formatDateTime, formatRate } from "../../utils/format.js";

export default function ReserveCard({
  walletId,
  reserveId,
  title,
  icon: Icon,
  colorVar,
  oddiyAmount,
  reserveData,
  currency = "UZS",
  currentRate = 12850,
  onEditReserve,
  onTransfer,
}) {
  const [isNotesExpanded, setIsNotesExpanded] = useState(false);
  const isDollar = currency === "USD";
  const notes = Array.isArray(reserveData?.notes) ? reserveData.notes : [];

  const reserveAmount = reserveData?.amount || 0;
  const totalAmount = oddiyAmount + reserveAmount;

  return (
    <div className="control-wallet-card" style={{ borderLeft: `3px solid var(${colorVar})` }}>
      {/* Karta sarlavhasi */}
      <div className="control-wallet-card__header">
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <div
            className="control-wallet-card__icon"
            style={{
              background: `var(${colorVar}-soft, var(--surface-hover))`,
              color: `var(${colorVar}, var(--accent))`,
              width: 36,
              height: 36,
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Icon size={19} />
          </div>
          <div style={{ minWidth: 0 }}>
            <h3 className="control-wallet-card__title" style={{ margin: 0, fontSize: "1rem", fontWeight: 700 }}>
              {title}
            </h3>
            <span style={{ fontSize: "0.74rem", color: "var(--text-muted)" }}>
              Oddiy & Zaxira
            </span>
          </div>
        </div>

        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <span style={{ fontSize: "0.68rem", color: "var(--text-muted)", display: "block" }}>
            Jami qoldiq:
          </span>
          <strong className="mono" style={{ fontSize: "1.05rem", color: "var(--text)", display: "block" }}>
            {isDollar ? formatDollar(totalAmount) : formatSum(totalAmount)}
          </strong>
          {isDollar && (
            <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", display: "block" }}>
              ~ {formatSum(totalAmount * currentRate)}
            </span>
          )}
        </div>
      </div>

      {/* Ikki Qismli Balanslar To'plami - 375px ga moslashuvchan */}
      <div className="control-wallet-grid">
        {/* a) Oddiy (Kundalik) balans */}
        <div className="control-sub-card control-sub-card--oddiy">
          <div className="control-sub-card__head">
            <span className="control-sub-card__label">
              Kundalik Erkin
            </span>
            <span className="control-sub-card__badge">
              Oddiy
            </span>
          </div>
          <div className="mono control-sub-card__amount">
            {isDollar ? formatDollar(oddiyAmount) : formatSum(oddiyAmount)}
          </div>
          {isDollar && (
            <div className="control-sub-card__conv mono">
              ~ {formatSum(oddiyAmount * currentRate)}
            </div>
          )}
          <div className="control-sub-card__actions">
            <button
              type="button"
              className="btn btn--subtle btn--xs control-action-btn"
              onClick={() => onTransfer && onTransfer(walletId, reserveId)}
              title="Zaxiraga o'tkazish"
            >
              <ArrowRightLeft size={13} />
              <span>Zaxiraga oʻtkazish</span>
            </button>
          </div>
        </div>

        {/* b) Asosiy (Rezerv) balans */}
        <div
          className="control-sub-card control-sub-card--asosiy"
          style={{ borderColor: `var(${colorVar}-border, var(--border))` }}
        >
          <div className="control-sub-card__head">
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <Shield size={13} style={{ color: `var(${colorVar})` }} />
              <span className="control-sub-card__label" style={{ color: `var(${colorVar})`, fontWeight: 700 }}>
                Daxlsiz Zaxira
              </span>
            </div>
            <span className="control-sub-card__badge control-sub-card__badge--reserve">
              Rezerv
            </span>
          </div>
          <div className="mono control-sub-card__amount" style={{ color: `var(${colorVar})` }}>
            {isDollar ? formatDollar(reserveAmount) : formatSum(reserveAmount)}
          </div>
          {isDollar && (
            <div className="control-sub-card__conv mono">
              ~ {formatSum(reserveAmount * currentRate)}
            </div>
          )}
          <div className="control-sub-card__actions control-sub-card__actions--dual">
            <button
              type="button"
              className="btn btn--subtle btn--xs control-action-btn"
              onClick={() => onEditReserve && onEditReserve(reserveId)}
              title="Summani tahrirlash (izoh bilan)"
            >
              <Edit2 size={12} />
              <span>Tahrirlash</span>
            </button>
            <button
              type="button"
              className="btn btn--subtle btn--xs control-action-btn"
              onClick={() => onTransfer && onTransfer(reserveId, walletId)}
              title="Oddiy balansga yechib olish"
            >
              <ArrowRightLeft size={12} />
              <span>Yechish</span>
            </button>
          </div>
        </div>
      </div>

      {/* Izohlar Tarixi (Faqat izoh mavjud bo'lsa yoki ko'rish istalganda) */}
      {notes.length > 0 && (
        <div className="control-wallet-notes">
          <button
            type="button"
            className="control-notes-toggle"
            onClick={() => setIsNotesExpanded(!isNotesExpanded)}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <History size={12} />
              <span>Zaxira o'zgarishlari ({notes.length})</span>
            </div>
            {isNotesExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>

          {isNotesExpanded && (
            <div className="control-notes-list animate-fade-in">
              {notes.map((n, idx) => (
                <div key={n.id || `note-${idx}`} className="control-note-item">
                  <div className="control-note-header">
                    <span className="mono">{formatDateTime(n.editedAt || n.edited_at || n.createdAt || new Date())}</span>
                    {(n.amountAtTime || n.amount_at_time || n.amount_at_that_time) !== undefined && (
                      <span className="mono" style={{ fontWeight: 700 }}>
                        {isDollar
                          ? formatDollar(n.amountAtTime || n.amount_at_time || n.amount_at_that_time)
                          : formatSum(n.amountAtTime || n.amount_at_time || n.amount_at_that_time)}
                      </span>
                    )}
                  </div>
                  <div className="control-note-text">{n.text}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
