import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  HandCoins,
  PlusCircle,
  Search,
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle2,
  Clock,
  AlertCircle,
  BookOpen,
  LayoutGrid,
  Users,
  X,
  User,
  ChevronRight,
  Phone,
  ShieldCheck,
  Send,
  Link2,
} from "lucide-react";
import { useExpenses } from "../context/ExpensesContext.jsx";
import { readLocalPeople, fetchPeople } from "../api/people.js";
import { getTrustLevelInfo } from "../constants/people.js";
import { formatSum, formatDollar, cleanSocialHandle } from "../utils/format.js";
import {
  DEBT_TYPES,
  getDebtDueInfo,
  DUE_STAGES,
} from "../constants/debts.js";
import DebtCard from "../components/debts/DebtCard.jsx";
import DebtLedgerList from "../components/debts/DebtLedgerList.jsx";
import DebtDetailModal from "../components/debts/DebtDetailModal.jsx";
import EditDebtModal from "../components/debts/EditDebtModal.jsx";
import AddDebtModal from "../components/debts/AddDebtModal.jsx";
import RepayDebtModal from "../components/debts/RepayDebtModal.jsx";
import ForgiveDebtModal from "../components/debts/ForgiveDebtModal.jsx";
import PersonHistoryModal from "../components/debts/PersonHistoryModal.jsx";
import Loader from "../components/common/Loader.jsx";

const STORAGE_VIEW_KEY = "oybek_system:debts_view_mode";

