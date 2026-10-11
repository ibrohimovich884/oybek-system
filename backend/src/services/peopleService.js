import { pool } from "../../db/pool.js";

/**
 * DB qatorlarini JS ob'ektlariga o'girish yordamchisi
 */
export function mapPersonRow(row, profile = null, appearances = []) {
  const latestAppearance = appearances[0] || null;
  return {
    id: row.id,
    userId: row.user_id,
    nickname: row.nickname,
    fullName: row.full_name || "",
    gender: row.gender || null, // 'female' | 'male' | 'other'
    category: row.category || "acquaintance", // 'friend' | 'acquaintance' | 'classmate' | 'coworker' | 'relative' | 'other'
    status: row.status || "active", // 'active' | 'lost_contact'
    isCrush: Boolean(row.is_crush),
    crushStatus: row.crush_status || null, // 'interest' | 'liked' | 'talking' | 'close' | 'dating' | 'unclear' | 'cooled' | 'ended' | 'became_friend'
    crushStartedOn: row.crush_started_on || null,
    metOn: row.met_on || null,
    metPlace: row.met_place || "",
    metVia: row.met_via || "",
    birthday: row.birthday || null,
    phone: row.phone || "",
    telegram: row.telegram || "",
    instagram: row.instagram || "",
    otherContacts: row.other_contacts || "",
    notes: row.notes || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    profile: profile
      ? {
          personId: profile.person_id,
          area: profile.area || "",
          interests: profile.interests || "",
          likes: profile.likes || "",
          dislikes: profile.dislikes || "",
          personality: profile.personality || "",
          howWeTalk: profile.how_we_talk || "",
          meaningToMe: profile.meaning_to_me || "",
          myFeelings: profile.my_feelings || "",
          updatedAt: profile.updated_at,
        }
      : null,
    latestAppearance: latestAppearance
      ? {
          id: latestAppearance.id,
          personId: latestAppearance.person_id,
          recordedAt: latestAppearance.recorded_at,
          heightCmEst: latestAppearance.height_cm_est ? Number(latestAppearance.height_cm_est) : null,
          eyeColor: latestAppearance.eye_color || "",
          hairColor: latestAppearance.hair_color || "",
          faceNotes: latestAppearance.face_notes || "",
          otherNotes: latestAppearance.other_notes || "",
        }
      : null,
    appearancesCount: appearances.length,
    appearances: appearances.map((a) => ({
      id: a.id,
      personId: a.person_id,
      recordedAt: a.recorded_at,
      heightCmEst: a.height_cm_est ? Number(a.height_cm_est) : null,
      eyeColor: a.eye_color || "",
      hairColor: a.hair_color || "",
      faceNotes: a.face_notes || "",
      otherNotes: a.other_notes || "",
      createdAt: a.created_at,
    })),
  };
}

/**
 * Barcha odamlar ro'yxatini olish (filtrlash va qidirish bilan)
 */
