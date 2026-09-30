/*
  Hozircha statik demo bildirishnoma.
  Keyinchalik bu komponent backenddan (masalan /api/notifications)
  so'nggi yangilanish yoki eslatmani olib kelib ko'rsatadi.
*/
export default function NotificationBanner({ title, body }) {
  if (!title) return null;

  return (
    <div className="notification">
      <span className="notification__dot" aria-hidden="true" />
      <div>
        <p className="notification__title">{title}</p>
        <p className="notification__body">{body}</p>
      </div>
    </div>
  );
}
