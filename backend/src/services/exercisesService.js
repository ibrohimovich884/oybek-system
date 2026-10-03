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
    ...(typeof row.details === "object" && row.details !== null ? row.details : {}),
  };
}

export async function getAllExercises(userId) {
  const query = userId
    ? "SELECT * FROM exercises WHERE user_id = $1 ORDER BY created_at"
    : "SELECT * FROM exercises ORDER BY created_at";
  const params = userId ? [userId] : [];

  const { rows } = await pool.query(query, params);
  return rows.map(mapExercise);
}

export async function createExercise(payload, userId) {
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
    `INSERT INTO exercises (id, user_id, name, category, target, duration_minutes, calories, icon, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8, COALESCE($9, to_char(now(), 'YYYY-MM-DD')))
     ON CONFLICT (id) DO UPDATE SET 
       name = EXCLUDED.name,
       category = EXCLUDED.category,
       target = EXCLUDED.target,
       duration_minutes = EXCLUDED.duration_minutes,
       calories = EXCLUDED.calories,
       icon = EXCLUDED.icon
     RETURNING *`,
    [id, userId || null, name, category, target, durationMinutes, calories, icon, createdAt]
  );
  return mapExercise(rows[0]);
}

export async function deleteExercise(id, userId) {
  if (userId) {
    await pool.query("DELETE FROM exercises WHERE id = $1 AND (user_id = $2 OR user_id IS NULL)", [id, userId]);
  } else {
    await pool.query("DELETE FROM exercises WHERE id = $1", [id]);
  }
}

export async function getAllLogs(userId) {
  const query = userId
    ? "SELECT * FROM exercise_logs WHERE user_id = $1"
    : "SELECT * FROM exercise_logs";
  const params = userId ? [userId] : [];

  const { rows } = await pool.query(query, params);
  return rows.map(mapLog);
}

export async function logExercise({ exerciseId, date, completed, details = {} }, userId) {
  if (!completed) {
    if (userId) {
      await pool.query(
        "DELETE FROM exercise_logs WHERE exercise_id = $1 AND date = $2 AND (user_id = $3 OR user_id IS NULL)",
        [exerciseId, date, userId]
      );
    } else {
      await pool.query(
        "DELETE FROM exercise_logs WHERE exercise_id = $1 AND date = $2",
        [exerciseId, date]
      );
    }
    return { exerciseId, date, completed: false };
  }

  const nowTime = new Date().toTimeString().slice(0, 5);
  const id = `log_${userId ? userId + "_" : ""}${date}_${exerciseId}`;

  const { rows } = await pool.query(
    `INSERT INTO exercise_logs (id, exercise_id, user_id, date, completed, completed_at, details)
     VALUES ($1, $2, $3, $4, true, $5, $6)
     ON CONFLICT (id)
     DO UPDATE SET completed = true, details = $6
     RETURNING *`,
    [id, exerciseId, userId || null, date, nowTime, JSON.stringify(details)]
  );
  return mapLog(rows[0]);
}
