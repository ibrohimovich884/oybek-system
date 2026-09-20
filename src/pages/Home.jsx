import NotificationBanner from "../components/notifications/NotificationBanner.jsx";

// Hozircha qattiq yozilgan (hardcoded) demo bildirishnoma.
// Kelajakda: backenddan oxirgi eslatma/yangilanishni fetch qilib shu yerga beriladi.
const DEMO_NOTIFICATION = {
  title: "Oybek-system yangilandi",
  body: "Money manager bo'limi endi mavjud. Xarajatlaringizni yozib borishni boshlashingiz mumkin.",
};

export default function Home() {
  return (
    <>
      <h1 className="page-title">Bosh sahifa</h1>
      <p className="page-subtitle">
        Har safar kirganingizda shu yerda yangilanishlar va eslatmalar chiqib turadi.
      </p>

      <NotificationBanner
        title={DEMO_NOTIFICATION.title}
        body={DEMO_NOTIFICATION.body}
      />
    </>
  );
}
