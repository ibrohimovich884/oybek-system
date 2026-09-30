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
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            className="control-wallet-card__icon"
            style={{
              background: `var(${colorVar}-soft, var(--surface-hover))`,
              color: `var(${colorVar}, var(--accent))`,
              padding: 8,
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon size={20} />
          </div>
          <div>
            <h3 className="control-wallet-card__title" style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700 }}>
              {title}
            </h3>
            <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
              Oddiy va Asosiy (Rezerv) balanslar
            </span>
          </div>
        </div>

        <div style={{ textAlign: "right" }}>
          <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", display: "block" }}>
            Ushbu manbadagi jami:
          </span>
          <strong className="mono" style={{ fontSize: "1.05rem", color: "var(--text)" }}>
            {isDollar ? formatDollar(totalAmount) : formatSum(totalAmount)}
          </strong>
          {isDollar && (
            <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", display: "block" }}>
              ~ {formatSum(totalAmount * currentRate)}
            </span>
          )}
        </div>
      </div>

      {/* Ikki Qismli Balanslar To'plami */}
      <div className="control-wallet-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 14 }}>
        {/* a) Oddiy balans */}
        <div
          className="control-sub-card"
          style={{
            background: "var(--surface-hover)",
            padding: "12px 14px",
            borderRadius: 8,
            border: "1px solid var(--border)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-muted)" }}>
              a) Oddiy Balans
            </span>
            <span className="badge" style={{ fontSize: "0.7rem", padding: "1px 6px" }}>
              Kundalik
            </span>
          </div>
          <div className="mono" style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--text)" }}>
            {isDollar ? formatDollar(oddiyAmount) : formatSum(oddiyAmount)}
          </div>
          {isDollar && (
            <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: 2 }}>
              ~ {formatSum(oddiyAmount * currentRate)}
            </div>
          )}
          <div style={{ marginTop: 10 }}>
            <button
              type="button"
              className="btn btn--subtle"
              onClick={() => onTransfer && onTransfer(walletId, reserveId)}
              style={{ width: "100%", fontSize: "0.75rem", padding: "4px 8px", justifyContent: "center" }}
            >
              <ArrowRightLeft size={13} />
              <span>Asosiyga o'tkazish</span>
            </button>
          </div>
        </div>

        {/* b) Asosiy (Rezerv) balans */}
        <div
          className="control-sub-card"
          style={{
            background: "var(--surface)",
            padding: "12px 14px",
            borderRadius: 8,
            border: `1px solid var(${colorVar}-border, var(--border))`,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <Shield size={14} style={{ color: `var(${colorVar})` }} />
              <span style={{ fontSize: "0.8rem", fontWeight: 700, color: `var(${colorVar})` }}>
                b) Asosiy (Rezerv)
              </span>
            </div>
            <button
              type="button"
              className="btn-icon btn-icon--sm"
              onClick={() => onEditReserve && onEditReserve(reserveId)}
              title="Asosiy balansni tahrirlash (izoh bilan)"
            >
              <Edit2 size={13} />
            </button>
          </div>
          <div className="mono" style={{ fontSize: "1.25rem", fontWeight: 700, color: `var(${colorVar})` }}>
            {isDollar ? formatDollar(reserveAmount) : formatSum(reserveAmount)}
          </div>
          {isDollar && (
            <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: 2 }}>
              ~ {formatSum(reserveAmount * currentRate)}
            </div>
          )}
          <div style={{ marginTop: 10 }}>
            <button
              type="button"
              className="btn btn--subtle"
              onClick={() => onTransfer && onTransfer(reserveId, walletId)}
              style={{ width: "100%", fontSize: "0.75rem", padding: "4px 8px", justifyContent: "center" }}
            >
              <ArrowRightLeft size={13} />
              <span>Oddiyga yechish</span>
            </button>
          </div>
        </div>
      </div>

      {/* Izohlar Tarixi (Append-only ro'yxati, eng yangisi tepada) */}
      <div className="control-wallet-notes" style={{ marginTop: 12, borderTop: "1px dashed var(--border)", paddingTop: 10 }}>
        <button
          type="button"
          className="btn-link"
          onClick={() => setIsNotesExpanded(!isNotesExpanded)}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: "0.8rem",
            color: "var(--text-muted)",
            padding: "2px 0",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <History size={13} />
            <span>Asosiy balans izohlar tarixi ({notes.length})</span>
          </div>
          {isNotesExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {isNotesExpanded && (
          <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6, maxHeight: 180, overflowY: "auto" }}>
            {notes.length === 0 ? (
              <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", padding: "6px 8px" }}>
                Hozircha izohlar mavjud emas. Balansni tahrirlaganda izohlar shu yerda paydo bo'ladi.
              </div>
            ) : (
              notes.map((n) => (
                <div
                  key={n.id}
                  style={{
                    padding: "6px 10px",
                    borderRadius: 6,
                    background: "var(--surface-hover)",
                    fontSize: "0.76rem",
                    border: "1px solid var(--border)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-muted)", marginBottom: 2 }}>
                    <span className="mono">{formatDateTime(n.createdAt)}</span>
                    {n.exchangeRate && <span className="mono">@ {formatRate(n.exchangeRate)}</span>}
                  </div>
                  <div style={{ color: "var(--text)" }}>{n.text}</div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
