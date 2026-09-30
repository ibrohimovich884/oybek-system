import { pool } from "../../db/pool.js";

function mapExercise(row) {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    target: row.target,
    durationMinutes: row.duration_minutes,
    calories: row.calories,
    icon: row.icon,
    createdAt: row.created_at,
  };
}

function mapLog(row) {
  return {
    id: row.id,
    exerciseId: row.exercise_id,
    date: row.date,
    completed: row.completed,
    completedAt: row.completed_at,
    ...row.details,
  };
}

export async function getAllExercises() {
  const { rows } = await pool.query("SELECT * FROM exercises ORDER BY created_at");
  return rows.map(mapExercise);
}

export async function createExercise(payload) {
  const {
    id,
    name,
    category = "Umumiy",
    target = "10 marta",
    durationMinutes = 15,
    calories = 50,
    icon = "Activity",
    createdAt,
  } = payload;

  const { rows } = await pool.query(
    `INSERT INTO exercises (id, name, category, target, duration_minutes, calories, icon, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7, COALESCE($8, to_char(now(), 'YYYY-MM-DD')))
     ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name
     RETURNING *`,
    [id, name, category, target, durationMinutes, calories, icon, createdAt]
  );
  return mapExercise(rows[0]);
}

export async function deleteExercise(id) {
  await pool.query("DELETE FROM exercises WHERE id = $1", [id]);
}

export async function getAllLogs() {
  const { rows } = await pool.query("SELECT * FROM exercise_logs");
  return rows.map(mapLog);
}

// completed=true bo'lsa yozuvni qo'shadi/yangilaydi, false bo'lsa o'chiradi
// — frontenddagi logExercise() bilan bir xil mantiq.
export async function logExercise({ exerciseId, date, completed, details = {} }) {
  if (!completed) {
    await pool.query(
      "DELETE FROM exercise_logs WHERE exercise_id = $1 AND date = $2",
      [exerciseId, date]
    );
    return { exerciseId, date, completed: false };
  }

  const nowTime = new Date().toTimeString().slice(0, 5);
  const id = `log_${date}_${exerciseId}`;

  const { rows } = await pool.query(
    `INSERT INTO exercise_logs (id, exercise_id, date, completed, completed_at, details)
     VALUES ($1, $2, $3, true, $4, $5)
     ON CONFLICT (exercise_id, date)
     DO UPDATE SET completed = true, details = $5
     RETURNING *`,
    [id, exerciseId, date, nowTime, JSON.stringify(details)]
  );
  return mapLog(rows[0]);
}