export async function getAllPeople(userId, filters = {}) {
  const whereClauses = [];
  const params = [];

  if (userId) {
    params.push(userId);
    whereClauses.push(`p.user_id = $${params.length}`);
  }

  if (filters.category && filters.category !== "all") {
    params.push(filters.category);
    whereClauses.push(`p.category = $${params.length}`);
  }

  if (filters.status && filters.status !== "all") {
    params.push(filters.status);
    whereClauses.push(`p.status = $${params.length}`);
  }

  if (filters.isCrush !== undefined && filters.isCrush !== "") {
    const isCrushVal = filters.isCrush === "true" || filters.isCrush === true;
    params.push(isCrushVal);
    whereClauses.push(`p.is_crush = $${params.length}`);
  }

  if (filters.crushStatus && filters.crushStatus !== "all") {
    params.push(filters.crushStatus);
    whereClauses.push(`p.crush_status = $${params.length}`);
  }

  if (filters.search && filters.search.trim()) {
    params.push(`%${filters.search.trim().toLowerCase()}%`);
    const searchIdx = params.length;
    whereClauses.push(
      `(LOWER(p.nickname) LIKE $${searchIdx} OR ` +
      `LOWER(COALESCE(p.full_name, '')) LIKE $${searchIdx} OR ` +
      `LOWER(COALESCE(p.phone, '')) LIKE $${searchIdx} OR ` +
      `LOWER(COALESCE(p.telegram, '')) LIKE $${searchIdx} OR ` +
      `LOWER(COALESCE(p.instagram, '')) LIKE $${searchIdx})`
    );
  }

  let orderBy = "p.nickname ASC";
  if (filters.sort === "created_desc") {
    orderBy = "p.created_at DESC";
  } else if (filters.sort === "updated_desc") {
    orderBy = "p.updated_at DESC";
  } else if (filters.sort === "met_desc") {
    orderBy = "p.met_on DESC NULLS LAST, p.created_at DESC";
  } else if (filters.sort === "name_desc") {
    orderBy = "p.nickname DESC";
  }

  const whereSql = whereClauses.length ? `WHERE ${whereClauses.join(" AND ")}` : "";
  const peopleQuery = `SELECT p.* FROM people p ${whereSql} ORDER BY ${orderBy}`;

  const { rows: people } = await pool.query(peopleQuery, params);

  if (people.length === 0) {
    return [];
  }

  const personIds = people.map((p) => p.id);

  // Kengaytirilgan profillarni olish
  const { rows: profiles } = await pool.query(
    "SELECT * FROM person_profiles WHERE person_id = ANY($1)",
    [personIds]
  );
  const profilesMap = new Map(profiles.map((pr) => [pr.person_id, pr]));

  // So'nggi tashqi ko'rinish qaydlarini olish
  const { rows: appearances } = await pool.query(
    `SELECT * FROM person_appearances 
     WHERE person_id = ANY($1) 
     ORDER BY recorded_at DESC, created_at DESC`,
    [personIds]
  );

  const appearancesByPerson = new Map();
  for (const a of appearances) {
    if (!appearancesByPerson.has(a.person_id)) {
      appearancesByPerson.set(a.person_id, []);
    }
    appearancesByPerson.get(a.person_id).push(a);
  }

  return people.map((row) =>
    mapPersonRow(
      row,
      profilesMap.get(row.id) || null,
      appearancesByPerson.get(row.id) || []
    )
  );
}

/**
 * Bitta shaxsning to'liq ma'lumotini olish
 */
export async function getPersonById(id, userId) {
  const query = userId
    ? "SELECT * FROM people WHERE id = $1 AND user_id = $2"
    : "SELECT * FROM people WHERE id = $1";
  const params = userId ? [id, userId] : [id];

  const { rows } = await pool.query(query, params);
  if (rows.length === 0) return null;

  const [profileRes, appearancesRes] = await Promise.all([
    pool.query("SELECT * FROM person_profiles WHERE person_id = $1", [id]),
    pool.query(
      "SELECT * FROM person_appearances WHERE person_id = $1 ORDER BY recorded_at DESC, created_at DESC",
      [id]
    ),
  ]);

  return mapPersonRow(
    rows[0],
    profileRes.rows[0] || null,
    appearancesRes.rows
  );
}

/**
 * Yangi shaxs kartasini yaratish
 */