export default function DebtsPage() {
  const {
    debts,
    addDebt,
    repayDebt,
    settleDebt,
    forgiveDebt,
    deleteDebt,
    updateDebt,
    rateInfo,
    isLoading,
  } = useExpenses();
  const currentUsdRate = rateInfo?.rate || 12850;

  // Ko'rinish rejimi: "ledger" (Daftar), "persons" (Qarzdorlar bo'yicha), "cards" (Kartalar)
  const [viewMode, setViewMode] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(STORAGE_VIEW_KEY) || "ledger";
    }
    return "ledger";
  });

  const [searchParams, setSearchParams] = useSearchParams();
  const [peopleList, setPeopleList] = useState(() => readLocalPeople());

  const [filterType, setFilterType] = useState("all");
  // Filtr turlari: "all" | "overdue" | "soon" | "no_date" | "given" | "taken" | "pending" | "forgiven" | "settled"

  const [searchQuery, setSearchQuery] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addDebtInitialData, setAddDebtInitialData] = useState(null);
  const [repayTargetDebt, setRepayTargetDebt] = useState(null);
  const [forgiveTargetDebt, setForgiveTargetDebt] = useState(null);
  const [selectedDebt, setSelectedDebt] = useState(null);
  const [editingDebt, setEditingDebt] = useState(null);
  const [selectedPersonHistory, setSelectedPersonHistory] = useState(null);
  const [isAutoLinking, setIsAutoLinking] = useState(false);
  const [autoLinkNotice, setAutoLinkNotice] = useState("");

  const handleOpenPersonHistory = (personName, personId = null) => {
    if (!personName && !personId) return;
    setSelectedPersonHistory({
      personName: personName || "",
      personId: personId || null,
    });
  };

  const handleViewModeChange = (mode) => {
    setViewMode(mode);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_VIEW_KEY, mode);
    }
  };

  // Odamlar ro'yxatini yuklash (ishonch darajasi va kontaktlarni bog'lash uchun)
  useEffect(() => {
    fetchPeople()
      .then((list) => {
        if (Array.isArray(list)) setPeopleList(list);
      })
      .catch(() => {});
  }, []);

  // Odamlar map'i (id bo'yicha va noyob ism bo'yicha tezkor qidiruv)
  const { peopleById, uniquePeopleByName } = useMemo(() => {
    const byId = new Map();
    const nameBuckets = new Map();
    peopleList.forEach((p) => {
      if (!p?.id) return;
      byId.set(p.id, p);
      const nick = (p.nickname || "").trim().toLowerCase();
      const full = (p.fullName || "").trim().toLowerCase();
      if (nick) {
        const list = nameBuckets.get(nick) || [];
        if (!list.some((x) => x.id === p.id)) list.push(p);
        nameBuckets.set(nick, list);
      }
      if (full) {
        const list = nameBuckets.get(full) || [];
        if (!list.some((x) => x.id === p.id)) list.push(p);
        nameBuckets.set(full, list);
      }
    });

    const uniqueByName = new Map();
    nameBuckets.forEach((list, key) => {
      if (list.length === 1) {
        uniqueByName.set(key, list[0]);
      }
    });

    return { peopleById: byId, uniquePeopleByName: uniqueByName };
  }, [peopleList]);

  // Bog'lanmagan, lekin Odamlar ro'yxatida noyob ism bilan mos keluvchi eski qarzlar
  const autoLinkableDebts = useMemo(() => {
    return debts
      .map((d) => {
        if (d.personId) return null;
        const norm = (d.personName || "").trim().toLowerCase();
        if (!norm) return null;
        const matched = uniquePeopleByName.get(norm);
        return matched ? { debt: d, person: matched } : null;
      })
      .filter(Boolean);
  }, [debts, uniquePeopleByName]);

  const handleAutoLinkDebts = async () => {
    if (isAutoLinking || autoLinkableDebts.length === 0) return;
    setIsAutoLinking(true);
    let linkedCount = 0;
    try {
      for (const { debt, person } of autoLinkableDebts) {
        const ig = cleanSocialHandle(debt.instagram || person.instagram || "");
        const tg = cleanSocialHandle(debt.telegram || person.telegram || "");
        await updateDebt(debt.id, {
          personId: person.id,
          contact: debt.contact || person.phone || "",
          instagram: ig,
          telegram: tg,
          location: debt.location || person.profile?.area || person.metPlace || "",
        });
        linkedCount += 1;
      }
      setAutoLinkNotice(`${linkedCount} ta eski qarz Odamlar roʻyxatiga muvaffaqiyatli bogʻlandi.`);
    } catch (err) {
      setAutoLinkNotice("Ayrim qarzlarni bogʻlashda xatolik yuz berdi.");
    } finally {
      setIsAutoLinking(false);
    }
  };

  // Har bir qarzga odamlar ro'yxatidagi bog'langan shaxs ma'lumotini biriktirish
  const enrichedDebts = useMemo(() => {
    return debts.map((debt) => {
      let resolved = null;
      if (debt.personId && peopleById.has(debt.personId)) {
        resolved = peopleById.get(debt.personId);
      } else if (debt.linkedPerson?.id && peopleById.has(debt.linkedPerson.id)) {
        resolved = peopleById.get(debt.linkedPerson.id);
      } else if (!debt.personId && !debt.linkedPerson?.id && debt.personName) {
        const norm = debt.personName.trim().toLowerCase();
        if (uniquePeopleByName.has(norm)) {
          resolved = uniquePeopleByName.get(norm);
        }
      }

      const mergedLinked = resolved
        ? {
            id: resolved.id,
            nickname: resolved.nickname,
            fullName: resolved.fullName,
            trustLevel: resolved.trustLevel,
            phone: resolved.phone,
            telegram: resolved.telegram,
            instagram: resolved.instagram,
            otherContacts: resolved.otherContacts,
            metPlace: resolved.metPlace,
            area: resolved.profile?.area || "",
          }
        : debt.linkedPerson || null;

      return {
        ...debt,
        linkedPerson: mergedLinked,
      };
    });
  }, [debts, peopleById, uniquePeopleByName]);

  // URL parametrlari (?addForPerson=..., ?personId=... yoki ?debtId=...) orqali kelganda modalni ochish
  useEffect(() => {
    const addForPersonId = searchParams.get("addForPerson");
    const viewPersonId = searchParams.get("personId");
    const viewDebtId = searchParams.get("debtId");

    if (addForPersonId) {
      const person = peopleById.get(addForPersonId);
      if (person) {
        const trustInfo = getTrustLevelInfo(person.trustLevel);
        const ig = cleanSocialHandle(person.instagram || "");
        const tg = cleanSocialHandle(person.telegram || "");
        setAddDebtInitialData({
          personId: person.id,
          personName: person.nickname || person.fullName || "",
          contact:
            person.phone ||
            (tg ? `@${tg}` : "") ||
            (ig ? `@${ig}` : "") ||
            "",
          instagram: ig,
          telegram: tg,
          location: person.profile?.area || person.metPlace || "",
          repaymentProbability: trustInfo.suggestedProbability,
        });
        setIsAddModalOpen(true);

        const nextParams = new URLSearchParams(searchParams);
        nextParams.delete("addForPerson");
        setSearchParams(nextParams, { replace: true });
      }
    } else if (viewDebtId) {
      const targetDebt = enrichedDebts.find((d) => d.id === viewDebtId);
      if (targetDebt) {
        setSelectedDebt(targetDebt);
        const nextParams = new URLSearchParams(searchParams);
        nextParams.delete("debtId");
        setSearchParams(nextParams, { replace: true });
      }
    } else if (viewPersonId) {
      const person = peopleById.get(viewPersonId);
      const fallbackDebt = enrichedDebts.find((d) => d.personId === viewPersonId);
      const resolvedName = person?.nickname || person?.fullName || fallbackDebt?.personName;
      if (resolvedName) {
        setSelectedPersonHistory({
          personName: resolvedName,
          personId: viewPersonId,
        });
        const nextParams = new URLSearchParams(searchParams);
        nextParams.delete("personId");
        setSearchParams(nextParams, { replace: true });
      }
    }
  }, [searchParams, peopleById, enrichedDebts, setSearchParams]);

  // Agar selectedDebt o'zgarsa (masalan context yangilansa), yangi nusxasini olamiz
  useEffect(() => {
    if (selectedDebt) {
      const fresh = enrichedDebts.find((d) => d.id === selectedDebt.id);
      if (fresh) {
        setSelectedDebt(fresh);
      } else {
        setSelectedDebt(null);
      }
    }
  }, [enrichedDebts, selectedDebt?.id]);

  // Har bir shaxs bo'yicha jamlangan ma'lumotlar (Consolidated per person)
  const personsMap = useMemo(() => {
    const map = new Map();

    enrichedDebts.forEach((debt) => {
      const linked = debt.linkedPerson;
      const pName = (linked?.nickname || debt.personName || "Noma'lum").trim();
      const linkedId = linked?.id || debt.personId || null;
      const normKey = linkedId ? `person:${linkedId}` : `name:${pName.toLowerCase()}`;

      if (!map.has(normKey)) {
        map.set(normKey, {
          key: normKey,
          personId: linkedId,
          linkedPerson: linked || null,
          trustLevel: linked?.trustLevel || null,
          personName: pName,
          fullName: linked?.fullName || "",
          contact: debt.contact || linked?.phone || "",
          instagram: cleanSocialHandle(debt.instagram || linked?.instagram || ""),
          telegram: cleanSocialHandle(debt.telegram || linked?.telegram || ""),
          location: debt.location || linked?.area || linked?.metPlace || "",
          debts: [],
          activeCount: 0,
          overdueCount: 0,
          soonCount: 0,
          noDateCount: 0,
          settledCount: 0,
          forgivenCount: 0,
          givenCount: 0,
          takenCount: 0,
          probHighCount: 0,
          probMediumCount: 0,
          probLowCount: 0,
          activeGivenUzs: 0,
          activeGivenUsd: 0,
          activeTakenUzs: 0,
          activeTakenUsd: 0,
          activeRemainingUzs: 0,
          activeRemainingUsd: 0,
          totalGivenUzs: 0,
          totalGivenUsd: 0,
          totalTakenUzs: 0,
          totalTakenUsd: 0,
          totalRepaidUzs: 0,
          totalRepaidUsd: 0,
          totalForgivenUzs: 0,
          totalForgivenUsd: 0,
        });
      }

      const pData = map.get(normKey);
      pData.debts.push(debt);
      if (!pData.personId && linkedId) pData.personId = linkedId;
      if (!pData.linkedPerson && linked) pData.linkedPerson = linked;
      if (!pData.trustLevel && linked?.trustLevel) pData.trustLevel = linked.trustLevel;
      if (!pData.fullName && linked?.fullName) pData.fullName = linked.fullName;
      if (!pData.contact && (debt.contact || linked?.phone)) pData.contact = debt.contact || linked?.phone || "";
      if (!pData.instagram && (debt.instagram || linked?.instagram)) {
        pData.instagram = cleanSocialHandle(debt.instagram || linked?.instagram || "");
      }
      if (!pData.telegram && (debt.telegram || linked?.telegram)) {
        pData.telegram = cleanSocialHandle(debt.telegram || linked?.telegram || "");
      }
      if (!pData.location && (debt.location || linked?.area || linked?.metPlace)) {
        pData.location = debt.location || linked?.area || linked?.metPlace || "";
      }

      const isUsd = debt.currency === "USD";
      const totalAmt = Number(debt.amount || 0);
      const isGiven = debt.type === DEBT_TYPES.GIVEN;
      const isSettled = debt.status === "settled";
      const isForgiven = debt.status === "forgiven";

      if (isGiven) {
        pData.givenCount += 1;
        if (isUsd) pData.totalGivenUsd += totalAmt;
        else pData.totalGivenUzs += totalAmt;
      } else {
        pData.takenCount += 1;
        if (isUsd) pData.totalTakenUsd += totalAmt;
        else pData.totalTakenUzs += totalAmt;
      }

      let paid = 0;
      let forgiven = 0;
      (debt.payments || []).forEach((pmt) => {
        const pAmt = Number(pmt.amount || 0);
        if (pmt.isForgiven) forgiven += pAmt;
        else paid += pAmt;
      });

      if (isUsd) {
        pData.totalRepaidUsd += paid;
        pData.totalForgivenUsd += forgiven;
      } else {
        pData.totalRepaidUzs += paid;
        pData.totalForgivenUzs += forgiven;
      }

      const remaining = isSettled || isForgiven ? 0 : Math.max(0, totalAmt - paid - forgiven);
      if (remaining > 0) {
        pData.activeCount += 1;
        if (isGiven) {
          if (isUsd) pData.activeGivenUsd += remaining;
          else pData.activeGivenUzs += remaining;
        } else {
          if (isUsd) pData.activeTakenUsd += remaining;
          else pData.activeTakenUzs += remaining;
        }
        if (isUsd) pData.activeRemainingUsd += remaining;
        else pData.activeRemainingUzs += remaining;

        const dueInfo = getDebtDueInfo(debt);
        if (dueInfo.isOverdue) pData.overdueCount += 1;
        else if (dueInfo.stage === DUE_STAGES.SOON) pData.soonCount += 1;
        else if (dueInfo.stage === DUE_STAGES.NO_DATE) pData.noDateCount += 1;

        const prob = debt.repaymentProbability || "high";
        if (prob === "low") pData.probLowCount += 1;
        else if (prob === "medium") pData.probMediumCount += 1;
        else pData.probHighCount += 1;
      } else if (isForgiven) {
        pData.forgivenCount += 1;
      } else {
        pData.settledCount += 1;
      }
    });

    return map;
  }, [enrichedDebts]);

  // Shaxslar ro'yxati (Muddati o'tganlar birinchi o'rinda)
  const personsList = useMemo(() => {
    const list = Array.from(personsMap.values());
    list.sort((a, b) => {
      // 1. Muddati o'tgan qarzlari bor shaxslar eng yuqorida
      if (a.overdueCount > 0 && b.overdueCount === 0) return -1;
      if (a.overdueCount === 0 && b.overdueCount > 0) return 1;

      // 2. Muddati oz qolganlar
      if (a.soonCount > 0 && b.soonCount === 0) return -1;
      if (a.soonCount === 0 && b.soonCount > 0) return 1;

      // 3. Faol qarzi borlar
      if (a.activeCount > 0 && b.activeCount === 0) return -1;
      if (a.activeCount === 0 && b.activeCount > 0) return 1;

      // 4. Qoldiq summasi kattaroqlar
      const aTotal = a.activeRemainingUzs + a.activeRemainingUsd * currentUsdRate;
      const bTotal = b.activeRemainingUzs + b.activeRemainingUsd * currentUsdRate;
      return bTotal - aTotal;
    });
    return list;
  }, [personsMap, currentUsdRate]);

  // Qidiruv va aktiv filtrlar bo'yicha saralangan Shaxslar ro'yxati
  const filteredPersonsList = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const qClean = q.replace(/^@/, "");

    return personsList.filter((p) => {
      if (filterType === "overdue" && p.overdueCount === 0) return false;
      else if (filterType === "soon" && p.soonCount === 0) return false;
      else if (filterType === "no_date" && p.noDateCount === 0) return false;
      else if (filterType === "prob_high" && p.probHighCount === 0) return false;
      else if (filterType === "prob_medium" && p.probMediumCount === 0) return false;
      else if (filterType === "prob_low" && p.probLowCount === 0) return false;
      else if (filterType === "given" && p.givenCount === 0) return false;
      else if (filterType === "taken" && p.takenCount === 0) return false;
      else if (filterType === "forgiven" && p.forgivenCount === 0) return false;
      else if (filterType === "settled" && p.settledCount === 0) return false;
      else if (filterType === "pending" && p.activeCount === 0) return false;

      if (!q) return true;
      return (
        p.personName.toLowerCase().includes(q) ||
        p.fullName.toLowerCase().includes(q) ||
        p.contact.toLowerCase().includes(q) ||
        p.location.toLowerCase().includes(q) ||
        (qClean && p.instagram.toLowerCase().includes(qClean)) ||
        (qClean && p.telegram.toLowerCase().includes(qClean)) ||
        (p.linkedPerson?.otherContacts || "").toLowerCase().includes(q) ||
        p.debts.some(
          (d) =>
            (d.reason || "").toLowerCase().includes(q) ||
            (d.personalNote || "").toLowerCase().includes(q)
        )
      );
    });
  }, [personsList, filterType, searchQuery]);

  // Qidiruv bo'yicha mos kelgan shaxslar (Tezkor tarixni ochish uchun)
  const matchedPersons = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();
    const qClean = q.replace(/^@/, "");
    return personsList.filter(
      (p) =>
        p.personName.toLowerCase().includes(q) ||
        p.fullName.toLowerCase().includes(q) ||
        p.contact.toLowerCase().includes(q) ||
        p.location.toLowerCase().includes(q) ||
        (qClean && p.instagram.toLowerCase().includes(qClean)) ||
        (qClean && p.telegram.toLowerCase().includes(qClean)) ||
        (p.linkedPerson?.otherContacts || "").toLowerCase().includes(q)
    );
  }, [personsList, searchQuery]);

  // Global Statistika hisoblash
  const stats = useMemo(() => {
    let givenUzs = 0;
    let givenUsd = 0;
    let takenUzs = 0;
    let takenUsd = 0;
    let pendingCount = 0;
    let settledCount = 0;
    let forgivenCount = 0;
    let overdueCount = 0;
    let soonCount = 0;
    let noDateCount = 0;
    let highProbCount = 0;
    let mediumProbCount = 0;
    let lowProbCount = 0;

    debts.forEach((debt) => {
      const isSettled = debt.status === "settled";
      const isForgiven = debt.status === "forgiven";
      const totalAmount = Number(debt.amount || 0);

      let paid = 0;
      let forg = 0;
      (debt.payments || []).forEach((p) => {
        if (p.isForgiven) forg += Number(p.amount || 0);
        else paid += Number(p.amount || 0);
      });

      const remaining = isSettled || isForgiven ? 0 : Math.max(0, totalAmount - paid - forg);

      if (isForgiven) {
        forgivenCount += 1;
      } else if (isSettled || remaining <= 0) {
        settledCount += 1;
      } else {
        pendingCount += 1;
        if (debt.type === DEBT_TYPES.GIVEN) {
          if (debt.currency === "USD") givenUsd += remaining;
          else givenUzs += remaining;
        } else if (debt.type === DEBT_TYPES.TAKEN) {
          if (debt.currency === "USD") takenUsd += remaining;
          else takenUzs += remaining;
        }

        const dueInfo = getDebtDueInfo(debt);
        if (dueInfo.isOverdue) overdueCount += 1;
        else if (dueInfo.stage === DUE_STAGES.SOON) soonCount += 1;
        else if (dueInfo.stage === DUE_STAGES.NO_DATE) noDateCount += 1;

        const prob = debt.repaymentProbability || "high";
        if (prob === "low") lowProbCount += 1;
        else if (prob === "medium") mediumProbCount += 1;
        else highProbCount += 1;
      }
    });

    const netUzs = givenUzs - takenUzs;
    const netUsd = givenUsd - takenUsd;
    const grandNetUzs = netUzs + Math.round(netUsd * currentUsdRate);

    return {
      givenUzs,
      givenUsd,
      takenUzs,
      takenUsd,
      netUzs,
      netUsd,
      grandNetUzs,
      pendingCount,
      settledCount,
      forgivenCount,
      overdueCount,
      soonCount,
      noDateCount,
      highProbCount,
      mediumProbCount,
      lowProbCount,
      totalCount: debts.length,
      personsCount: personsList.length,
    };
  }, [debts, currentUsdRate, personsList]);

  // Qidiruv va filtrlar (Muddati bo'yicha qat'iy tartiblangan)
  const filteredDebts = useMemo(() => {
    return enrichedDebts
      .filter((d) => {
        const dueInfo = getDebtDueInfo(d);

        // Maxsus muddat filtrlari
        if (filterType === "overdue") {
          if (!dueInfo.isOverdue) return false;
        } else if (filterType === "soon") {
          if (dueInfo.stage !== DUE_STAGES.SOON) return false;
        } else if (filterType === "no_date") {
          if (dueInfo.stage !== DUE_STAGES.NO_DATE) return false;
        } else if (filterType === "given") {
          if (d.type !== DEBT_TYPES.GIVEN) return false;
        } else if (filterType === "taken") {
          if (d.type !== DEBT_TYPES.TAKEN) return false;
        } else if (filterType === "forgiven") {
          if (d.status !== "forgiven") return false;
        } else if (filterType === "settled") {
          if (d.status !== "settled") return false;
        } else if (filterType === "pending") {
          if (d.status === "settled" || d.status === "forgiven") return false;
        } else if (filterType === "prob_high") {
          if ((d.repaymentProbability || "high") !== "high" || d.status === "settled" || d.status === "forgiven") return false;
        } else if (filterType === "prob_medium") {
          if (d.repaymentProbability !== "medium" || d.status === "settled" || d.status === "forgiven") return false;
        } else if (filterType === "prob_low") {
          if (d.repaymentProbability !== "low" || d.status === "settled" || d.status === "forgiven") return false;
        }

        // Matnli qidiruv (Odamlar ro'yxatidagi ism, telefon, Telegram, Instagram ham qamrab olinadi)
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const qClean = q.replace(/^@/, "");
          const linked = d.linkedPerson;
          const matchName = (d.personName || "").toLowerCase().includes(q);
          const matchLinkedNick = (linked?.nickname || "").toLowerCase().includes(q);
          const matchLinkedFull = (linked?.fullName || "").toLowerCase().includes(q);
          const matchContact = (d.contact || "").toLowerCase().includes(q);
          const matchLinkedPhone = (linked?.phone || "").toLowerCase().includes(q);
          const matchIg =
            Boolean(qClean) &&
            (cleanSocialHandle(d.instagram || "").toLowerCase().includes(qClean) ||
              cleanSocialHandle(linked?.instagram || "").toLowerCase().includes(qClean));
          const matchTg =
            Boolean(qClean) &&
            (cleanSocialHandle(d.telegram || "").toLowerCase().includes(qClean) ||
              cleanSocialHandle(linked?.telegram || "").toLowerCase().includes(qClean));
          const matchReason = (d.reason || "").toLowerCase().includes(q);
          const matchLoc = (d.location || "").toLowerCase().includes(q);
          const matchNote = (d.personalNote || "").toLowerCase().includes(q);
          return (
            matchName ||
            matchLinkedNick ||
            matchLinkedFull ||
            matchContact ||
            matchLinkedPhone ||
            matchIg ||
            matchTg ||
            matchReason ||
            matchLoc ||
            matchNote
          );
        }

        return true;
      })
      .sort((a, b) => {
        const infoA = getDebtDueInfo(a);
        const infoB = getDebtDueInfo(b);

        // Bosqichlar bo'yicha ustuvorlik tartibi:
        // 0: OVERDUE (O'tib ketganlar)
        // 1: SOON (Oz qolganlar)
        // 2: UPCOMING (Kelgusi)
        // 3: NO_DATE (Muddatsiz)
        // 4: CLOSED (Yopilgan / Kechilgan)
        const stagePriority = {
          [DUE_STAGES.OVERDUE]: 0,
          [DUE_STAGES.SOON]: 1,
          [DUE_STAGES.UPCOMING]: 2,
          [DUE_STAGES.NO_DATE]: 3,
          [DUE_STAGES.CLOSED]: 4,
        };

        const prioA = stagePriority[infoA.stage] ?? 99;
        const prioB = stagePriority[infoB.stage] ?? 99;

        if (prioA !== prioB) {
          return prioA - prioB;
        }

        // Agar ikkalasi ham OVERDUE bo'lsa: eng ko'p kechikkani yuqorida (daysLeft manfiy)
        if (infoA.stage === DUE_STAGES.OVERDUE) {
          return (infoA.daysLeft ?? 0) - (infoB.daysLeft ?? 0);
        }

        // Agar ikkalasi ham SOON yoki UPCOMING bo'lsa: muddati eng yaqini yuqorida
        if (infoA.stage === DUE_STAGES.SOON || infoA.stage === DUE_STAGES.UPCOMING) {
          return (infoA.daysLeft ?? 999) - (infoB.daysLeft ?? 999);
        }

        // Boshqa hollarda sanasi bo'yicha eng yangi
        return new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt);
      });
  }, [enrichedDebts, filterType, searchQuery]);

  const handleSettle = async (id, customOpts = {}) => {
    const debt = debts.find((d) => d.id === id);
    if (!debt) return;
    const paid = (debt.payments || []).reduce((sum, p) => sum + (p.isForgiven ? 0 : Number(p.amount || 0)), 0);
    const forgiven = (debt.payments || []).reduce((sum, p) => sum + (p.isForgiven ? Number(p.amount || 0) : 0), 0);
    const rem = Math.max(0, Number(debt.amount || 0) - paid - forgiven);

    await settleDebt(id, {
      amount: customOpts.amount !== undefined ? Number(customOpts.amount) : rem,
      wallet: customOpts.wallet || debt.wallet,
      affectBalance: customOpts.affectBalance !== undefined ? customOpts.affectBalance : false,
      note: customOpts.note || "To'liq yopildi deb belgilandi",
      date: new Date().toISOString(),
    });
  };

  const handleOpenAddNewDebt = (prefill = null) => {
    setAddDebtInitialData(prefill);
    setIsAddModalOpen(true);
  };

  return (
    <div className="debts-page">
      {/* 1. Sarlavha qismi (Page Header) */}
      <div className="debts-page__header">
        <div className="debts-page__title-block">
          <div className="debts-page__title-row">
            <div className="debts-page__logo-badge">
              <HandCoins size={20} />
            </div>
            <div>
              <h1 className="debts-page__title">Qarz daftari</h1>
              <p className="debts-page__subtitle">
                Muddati boʻyicha saralangan kutilayotgan qarzlar va shaxslar tarixi
              </p>
            </div>
          </div>
        </div>

        <div className="debts-header-actions">
          {/* Ko'rinish rejimi: Daftar / Shaxslar / Kartalar */}
          <div className="debt-view-toggle">
            <button
              type="button"
              className={`debt-view-toggle__btn ${viewMode === "ledger" ? "is-active" : ""}`}
              onClick={() => handleViewModeChange("ledger")}
              title="Daftar ko'rinishi (Muddati bo'yicha ro'yxat)"
            >
              <BookOpen size={14} />
              <span>Daftar</span>
            </button>

            <button
              type="button"
              className={`debt-view-toggle__btn ${viewMode === "persons" ? "is-active" : ""}`}
              onClick={() => handleViewModeChange("persons")}
              title="Qarzdor shaxslar bo'yicha jamlangan ko'rinish"
            >
              <Users size={14} />
              <span>Shaxslar</span>
            </button>

            <button
              type="button"
              className={`debt-view-toggle__btn ${viewMode === "cards" ? "is-active" : ""}`}
              onClick={() => handleViewModeChange("cards")}
              title="Karta ko'rinishi"
            >
              <LayoutGrid size={14} />
              <span>Kartalar</span>
            </button>
          </div>

          <button
            type="button"
            className="btn btn--primary debts-add-btn"
            onClick={() => handleOpenAddNewDebt(null)}
          >
            <PlusCircle size={16} />
            <span>Yangi qarz</span>
          </button>
        </div>
      </div>

      {/* 2. KPI Ko'rsatkichlari */}
      <div className="debts-stats-grid">
        {/* Men bergan qarzlar */}
        <div className="debts-stat-card debts-stat-card--given">
          <div className="debts-stat-card__top">
            <div className="debts-stat-card__label">
              <ArrowUpRight size={15} />
              <span>Berilgan (Kutilmoqda)</span>
            </div>
            <span className="debts-stat-card__badge">Qoldiq</span>
          </div>

          <div className="debts-stat-card__val mono">
            {formatSum(stats.givenUzs)}
          </div>

          {stats.givenUsd > 0 && (
            <div className="debts-stat-card__usd-val mono">
              + {formatDollar(stats.givenUsd)}
            </div>
          )}

          <div className="debts-stat-card__meta">
            Menga qaytishi kerak bo'lgan mablag'
          </div>
        </div>

        {/* Men olgan qarzlar */}
        <div className="debts-stat-card debts-stat-card--taken">
          <div className="debts-stat-card__top">
            <div className="debts-stat-card__label">
              <ArrowDownLeft size={15} />
              <span>Olgan (Majburiyat)</span>
            </div>
            <span className="debts-stat-card__badge">Qoldiq</span>
          </div>

          <div className="debts-stat-card__val debts-stat-card__val--taken mono">
            {formatSum(stats.takenUzs)}
          </div>

          {stats.takenUsd > 0 && (
            <div className="debts-stat-card__usd-val debts-stat-card__usd-val--taken mono">
              + {formatDollar(stats.takenUsd)}
            </div>
          )}

          <div className="debts-stat-card__meta">
            To'lashim kerak bo'lgan summa
          </div>
        </div>

        {/* Sof kutilayotgan saldo */}
        <div className="debts-stat-card debts-stat-card--net">
          <div className="debts-stat-card__top">
            <div className="debts-stat-card__label">
              <CheckCircle2 size={15} />
              <span>Sof saldo & Muddatlar</span>
            </div>
            <span className="debts-stat-card__badge">Farq</span>
          </div>

          <div
            className={`debts-stat-card__val mono ${
              stats.grandNetUzs >= 0
                ? "debts-stat-card__val--net-pos"
                : "debts-stat-card__val--net-neg"
            }`}
          >
            {stats.grandNetUzs >= 0 ? "+" : ""}{formatSum(stats.grandNetUzs)}
          </div>

          <div className="debts-stat-card__meta">
            {stats.overdueCount > 0 ? (
              <span style={{ color: "var(--expense)", fontWeight: 700 }}>
                🚨 {stats.overdueCount} ta muddati o'tgan!
              </span>
            ) : (
              <span>O'tgan muddat yo'q • </span>
            )}
            <span> Oz qolgan: <strong>{stats.soonCount} ta</strong> • Shaxslar: <strong>{stats.personsCount} ta</strong></span>
          </div>
        </div>
      </div>

      {/* 3. Qidiruv va filtr tugmalari */}
      <div className="debts-filter-card">
        {/* Filtr tabs (Muddati va holatlar bo'yicha) */}
        <div className="debts-filter-scroll">
          {[
            { id: "all", label: `Barchasi (${debts.length})` },
            { id: "overdue", label: `🚨 Muddati o'tganlar (${stats.overdueCount})`, isAlert: stats.overdueCount > 0 },
            { id: "soon", label: `⏳ Oz qolganlar (${stats.soonCount})` },
            { id: "no_date", label: `📅 Muddatsizlar (${stats.noDateCount})` },
            { id: "prob_high", label: `🟢 Yuqori ehtimol (${stats.highProbCount})` },
            { id: "prob_medium", label: `🟡 Oʻrtacha ehtimol (${stats.mediumProbCount})` },
            { id: "prob_low", label: `🔴 Past ehtimol (${stats.lowProbCount})`, isAlert: stats.lowProbCount > 0 },
            { id: "given", label: "Men bergan" },
            { id: "taken", label: "Men olgan" },
            { id: "forgiven", label: `💜 Voz kechilgan (${stats.forgivenCount})` },
            { id: "settled", label: `✅ Yopilgan (${stats.settledCount})` },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`debts-filter-tab ${
                filterType === tab.id ? "is-active" : ""
              } ${tab.isAlert ? "debts-filter-tab--alert" : ""}`}
              onClick={() => setFilterType(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Qidiruv input */}
        <div className="input-with-icon debts-search-box">
          <Search size={15} className="input-icon" />
          <input
            type="text"
            className="field-input field-input--sm debts-search-input"
            placeholder="Ism, telefon, @instagram, @telegram yoki izoh boʻyicha qidiring..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="debts-search-clear"
              onClick={() => setSearchQuery("")}
              title="Qidiruvni tozalash"
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Eski bog'lanmagan qarzlarni Odamlar bilan bog'lash banneri */}
      {(autoLinkableDebts.length > 0 || autoLinkNotice) && (
        <div className="debt-autolink-banner">
          {autoLinkableDebts.length > 0 ? (
            <>
              <div className="debt-autolink-banner__text">
                <Link2 size={15} color="var(--accent)" />
                <span>
                  <strong>{autoLinkableDebts.length} ta</strong> eski qarz Odamlar roʻyxatidagi shaxslar bilan ism boʻyicha mos keldi.
                </span>
              </div>
              <button
                type="button"
                className="btn btn--xs btn--primary"
                onClick={handleAutoLinkDebts}
                disabled={isAutoLinking}
              >
                <Link2 size={12} />
                <span>{isAutoLinking ? "Bogʻlanmoqda..." : "Barchasini bogʻlash"}</span>
              </button>
            </>
          ) : (
            <>
              <div className="debt-autolink-banner__text">
                <CheckCircle2 size={15} color="var(--income)" />
                <span>{autoLinkNotice}</span>
              </div>
              <button
                type="button"
                className="btn btn--xs btn--ghost"
                onClick={() => setAutoLinkNotice("")}
              >
                <X size={12} />
              </button>
            </>
          )}
        </div>
      )}

      {/* 3.1. Qidirilgan shaxslar bo'yicha tezkor tarix paneli (Search highlight) */}
      {searchQuery.trim() && matchedPersons.length > 0 && (
        <div className="debts-search-match-section">
          <div className="debts-search-match-header">
            <User size={14} color="var(--accent)" />
            <span>Topilgan qarz oluvchilar — barcha olingan va yopilgan qarzlari tarixi:</span>
          </div>

          <div className="debts-search-match-grid">
            {matchedPersons.map((person) => {
              const trustInfo = person.trustLevel ? getTrustLevelInfo(person.trustLevel) : null;
              const hasActiveGiven = person.activeGivenUzs > 0 || person.activeGivenUsd > 0;
              const hasActiveTaken = person.activeTakenUzs > 0 || person.activeTakenUsd > 0;
              const onlyTaken = hasActiveTaken && !hasActiveGiven;
              const displayUzs = onlyTaken ? person.activeTakenUzs : person.activeGivenUzs - person.activeTakenUzs;
              const displayUsd = onlyTaken ? person.activeTakenUsd : person.activeGivenUsd - person.activeTakenUsd;
              const hasActive = hasActiveGiven || hasActiveTaken;

              const renderAmountText = () => {
                if (!hasActive) return "0 (Yopilgan)";
                const absUzs = Math.abs(displayUzs);
                const absUsd = Math.abs(displayUsd);
                const prefix = onlyTaken ? "Berishim: " : hasActiveTaken ? "Sof: " : "Olishim: ";
                if (absUzs > 0 && absUsd > 0) {
                  return `${prefix}${displayUzs < 0 ? "-" : ""}${formatSum(absUzs)} + ${formatDollar(absUsd)}`;
                }
                if (absUzs > 0) return `${prefix}${displayUzs < 0 ? "-" : ""}${formatSum(absUzs)}`;
                return `${prefix}${displayUsd < 0 ? "-" : ""}${formatDollar(absUsd)}`;
              };

              return (
                <div
                  key={person.key}
                  className="debts-search-match-card"
                  onClick={() => handleOpenPersonHistory(person.personName, person.personId)}
                  title="Barcha qarzlari tarixini 1 ta joyda ochish uchun bosing"
                >
                  <div className="debts-search-match-avatar">
                    {person.personName.charAt(0).toUpperCase()}
                  </div>

                  <div className="debts-search-match-info">
                    <div className="debts-search-match-name-row">
                      <strong className="debts-search-match-name">{person.personName}</strong>
                      {person.fullName && person.fullName !== person.personName && (
                        <span style={{ fontSize: "0.74rem", color: "var(--text-muted)" }}>
                          ({person.fullName})
                        </span>
                      )}
                      {trustInfo && (
                        <span
                          className="debt-trust-pill"
                          style={{
                            color: trustInfo.color,
                            background: trustInfo.bg,
                            borderColor: trustInfo.border,
                          }}
                        >
                          <ShieldCheck size={10} />
                          <span>{trustInfo.shortLabel} ishonch</span>
                        </span>
                      )}
                      {person.overdueCount > 0 && (
                        <span className="badge badge--danger" style={{ fontSize: "0.68rem" }}>
                          Muddati o'tgan
                        </span>
                      )}
                    </div>

                    <div className="debts-search-match-sub">
                      <span>Jami {person.debts.length} ta qarz</span>
                      {person.contact && <span>• {person.contact}</span>}
                      {person.instagram && <span>• IG: @{person.instagram}</span>}
                      {person.telegram && <span>• TG: @{person.telegram}</span>}
                    </div>
                  </div>

                  <div className="debts-search-match-amount">
                    <span
                      className="debts-search-match-amount-val mono"
                      style={onlyTaken ? { color: "var(--expense)" } : undefined}
                    >
                      {renderAmountText()}
                    </span>
                    <span className="debts-search-match-cta">
                      Tarixni ochish <ChevronRight size={12} />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. Qarzlar ro'yxati / Shaxslar daftari */}
      {isLoading ? (
        <Loader
          variant="block"
          size="lg"
          text="Qarzlar daftari yuklanmoqda..."
          subtext="Muddati boʻyicha saralangan hisob-kitob"
          blur="5px"
        />
      ) : viewMode === "persons" ? (
        /* Shaxslar (Qarzdorlar) Jamlangan Ko'rinishi */
        filteredPersonsList.length > 0 ? (
          <div className="debts-persons-grid">
            {filteredPersonsList.map((person) => {
              const hasActiveGiven = person.activeGivenUzs > 0 || person.activeGivenUsd > 0;
              const hasActiveTaken = person.activeTakenUzs > 0 || person.activeTakenUsd > 0;
              const hasActive = hasActiveGiven || hasActiveTaken;
              const onlyTaken = hasActiveTaken && !hasActiveGiven;
              const mixed = hasActiveGiven && hasActiveTaken;
              const netUzs = person.activeGivenUzs - person.activeTakenUzs;
              const netUsd = person.activeGivenUsd - person.activeTakenUsd;
              const primaryUzs = onlyTaken ? person.activeTakenUzs : netUzs;
              const primaryUsd = onlyTaken ? person.activeTakenUsd : netUsd;
              const trustInfo = person.trustLevel ? getTrustLevelInfo(person.trustLevel) : null;

              return (
                <div
                  key={person.key}
                  className={`person-ledger-card ${
                    person.overdueCount > 0 ? "person-ledger-card--overdue" : ""
                  }`}
                  onClick={() => handleOpenPersonHistory(person.personName, person.personId)}
                >
                  <div className="person-ledger-card__top">
                    <div className="person-ledger-card__profile">
                      <div
                        className={`person-ledger-card__avatar ${
                          hasActive ? "person-ledger-card__avatar--active" : "person-ledger-card__avatar--settled"
                        }`}
                      >
                        {person.personName.charAt(0).toUpperCase()}
                      </div>

                      <div className="person-ledger-card__titles">
                        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                          <h4 className="person-ledger-card__name">{person.personName}</h4>
                          {person.personId && (
                            <span
                              className="debt-social-chip"
                              title="Odamlar ro'yxatiga bog'langan"
                            >
                              <Link2 size={10} />
                              <span>Odamlar</span>
                            </span>
                          )}
                        </div>
                        {person.fullName && person.fullName !== person.personName && (
                          <div style={{ fontSize: "0.73rem", color: "var(--text-muted)" }}>
                            {person.fullName}
                          </div>
                        )}
                        <div className="person-ledger-card__meta">
                          {person.contact && (
                            <span className="person-ledger-card__contact">
                              <Phone size={10} /> {person.contact}
                            </span>
                          )}
                          {person.instagram && (
                            <span className="person-ledger-card__contact">
                              IG: @{person.instagram}
                            </span>
                          )}
                          {person.telegram && (
                            <span className="person-ledger-card__contact">
                              <Send size={9} /> @{person.telegram}
                            </span>
                          )}
                          <span>• Jami {person.debts.length} ta qarz</span>
                        </div>
                      </div>
                    </div>

                    {/* Qoldiq summa (Yo'nalishi va USD bilan) */}
                    <div className="person-ledger-card__balance-block">
                      <span className="person-ledger-card__bal-lbl">
                        {mixed
                          ? "Sof qoldiq:"
                          : onlyTaken
                          ? "Qaytarishim:"
                          : hasActiveGiven
                          ? "Menga qaytishi:"
                          : "Qarz qoldig'i:"}
                      </span>
                      <div
                        className={`person-ledger-card__bal-val mono ${
                          onlyTaken
                            ? "person-ledger-card__bal-val--taken"
                            : hasActive
                            ? "person-ledger-card__bal-val--owed"
                            : "person-ledger-card__bal-val--zero"
                        }`}
                      >
                        {!hasActive
                          ? "0 UZS"
                          : Math.abs(primaryUzs) > 0
                          ? `${primaryUzs < 0 ? "-" : ""}${formatSum(Math.abs(primaryUzs))}`
                          : `${primaryUsd < 0 ? "-" : ""}${formatDollar(Math.abs(primaryUsd))}`}
                      </div>
                      {hasActive && Math.abs(primaryUzs) > 0 && Math.abs(primaryUsd) > 0 && (
                        <div className="person-ledger-card__bal-sub mono">
                          {primaryUsd > 0 ? "+ " : "- "}
                          {formatDollar(Math.abs(primaryUsd))}
                        </div>
                      )}
                      {mixed && (
                        <div className="person-ledger-card__bal-mix">
                          Ber: {person.activeGivenUzs > 0 ? formatSum(person.activeGivenUzs) : formatDollar(person.activeGivenUsd)} · Ol: {person.activeTakenUzs > 0 ? formatSum(person.activeTakenUzs) : formatDollar(person.activeTakenUsd)}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Nishonlar */}
                  <div className="person-ledger-card__badges">
                    {trustInfo && (
                      <span
                        className="debt-trust-pill"
                        style={{
                          color: trustInfo.color,
                          background: trustInfo.bg,
                          borderColor: trustInfo.border,
                        }}
                        title={`Ishonish darajasi: ${trustInfo.fullLabel}`}
                      >
                        <ShieldCheck size={11} />
                        <span>{trustInfo.label}</span>
                      </span>
                    )}

                    {person.overdueCount > 0 ? (
                      <span className="badge badge--danger" style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                        <AlertCircle size={11} />
                        {person.overdueCount} ta muddati o'tgan!
                      </span>
                    ) : person.soonCount > 0 ? (
                      <span className="badge badge--warning" style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                        <Clock size={11} />
                        {person.soonCount} ta qaytishga oz qolgan
                      </span>
                    ) : hasActive ? (
                      <span className="badge badge--info">Faol qarzlar mavjud</span>
                    ) : (
                      <span className="badge badge--success">Barcha qarzlar yopilgan</span>
                    )}

                    {person.forgivenCount > 0 && (
                      <span
                        className="badge"
                        style={{
                          background: "rgba(168, 85, 247, 0.15)",
                          color: "#c084fc",
                          border: "1px solid rgba(168, 85, 247, 0.3)",
                        }}
                      >
                        {person.forgivenCount} ta voz kechilgan
                      </span>
                    )}
                  </div>

                  {/* Pastki tugmalar */}
                  <div className="person-ledger-card__footer" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      className="btn btn--xs btn--primary"
                      onClick={() => handleOpenPersonHistory(person.personName, person.personId)}
                    >
                      <User size={12} />
                      <span>Toʻliq tarixni koʻrish</span>
                    </button>

                    <button
                      type="button"
                      className="btn btn--xs btn--ghost"
                      onClick={() =>
                        handleOpenAddNewDebt({
                          personId: person.personId,
                          personName: person.personName,
                          contact: person.contact,
                          instagram: person.instagram,
                          telegram: person.telegram,
                          location: person.location,
                          repaymentProbability: trustInfo?.suggestedProbability,
                        })
                      }
                    >
                      <PlusCircle size={12} />
                      <span>+ Qarz yozish</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="debts-empty-state">
            <Users size={36} color="var(--text-muted)" />
            <div>
              <h4 className="debts-empty-title">
                {searchQuery || filterType !== "all"
                  ? "Filtr bo'yicha shaxslar topilmadi"
                  : "Shaxslar ro'yxati bo'sh"}
              </h4>
              <p className="debts-empty-subtitle">
                {searchQuery || filterType !== "all"
                  ? "Qidiruv so'zini o'zgartiring yoki filtrni «Barchasi» holatiga qaytaring."
                  : "Qarz kiritilgach, barcha qarz oluvchilar shu yerda avtomatik jamlanadi."}
              </p>
            </div>
          </div>
        )
      ) : filteredDebts.length > 0 ? (
        viewMode === "ledger" ? (
          <DebtLedgerList
            debts={filteredDebts}
            onSelectDebt={(debt) => setSelectedDebt(debt)}
            onOpenRepay={(debt) => setRepayTargetDebt(debt)}
            onOpenForgive={(debt) => setForgiveTargetDebt(debt)}
            onOpenPersonHistory={handleOpenPersonHistory}
            onSettleDebt={handleSettle}
            showStageDividers={filterType === "all"}
          />
        ) : (
          <div className="debts-cards-grid">
            {filteredDebts.map((debt) => (
              <DebtCard
                key={debt.id}
                debt={debt}
                onSelectDebt={(d) => setSelectedDebt(d)}
                onOpenRepay={(d) => setRepayTargetDebt(d)}
                onOpenForgive={(d) => setForgiveTargetDebt(d)}
                onOpenPersonHistory={handleOpenPersonHistory}
                onDeleteDebt={deleteDebt}
                onSettleDebt={handleSettle}
              />
            ))}
          </div>
        )
      ) : (
        <div className="debts-empty-state">
          <HandCoins size={36} color="var(--text-muted)" />
          <div>
            <h4 className="debts-empty-title">
              {searchQuery ? "Hech qanday qarz topilmadi" : "Qarz daftari bo'sh"}
            </h4>
            <p className="debts-empty-subtitle">
              {searchQuery
                ? "Qidiruv so'zini o'zgartirib ko'ring yoki filtrlarni tozalang."
                : "Berilgan yoki olingan qarzlar bo'lsa, 'Yangi qarz' tugmasi orqali kiriting."}
            </p>
          </div>
          {!searchQuery && (
            <button
              type="button"
              className="btn btn--primary btn--sm"
              onClick={() => handleOpenAddNewDebt(null)}
            >
              <PlusCircle size={15} />
              <span>Qarz kiritish</span>
            </button>
          )}
        </div>
      )}

      {/* Mobil telefonlar uchun qulay suzuvchi (FAB) tugma */}
      <button
        type="button"
        className="debt-fab-btn"
        onClick={() => handleOpenAddNewDebt(null)}
        aria-label="Yangi qarz yozish"
        title="Yangi qarz yozish"
      >
        <PlusCircle size={20} />
        <span>Qarz yozish</span>
      </button>

      {/* Shaxsning barcha olingan va yopilgan qarzlari to'liq konsolidatsiyalangan tarixi */}
      <PersonHistoryModal
        isOpen={Boolean(selectedPersonHistory)}
        onClose={() => setSelectedPersonHistory(null)}
        personName={selectedPersonHistory?.personName}
        personId={selectedPersonHistory?.personId}
        peopleList={peopleList}
        debts={enrichedDebts}
        onOpenRepay={(debt) => setRepayTargetDebt(debt)}
        onOpenForgive={(debt) => setForgiveTargetDebt(debt)}
        onOpenDebtDetail={(debt) => setSelectedDebt(debt)}
        onAddNewDebtForPerson={(prefill) => handleOpenAddNewDebt(prefill)}
        onSettleDebt={handleSettle}
      />

      {/* Qarzdan voz kechish (Kechvorish / Halol qilish) modali */}
      <ForgiveDebtModal
        isOpen={Boolean(forgiveTargetDebt)}
        onClose={() => setForgiveTargetDebt(null)}
        debt={forgiveTargetDebt}
        onForgive={forgiveDebt}
      />

      {/* Qarzdor shaxsning yakka qarz tafsilotlari modali */}
      <DebtDetailModal
        isOpen={Boolean(selectedDebt)}
        onClose={() => setSelectedDebt(null)}
        debt={selectedDebt}
        onOpenRepay={(d) => setRepayTargetDebt(d)}
        onOpenForgive={(d) => setForgiveTargetDebt(d)}
        onOpenPersonHistory={handleOpenPersonHistory}
        onOpenEdit={(d) => setEditingDebt(d)}
        onDeleteDebt={deleteDebt}
        onSettleDebt={handleSettle}
      />

      {/* Yangi qarz qo'shish modali */}
      <AddDebtModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setAddDebtInitialData(null);
          setPeopleList(readLocalPeople());
        }}
        onAddDebt={addDebt}
        initialData={addDebtInitialData}
      />

      {/* Qarz ma'lumotlarini tahrirlash modali */}
      <EditDebtModal
        isOpen={Boolean(editingDebt)}
        onClose={() => {
          setEditingDebt(null);
          setPeopleList(readLocalPeople());
        }}
        debt={editingDebt}
        onUpdateDebt={updateDebt}
      />

      {/* Qisman / to'liq to'lov qayd qilish modali */}
      <RepayDebtModal
        isOpen={Boolean(repayTargetDebt)}
        onClose={() => setRepayTargetDebt(null)}
        debt={repayTargetDebt}
        onRepay={repayDebt}
      />
    </div>
  );
}
