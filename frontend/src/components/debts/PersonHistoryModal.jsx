import React, { useState, useMemo } from "react";
import {
  X,
  Phone,
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  AlertCircle,
  PlusCircle,
  HeartHandshake,
  DollarSign,
  Copy,
  Check,
  ChevronRight,
  ArrowUpRight,
  ArrowDownLeft,
  FileText,
  BadgeCheck,
  User,
  History,
  FolderOpen,
} from "lucide-react";
import { formatSum, formatDollar } from "../../utils/format.js";
import {
  DEBT_TYPES,
  DEBT_TYPE_LABELS,
  DEBT_STATUS_LABELS,
  getDebtDueInfo,
  DUE_STAGES,
} from "../../constants/debts.js";
import { WALLET_CONFIG } from "../../constants/money.js";

export default function PersonHistoryModal({
  isOpen,
  onClose,
  personName,
  debts = [],
  onOpenRepay,
  onOpenForgive,
  onOpenDebtDetail,
  onAddNewDebtForPerson,
  onSettleDebt,
}) {
  const [activeTab, setActiveTab] = useState("debts"); // "debts" | "timeline"
  const [copiedPhone, setCopiedPhone] = useState(false);

  // Ushbu shaxsga tegishli barcha qarzlarni yig'ib olamiz
  const personDebts = useMemo(() => {
    if (!personName) return [];
    const normalizedTarget = personName.trim().toLowerCase();
    return debts
      .filter((d) => (d.personName || "").trim().toLowerCase() === normalizedTarget)
      .sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt));
  }, [debts, personName]);

  // Telefon raqami va joylashuvni eng so'nggi ma'lumotdan olamiz
  const personContact = useMemo(() => {
    const withPhone = personDebts.find((d) => Boolean(d.contact));
    return withPhone ? withPhone.contact : "";
  }, [personDebts]);

  const personLocation = useMemo(() => {
    const withLoc = personDebts.find((d) => Boolean(d.location));
    return withLoc ? withLoc.location : "";
  }, [personDebts]);

  // Umumiy yig'ilgan statistika (Barcha olingan va yopilgan qarzlar yig'indisi)
  const stats = useMemo(() => {
    let givenUzs = 0;
    let givenUsd = 0;
    let takenUzs = 0;
    let takenUsd = 0;
    let repaidUzs = 0;
    let repaidUsd = 0;
    let forgivenUzs = 0;
    let forgivenUsd = 0;
    let activeRemainingUzs = 0;
    let activeRemainingUsd = 0;

    let pendingCount = 0;
    let settledCount = 0;
    let forgivenCount = 0;
    let overdueCount = 0;

    personDebts.forEach((debt) => {
      const isUsd = debt.currency === "USD";
      const total = Number(debt.amount || 0);
      const isGiven = debt.type === DEBT_TYPES.GIVEN;
      const isSettled = debt.status === "settled";
      const isForgiven = debt.status === "forgiven";

      if (isGiven) {
        if (isUsd) givenUsd += total;
        else givenUzs += total;
      } else {
        if (isUsd) takenUsd += total;
        else takenUzs += total;
      }

      // To'lovlar hisobi
      let debtPaid = 0;
      let debtForgiven = 0;
      (debt.payments || []).forEach((p) => {
        const pAmt = Number(p.amount || 0);
        if (p.isForgiven) {
          debtForgiven += pAmt;
        } else {
          debtPaid += pAmt;
        }
      });

      if (isUsd) {
        repaidUsd += debtPaid;
        forgivenUsd += debtForgiven;
      } else {
        repaidUzs += debtPaid;
        forgivenUzs += debtForgiven;
      }

      const remaining = isSettled || isForgiven ? 0 : Math.max(0, total - debtPaid - debtForgiven);
      if (remaining > 0) {
        pendingCount += 1;
        if (isUsd) activeRemainingUsd += remaining;
        else activeRemainingUzs += remaining;

        const dueInfo = getDebtDueInfo(debt);
        if (dueInfo.isOverdue) overdueCount += 1;
      } else if (isForgiven) {
        forgivenCount += 1;
      } else {
        settledCount += 1;
      }
    });

    return {
      totalDebtsCount: personDebts.length,
      givenUzs,
      givenUsd,
      takenUzs,
      takenUsd,
      repaidUzs,
      repaidUsd,
      forgivenUzs,
      forgivenUsd,
      activeRemainingUzs,
      activeRemainingUsd,
      pendingCount,
      settledCount,
      forgivenCount,
      overdueCount,
    };
  }, [personDebts]);

  // Barcha to'lovlar va kechishlar vaqt shkalasi (timeline)
  const timelineEvents = useMemo(() => {
    const events = [];
    personDebts.forEach((debt) => {
      // Qarz olingan/berilgan voqea
      events.push({
        id: `created_${debt.id}`,
        type: "debt_created",
        debtId: debt.id,
        debtType: debt.type,
        date: debt.date || debt.createdAt,
        amount: Number(debt.amount || 0),
        currency: debt.currency || "UZS",
        note: debt.reason || (debt.type === "given" ? "Qarz berildi" : "Qarz olindi"),
        debt,
      });

      // To'lovlar va kechishlar
      (debt.payments || []).forEach((p, idx) => {
        events.push({
          id: p.id || `p_${debt.id}_${idx}`,
          type: p.isForgiven || debt.status === "forgiven" ? "forgiven" : "payment",
          debtId: debt.id,
          debtType: debt.type,
          date: p.date || p.paidAt || debt.updatedAt,
          amount: Number(p.amount || 0),
          currency: debt.currency || "UZS",
          note: p.note || (p.isForgiven ? "Qarzdan voz kechildi" : "Qarz to'lovi"),
          wallet: p.wallet || debt.wallet,
          debt,
        });
      });
    });

    events.sort((a, b) => new Date(b.date) - new Date(a.date));
    return events;
  }, [personDebts]);

  if (!isOpen || !personName) return null;

  const handleCopyPhone = () => {
    if (!personContact) return;
    navigator.clipboard.writeText(personContact);
    setCopiedPhone(true);
    setTimeout(() => setCopiedPhone(false), 2000);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content modal-content--wide person-history-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-mobile-handle" />

        {/* Modal Header: Shaxs Profili */}
        <div className="modal-header person-history-header">
          <div className="person-history-header__profile">
            <div className="person-history-avatar">
              {personName.charAt(0).toUpperCase()}
            </div>

            <div className="person-history-header__info">
              <div className="person-history-name-row">
                <h3 className="person-history-name">{personName}</h3>
                <span className="badge badge--neutral">
                  Jami {stats.totalDebtsCount} ta qarz
                </span>
                {stats.overdueCount > 0 && (
                  <span className="badge badge--danger" style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                    <AlertCircle size={10} />
                    {stats.overdueCount} ta muddati o'tgan!
                  </span>
                )}
              </div>

              <div className="person-history-meta-row">
                {personContact && (
                  <span className="person-history-contact-tag">
                    <Phone size={11} /> {personContact}
                  </span>
                )}
                {personLocation && (
                  <span className="person-history-loc-tag">
                    <MapPin size={11} /> {personLocation}
                  </span>
                )}
                <span className="person-history-status-tag">
                  Faol: <strong>{stats.pendingCount}</strong> • Yopilgan: <strong>{stats.settledCount}</strong> • Voz kechilgan: <strong>{stats.forgivenCount}</strong>
                </span>
              </div>
            </div>
          </div>

          <div className="person-history-header__actions">
            {personContact && (
              <a
                href={`tel:${personContact.replace(/[^\d+]/g, "")}`}
                className="btn btn--xs btn--primary"
                style={{ textDecoration: "none" }}
              >
                <Phone size={12} />
                <span>Qo'ng'iroq</span>
              </a>
            )}

            <button
              type="button"
              className="modal-close-btn"
              onClick={onClose}
              aria-label="Yopish"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="modal-body person-history-body">
          {/* 1. Umumiy Konsolidatsiyalangan Hisob-Kitob (KPI Kartalar) */}
          <div className="person-history-stats-grid">
            {/* Hozirgi qarz qoldig'i (Eng muhimi!) */}
            <div
              className={`person-kpi-card ${
                stats.activeRemainingUzs > 0 || stats.activeRemainingUsd > 0
                  ? "person-kpi-card--active-debt"
                  : "person-kpi-card--settled"
              }`}
            >
              <span className="person-kpi-card__lbl">Hozirgi qarz qoldig'i</span>
              <div className="person-kpi-card__val mono">
                {stats.activeRemainingUzs > 0 || stats.activeRemainingUsd > 0
                  ? formatSum(stats.activeRemainingUzs)
                  : "0 UZS (To'liq yopilgan)"}
              </div>
              {stats.activeRemainingUsd > 0 && (
                <div className="person-kpi-card__sub mono">
                  + {formatDollar(stats.activeRemainingUsd)}
                </div>
              )}
              <span className="person-kpi-card__hint">
                {stats.pendingCount > 0
                  ? `${stats.pendingCount} ta qarz yopilishi kutilmoqda`
                  : "Ushbu shaxs bilan qarzlar nol bo'lgan"}
              </span>
            </div>

            {/* Jami berilgan */}
            <div className="person-kpi-card">
              <span className="person-kpi-card__lbl">Jami berilgan qarz</span>
              <div className="person-kpi-card__val mono" style={{ color: "var(--accent)" }}>
                {formatSum(stats.givenUzs)}
              </div>
              {stats.givenUsd > 0 && (
                <div className="person-kpi-card__sub mono">
                  + {formatDollar(stats.givenUsd)}
                </div>
              )}
              <span className="person-kpi-card__hint">Barcha vaqtlar davomida</span>
            </div>

            {/* Jami qaytargan */}
            <div className="person-kpi-card">
              <span className="person-kpi-card__lbl">Qaytarilgan to'lovlar</span>
              <div className="person-kpi-card__val mono" style={{ color: "var(--income)" }}>
                {formatSum(stats.repaidUzs)}
              </div>
              {stats.repaidUsd > 0 && (
                <div className="person-kpi-card__sub mono">
                  + {formatDollar(stats.repaidUsd)}
                </div>
              )}
              <span className="person-kpi-card__hint">Real to'langan summa</span>
            </div>

            {/* Voz kechilgan summa */}
            <div className="person-kpi-card" style={{ borderColor: "rgba(168, 85, 247, 0.3)" }}>
              <span className="person-kpi-card__lbl" style={{ color: "#c084fc" }}>
                Voz kechilgan (Kechilgan)
              </span>
              <div className="person-kpi-card__val mono" style={{ color: "#c084fc" }}>
                {formatSum(stats.forgivenUzs)}
              </div>
              {stats.forgivenUsd > 0 && (
                <div className="person-kpi-card__sub mono">
                  + {formatDollar(stats.forgivenUsd)}
                </div>
              )}
              <span className="person-kpi-card__hint">Qaytarilmasdan kechilgan</span>
            </div>
          </div>

          {/* 2. Sub-tablar: Barcha qarzlar ro'yxati vs Xronologik vaqt jadvali */}
          <div className="person-tabs-bar">
            <button
              type="button"
              className={`person-tab-btn ${activeTab === "debts" ? "is-active" : ""}`}
              onClick={() => setActiveTab("debts")}
            >
              <FolderOpen size={14} />
              <span>Barcha qarzlar ({personDebts.length})</span>
            </button>

            <button
              type="button"
              className={`person-tab-btn ${activeTab === "timeline" ? "is-active" : ""}`}
              onClick={() => setActiveTab("timeline")}
            >
              <History size={14} />
              <span>To'lovlar & Voqealar tarixi ({timelineEvents.length})</span>
            </button>
          </div>

          {/* 3. Tab tarkibi */}
          {activeTab === "debts" ? (
            <div className="person-debts-list">
              {personDebts.map((debt, index) => {
                const isGiven = debt.type === DEBT_TYPES.GIVEN;
                const isUsd = debt.currency === "USD";
                const formatFn = isUsd ? formatDollar : formatSum;

                const totalAmount = Number(debt.amount || 0);
                const payments = debt.payments || [];
                const paidAmount = payments.reduce((acc, p) => acc + (p.isForgiven ? 0 : Number(p.amount || 0)), 0);
                const forgivenAmount = payments.reduce((acc, p) => acc + (p.isForgiven ? Number(p.amount || 0) : 0), 0);
                const isSettled = debt.status === "settled";
                const isForgiven = debt.status === "forgiven";
                const remaining = isSettled || isForgiven ? 0 : Math.max(0, totalAmount - paidAmount - forgivenAmount);

                const statusCfg = DEBT_STATUS_LABELS[debt.status] || DEBT_STATUS_LABELS.pending;
                const dueInfo = getDebtDueInfo(debt);

                return (
                  <div
                    key={debt.id}
                    className={`person-debt-item ${
                      isSettled
                        ? "person-debt-item--settled"
                        : isForgiven
                        ? "person-debt-item--forgiven"
                        : dueInfo.isOverdue
                        ? "person-debt-item--overdue"
                        : ""
                    }`}
                  >
                    {/* Yuqori qator */}
                    <div className="person-debt-item__top">
                      <div className="person-debt-item__title-wrap">
                        <span className="person-debt-num">#{index + 1}</span>
                        <span
                          className={`debt-type-pill ${
                            isGiven ? "debt-type-pill--given" : "debt-type-pill--taken"
                          }`}
                        >
                          {isGiven ? <ArrowUpRight size={11} /> : <ArrowDownLeft size={11} />}
                          <span>{isGiven ? "Berilgan qarz" : "Olingan qarz"}</span>
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

                        {dueInfo.isOverdue && !isSettled && !isForgiven && (
                          <span className="debt-due-pill debt-due-pill--overdue">
                            <AlertCircle size={11} />
                            <span>{dueInfo.text}</span>
                          </span>
                        )}
                      </div>

                      <div className="person-debt-item__amount-wrap">
                        <span
                          className={`person-debt-amount mono ${
                            isSettled
                              ? "person-debt-amount--settled"
                              : isForgiven
                              ? "person-debt-amount--forgiven"
                              : isGiven
                              ? "person-debt-amount--given"
                              : "person-debt-amount--taken"
                          }`}
                        >
                          {isGiven ? "+" : "-"}{formatFn(totalAmount)}
                        </span>

                        {!isSettled && !isForgiven && remaining > 0 && (
                          <span className="person-debt-remaining mono">
                            Qoldiq: {formatFn(remaining)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Tafsilotlar: Sabab, sana, muddat, hamyon */}
                    <div className="person-debt-item__details">
                      <span className="person-debt-detail">
                        <Calendar size={11} />
                        {new Date(debt.date || debt.createdAt).toLocaleDateString("uz-UZ", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>

                      <span className="person-debt-detail">
                        <Clock size={11} />
                        Muddati: {dueInfo.text}
                      </span>

                      {debt.wallet && (
                        <span className="person-debt-detail">
                          Hamyon: {WALLET_CONFIG[debt.wallet]?.shortLabel || debt.wallet}
                        </span>
                      )}

                      {debt.reason && (
                        <span className="person-debt-reason">
                          Sababi: <em>{debt.reason}</em>
                        </span>
                      )}
                    </div>

                    {/* Kechilgan / to'langan summa ma'lumoti */}
                    {(paidAmount > 0 || forgivenAmount > 0) && (
                      <div className="person-debt-item__paid-info">
                        {paidAmount > 0 && (
                          <span className="person-paid-badge mono">
                            To'langan: {formatFn(paidAmount)}
                          </span>
                        )}
                        {forgivenAmount > 0 && (
                          <span className="person-forgiven-badge mono">
                            Voz kechilgan: {formatFn(forgivenAmount)}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Amallar tugmalari */}
                    <div className="person-debt-item__actions">
                      {!isSettled && !isForgiven && (
                        <>
                          <button
                            type="button"
                            className="btn btn--xs btn--primary"
                            onClick={() => {
                              onOpenRepay(debt);
                            }}
                          >
                            <PlusCircle size={12} />
                            <span>To'lov olish</span>
                          </button>

                          <button
                            type="button"
                            className="btn btn--xs"
                            style={{
                              background: "rgba(168, 85, 247, 0.15)",
                              color: "#c084fc",
                              border: "1px solid rgba(168, 85, 247, 0.3)",
                            }}
                            onClick={() => {
                              onOpenForgive(debt);
                            }}
                            title="Bu qarzdan voz kechish (kechib yuborish)"
                          >
                            <HeartHandshake size={12} />
                            <span>Voz kechish</span>
                          </button>

                          <button
                            type="button"
                            className="btn btn--xs btn--ghost"
                            onClick={() =>
                              onSettleDebt(debt.id, {
                                amount: remaining,
                                wallet: debt.wallet,
                                affectBalance: false,
                              })
                            }
                            title="To'liq yopildi deb belgilash"
                          >
                            <CheckCircle2 size={12} />
                            <span>Yopildi</span>
                          </button>
                        </>
                      )}

                      <button
                        type="button"
                        className="btn btn--xs btn--ghost"
                        onClick={() => onOpenDebtDetail(debt)}
                        style={{ marginLeft: "auto" }}
                      >
                        <span>Batafsil</span>
                        <ChevronRight size={12} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="person-timeline-list">
              {timelineEvents.map((evt) => {
                const isDebtCreated = evt.type === "debt_created";
                const isForgiven = evt.type === "forgiven";
                const isPayment = evt.type === "payment";
                const isUsd = evt.currency === "USD";
                const formatFn = isUsd ? formatDollar : formatSum;

                return (
                  <div key={evt.id} className="person-timeline-item">
                    <div
                      className={`person-timeline-icon ${
                        isDebtCreated
                          ? "person-timeline-icon--create"
                          : isForgiven
                          ? "person-timeline-icon--forgive"
                          : "person-timeline-icon--pay"
                      }`}
                    >
                      {isDebtCreated ? (
                        <FileText size={13} />
                      ) : isForgiven ? (
                        <HeartHandshake size={13} />
                      ) : (
                        <CheckCircle2 size={13} />
                      )}
                    </div>

                    <div className="person-timeline-content">
                      <div className="person-timeline-top">
                        <div className="person-timeline-title">
                          {isDebtCreated
                            ? evt.debtType === "given"
                              ? "Qarz berildi"
                              : "Qarz olindi"
                            : isForgiven
                            ? "Qarzdan voz kechildi (Kechildi)"
                            : "Qarz to'lovi qaytarildi"}
                        </div>
                        <span
                          className={`person-timeline-amount mono ${
                            isDebtCreated
                              ? "person-timeline-amount--debt"
                              : isForgiven
                              ? "person-timeline-amount--forgive"
                              : "person-timeline-amount--pay"
                          }`}
                        >
                          {isDebtCreated ? "" : "+"}{formatFn(evt.amount)}
                        </span>
                      </div>

                      <div className="person-timeline-meta">
                        <span>
                          {new Date(evt.date).toLocaleDateString("uz-UZ", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                        {evt.note && <span>• {evt.note}</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer: Yangi qarz kiritish va yopish */}
        <div className="modal-footer person-history-footer">
          <button
            type="button"
            className="btn btn--sm btn--primary"
            onClick={() => {
              onClose();
              onAddNewDebtForPerson({ personName, contact: personContact });
            }}
          >
            <PlusCircle size={15} />
            <span>+ Yangi qarz yozish ({personName})</span>
          </button>

          <button
            type="button"
            className="btn btn--sm btn--ghost"
            onClick={onClose}
          >
            <span>Yopish</span>
          </button>
        </div>
      </div>
    </div>
  );
}