export async function createPerson(payload, userId) {
  if (!userId) {
    throw new Error("Foydalanuvchi identifikatori majburiy");
  }

  const nickname = (payload.nickname || "").trim();
  if (!nickname) {
    throw new Error("Ism yoki laqab (nickname) kiritilishi shart");
  }

  const id = payload.id || `person_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const fullName = (payload.fullName || payload.full_name || "").trim() || null;
  const gender = payload.gender || null; // 'female' | 'male' | 'other'
  const category = payload.category || "acquaintance";
  const status = payload.status || "active";
  const isCrush = Boolean(payload.isCrush ?? payload.is_crush ?? false);
  const crushStatus = isCrush ? (payload.crushStatus || payload.crush_status || null) : null;
  const crushStartedOn = isCrush ? (payload.crushStartedOn || payload.crush_started_on || null) : null;
  const metOn = payload.metOn || payload.met_on || null;
  const metPlace = (payload.metPlace || payload.met_place || "").trim() || null;
  const metVia = (payload.metVia || payload.met_via || "").trim() || null;
  const birthday = payload.birthday || null;
  const phone = (payload.phone || "").trim() || null;
  const telegram = (payload.telegram || "").trim().replace(/^@/, "") || null;
  const instagram = (payload.instagram || "").trim().replace(/^@/, "") || null;
  const otherContacts = (payload.otherContacts || payload.other_contacts || "").trim() || null;
  const notes = (payload.notes || "").trim() || null;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const insertPersonQuery = `
      INSERT INTO people (
        id, user_id, nickname, full_name, gender, category, status,
        is_crush, crush_status, crush_started_on, met_on, met_place, met_via,
        birthday, phone, telegram, instagram, other_contacts, notes,
        created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7,
        $8, $9, $10, $11, $12, $13,
        $14, $15, $16, $17, $18, $19,
        now(), now()
      )
      RETURNING *
    `;

    const personValues = [
      id, userId, nickname, fullName, gender, category, status,
      isCrush, crushStatus, crushStartedOn, metOn, metPlace, metVia,
      birthday, phone, telegram, instagram, otherContacts, notes,
    ];

    const { rows: personRows } = await client.query(insertPersonQuery, personValues);
    const createdPerson = personRows[0];

    // Profil (ixtiyoriy kengaytirilgan ma'lumotlar)
    let createdProfile = null;
    const profileData = payload.profile || payload.profileData;
    if (profileData && typeof profileData === "object") {
      const area = (profileData.area || "").trim() || null;
      const interests = (profileData.interests || "").trim() || null;
      const likes = (profileData.likes || "").trim() || null;
      const dislikes = (profileData.dislikes || "").trim() || null;
      const personality = (profileData.personality || "").trim() || null;
      const howWeTalk = (profileData.howWeTalk || profileData.how_we_talk || "").trim() || null;
      const meaningToMe = (profileData.meaningToMe || profileData.meaning_to_me || "").trim() || null;
      const myFeelings = (profileData.myFeelings || profileData.my_feelings || "").trim() || null;

      // Faqat kamida bitta maydon to'ldirilgan bo'lsa yozamiz
      if (area || interests || likes || dislikes || personality || howWeTalk || meaningToMe || myFeelings) {
        const { rows: pRows } = await client.query(
          `INSERT INTO person_profiles (
            person_id, user_id, area, interests, likes, dislikes, personality,
            how_we_talk, meaning_to_me, my_feelings, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, now(), now())
          ON CONFLICT (person_id) DO UPDATE SET
            area = EXCLUDED.area,
            interests = EXCLUDED.interests,
            likes = EXCLUDED.likes,
            dislikes = EXCLUDED.dislikes,
            personality = EXCLUDED.personality,
            how_we_talk = EXCLUDED.how_we_talk,
            meaning_to_me = EXCLUDED.meaning_to_me,
            my_feelings = EXCLUDED.my_feelings,
            updated_at = now()
          RETURNING *`,
          [id, userId, area, interests, likes, dislikes, personality, howWeTalk, meaningToMe, myFeelings]
        );
        createdProfile = pRows[0];
      }
    }

    // Boshlang'ich tashqi ko'rinish qaydi (ixtiyoriy)
    const appearances = [];
    const appearanceData = payload.appearance || payload.initialAppearance;
    if (appearanceData && typeof appearanceData === "object") {
      const appHeight = appearanceData.heightCmEst || appearanceData.height_cm_est;
      const appEye = (appearanceData.eyeColor || appearanceData.eye_color || "").trim() || null;
      const appHair = (appearanceData.hairColor || appearanceData.hair_color || "").trim() || null;
      const appFace = (appearanceData.faceNotes || appearanceData.face_notes || "").trim() || null;
      const appOther = (appearanceData.otherNotes || appearanceData.other_notes || "").trim() || null;

      if (appHeight || appEye || appHair || appFace || appOther) {
        const appRecordTime = appearanceData.recordedAt || appearanceData.recorded_at || new Date().toISOString();
        const appId = appearanceData.id || `appr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        const { rows: appRows } = await client.query(
          `INSERT INTO person_appearances (
            id, person_id, user_id, recorded_at, height_cm_est, eye_color, hair_color, face_notes, other_notes, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, now())
          RETURNING *`,
          [
            appId,
            id,
            userId,
            appRecordTime,
            appHeight ? Number(appHeight) : null,
            appEye,
            appHair,
            appFace,
            appOther,
          ]
        );
        appearances.push(appRows[0]);
      }
    }

    await client.query("BEGIN");
    await client.query("COMMIT");

    return mapPersonRow(createdPerson, createdProfile, appearances);
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Shaxs kartasini tahrirlash
 */
