import React, { useState, useEffect, useCallback } from "react";
import {
  Users,
  UserCheck,
  UserX,
  Heart,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import {
  fetchPeople,
  fetchPeopleStats,
  deletePerson,
  updateCrushStatus,
  fetchPersonById,
} from "../api/people.js";
import { PERSON_CATEGORIES } from "../constants/people.js";
import PersonCard from "../components/people/PersonCard.jsx";
import PersonDetailModal from "../components/people/PersonDetailModal.jsx";
import AddPersonModal from "../components/people/AddPersonModal.jsx";
import EditPersonModal from "../components/people/EditPersonModal.jsx";

export default function PeoplePage() {
  const [people, setPeople] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    lostContact: 0,
    crushes: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [sortBy, setSortBy] = useState("name_asc");

  // Modallar holati
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [peopleData, statsData] = await Promise.all([
        fetchPeople({
          category: selectedCategory,
          status: selectedStatus,
          search: search.trim(),
          sort: sortBy,
        }),
        fetchPeopleStats(),
      ]);
      setPeople(peopleData || []);
      if (statsData) setStats(statsData);

      // Agar detail modal ochiq bo'lsa, uni yangilaymiz
      if (selectedPerson) {
        const refreshed = await fetchPersonById(selectedPerson.id);
        if (refreshed) setSelectedPerson(refreshed);
      }
    } catch (err) {
      console.error("Odamlarni yuklashda xatolik:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, selectedStatus, search, sortBy, selectedPerson?.id]);

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
      const isNowCrush = !person.isCrush;
      await updateCrushStatus(person.id, {
        isCrush: isNowCrush,
        crushStatus: isNowCrush ? "liked" : null,
        crushStartedOn: isNowCrush ? new Date().toISOString().slice(0, 10) : null,
      });
      loadData();
    } catch (err) {
      alert("Crush holatini o'zgartirishda xatolik: " + err.message);
    }
  };

  const handleDeletePerson = async (person) => {
    if (
      !window.confirm(
        `"${person.nickname}" kartasini va unga tegishli barcha ma'lumotlarni o'chirishni tasdiqlaysizmi?`
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
          >
            <Plus size={16} />
            <span>Yangi tanish qo'shish</span>
          </button>
        </div>
      </div>

      {/* Statistika kartalari (Frosted glass + blur) */}
      <div className="people-stats-grid">
        <div className="people-stat-card">
          <div className="people-stat-icon">
            <Users size={20} />
          </div>
          <div className="people-stat-content">
            <span className="people-stat-num">{stats.total}</span>
            <span className="people-stat-label">Jami tanishlar</span>
          </div>
        </div>

        <div className="people-stat-card">
          <div className="people-stat-icon people-stat-icon--active">
            <UserCheck size={20} />
          </div>
          <div className="people-stat-content">
            <span className="people-stat-num">{stats.active}</span>
            <span className="people-stat-label">Faol aloqada</span>
          </div>
        </div>

        <div className="people-stat-card">
          <div className="people-stat-icon people-stat-icon--lost">
            <UserX size={20} />
          </div>
          <div className="people-stat-content">
            <span className="people-stat-num">{stats.lostContact}</span>
            <span className="people-stat-label">Aloqa uzilgan</span>
          </div>
        </div>

        <div className="people-stat-card">
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
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
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
            {search || selectedCategory !== "all" || selectedStatus !== "all"
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
          onDelete={handleDeletePerson}
          onRefresh={loadData}
        />
      )}

      {isAddOpen && (
        <AddPersonModal
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
