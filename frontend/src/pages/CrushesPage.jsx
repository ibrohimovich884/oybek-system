import React, { useState, useEffect, useCallback } from "react";
import {
  Heart,
  Plus,
  Search,
  Sparkles,
  RefreshCw,
  Clock,
  User,
  Users,
} from "lucide-react";
import {
  fetchCrushes,
  fetchPeopleStats,
  deletePerson,
  updateCrushStatus,
  fetchPersonById,
} from "../api/people.js";
import {
  CRUSH_STATUSES,
  CRUSH_STATUS_LABELS,
} from "../constants/people.js";
import PersonCard from "../components/people/PersonCard.jsx";
import PersonDetailModal from "../components/people/PersonDetailModal.jsx";
import AddPersonModal from "../components/people/AddPersonModal.jsx";
import EditPersonModal from "../components/people/EditPersonModal.jsx";

export default function CrushesPage() {
  const [crushes, setCrushes] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCrushStatus, setSelectedCrushStatus] = useState("all");
  const [sortBy, setSortBy] = useState("name_asc");

  // Modallar
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [crushData, statsData] = await Promise.all([
        fetchCrushes({
          crushStatus: selectedCrushStatus,
          search: search.trim(),
          sort: sortBy,
        }),
        fetchPeopleStats(),
      ]);
      setCrushes(crushData || []);
      if (statsData) setStats(statsData);

      if (selectedPerson) {
        const refreshed = await fetchPersonById(selectedPerson.id);
        if (refreshed) setSelectedPerson(refreshed);
      }
    } catch (err) {
      console.error("Yoqtirganlarni yuklashda xatolik:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedCrushStatus, search, sortBy, selectedPerson?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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
      loadData();
    } catch (err) {
      alert("Xatolik: " + err.message);
    }
  };

  const handleDeletePerson = async (person) => {
    if (
      !window.confirm(
        `"${person.nickname}" kartasini va unga tegishli ma'lumotlarni o'chirishni tasdiqlaysizmi?`
      )
    ) {
      return;
    }

    try {
      await deletePerson(person.id);
      setIsDetailOpen(false);
      setSelectedPerson(null);
      loadData();
    } catch (err) {
      alert("O'chirishda xatolik: " + err.message);
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
            onClick={loadData}
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
          onDelete={handleDeletePerson}
          onRefresh={loadData}
        />
      )}

      {isAddOpen && (
        <AddPersonModal
          initialIsCrush={true}
          onClose={() => setIsAddOpen(false)}
          onSuccess={loadData}
        />
      )}

      {isEditOpen && selectedPerson && (
        <EditPersonModal
          person={selectedPerson}
          onClose={() => {
            setIsEditOpen(false);
            setSelectedPerson(null);
          }}
          onSuccess={loadData}
        />
      )}
    </div>
  );
}
