import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Heart,
  Plus,
  Search,
  RefreshCw,
  X,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import {
  fetchCrushes,
  fetchPeopleStats,
  deletePerson,
  updateCrushStatus,
  fetchPersonById,
} from "../api/people.js";
import { CRUSH_STATUSES } from "../constants/people.js";
import { DEBT_TYPES } from "../constants/debts.js";
import { useExpenses } from "../context/ExpensesContext.jsx";
import PersonCard from "../components/people/PersonCard.jsx";
import PersonDetailModal from "../components/people/PersonDetailModal.jsx";
import AddPersonModal from "../components/people/AddPersonModal.jsx";
import EditPersonModal from "../components/people/EditPersonModal.jsx";
import ConfirmModal from "../components/common/ConfirmModal.jsx";

export default function CrushesPage() {
  const { debts } = useExpenses();
  const [crushes, setCrushes] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedCrushStatus, setSelectedCrushStatus] = useState("all");
  const [sortBy, setSortBy] = useState("name_asc");

  // Modallar
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const selectedPersonIdRef = useRef(null);
  useEffect(() => {
    selectedPersonIdRef.current = selectedPerson?.id || null;
  }, [selectedPerson?.id]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  const loadStats = useCallback(async () => {
    try {
      const statsData = await fetchPeopleStats();
      if (statsData) setStats(statsData);
    } catch (err) {
      console.error("Statistikani yuklashda xatolik:", err);
    }
  }, []);

  const loadCrushes = useCallback(async () => {
    try {
      setLoading(true);
      const crushData = await fetchCrushes({
        crushStatus: selectedCrushStatus,
        search: debouncedSearch,
        sort: sortBy,
      });
      setCrushes(crushData || []);
    } catch (err) {
      console.error("Yoqtirganlarni yuklashda xatolik:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedCrushStatus, debouncedSearch, sortBy]);

  const refreshAll = useCallback(async () => {
    await Promise.all([loadCrushes(), loadStats()]);
    const openId = selectedPersonIdRef.current;
    if (openId) {
      const refreshed = await fetchPersonById(openId);
      if (refreshed) setSelectedPerson(refreshed);
    }
  }, [loadCrushes, loadStats]);

  // Har bir yoqtirilgan inson uchun faol qarzlar yig'indisi
  const debtSummaryByPersonId = useMemo(() => {
    const map = new Map();
    if (!crushes.length || !debts?.length) return map;

    const nameCountMap = new Map();
    for (const p of crushes) {
      const n1 = (p.nickname || "").trim().toLowerCase();
      const n2 = (p.fullName || "").trim().toLowerCase();
      if (n1) nameCountMap.set(n1, (nameCountMap.get(n1) || 0) + 1);
      if (n2 && n2 !== n1) nameCountMap.set(n2, (nameCountMap.get(n2) || 0) + 1);
    }

    for (const p of crushes) {
      const nick = (p.nickname || "").trim().toLowerCase();
      const full = (p.fullName || "").trim().toLowerCase();
      let activeCount = 0;
      let givenCount = 0;
      let takenCount = 0;
      let givenUzs = 0;
      let givenUsd = 0;
      let takenUzs = 0;
      let takenUsd = 0;
      let remainingUzs = 0;
      let remainingUsd = 0;

      for (const d of debts) {
        if (d.status === "settled" || d.status === "forgiven") continue;
        const dPersonId = d.personId || d.linkedPerson?.id || null;
        let isMatch = false;
        if (dPersonId) {
          isMatch = dPersonId === p.id;
        } else {
          const dName = (d.personName || "").trim().toLowerCase();
          if (dName && ((dName === nick && (nameCountMap.get(nick) || 0) === 1) || (full && dName === full && (nameCountMap.get(full) || 0) === 1))) {
            isMatch = true;
          }
        }
        if (!isMatch) continue;

        const paid = (d.payments || []).reduce((acc, pm) => acc + Number(pm.amount || 0), 0);
        const rem = Math.max(0, Number(d.amount || 0) - paid);
        if (rem > 0) {
          activeCount += 1;
          const isUsd = d.currency === "USD";
          if (d.type === DEBT_TYPES.TAKEN) {
            takenCount += 1;
            if (isUsd) takenUsd += rem;
            else takenUzs += rem;
          } else {
            givenCount += 1;
            if (isUsd) givenUsd += rem;
            else givenUzs += rem;
          }
          if (isUsd) remainingUsd += rem;
          else remainingUzs += rem;
        }
      }
      if (activeCount > 0) {
        map.set(p.id, {
          activeCount,
          givenCount,
          takenCount,
          givenUzs,
          givenUsd,
          takenUzs,
          takenUsd,
          remainingUzs,
          remainingUsd,
        });
      }
    }
    return map;
  }, [crushes, debts]);

  useEffect(() => {
    loadCrushes();
  }, [loadCrushes]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const handleCardClick = async (person) => {
    try {
      const full = await fetchPersonById(person.id);
      setSelectedPerson(full || person);
      setIsDetailOpen(true);
    } catch (err) {
      setSelectedPerson(person);
      setIsDetailOpen(true);
    }
  };

  const handleToggleCrush = async (person) => {
    try {
      await updateCrushStatus(person.id, {
        isCrush: false,
        crushStatus: null,
        crushStartedOn: null,
      });
      refreshAll();
    } catch (err) {
      setFeedback({ type: "error", message: "Xatolik: " + err.message });
    }
  };

  const handleRequestDeletePerson = (person) => {
    setDeleteTarget(person);
  };

  const handleConfirmDeletePerson = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deletePerson(deleteTarget.id);
      setFeedback({
        type: "success",
        message: `"${deleteTarget.nickname}" kartasi o'chirildi.`,
      });
      setDeleteTarget(null);
      setIsDetailOpen(false);
      setSelectedPerson(null);
      refreshAll();
    } catch (err) {
      setFeedback({ type: "error", message: "O'chirishda xatolik: " + err.message });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEditPerson = (person) => {
    setSelectedPerson(person);
    setIsDetailOpen(false);
    setIsEditOpen(true);
  };

  return (
    <div className="people-container">
      {/* Pushti va zumrad yashil ambient nur */}
      <div className="people-ambient-glow people-ambient-glow--pink" />

      {/* Sarlavha paneli */}
      <div className="people-hero">
        <div className="people-title-group">
          <h1>
            <Heart size={28} fill="#f472b6" color="#f472b6" />
            <span>Yoqtirganlar</span>
          </h1>
          <p>
            Sizga yoqqan insonlar, ularga bo'lgan his-tuyg'ular va munosabat bosqichlari
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <button
            type="button"
            onClick={refreshAll}
            className="people-btn-secondary"
            title="Yangilash"
            style={{ padding: "0.6rem 0.85rem" }}
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          </button>

          <button
            type="button"
            onClick={() => setIsAddOpen(true)}
            className="people-btn-primary"
            style={{
              background: "linear-gradient(135deg, #ec4899 0%, #10b981 100%)",
              borderColor: "rgba(244, 114, 182, 0.4)",
            }}
          >
            <Plus size={16} />
            <span>Yangi qo'shish</span>
          </button>
        </div>
      </div>

      {/* Amallar xabarnomasi */}
      {feedback && (
        <div className={`people-feedback-banner people-feedback-banner--${feedback.type}`}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            {feedback.type === "error" ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
            <span>{feedback.message}</span>
          </div>
          <button type="button" onClick={() => setFeedback(null)} className="people-feedback-close">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Toolbar va filtrlash */}
      <div className="people-toolbar" style={{ borderColor: "rgba(244, 114, 182, 0.25)" }}>
        <div className="people-search-row">
          <div className="people-search-box">
            <Search size={16} className="people-search-icon" />
            <input
              type="text"
              className="people-search-input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Ism, telefon, @telegram, @instagram orqali qidirish..."
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                style={{
                  position: "absolute",
                  right: "10px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "transparent",
                  border: "none",
                  color: "var(--text-muted)",
                  cursor: "pointer",
                  padding: "4px",
                }}
                title="Qidiruvni tozalash"
              >
                <X size={15} />
              </button>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="people-form-select"
              style={{ minWidth: "150px", padding: "0.65rem 0.85rem" }}
            >
              <option value="name_asc">Ism (A-Z)</option>
              <option value="name_desc">Ism (Z-A)</option>
              <option value="created_desc">Yangi qo'shilganlar</option>
              <option value="met_desc">Tanishgan sanasi</option>
            </select>
          </div>
        </div>

        {/* His-tuyg'u bosqichlari filter tugmalari */}
        <div className="people-categories-scroll">
          {CRUSH_STATUSES.map((st) => (
            <button
              key={st.value}
              type="button"
              className={`people-filter-btn ${
                selectedCrushStatus === st.value ? "is-active" : ""
              }`}
              style={
                selectedCrushStatus === st.value
                  ? {
                      background: "rgba(244, 114, 182, 0.2)",
                      borderColor: "rgba(244, 114, 182, 0.6)",
                      color: "#fbcfe8",
                    }
                  : {}
              }
              onClick={() => setSelectedCrushStatus(st.value)}
            >
              <span>{st.label}</span>
              {st.value !== "all" && stats?.byCrushStatus?.[st.value] !== undefined && (
                <span
                  style={{
                    fontSize: "0.72rem",
                    opacity: 0.8,
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  ({stats.byCrushStatus[st.value] || 0})
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Ro'yxat */}
      {loading && crushes.length === 0 ? (
        <div className="people-empty-state">
          <RefreshCw size={28} className="animate-spin" color="#f472b6" />
          <p>Yoqtirganlar ro'yxati yuklanmoqda...</p>
        </div>
      ) : crushes.length > 0 ? (
        <div className="people-grid">
          {crushes.map((person) => (
            <PersonCard
              key={person.id}
              person={person}
              debtSummary={debtSummaryByPersonId.get(person.id) || null}
              onClick={handleCardClick}
              onToggleCrush={handleToggleCrush}
            />
          ))}
        </div>
      ) : (
        <div className="people-empty-state">
          <div
            className="people-empty-icon"
            style={{
              background: "rgba(244, 114, 182, 0.12)",
              borderColor: "rgba(244, 114, 182, 0.25)",
              color: "#f472b6",
            }}
          >
            <Heart size={28} fill="#f472b6" />
          </div>
          <h3>Yoqtirganlar ro'yxati hozircha bo'sh</h3>
          <p>
            {search || selectedCrushStatus !== "all"
              ? "Tanlangan bosqich yoki qidiruv bo'yicha hech kim topilmadi."
              : "Sizga yoqqan insonlarni shu yerda alohida saqlashingiz va his-tuyg'ularingiz dinamikasini kuzatib borishingiz mumkin."}
          </p>
          <button
            type="button"
            onClick={() => setIsAddOpen(true)}
            className="people-btn-primary"
            style={{
              marginTop: "0.5rem",
              background: "linear-gradient(135deg, #ec4899 0%, #10b981 100%)",
            }}
          >
            <Plus size={15} />
            <span>Yangi inson qo'shish</span>
          </button>
        </div>
      )}

      {/* MODALLAR */}
      {isDetailOpen && selectedPerson && (
        <PersonDetailModal
          person={selectedPerson}
          onClose={() => {
            setIsDetailOpen(false);
            setSelectedPerson(null);
          }}
          onEdit={handleEditPerson}
          onDelete={handleRequestDeletePerson}
          onRefresh={refreshAll}
        />
      )}

      {isAddOpen && (
        <AddPersonModal
          initialIsCrush={true}
          onClose={() => setIsAddOpen(false)}
          onSuccess={refreshAll}
        />
      )}

      {isEditOpen && selectedPerson && (
        <EditPersonModal
          person={selectedPerson}
          onClose={() => {
            setIsEditOpen(false);
            setSelectedPerson(null);
          }}
          onSuccess={refreshAll}
        />
      )}

      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        title="Shaxs kartasini o'chirish"
        message={
          deleteTarget
            ? `"${deleteTarget.nickname}" kartasini va unga tegishli shaxsiy ma'lumotlarni o'chirishni tasdiqlaysizmi?`
            : ""
        }
        confirmLabel="Ha, o'chirish"
        cancelLabel="Bekor qilish"
        variant="danger"
        isLoading={isDeleting}
        onConfirm={handleConfirmDeletePerson}
        onCancel={() => !isDeleting && setDeleteTarget(null)}
      />
    </div>
  );
}
