import { useState, useMemo } from "react";
import {
  Bell,
  CheckCheck,
  Trash2,
  Plus,
  Sliders,
  Search,
  Filter,
  HandCoins,
  Wallet,
  AlertTriangle,
  Info,
  Sparkles,
  Inbox,
  Volume2,
  Calendar,
} from "lucide-react";
import { useNotifications } from "../context/NotificationsContext.jsx";
import NotificationCard from "../components/notifications/NotificationCard.jsx";
import AddNotificationModal from "../components/notifications/AddNotificationModal.jsx";
import NotificationSettingsModal from "../components/notifications/NotificationSettingsModal.jsx";

export default function NotificationsPage() {
  const {
    notifications,
    unreadCount,
    addNotification,
    markAsRead,
    markAllAsRead,
    markAsUnread,
    deleteNotification,
    clearReadNotifications,
    resetDismissedSystemNotifications,
    settings,
    updateSettings,
    browserPermission,
    requestBrowserPermission,
    playNotificationSound,
  } = useNotifications();

  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all"); // 'all' | 'unread' | 'high' | 'debt' | 'finance' | 'custom'
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  // Filtrlangan bildirishnomalar ro'yxati
  const filteredNotifications = useMemo(() => {
    return notifications.filter((notif) => {
      // 1. Tab filtri
      if (activeTab === "unread" && notif.isRead) return false;
      if (activeTab === "high" && notif.priority !== "high") return false;
      if (activeTab === "debt" && notif.type !== "debt") return false;
      if (activeTab === "finance" && notif.type !== "finance") return false;
      if (activeTab === "custom" && !notif.isCustom) return false;

      // 2. Qidiruv so'zi
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const titleMatch = (notif.title || "").toLowerCase().includes(query);
        const msgMatch = (notif.message || "").toLowerCase().includes(query);
        const typeMatch = (notif.type || "").toLowerCase().includes(query);
        if (!titleMatch && !msgMatch && !typeMatch) return false;
      }

      return true;
    });
  }, [notifications, activeTab, searchQuery]);

  // Statistik hisoblar
  const counts = useMemo(() => {
    const total = notifications.length;
    const unread = notifications.filter((n) => !n.isRead).length;
    const high = notifications.filter((n) => n.priority === "high").length;
    const debts = notifications.filter((n) => n.type === "debt").length;
    const finance = notifications.filter((n) => n.type === "finance").length;
    const custom = notifications.filter((n) => n.isCustom).length;
    return { total, unread, high, debts, finance, custom };
  }, [notifications]);

  const handleToggleRead = (id) => {
    const item = notifications.find((n) => n.id === id);
    if (item) {
      if (item.isRead) markAsUnread(id);
      else markAsRead(id);
    }
  };

  return (
    <div className="notifications-page">
      {/* Sahifa bosh sarlavhasi */}
      <div className="notif-page-header">
        <div className="notif-page-header__left">
          <div className="flex items-center gap-3">
            <div className="notif-page-logo">
              <Bell size={22} className="text-accent" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="page-title">Bildirishnomalar</h1>
                {unreadCount > 0 && (
                  <span className="notif-badge-pill">
                    {unreadCount} ta yangi
                  </span>
                )}
              </div>
              <p className="page-subtitle">
                Moliya ogohlantirishlari, qarz muddatlari va eslatmalar markazi
              </p>
            </div>
          </div>
        </div>

        {/* Yuqori tezkor amallar */}
        <div className="notif-page-header__actions">
          <button
            type="button"
            className="btn btn--subtle btn--sm"
            onClick={() => setIsSettingsModalOpen(true)}
            title="Bildirishnoma sozlamalari"
          >
            <Sliders size={16} />
            <span className="hide-mobile">Sozlamalar</span>
          </button>

          {unreadCount > 0 && (
            <button
              type="button"
              className="btn btn--secondary btn--sm"
              onClick={markAllAsRead}
              title="Barchasini o'qilgan deb belgilash"
            >
              <CheckCheck size={16} />
              <span className="hide-mobile">Barchasini o'qish</span>
            </button>
          )}

          <button
            type="button"
            className="btn btn--primary btn--sm"
            onClick={() => setIsAddModalOpen(true)}
          >
            <Plus size={16} />
            <span>Yangi eslatma</span>
          </button>
        </div>
      </div>

      {/* Statistika kartachalari */}
      <div className="notif-stats-grid">
        <div
          className={`notif-stat-card ${activeTab === "all" ? "is-active" : ""}`}
          onClick={() => setActiveTab("all")}
        >
          <div className="notif-stat-card__icon notif-stat-card__icon--all">
            <Inbox size={18} />
          </div>
          <div className="notif-stat-card__info">
            <span className="notif-stat-card__label">Barcha xabarlar</span>
            <span className="notif-stat-card__val mono">{counts.total}</span>
          </div>
        </div>

        <div
          className={`notif-stat-card ${activeTab === "unread" ? "is-active" : ""}`}
          onClick={() => setActiveTab("unread")}
        >
          <div className="notif-stat-card__icon notif-stat-card__icon--unread">
            <Bell size={18} />
          </div>
          <div className="notif-stat-card__info">
            <span className="notif-stat-card__label">O'qilmagan</span>
            <span className="notif-stat-card__val mono text-accent">
              {counts.unread}
            </span>
          </div>
        </div>

        <div
          className={`notif-stat-card ${activeTab === "high" ? "is-active" : ""}`}
          onClick={() => setActiveTab("high")}
        >
          <div className="notif-stat-card__icon notif-stat-card__icon--high">
            <AlertTriangle size={18} />
          </div>
          <div className="notif-stat-card__info">
            <span className="notif-stat-card__label">Muhim / Ogohlantirish</span>
            <span className="notif-stat-card__val mono text-expense">
              {counts.high}
            </span>
          </div>
        </div>

        <div
          className={`notif-stat-card ${activeTab === "debt" ? "is-active" : ""}`}
          onClick={() => setActiveTab("debt")}
        >
          <div className="notif-stat-card__icon notif-stat-card__icon--debt">
            <HandCoins size={18} />
          </div>
          <div className="notif-stat-card__info">
            <span className="notif-stat-card__label">Qarz muddatlari</span>
            <span className="notif-stat-card__val mono text-karta">
              {counts.debts}
            </span>
          </div>
        </div>
      </div>

      {/* Filtrlash va Qidiruv qatori */}
      <div className="notif-filter-bar">
        {/* Tablar */}
        <div className="notif-tabs">
          {[
            { id: "all", label: "Barchasi", count: counts.total },
            { id: "unread", label: "O'qilmaganlar", count: counts.unread },
            { id: "high", label: "Muhim", count: counts.high },
            { id: "debt", label: "Qarzlar", count: counts.debts },
            { id: "finance", label: "Moliya", count: counts.finance },
            { id: "custom", label: "Shaxsiy", count: counts.custom },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`notif-tab ${activeTab === tab.id ? "is-active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span>{tab.label}</span>
              {tab.count > 0 && (
                <span className="notif-tab-count mono">{tab.count}</span>
              )}
            </button>
          ))}
        </div>

        {/* Qidiruv input */}
        <div className="notif-search-wrap">
          <Search size={15} className="notif-search-icon" />
          <input
            type="text"
            className="notif-search-input"
            placeholder="Qidirish (mavzu yoki matn)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="notif-search-clear"
              onClick={() => setSearchQuery("")}
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Qo'shimcha qulayliklar: Barcha o'qilganlarni tozalash */}
      {notifications.some((n) => n.isRead) && (
        <div className="notif-sub-actions">
          <span className="text-muted text-xs">
            O'qilgan bildirishnomalarni ro'yxatdan tozalash:
          </span>
          <button
            type="button"
            className="btn btn--subtle btn--xs"
            onClick={clearReadNotifications}
          >
            <Trash2 size={13} />
            <span>O'qilganlarni tozalash</span>
          </button>
        </div>
      )}

      {/* Bildirishnomalar ro'yxati */}
      <div className="notif-list-container">
        {filteredNotifications.length > 0 ? (
          <div className="notif-list">
            {filteredNotifications.map((notification) => (
              <NotificationCard
                key={notification.id}
                notification={notification}
                onToggleRead={handleToggleRead}
                onDelete={deleteNotification}
              />
            ))}
          </div>
        ) : (
          <div className="notif-empty-state">
            <div className="notif-empty-icon">
              <Inbox size={40} />
            </div>
            <h3 className="notif-empty-title">Bildirishnomalar mavjud emas</h3>
            <p className="notif-empty-desc">
              {searchQuery
                ? `"${searchQuery}" bo'yicha hech qanday bildirishnoma topilmadi.`
                : activeTab !== "all"
                ? "Ushbu bo'limda hozircha bildirishnomalar yo'q."
                : "Hozircha tizim va moliyaviy ogohlantirishlar bo'sh. O'zingiz shaxsiy eslatma qo'shishingiz mumkin."}
            </p>
            <div className="flex items-center gap-2 mt-4">
              {searchQuery && (
                <button
                  type="button"
                  className="btn btn--secondary btn--sm"
                  onClick={() => setSearchQuery("")}
                >
                  Qidiruvni tozalash
                </button>
              )}
              <button
                type="button"
                className="btn btn--primary btn--sm"
                onClick={() => setIsAddModalOpen(true)}
              >
                <Plus size={15} />
                <span>Eslatma qo'shish</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modallar */}
      <AddNotificationModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={addNotification}
      />

      <NotificationSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        settings={settings}
        onUpdateSettings={updateSettings}
        browserPermission={browserPermission}
        onRequestPermission={requestBrowserPermission}
        onResetDismissed={resetDismissedSystemNotifications}
        onTestSound={playNotificationSound}
      />
    </div>
  );
}
