import React from "react";
import {
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle2,
  Clock,
  AlertCircle,
  Database,
  ChevronRight,
  PlusCircle,
  Phone,
  Calendar,
  HeartHandshake,
  User,
} from "lucide-react";
import { formatSum, formatDollar } from "../../utils/format.js";
import {
  DEBT_TYPES,
  DEBT_STATUS_LABELS,
  getDebtDueInfo,
  DUE_STAGES,
} from "../../constants/debts.js";
import { WALLET_CONFIG } from "../../constants/money.js";

export default function DebtLedgerList({
  debts,
  onSelectDebt,
  onOpenRepay,
  onOpenForgive,
  onOpenPersonHistory,
  onSettleDebt,
  showStageDividers = true,
}) {
  let lastStage = null;

  const STAGE_TITLES = {
    [DUE_STAGES.OVERDUE]: { title: "Muddati oʻtib ketgan qarzlar", icon: AlertCircle, color: "var(--expense)", bg: "rgba(239, 68, 68, 0.12)" },
    [DUE_STAGES.SOON]: { title: "Muddati oz qolganlar (7 kun ichida)", icon: Clock, color: "#f59e0b", bg: "rgba(245, 158, 11, 0.12)" },
    [DUE_STAGES.UPCOMING]: { title: "Kelgusi muddatdagi qarzlar", icon: Calendar, color: "var(--accent)", bg: "rgba(78, 184, 150, 0.12)" },
    [DUE_STAGES.NO_DATE]: { title: "Muddatsiz toʻlovchilar (Muddat belgilanmagan)", icon: Calendar, color: "var(--text-muted)", bg: "var(--surface-2)" },
    [DUE_STAGES.CLOSED]: { title: "Yopilgan va Voz kechilgan qarzlar", icon: CheckCircle2, color: "var(--income)", bg: "rgba(34, 197, 94, 0.1)" },
  };

  return (
    <div className="debt-ledger-container">
      {/* Daftar sarlavhasi (Notebook Header - Desktop only) */}
      <div className="debt-ledger-header">
        <div className="debt-ledger-col debt-ledger-col--num">#</div>
        <div className="debt-ledger-col debt-ledger-col--person">Qarzdor shaxs</div>
        <div className="debt-ledger-col debt-ledger-col--type">Turi</div>
        <div className="debt-ledger-col debt-ledger-col--amount">Summa & Qoldiq</div>
        <div className="debt-ledger-col debt-ledger-col--due">Muddati</div>
        <div className="debt-ledger-col debt-ledger-col--status">Holati</div>
        <div className="debt-ledger-col debt-ledger-col--actions">Amallar</div>
      </div>

      {/* Daftar qatorlari (Notebook Ruled Rows) */}
      <div className="debt-ledger-list">
        {debts.map((debt, index) => {
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

          // Qaytish muddati tahlili
          const dueInfo = getDebtDueInfo(debt);
          const isOverdue = dueInfo.isOverdue;

          // Bo'lim ajratuvchisi (Group Header)
          let renderDivider = false;
          if (showStageDividers && dueInfo.stage !== lastStage) {
            renderDivider = true;
            lastStage = dueInfo.stage;
          }

          const statusCfg = DEBT_STATUS_LABELS[debt.status] || DEBT_STATUS_LABELS.pending;
          const walletCfg = WALLET_CONFIG[debt.wallet];
          const stageConfig = STAGE_TITLES[dueInfo.stage];

          return (
            <React.Fragment key={debt.id}>
              {renderDivider && stageConfig && (
                <div
                  className="debt-stage-divider"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "8px 16px",
                    background: stageConfig.bg,
                    borderBottom: "1px solid var(--border)",
                    fontSize: "0.76rem",
                    fontWeight: 700,
                    color: stageConfig.color,
                    letterSpacing: "0.02em",
                  }}
                >
                  <stageConfig.icon size={13} />
                  <span>{stageConfig.title}</span>
                </div>
              )}

              <div
                className={`debt-ledger-row ${isSettled ? "debt-ledger-row--settled" : ""} ${
                  isOverdue ? "debt-ledger-row--overdue" : ""
                } ${isForgiven ? "debt-ledger-row--forgiven" : ""}`}
                onClick={() => onSelectDebt(debt)}
                title="To'liq ma'lumotlarni ko'rish uchun bosing"
              >
                {/* 1. Tartib raqami (1, 2, 3...) */}
                <div className="debt-ledger-cell debt-ledger-cell--num">
                  <span className="debt-num-badge">{index + 1}.</span>
                </div>

                {/* 2. Qarzdor shaxs nomi va aloqasi */}
                <div className="debt-ledger-cell debt-ledger-cell--person">
                  <div className="debt-person-info">
                    <div
                      className={`debt-person-avatar ${
                        isForgiven
                          ? "debt-person-avatar--forgiven"
                          : isGiven
                          ? "debt-person-avatar--given"
                          : "debt-person-avatar--taken"
                      }`}
                      onClick={(e) => {
                        if (onOpenPersonHistory) {
                          e.stopPropagation();
                          onOpenPersonHistory(debt.personName);
                        }
                      }}
                      title="Ushbu shaxsning barcha qarzlari tarixini ko'rish"
                      style={{ cursor: onOpenPersonHistory ? "pointer" : "default" }}
                    >
                      {debt.personName ? debt.personName.charAt(0).toUpperCase() : "?"}
                    </div>
                    <div className="debt-person-text">
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span
                          className="debt-person-name"
                          onClick={(e) => {
                            if (onOpenPersonHistory) {
                              e.stopPropagation();
                              onOpenPersonHistory(debt.personName);
                            }
                          }}
                          style={{
                            cursor: onOpenPersonHistory ? "pointer" : "default",
                            textDecoration: onOpenPersonHistory ? "underline" : "none",
                            textDecorationColor: "var(--border-focus)",
                          }}
                        >
                          {debt.personName}
                        </span>

                        {onOpenPersonHistory && (
                          <button
                            type="button"
                            className="debt-person-history-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenPersonHistory(debt.personName);
                            }}
                            title="Barcha olingan va yopilgan qarzlar tarixi"
                          >
                            <User size={10} />
                            <span>Tarixi</span>
                          </button>
                        )}
                      </div>

                      <div className="debt-person-sub">
                        {debt.contact && (
                          <span className="debt-person-contact">
                            <Phone size={10} /> {debt.contact}
                          </span>
                        )}
                        {debt.location && (
                          <span className="debt-person-loc">• {debt.location}</span>
                        )}
                        <span className="debt-person-due-mobile">
                          • {dueInfo.text}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. Qarz turi (+ Bergan / - Olgan) */}
                <div className="debt-ledger-cell debt-ledger-cell--type">
                  <span
                    className={`debt-type-pill ${
                      isGiven ? "debt-type-pill--given" : "debt-type-pill--taken"
                    }`}
                  >
                    {isGiven ? <ArrowUpRight size={12} /> : <ArrowDownLeft size={12} />}
                    <span>{isGiven ? "Berganman (+)" : "Olganman (-)"}</span>
                  </span>
                </div>

                {/* 4. Summa va qoldiq */}
                <div className="debt-ledger-cell debt-ledger-cell--amount">
                  <div className="debt-amount-block">
                    <span
                      className={`debt-amount-val mono ${
                        isSettled
                          ? "debt-amount-val--settled"
                          : isGiven
                          ? "debt-amount-val--given"
                          : "debt-amount-val--taken"
                      }`}
                    >
                      {isGiven ? "+" : "-"}{formatFn(totalAmount)}
                    </span>

                    {!isSettled && paidAmount > 0 ? (
                      <span className="debt-remaining-tag mono">
                        Qoldiq: {formatFn(remainingAmount)} ({percentPaid}%)
                      </span>
                    ) : !isSettled ? (
                      walletCfg && (
                        <span className="debt-wallet-tag">{walletCfg.shortLabel}</span>
                      )
                    ) : isForgiven ? (
                      <span className="debt-forgiven-tag mono" style={{ color: "#c084fc", fontSize: "0.7rem", fontWeight: 700 }}>
                        Voz kechilgan
                      </span>
                    ) : (
                      <span className="debt-settled-tag mono">Yopilgan</span>
                    )}
                  </div>
                </div>

                {/* 5. Qaytish muddati */}
                <div className="debt-ledger-cell debt-ledger-cell--due">
                  <div className="debt-due-block">
                    {dueInfo.isOverdue ? (
                      <span className="debt-due-pill debt-due-pill--overdue">
                        <AlertCircle size={12} />
                        <span>{dueInfo.text}</span>
                      </span>
                    ) : dueInfo.stage === DUE_STAGES.NO_DATE ? (
                      <span className="debt-due-pill debt-due-pill--unknown">Muddatsiz</span>
                    ) : isForgiven ? (
                      <span className="debt-due-pill" style={{ color: "#c084fc" }}>Kechildi</span>
                    ) : isSettled ? (
                      <span className="debt-due-pill debt-due-pill--settled">Yopildi</span>
                    ) : dueInfo.stage === DUE_STAGES.SOON ? (
                      <span className="debt-due-pill debt-due-pill--urgent">
                        <Clock size={12} />
                        <span>{dueInfo.text}</span>
                      </span>
                    ) : (
                      <span className="debt-due-pill debt-due-pill--normal">
                        <Calendar size={12} />
                        <span>{dueInfo.text}</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* 6. Holati va DB nishoni */}
                <div className="debt-ledger-cell debt-ledger-cell--status">
                  <div className="debt-status-stack">
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

                    {debt.synced ? (
                      <span className="badge badge--db-synced debt-db-badge" title="Server bazasida (DB) saqlangan">
                        <Database size={9} />
                        <span>DB</span>
                      </span>
                    ) : (
                      <span
                        className="badge badge--db-pending debt-db-badge"
                        title="Faqat xotirada, internet ulanganda serverga yuboriladi"
                      >
                        <Clock size={9} />
                        <span>Xotirada</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* 7. Amallar */}
                <div
                  className="debt-ledger-cell debt-ledger-cell--actions"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="debt-row-actions">
                    <div className="debt-row-mobile-status">
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
                      {debt.synced ? (
                        <span className="badge badge--db-synced debt-db-badge" title="Server bazasida">
                          <Database size={9} />
                          <span>DB</span>
                        </span>
                      ) : (
                        <span className="badge badge--db-pending debt-db-badge" title="Xotirada">
                          <Clock size={9} />
                          <span>Xotira</span>
                        </span>
                      )}
                    </div>

                    <div className="debt-row-buttons">
                      {!isSettled && (
                        <>
                          <button
                            type="button"
                            className="debt-action-btn debt-action-btn--pay"
                            onClick={() => onOpenRepay(debt)}
                            title={isGiven ? "To'lov qabul qilish" : "To'lov qilish"}
                          >
                            <PlusCircle size={13} />
                            <span>To'lov</span>
                          </button>

                          {onOpenForgive && (
                            <button
                              type="button"
                              className="debt-action-btn debt-action-btn--forgive"
                              onClick={() => onOpenForgive(debt)}
                              title="Qarzdan voz kechish (Kechvorish)"
                            >
                              <HeartHandshake size={13} />
                              <span className="debt-action-btn-text">Voz kechish</span>
                            </button>
                          )}

                          <button
                            type="button"
                            className="debt-action-btn debt-action-btn--settle"
                            onClick={() =>
                              onSettleDebt(debt.id, {
                                amount: remainingAmount,
                                wallet: debt.wallet,
                                affectBalance: false,
                              })
                            }
                            title="To'liq yopildi deb belgilash"
                          >
                            <CheckCircle2 size={13} />
                          </button>
                        </>
                      )}

                      <button
                        type="button"
                        className="debt-action-btn debt-action-btn--view"
                        onClick={() => onSelectDebt(debt)}
                        title="To'liq ma'lumotlarni ochish"
                      >
                        <span>Batafsil</span>
                        <ChevronRight size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

