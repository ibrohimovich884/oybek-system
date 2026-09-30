import { useState } from "react";
import { Link } from "react-router-dom";
import {
  HandCoins,
  ArrowRight,
  PlusCircle,
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { useExpenses } from "../../context/ExpensesContext.jsx";
import { formatSum, formatDollar } from "../../utils/format.js";
import { DEBT_TYPES } from "../../constants/debts.js";
import AddDebtModal from "../debts/AddDebtModal.jsx";

export default function PendingDebtsCard() {
  const { debts, addDebt } = useExpenses();
  const [isAddOpen, setIsAddOpen] = useState(false);

  // Faol qarzlar hisobi
  const activeDebts = debts.filter((d) => d.status !== "settled");

  let givenUzs = 0;
  let givenUsd = 0;
  let takenUzs = 0;
  let takenUsd = 0;

  activeDebts.forEach((debt) => {
    const totalAmount = Number(debt.amount || 0);
    const paid = (debt.payments || []).reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const remaining = Math.max(0, totalAmount - paid);

    if (debt.type === DEBT_TYPES.GIVEN) {
      if (debt.currency === "USD") givenUsd += remaining;
      else givenUzs += remaining;
    } else {
      if (debt.currency === "USD") takenUsd += remaining;
      else takenUzs += remaining;
    }
  });

  return (
    <div className="control-card control-card--debts">
      <div className="control-card__header">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            className="control-card__icon-wrapper"
            style={{ background: "rgba(56, 189, 248, 0.15)", color: "#38bdf8" }}
          >
            <HandCoins size={20} />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <h4 className="control-card__title">Qarz daftarchasi</h4>
              <span className="badge badge--success" style={{ fontSize: "0.68rem" }}>
                Faol modul
              </span>
            </div>
            <span className="control-card__subtitle">
              Kutilayotgan pullar, berilgan va olingan qarzlar balansi
            </span>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            className="btn btn--subtle btn--xs"
            onClick={() => setIsAddOpen(true)}
            style={{ display: "flex", alignItems: "center", gap: 4 }}
          >
            <PlusCircle size={13} />
            <span>Yangi qarz</span>
          </button>

          <Link
            to="/debts"
            className="btn btn--primary btn--xs"
            style={{ display: "flex", alignItems: "center", gap: 4 }}
          >
            <span>Daftarni ochish</span>
            <ArrowRight size={13} />
          </Link>
        </div>
      </div>

      {/* Tezkor ko'rsatkichlar */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 10,
          marginTop: 14,
        }}
      >
        {/* Berilgan qarzlar */}
        <div
          style={{
            padding: "10px 14px",
            background: "var(--surface-sunken)",
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--border)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.78rem", color: "#38bdf8", fontWeight: 600 }}>
            <ArrowUpRight size={14} />
            <span>Kutilayotgan (Men bergan)</span>
          </div>
          <div className="mono" style={{ fontSize: "1.15rem", fontWeight: 700, marginTop: 4, color: "var(--text)" }}>
            {formatSum(givenUzs)}
          </div>
          {givenUsd > 0 && (
            <div style={{ fontSize: "0.8rem", color: "var(--dollar)", fontWeight: 600 }}>
              + {formatDollar(givenUsd)}
            </div>
          )}
        </div>

        {/* Olingan qarzlar */}
        <div
          style={{
            padding: "10px 14px",
            background: "var(--surface-sunken)",
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--border)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.78rem", color: "#f59e0b", fontWeight: 600 }}>
            <ArrowDownLeft size={14} />
            <span>Qarzim (Men olgan)</span>
          </div>
          <div className="mono" style={{ fontSize: "1.15rem", fontWeight: 700, marginTop: 4, color: "var(--expense)" }}>
            {formatSum(takenUzs)}
          </div>
          {takenUsd > 0 && (
            <div style={{ fontSize: "0.8rem", color: "var(--expense)", fontWeight: 600 }}>
              + {formatDollar(takenUsd)}
            </div>
          )}
        </div>
      </div>

      {/* Oxirgi 2 ta faol qarz */}
      {activeDebts.length > 0 ? (
        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600 }}>
            So'nggi yozuvlar:
          </span>
          {activeDebts.slice(0, 2).map((d) => {
            const isGiven = d.type === DEBT_TYPES.GIVEN;
            const formatFn = d.currency === "USD" ? formatDollar : formatSum;
            return (
              <div
                key={d.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "6px 10px",
                  background: "var(--surface-sunken)",
                  borderRadius: 6,
                  fontSize: "0.82rem",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {isGiven ? (
                    <ArrowUpRight size={14} color="#38bdf8" />
                  ) : (
                    <ArrowDownLeft size={14} color="#f59e0b" />
                  )}
                  <span style={{ fontWeight: 600, color: "var(--text)" }}>{d.personName}</span>
                  {d.reason && (
                    <span style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>
                      ({d.reason})
                    </span>
                  )}
                </div>
                <span className="mono font-semibold" style={{ color: isGiven ? "#38bdf8" : "#f59e0b" }}>
                  {formatFn(d.amount)}
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ marginTop: 10, fontSize: "0.8rem", color: "var(--text-muted)", fontStyle: "italic" }}>
          Hozirda kutilayotgan faol qarzlar mavjud emas.
        </div>
      )}

      <AddDebtModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onAddDebt={addDebt}
      />
    </div>
  );
}