export async function updatePerson(id, updates, userId) {
  const current = await getPersonById(id, userId);
  if (!current) {
    throw new Error("Shaxs topilmadi yoki ruxsat berilmagan");
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const nickname = updates.nickname !== undefined ? updates.nickname.trim() : current.nickname;
    if (!nickname) {
      throw new Error("Ism yoki laqab bo'sh bo'lishi mumkin emas");
    }

    const fullName = updates.fullName !== undefined ? (updates.fullName?.trim() || null) : (current.fullName || null);
    const gender = updates.gender !== undefined ? (updates.gender || null) : current.gender;
    const category = updates.category !== undefined ? updates.category : current.category;
    const status = updates.status !== undefined ? updates.status : current.status;
    const isCrush = updates.isCrush !== undefined ? Boolean(updates.isCrush) : current.isCrush;
    const crushStatus = isCrush
      ? (updates.crushStatus !== undefined ? updates.crushStatus : current.crushStatus)
      : null;
    const crushStartedOn = isCrush
      ? (updates.crushStartedOn !== undefined ? (updates.crushStartedOn || null) : current.crushStartedOn)
      : null;
    const metOn = updates.metOn !== undefined ? (updates.metOn || null) : current.metOn;
    const metPlace = updates.metPlace !== undefined ? (updates.metPlace?.trim() || null) : (current.metPlace || null);
    const metVia = updates.metVia !== undefined ? (updates.metVia?.trim() || null) : (current.metVia || null);
    const birthday = updates.birthday !== undefined ? (updates.birthday || null) : current.birthday;
    const phone = updates.phone !== undefined ? (updates.phone?.trim() || null) : (current.phone || null);
    const telegram = updates.telegram !== undefined ? (updates.telegram?.trim().replace(/^@/, "") || null) : (current.telegram || null);
    const instagram = updates.instagram !== undefined ? (updates.instagram?.trim().replace(/^@/, "") || null) : (current.instagram || null);
    const otherContacts = updates.otherContacts !== undefined ? (updates.otherContacts?.trim() || null) : (current.otherContacts || null);
    const notes = updates.notes !== undefined ? (updates.notes?.trim() || null) : (current.notes || null);

    const updateQuery = `
      UPDATE people SET
        nickname = $1,
        full_name = $2,
        gender = $3,
        category = $4,
        status = $5,
        is_crush = $6,
        crush_status = $7,
        crush_started_on = $8,
        met_on = $9,
        met_place = $10,
        met_via = $11,
        birthday = $12,
        phone = $13,
        telegram = $14,
        instagram = $15,
        other_contacts = $16,
        notes = $17,
        updated_at = now()
      WHERE id = $18 AND user_id = $19
      RETURNING *
    `;

    const { rows: personRows } = await client.query(updateQuery, [
      nickname, fullName, gender, category, status,
      isCrush, crushStatus, crushStartedOn, metOn, metPlace, metVia,
      birthday, phone, telegram, instagram, otherContacts, notes,
      id, userId,
    ]);

    // Agar profil ham yangilanishlar ichida kelsa
    if (updates.profile !== undefined) {
      const p = updates.profile;
      if (p === null) {
        await client.query("DELETE FROM person_profiles WHERE person_id = $1", [id]);
      } else {
        const area = (p.area || "").trim() || null;
        const interests = (p.interests || "").trim() || null;
        const likes = (p.likes || "").trim() || null;
        const dislikes = (p.dislikes || "").trim() || null;
        const personality = (p.personality || "").trim() || null;
        const howWeTalk = (p.howWeTalk || p.how_we_talk || "").trim() || null;
        const meaningToMe = (p.meaningToMe || p.meaning_to_me || "").trim() || null;
        const myFeelings = (p.myFeelings || p.my_feelings || "").trim() || null;

        await client.query(
          `INSERT INTO person_profiles (
            person_id, user_id, area, interests, likes, dislikes, personality,
            how_we_talk, meaning_to_me, my_feelings, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, now(), now())
          ON CONFLICT (person_id) DO UPDATE SET
            area = EXCLUDED.area,
            interests = EXCLUDED.interests,
            likes = EXCLUDED.likes,
            dislikes = EXCLUDED.dislikes,
            personality = EXCLUDED.personality,
            how_we_talk = EXCLUDED.how_we_talk,
            meaning_to_me = EXCLUDED.meaning_to_me,
            my_feelings = EXCLUDED.my_feelings,
            updated_at = now()`,
          [id, userId, area, interests, likes, dislikes, personality, howWeTalk, meaningToMe, myFeelings]
        );
      }
    }

    await client.query("COMMIT");

    return await getPersonById(id, userId);
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Kengaytirilgan profilni upsert qilish
 */
export async function upsertProfile(personId, profileData, userId) {
  const current = await getPersonById(personId, userId);
  if (!current) {
    throw new Error("Shaxs topilmadi yoki ruxsat berilmagan");
  }

  const area = (profileData.area || "").trim() || null;
  const interests = (profileData.interests || "").trim() || null;
  const likes = (profileData.likes || "").trim() || null;
  const dislikes = (profileData.dislikes || "").trim() || null;
  const personality = (profileData.personality || "").trim() || null;
  const howWeTalk = (profileData.howWeTalk || profileData.how_we_talk || "").trim() || null;
  const meaningToMe = (profileData.meaningToMe || profileData.meaning_to_me || "").trim() || null;
  const myFeelings = (profileData.myFeelings || profileData.my_feelings || "").trim() || null;

  const { rows } = await pool.query(
    `INSERT INTO person_profiles (
      person_id, user_id, area, interests, likes, dislikes, personality,
      how_we_talk, meaning_to_me, my_feelings, created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, now(), now())
    ON CONFLICT (person_id) DO UPDATE SET
      area = EXCLUDED.area,
      interests = EXCLUDED.interests,
      likes = EXCLUDED.likes,
      dislikes = EXCLUDED.dislikes,
      personality = EXCLUDED.personality,
      how_we_talk = EXCLUDED.how_we_talk,
      meaning_to_me = EXCLUDED.meaning_to_me,
      my_feelings = EXCLUDED.my_feelings,
      updated_at = now()
    RETURNING *`,
    [personId, userId, area, interests, likes, dislikes, personality, howWeTalk, meaningToMe, myFeelings]
  );

  return {
    personId: rows[0].person_id,
    area: rows[0].area || "",
    interests: rows[0].interests || "",
    likes: rows[0].likes || "",
    dislikes: rows[0].dislikes || "",
    personality: rows[0].personality || "",
    howWeTalk: rows[0].how_we_talk || "",
    meaningToMe: rows[0].meaning_to_me || "",
    myFeelings: rows[0].my_feelings || "",
    updatedAt: rows[0].updated_at,
  };
}

/**
 * Tashqi ko'rinish tarixiga yangi qayd qo'shish
 */
export async function addAppearance(personId, data, userId) {
  const current = await getPersonById(personId, userId);
  if (!current) {
    throw new Error("Shaxs topilmadi yoki ruxsat berilmagan");
  }

  const id = data.id || `appr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const recordedAt = data.recordedAt || data.recorded_at || new Date().toISOString();
  const heightCmEst = data.heightCmEst || data.height_cm_est ? Number(data.heightCmEst || data.height_cm_est) : null;
  const eyeColor = (data.eyeColor || data.eye_color || "").trim() || null;
  const hairColor = (data.hairColor || data.hair_color || "").trim() || null;
  const faceNotes = (data.faceNotes || data.face_notes || "").trim() || null;
  const otherNotes = (data.otherNotes || data.other_notes || "").trim() || null;

  const { rows } = await pool.query(
    `INSERT INTO person_appearances (
      id, person_id, user_id, recorded_at, height_cm_est, eye_color, hair_color, face_notes, other_notes, created_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, now())
    RETURNING *`,
    [id, personId, userId, recordedAt, heightCmEst, eyeColor, hairColor, faceNotes, otherNotes]
  );

  const row = rows[0];
  return {
    id: row.id,
    personId: row.person_id,
    recordedAt: row.recorded_at,
    heightCmEst: row.height_cm_est ? Number(row.height_cm_est) : null,
    eyeColor: row.eye_color || "",
    hairColor: row.hair_color || "",
    faceNotes: row.face_notes || "",
    otherNotes: row.other_notes || "",
    createdAt: row.created_at,
  };
}

/**
 * Tashqi ko'rinish qaydini o'chirish
 */
export async function deleteAppearance(appearanceId, personId, userId) {
  const { rowCount } = await pool.query(
    "DELETE FROM person_appearances WHERE id = $1 AND person_id = $2 AND user_id = $3",
    [appearanceId, personId, userId]
  );
  if (rowCount === 0) {
    throw new Error("Ko'rinish qaydi topilmadi yoki o'chirish huquqi yo'q");
  }
  return { success: true };
}

/**
 * Shaxsni o'chirish (CASCADE tufayli profile va appearances o'chadi)
 */
export async function deletePerson(id, userId) {
  const { rowCount } = await pool.query(
    "DELETE FROM people WHERE id = $1 AND user_id = $2",
    [id, userId]
  );
  if (rowCount === 0) {
    throw new Error("Shaxs topilmadi yoki o'chirish huquqi yo'q");
  }
  return { success: true };
}

/**
 * Crush statusini tezkor yangilash
 */
export async function updateCrushStatus(id, { isCrush, crushStatus, crushStartedOn }, userId) {
  const isCrushVal = Boolean(isCrush);
  const statusVal = isCrushVal ? (crushStatus || null) : null;
  const startedVal = isCrushVal ? (crushStartedOn || null) : null;

  const { rows } = await pool.query(
    `UPDATE people SET
      is_crush = $1,
      crush_status = $2,
      crush_started_on = $3,
      updated_at = now()
     WHERE id = $4 AND user_id = $5
     RETURNING *`,
    [isCrushVal, statusVal, startedVal, id, userId]
  );

  if (rows.length === 0) {
    throw new Error("Shaxs topilmadi");
  }

  return await getPersonById(id, userId);
}

/**
 * Odamlar statistikasi
 */
export async function getPeopleStats(userId) {
  const totalRes = await pool.query(
    `SELECT
      COUNT(*)::int AS total_people,
      COUNT(*) FILTER (WHERE status = 'active')::int AS active_count,
      COUNT(*) FILTER (WHERE status = 'lost_contact')::int AS lost_contact_count,
      COUNT(*) FILTER (WHERE is_crush = true)::int AS crush_count
     FROM people WHERE user_id = $1`,
    [userId]
  );

  const categoriesRes = await pool.query(
    `SELECT category, COUNT(*)::int AS count
     FROM people WHERE user_id = $1
     GROUP BY category`,
    [userId]
  );

  const crushStatusesRes = await pool.query(
    `SELECT crush_status, COUNT(*)::int AS count
     FROM people WHERE user_id = $1 AND is_crush = true
     GROUP BY crush_status`,
    [userId]
  );

  const stats = totalRes.rows[0] || {
    total_people: 0,
    active_count: 0,
    lost_contact_count: 0,
    crush_count: 0,
  };

  const categoriesMap = {};
  for (const r of categoriesRes.rows) {
    categoriesMap[r.category] = r.count;
  }

  const crushMap = {};
  for (const r of crushStatusesRes.rows) {
    if (r.crush_status) {
      crushMap[r.crush_status] = r.count;
    }
  }

  return {
    total: stats.total_people,
    active: stats.active_count,
    lostContact: stats.lost_contact_count,
    crushes: stats.crush_count,
    byCategory: categoriesMap,
    byCrushStatus: crushMap,
  };
}
