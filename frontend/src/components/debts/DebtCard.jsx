import { useState } from "react";
import {
  User,
  Phone,
  Calendar,
  MapPin,
  HelpCircle,
  FileText,
  Clock,
  Database,
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle2,
  Trash2,
  ChevronDown,
  ChevronUp,
  PlusCircle,
  AlertCircle,
  Info,
} from "lucide-react";
import { formatSum, formatDollar } from "../../utils/format.js";
import { WALLET_CONFIG } from "../../constants/money.js";
import {
  DEBT_TYPES,
  DEBT_TYPE_LABELS,
  DEBT_STATUS_LABELS,
} from "../../constants/debts.js";
import SecurityGate from "../security/SecurityGate.jsx";

export default function DebtCard({
  debt,
  onSelectDebt,
  onOpenRepay,
  onDeleteDebt,
  onSettleDebt,
}) {
  const [showPayments, setShowPayments] = useState(false);
  const [showSecurityDelete, setShowSecurityDelete] = useState(false);

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
  let dueDateText = "Muddatsiz";
  let isOverdue = false;
  let daysLeft = null;
  if (!debt.isDueDateUnknown && debt.dueDate) {
    const due = new Date(debt.dueDate);
    const now = new Date();
    dueDateText = due.toLocaleDateString("uz-UZ", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
    const diffTime = due.getTime() - now.getTime();
    daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (!isSettled && daysLeft < 0) {
      isOverdue = true;
    }
  }

  const walletCfg = WALLET_CONFIG[debt.wallet];

  return (
    <div
      className={`debt-card ${isSettled ? "debt-card--settled" : ""} ${
        isOverdue ? "debt-card--overdue" : ""
      }`}
    >
      {/* 1. Header: Shaxs, Aloqa & Summa */}
      <div
        className="debt-card__header"
        onClick={() => onSelectDebt && onSelectDebt(debt)}
      >
        <div className="debt-card__person-wrap">
          <div
            className={`debt-card__avatar ${
              isGiven ? "debt-card__avatar--given" : "debt-card__avatar--taken"
            }`}
          >
            {debt.personName ? debt.personName.charAt(0).toUpperCase() : "?"}
          </div>
          <div className="debt-card__person-details">
            <h4 className="debt-card__name">{debt.personName}</h4>
            {debt.contact ? (
              <span className="debt-card__contact">
                <Phone size={11} />
                <span>{debt.contact}</span>
              </span>
            ) : (
              <span className="debt-card__sub-hint">Ma'lumotlarni ko'rish</span>
            )}
          </div>
        </div>

        {/* Summa va Qoldiq */}
        <div className="debt-card__amount-block">
          <div
            className={`debt-card__total mono ${
              isGiven ? "debt-card__total--given" : "debt-card__total--taken"
            }`}
          >
            {isGiven ? "+" : "-"}{formatFn(totalAmount)}
          </div>
          {!isSettled && paidAmount > 0 ? (
            <div className="debt-card__remaining mono">
              Qoldiq: <strong>{formatFn(remainingAmount)}</strong>
            </div>
          ) : !isSettled ? (
            <div className="debt-card__remaining-sub">
              {walletCfg?.shortLabel || (isUsd ? "USD" : "UZS")}
            </div>
          ) : (
            <div className="debt-card__settled-label mono">Yopilgan</div>
          )}
        </div>
      </div>

      {/* 2. Nishonlar (Badges) qatori */}
      <div className="debt-card__badges-row">
        <span
          className={`debt-type-pill ${
            isGiven ? "debt-type-pill--given" : "debt-type-pill--taken"
          }`}
        >
          {isGiven ? <ArrowUpRight size={12} /> : <ArrowDownLeft size={12} />}
          <span>{isGiven ? "Berganman" : "Olganman"}</span>
        </span>

        <span
          className="debt-status-pill"
          style={{
            color: statusInfo.color,
            backgroundColor: statusInfo.bg,
            borderColor: statusInfo.border,
          }}
        >
          {statusInfo.label}
        </span>

        {isOverdue ? (
          <span className="debt-due-pill debt-due-pill--overdue">
            <AlertCircle size={11} />
            <span>{Math.abs(daysLeft)} kun o'tdi</span>
          </span>
        ) : daysLeft !== null && daysLeft <= 3 && !isSettled ? (
          <span className="debt-due-pill debt-due-pill--urgent">
            <Clock size={11} />
            <span>{daysLeft === 0 ? "Bugun" : `${daysLeft} kun qoldi`}</span>
          </span>
        ) : null}

        {debt.synced ? (
          <span className="badge badge--db-synced debt-db-badge" title="Server bazasida saqlangan">
            <Database size={9} />
            <span>DB</span>
          </span>
        ) : (
          <span className="badge badge--db-pending debt-db-badge" title="Xotirada saqlangan">
            <Clock size={9} />
            <span>Xotirada</span>
          </span>
        )}
      </div>

      {/* 3. Progress Bar (agar qisman to'langan bo'lsa) */}
      {!isSettled && paidAmount > 0 && (
        <div className="debt-card__progress-wrap">
          <div className="debt-card__progress-track">
            <div
              className="debt-card__progress-bar"
              style={{ width: `${percentPaid}%` }}
            />
          </div>
          <div className="debt-card__progress-meta">
            <span>To'landi: <strong className="mono">{formatFn(paidAmount)}</strong> ({percentPaid}%)</span>
            <span>Qoldiq: <strong className="mono">{formatFn(remainingAmount)}</strong></span>
          </div>
        </div>
      )}

      {/* 4. Tafsilotlar paneli (Sana, muddat, joy, sabab) */}
      <div className="debt-card__details">
        {/* Berilgan/Olingan sana va hisob */}
        <div className="debt-card__detail-item">
          <Calendar size={13} className="debt-card__detail-icon" />
          <span className="debt-card__detail-text">
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
          className={`debt-card__detail-item ${
            isOverdue ? "debt-card__detail-item--overdue" : ""
          }`}
        >
          {isOverdue ? (
            <AlertCircle size={13} className="debt-card__detail-icon" />
          ) : (
            <Clock size={13} className="debt-card__detail-icon" />
          )}
          <span className="debt-card__detail-text">
            {isOverdue ? "Kechikkan: " : "Muddati: "}
            {dueDateText}
          </span>
        </div>

        {/* Joylashuv */}
        {debt.location && (
          <div className="debt-card__detail-item debt-card__detail-item--wide">
            <MapPin size={13} className="debt-card__detail-icon" />
            <span className="debt-card__detail-text">{debt.location}</span>
          </div>
        )}

        {/* Sabab / Maqsad */}
        {debt.reason && (
          <div className="debt-card__detail-item debt-card__detail-item--wide">
            <HelpCircle size={13} className="debt-card__detail-icon" />
            <span className="debt-card__detail-text">{debt.reason}</span>
          </div>
        )}
      </div>

      {/* 5. Shaxsiy eslatma (Izoh) */}
      {debt.personalNote && (
        <div className="debt-card__note">
          <FileText size={13} className="debt-card__note-icon" />
          <div className="debt-card__note-body">
            <strong>Izoh: </strong>
            <span>{debt.personalNote}</span>
          </div>
        </div>
      )}

      {/* 6. To'lovlar tarixi akkordioni */}
      {payments.length > 0 && (
        <div className="debt-card__payments-section">
          <button
            type="button"
            className="debt-card__payments-toggle"
            onClick={() => setShowPayments(!showPayments)}
          >
            <span>To'lovlar tarixi ({payments.length} ta)</span>
            {showPayments ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>

          {showPayments && (
            <div className="debt-card__payments-list">
              {payments.map((p) => (
                <div key={p.id} className="debt-card__payment-item">
                  <div className="debt-card__payment-meta">
                    <CheckCircle2 size={12} color="var(--accent)" />
                    <span>
                      {new Date(p.date).toLocaleDateString("uz-UZ", {
                        month: "short",
                        day: "numeric",
                      })}
                      {p.note && ` — ${p.note}`}
                    </span>
                  </div>
                  <span className="debt-card__payment-val mono">
                    +{formatFn(p.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 7. Pastki boshqaruv tugmalari */}
      <div className="debt-card__actions-footer">
        <button
          type="button"
          className="debt-card__btn-delete"
          onClick={() => setShowSecurityDelete(true)}
          title="O'chirish"
          aria-label="O'chirish"
        >
          <Trash2 size={14} />
          <span>O'chirish</span>
        </button>

        <div className="debt-card__action-group">
          {!isSettled ? (
            <>
              <button
                type="button"
                className="debt-card__btn-settle"
                onClick={() =>
                  onSettleDebt(debt.id, {
                    amount: remainingAmount,
                    wallet: debt.wallet,
                    affectBalance: false,
                  })
                }
                title="To'liq yopildi deb belgilash"
              >
                <CheckCircle2 size={14} />
                <span>Yopildi</span>
              </button>

              <button
                type="button"
                className="debt-card__btn-pay"
                onClick={() => onOpenRepay(debt)}
              >
                <PlusCircle size={14} />
                <span>To'lov</span>
              </button>
            </>
          ) : (
            <span className="debt-card__settled-badge">
              <CheckCircle2 size={14} />
              <span>To'liq yopilgan</span>
            </span>
          )}

          <button
            type="button"
            className="debt-card__btn-detail"
            onClick={() => onSelectDebt && onSelectDebt(debt)}
            title="Batafsil ma'lumotlar"
          >
            <Info size={14} />
            <span>Batafsil</span>
          </button>
        </div>
      </div>

      {/* Xavfsiz Parol bilan O'chirish Modali */}
      <SecurityGate
        isModal={true}
        isOpen={showSecurityDelete}
        isDanger={true}
        title="Qarzni Oʻchirish"
        subtitle={`"${debt.personName}"ga tegishli ${formatFn(totalAmount)} qarz yozuvini oʻchirish uchun 4 xonali PIN parolni kiriting`}
        onSuccess={() => {
          onDeleteDebt(debt.id);
          setShowSecurityDelete(false);
        }}
        onCancel={() => setShowSecurityDelete(false)}
      />
    </div>
  );
}
