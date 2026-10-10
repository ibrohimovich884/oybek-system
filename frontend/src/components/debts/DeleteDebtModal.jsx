import React, { useState } from "react";
import {
  X,
  AlertTriangle,
  RotateCcw,
  Trash2,
  Wallet,
  Calendar,
  User,
  ArrowUpRight,
  ArrowDownLeft,
} from "lucide-react";
import { useExpenses } from "../../context/ExpensesContext.jsx";
import { formatSum, formatDollar } from "../../utils/format.js";
import { WALLET_CONFIG } from "../../constants/money.js";
import SecurityGate from "../security/SecurityGate.jsx";

export default function DeleteDebtModal({
  isOpen,
  onClose,
  debt,
  onConfirmDelete,
}) {
  const { getLinkedDebtTransactions } = useExpenses();
  const [showSecurityGate, setShowSecurityGate] = useState(false);
  const [selectedRevertOption, setSelectedRevertOption] = useState(false);

  if (!isOpen || !debt) return null;

  const linkedTxs = getLinkedDebtTransactions ? getLinkedDebtTransactions(debt) : [];
  const hasLinkedTxs = linkedTxs.length > 0 || debt.affectBalance;
  const isUsd = debt.currency === "USD";
  const formatFn = isUsd ? formatDollar : formatSum;
  const isGiven = debt.type === "given";

  const walletCfg = WALLET_CONFIG[debt.wallet] || { label: debt.wallet || "Hamyon" };

  const handleSelectDelete = (revert) => {
    setSelectedRevertOption(revert);
    setShowSecurityGate(true);
  };

  const handleFinalSuccess = () => {
    setShowSecurityGate(false);
    onConfirmDelete(debt.id, { revertTransactions: selectedRevertOption });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content animate-slide-up"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 520 }}
      >
        <div className="modal-mobile-handle" />

        <div className="modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "var(--radius-md)",
                background: "rgba(239, 68, 68, 0.15)",
                color: "var(--expense)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Trash2 size={20} />
            </div>
            <div>
              <h3 className="modal-title">Qarzni Oʻchirish</h3>
              <p className="modal-subtitle">
                {debt.personName} qarz yozuvini tizimdan oʻchirish
              </p>
            </div>
          </div>
          <button
            type="button"
            className="btn-icon"
            onClick={onClose}
            aria-label="Yopish"
          >
            <X size={18} />
          </button>
        </div>

        <div className="modal-body" style={{ padding: "16px 20px" }}>
          {/* Qarz ma'lumotlari xulosasi */}
          <div
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--border-color)",
              borderRadius: "var(--radius-md)",
              padding: "12px 16px",
              marginBottom: 16,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 600 }}>
                <User size={15} color="var(--accent)" />
                <span>{debt.personName}</span>
              </div>
              <span
                className={`debt-type-pill ${isGiven ? "debt-type-pill--given" : "debt-type-pill--taken"}`}
                style={{ fontSize: "0.72rem" }}
              >
                {isGiven ? <ArrowUpRight size={11} /> : <ArrowDownLeft size={11} />}
                <span>{isGiven ? "Berilgan qarz" : "Olingan qarz"}</span>
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                Hamyon: <strong>{walletCfg.label}</strong>
              </span>
              <strong className="mono" style={{ fontSize: "1.1rem", color: isGiven ? "var(--income)" : "var(--expense)" }}>
                {isGiven ? "+" : "-"}{formatFn(Number(debt.amount || 0))}
              </strong>
            </div>
          </div>

          {/* Bog'liq tranzaksiyalar ogohlantirishi */}
          {hasLinkedTxs ? (
            <div
              style={{
                background: "rgba(245, 158, 11, 0.1)",
                border: "1px solid rgba(245, 158, 11, 0.35)",
                borderRadius: "var(--radius-md)",
                padding: "14px 16px",
                marginBottom: 20,
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 10 }}>
                <AlertTriangle size={20} color="#f59e0b" style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <strong style={{ color: "#f59e0b", display: "block", fontSize: "0.9rem" }}>
                    Bogʻliq hamyon tranzaksiyasi mavjud!
                  </strong>
                  <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", margin: "4px 0 0", lineHeight: 1.4 }}>
                    Ushbu qarz yaratilganda yoki toʻlanganda hamyon hisobingiz balansiga taʼsir qilgan.
                    Qarz oʻchirilganda balansdagi ushbu harakatni ham bekor qilishni (qaytarishni) tanlashingiz mumkin:
                  </p>
                </div>
              </div>

              {linkedTxs.length > 0 && (
                <div
                  style={{
                    background: "rgba(0, 0, 0, 0.2)",
                    borderRadius: "var(--radius-sm)",
                    padding: "8px 12px",
                    fontSize: "0.78rem",
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                  }}
                >
                  <span style={{ color: "var(--text-muted)", fontWeight: 600 }}>
                    Topilgan bogʻliq tranzaksiyalar ({linkedTxs.length} ta):
                  </span>
                  {linkedTxs.slice(0, 3).map((tx) => (
                    <div
                      key={tx.id}
                      className="mono"
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        color: "var(--text-primary)",
                      }}
                    >
                      <span>
                        • {tx.subcategory || tx.category}: {tx.reason || debt.personName}
                      </span>
                      <span>
                        {tx.type === "income" ? "+" : "-"}{isUsd ? formatDollar(tx.amount) : formatSum(tx.amount)}
                      </span>
                    </div>
                  ))}
                  {linkedTxs.length > 3 && (
                    <span style={{ color: "var(--text-muted)", fontSize: "0.72rem" }}>
                      ...va yana {linkedTxs.length - 3} ta toʻlov
                    </span>
                  )}
                </div>
              )}
            </div>
          ) : (
            <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)", marginBottom: 20 }}>
              Haqiqatan ham ushbu qarz yozuvini daftardan butunlay oʻchirmoqchimisiz? Ushbu amalni ortga qaytarib boʻlmaydi.
            </p>
          )}

          {/* Amallar tanlovi */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {hasLinkedTxs ? (
              <>
                <button
                  type="button"
                  className="btn btn--primary"
                  style={{
                    background: "var(--accent)",
                    borderColor: "var(--accent)",
                    color: "#fff",
                    justifyContent: "flex-start",
                    padding: "12px 14px",
                    textAlign: "left",
                  }}
                  onClick={() => handleSelectDelete(true)}
                >
                  <RotateCcw size={18} style={{ flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <strong style={{ display: "block", fontSize: "0.88rem" }}>
                      Qarz va bogʻliq tranzaksiyani oʻchirish (Tavsiya etiladi)
                    </strong>
                    <span style={{ fontSize: "0.74rem", opacity: 0.9, fontWeight: 400 }}>
                      Qarz oʻchiriladi va hamyon balansi qaytariladi ({walletCfg.label})
                    </span>
                  </div>
                </button>

                <button
                  type="button"
                  className="btn btn--subtle"
                  style={{
                    justifyContent: "flex-start",
                    padding: "12px 14px",
                    textAlign: "left",
                    borderColor: "var(--border-color)",
                  }}
                  onClick={() => handleSelectDelete(false)}
                >
                  <Trash2 size={18} style={{ flexShrink: 0, marginTop: 2, color: "var(--expense)" }} />
                  <div>
                    <strong style={{ display: "block", fontSize: "0.88rem" }}>
                      Faqat qarzni oʻchirish (Balans oʻzgarmasin)
                    </strong>
                    <span style={{ fontSize: "0.74rem", color: "var(--text-muted)", fontWeight: 400 }}>
                      Hamyon balansi oʻzgarishsiz qoladi, faqat qarz yozuvi oʻchiriladi
                    </span>
                  </div>
                </button>
              </>
            ) : (
              <button
                type="button"
                className="btn btn--primary"
                style={{
                  background: "var(--expense)",
                  borderColor: "var(--expense)",
                  color: "#fff",
                  justifyContent: "center",
                  padding: "10px",
                }}
                onClick={() => handleSelectDelete(false)}
              >
                <Trash2 size={16} />
                <span>Oʻchirishni tasdiqlash</span>
              </button>
            )}

            <button
              type="button"
              className="btn btn--ghost"
              style={{ justifyContent: "center", marginTop: 4 }}
              onClick={onClose}
            >
              Bekor qilish
            </button>
          </div>
        </div>

        {/* Xavfsiz Parol Modali (PIN o'rnatilgan bo'lsa) */}
        <SecurityGate
          isModal={true}
          isOpen={showSecurityGate}
          isDanger={true}
          title="Qarzni Oʻchirish"
          subtitle={`"${debt.personName}" qarzini oʻchirish uchun 4 xonali PIN parolni kiriting`}
          onSuccess={handleFinalSuccess}
          onCancel={() => setShowSecurityGate(false)}
        />
      </div>
    </div>
  );
}
