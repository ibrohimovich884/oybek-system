import { useState } from 'react';
import {
  X,
  Plus,
  Flame,
  Dumbbell,
  Zap,
  Activity,
  Shield,
  HeartPulse,
  Sparkles,
} from 'lucide-react';

const CATEGORIES = [
  'Kuch',
  'Kardio',
  'Oyoq & Qorin',
  'Matonat',
  'Moslashuvchanlik',
  'Umumiy',
];

const ICONS = [
  { name: 'Flame', label: 'Olov', component: Flame },
  { name: 'Dumbbell', label: 'Gantel', component: Dumbbell },
  { name: 'Zap', label: 'Chaqmoq', component: Zap },
  { name: 'Activity', label: 'Faollik', component: Activity },
  { name: 'Shield', label: 'Qalqon', component: Shield },
  { name: 'HeartPulse', label: 'Yurak', component: HeartPulse },
];

export default function AddExerciseForm({ isOpen, onClose, onAddExercise }) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Kuch');
  const [target, setTarget] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(15);
  const [calories, setCalories] = useState(80);
  const [selectedIcon, setSelectedIcon] = useState('Activity');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Iltimos, mashq nomini kiriting');
      return;
    }
    if (!target.trim()) {
      setError("Iltimos, mashq mo'ljalini kiriting (masalan: 15 marta × 3 to'plam)");
      return;
    }

    onAddExercise({
      name: name.trim(),
      category,
      target: target.trim(),
      durationMinutes: Number(durationMinutes) || 15,
      calories: Number(calories) || 50,
      icon: selectedIcon,
    });

    // Tozalash va yopish
    setName('');
    setTarget('');
    setCategory('Kuch');
    setSelectedIcon('Activity');
    setError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in">
      <div
        id="add-exercise-modal"
        className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Yangi mashq qo'shish</h3>
              <p className="text-xs text-slate-500">Kundalik rejangizga yangi mashq kiriting</p>
            </div>
          </div>
          <button
            id="close-add-exercise-modal-btn"
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/60 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body / Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          {error && (
            <div className="p-3 text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200 rounded-xl">
              {error}
            </div>
          )}

          {/* Nomi */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Mashq nomi <span className="text-rose-500">*</span>
            </label>
            <input
              id="new-exercise-name-input"
              type="text"
              required
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError('');
              }}
              placeholder="Masalan: Gantel bilan yelkani ko'tarish"
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>

          {/* Kategoriya */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Kategoriya / Toifa
            </label>
            <div className="grid grid-cols-3 gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`px-3 py-2 text-xs font-medium rounded-xl border transition cursor-pointer text-center ${
                    category === cat
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-700 font-semibold shadow-xs'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Mo'ljal (Target) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Mo'ljal / Takrorlash soni <span className="text-rose-500">*</span>
            </label>
            <input
              id="new-exercise-target-input"
              type="text"
              required
              value={target}
              onChange={(e) => {
                setTarget(e.target.value);
                if (error) setError('');
              }}
              placeholder="Masalan: 20 marta × 3 to'plam yoki 3 km"
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>

          {/* Davomiyligi va Kaloriya */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Vaqt (daqiqa)
              </label>
              <input
                id="new-exercise-duration-input"
                type="number"
                min="1"
                max="180"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Taxminiy kkal
              </label>
              <input
                id="new-exercise-calories-input"
                type="number"
                min="0"
                max="2000"
                value={calories}
                onChange={(e) => setCalories(e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Icon Tanlash */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Belgi (Icon)
            </label>
            <div className="flex flex-wrap gap-2">
              {ICONS.map((ico) => {
                const IconComp = ico.component;
                const isSelected = selectedIcon === ico.name;
                return (
                  <button
                    key={ico.name}
                    type="button"
                    onClick={() => setSelectedIcon(ico.name)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-medium transition cursor-pointer ${
                      isSelected
                        ? 'bg-slate-900 border-slate-900 text-white shadow-xs'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <IconComp className="w-3.5 h-3.5" />
                    <span>{ico.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            >
              Bekor qilish
            </button>
            <button
              id="submit-add-exercise-btn"
              type="submit"
              className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl shadow-xs transition cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Mashqni saqlash</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
