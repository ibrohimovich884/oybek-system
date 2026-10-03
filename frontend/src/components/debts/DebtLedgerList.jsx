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
} from "lucide-react";
import { formatSum, formatDollar } from "../../utils/format.js";
import { DEBT_TYPES, DEBT_STATUS_LABELS } from "../../constants/debts.js";
import { WALLET_CONFIG } from "../../constants/money.js";

export default function DebtLedgerList({
  debts,
  onSelectDebt,
  onOpenRepay,
  onSettleDebt,
}) {
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
          const paidAmount = payments.reduce((acc, p) => acc + Number(p.amount || 0), 0);
          const remainingAmount = Math.max(0, totalAmount - paidAmount);
          const percentPaid =
            totalAmount > 0 ? Math.min(100, Math.round((paidAmount / totalAmount) * 100)) : 0;
          const isSettled = debt.status === "settled" || remainingAmount === 0;

          // Qaytish muddati tekshiruvi
          let dueDateText = "Muddatsiz";
          let isOverdue = false;
          let daysLeft = null;
          if (!debt.isDueDateUnknown && debt.dueDate) {
            const due = new Date(debt.dueDate);
            const now = new Date();
            dueDateText = due.toLocaleDateString("uz-UZ", {
              day: "numeric",
              month: "short",
            });
            const diffTime = due.getTime() - now.getTime();
            daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            if (!isSettled && daysLeft < 0) {
              isOverdue = true;
            }
          }

          const statusCfg = DEBT_STATUS_LABELS[debt.status] || DEBT_STATUS_LABELS.pending;
          const walletCfg = WALLET_CONFIG[debt.wallet];

          return (
            <div
              key={debt.id}
              className={`debt-ledger-row ${isSettled ? "debt-ledger-row--settled" : ""} ${
                isOverdue ? "debt-ledger-row--overdue" : ""
              }`}
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
                      isGiven ? "debt-person-avatar--given" : "debt-person-avatar--taken"
                    }`}
                  >
                    {debt.personName ? debt.personName.charAt(0).toUpperCase() : "?"}
                  </div>
                  <div className="debt-person-text">
                    <span className="debt-person-name">{debt.personName}</span>
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
                        • {isOverdue ? `${Math.abs(daysLeft)} kun o'tdi!` : dueDateText}
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
                  ) : (
                    <span className="debt-settled-tag mono">Yopilgan</span>
                  )}
                </div>
              </div>

              {/* 5. Qaytish muddati */}
              <div className="debt-ledger-cell debt-ledger-cell--due">
                <div className="debt-due-block">
                  {isOverdue ? (
                    <span className="debt-due-pill debt-due-pill--overdue">
                      <AlertCircle size={12} />
                      <span>{Math.abs(daysLeft)} kun o'tdi</span>
                    </span>
                  ) : debt.isDueDateUnknown || !debt.dueDate ? (
                    <span className="debt-due-pill debt-due-pill--unknown">Muddatsiz</span>
                  ) : isSettled ? (
                    <span className="debt-due-pill debt-due-pill--settled">Yopildi</span>
                  ) : daysLeft !== null && daysLeft <= 3 ? (
                    <span className="debt-due-pill debt-due-pill--urgent">
                      <Clock size={12} />
                      <span>{daysLeft === 0 ? "Bugun" : `${daysLeft} kun qoldi`}</span>
                    </span>
                  ) : (
                    <span className="debt-due-pill debt-due-pill--normal">
                      <Calendar size={12} />
                      <span>{dueDateText}</span>
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
          );
        })}
      </div>
    </div>
  );
}
