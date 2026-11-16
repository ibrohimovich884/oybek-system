import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Users,
  UserCheck,
  UserX,
  Heart,
  Plus,
  Search,
  RefreshCw,
  X,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import {
  fetchPeople,
  fetchPeopleStats,
  deletePerson,
  updateCrushStatus,
  fetchPersonById,
} from "../api/people.js";
import { PERSON_CATEGORIES, TRUST_LEVEL_OPTIONS } from "../constants/people.js";
import { DEBT_TYPES } from "../constants/debts.js";
import { useExpenses } from "../context/ExpensesContext.jsx";
import PersonCard from "../components/people/PersonCard.jsx";
import PersonDetailModal from "../components/people/PersonDetailModal.jsx";
import AddPersonModal from "../components/people/AddPersonModal.jsx";
import EditPersonModal from "../components/people/EditPersonModal.jsx";
import ConfirmModal from "../components/common/ConfirmModal.jsx";

export default function PeoplePage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { debts } = useExpenses();
  const [people, setPeople] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    lostContact: 0,
    crushes: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedTrustLevel, setSelectedTrustLevel] = useState("all");
  const [sortBy, setSortBy] = useState("name_asc");

  // Modallar holati
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

  // Qidiruv matnini 250ms kechikish bilan serverga yuborish
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

  const loadPeopleList = useCallback(async () => {
    try {
      setLoading(true);
      const peopleData = await fetchPeople({
        category: selectedCategory,
        status: selectedStatus,
        trustLevel: selectedTrustLevel,
        search: debouncedSearch,
        sort: sortBy,
      });
      setPeople(peopleData || []);
    } catch (err) {
      console.error("Odamlarni yuklashda xatolik:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, selectedStatus, selectedTrustLevel, debouncedSearch, sortBy]);

  const refreshAll = useCallback(async () => {
    await Promise.all([loadPeopleList(), loadStats()]);
    const openId = selectedPersonIdRef.current;
    if (openId) {
      const refreshed = await fetchPersonById(openId);
      if (refreshed) setSelectedPerson(refreshed);
    }
  }, [loadPeopleList, loadStats]);

  useEffect(() => {
    loadPeopleList();
  }, [loadPeopleList]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  // URL (?personId=...) orqali kelganda shaxs kartasini ochish
  useEffect(() => {
    const viewPersonId = searchParams.get("personId");
    if (!viewPersonId) return;
    fetchPersonById(viewPersonId)
      .then((person) => {
        if (person) {
          setSelectedPerson(person);
          setIsDetailOpen(true);
        }
      })
      .catch(() => {})
      .finally(() => {
        const next = new URLSearchParams(searchParams);
        next.delete("personId");
        setSearchParams(next, { replace: true });
      });
  }, [searchParams, setSearchParams]);

  // Har bir odam uchun faol qarzlar yig'indisini yo'nalishi bilan hisoblash
  const debtSummaryByPersonId = useMemo(() => {
    const map = new Map();
    if (!people.length || !debts?.length) return map;

    const nameCountMap = new Map();
    for (const p of people) {
      const n1 = (p.nickname || "").trim().toLowerCase();
      const n2 = (p.fullName || "").trim().toLowerCase();
      if (n1) nameCountMap.set(n1, (nameCountMap.get(n1) || 0) + 1);
      if (n2 && n2 !== n1) nameCountMap.set(n2, (nameCountMap.get(n2) || 0) + 1);
    }

    for (const p of people) {
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
  }, [people, debts]);

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
      const isNowCrush = !person.isCrush;
      await updateCrushStatus(person.id, {
        isCrush: isNowCrush,
        crushStatus: isNowCrush ? "liked" : null,
        crushStartedOn: isNowCrush ? new Date().toISOString().slice(0, 10) : null,
      });
      refreshAll();
    } catch (err) {
      setFeedback({
        type: "error",
        message: "Yoqtirganlar holatini o'zgartirishda xatolik: " + err.message,
      });
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
      setFeedback({
        type: "error",
        message: "O'chirishda xatolik: " + err.message,
      });
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
      {/* Yashil ambient nur effekti */}
      <div className="people-ambient-glow" />

      {/* Sarlavha paneli */}
      <div className="people-hero">
        <div className="people-title-group">
          <h1>
            <Users size={28} color="#4eb896" />
            <span>Odamlar</span>
          </h1>
          <p>Tanishingiz bo'lgan barcha insonlarning shaxsiy kartalari va tarixi</p>
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
          >
            <Plus size={16} />
            <span>Yangi tanish qo'shish</span>
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

      {/* Statistika kartalari (Frosted glass + blur, bosganda tezkor filtrlaydi) */}
      <div className="people-stats-grid">
        <div
          className="people-stat-card"
          onClick={() => {
            setSelectedCategory("all");
            setSelectedStatus("all");
            setSelectedTrustLevel("all");
            setSearch("");
          }}
          style={{ cursor: "pointer" }}
          title="Barcha tanishlarni ko'rsatish"
        >
          <div className="people-stat-icon">
            <Users size={20} />
          </div>
          <div className="people-stat-content">
            <span className="people-stat-num">{stats.total}</span>
            <span className="people-stat-label">Jami tanishlar</span>
          </div>
        </div>

        <div
          className="people-stat-card"
          onClick={() => setSelectedStatus(selectedStatus === "active" ? "all" : "active")}
          style={{
            cursor: "pointer",
            borderColor: selectedStatus === "active" ? "rgba(52, 211, 153, 0.6)" : undefined,
            background: selectedStatus === "active" ? "rgba(52, 211, 153, 0.12)" : undefined,
          }}
          title="Faqat faol aloqadagilarni filtrlash"
        >
          <div className="people-stat-icon people-stat-icon--active">
            <UserCheck size={20} />
          </div>
          <div className="people-stat-content">
            <span className="people-stat-num">{stats.active}</span>
            <span className="people-stat-label">Faol aloqada</span>
          </div>
        </div>

        <div
          className="people-stat-card"
          onClick={() => setSelectedStatus(selectedStatus === "lost_contact" ? "all" : "lost_contact")}
          style={{
            cursor: "pointer",
            borderColor: selectedStatus === "lost_contact" ? "rgba(167, 139, 250, 0.6)" : undefined,
            background: selectedStatus === "lost_contact" ? "rgba(167, 139, 250, 0.12)" : undefined,
          }}
          title="Aloqa uzilganlarni filtrlash"
        >
          <div className="people-stat-icon people-stat-icon--lost">
            <UserX size={20} />
          </div>
          <div className="people-stat-content">
            <span className="people-stat-num">{stats.lostContact}</span>
            <span className="people-stat-label">Aloqa uzilgan</span>
          </div>
        </div>

        <div
          className="people-stat-card"
          onClick={() => navigate("/crushes")}
          style={{ cursor: "pointer" }}
          title="Yoqtirganlar sahifasiga o'tish"
        >
          <div className="people-stat-icon people-stat-icon--crush">
            <Heart size={20} fill="#f472b6" />
          </div>
          <div className="people-stat-content">
            <span className="people-stat-num">{stats.crushes}</span>
            <span className="people-stat-label">Yoqtirganlar</span>
          </div>
        </div>
      </div>

      {/* Filtr va qidiruv paneli (Toolbar) */}
      <div className="people-toolbar">
        <div className="people-search-row">
          <div className="people-search-box">
            <Search size={16} className="people-search-icon" />
            <input
              type="text"
              className="people-search-input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Ism, to'liq ism, telefon, @telegram, @instagram..."
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

          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
            <select
              value={selectedTrustLevel}
              onChange={(e) => setSelectedTrustLevel(e.target.value)}
              className="people-form-select"
              style={{ minWidth: "150px", padding: "0.65rem 0.85rem" }}
            >
              <option value="all">Barcha ishonch</option>
              {TRUST_LEVEL_OPTIONS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label} {stats.byTrustLevel?.[t.value] !== undefined ? `(${stats.byTrustLevel[t.value]})` : ""}
                </option>
              ))}
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="people-form-select"
              style={{ minWidth: "140px", padding: "0.65rem 0.85rem" }}
            >
              <option value="all">Barcha holatlar</option>
              <option value="active">Faqat faol</option>
              <option value="lost_contact">Aloqa uzilgan</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="people-form-select"
              style={{ minWidth: "150px", padding: "0.65rem 0.85rem" }}
            >
              <option value="name_asc">Ism (A-Z)</option>
              <option value="name_desc">Ism (Z-A)</option>
              <option value="trust_desc">Ishonish darajasi</option>
              <option value="created_desc">Yangi qo'shilganlar</option>
              <option value="met_desc">Tanishgan sanasi</option>
            </select>
          </div>
        </div>

        {/* Kategoriyalar bo'yicha filter tugmalari (Segmented controls) */}
        <div className="people-categories-scroll">
          {PERSON_CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              type="button"
              className={`people-filter-btn ${
                selectedCategory === cat.value ? "is-active" : ""
              }`}
              onClick={() => setSelectedCategory(cat.value)}
            >
              <span>{cat.label}</span>
              {cat.value !== "all" && stats.byCategory?.[cat.value] !== undefined && (
                <span
                  style={{
                    fontSize: "0.72rem",
                    opacity: 0.8,
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  ({stats.byCategory[cat.value] || 0})
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Odamlar kartalari to'plami */}
      {loading && people.length === 0 ? (
        <div className="people-empty-state">
          <RefreshCw size={28} className="animate-spin" color="#4eb896" />
          <p>Odamlar ro'yxati yuklanmoqda...</p>
        </div>
      ) : people.length > 0 ? (
        <div className="people-grid">
          {people.map((person) => (
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
          <div className="people-empty-icon">
            <Users size={28} />
          </div>
          <h3>Hech kim topilmadi</h3>
          <p>
            {search || selectedCategory !== "all" || selectedStatus !== "all" || selectedTrustLevel !== "all"
              ? "Qidiruv yoki filtrlash parametrlarini o'zgartirib ko'ring."
              : "Hozircha hech qanday tanish qo'shilmagan. Birinchi shaxs kartasini yarating!"}
          </p>
          <button
            type="button"
            onClick={() => setIsAddOpen(true)}
            className="people-btn-primary"
            style={{ marginTop: "0.5rem" }}
          >
            <Plus size={15} />
            <span>Yangi tanish qo'shish</span>
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
            ? `"${deleteTarget.nickname}" kartasini va unga tegishli shaxsiy ma'lumotlarni o'chirishni tasdiqlaysizmi? Bog'langan qarz yozuvlari saqlanib qoladi.`
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
