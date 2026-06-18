import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
  deleteDoc,
  doc,
  updateDoc,
  where,
  arrayUnion,
  arrayRemove,
  getDocs,
  writeBatch,
} from "firebase/firestore";
import {
  db,
  logout,
  handleFirestoreError,
  OperationType,
} from "../lib/firebase";
import { useFamily } from "../context/FamilyContext";
import { motion, AnimatePresence } from "motion/react";
import {
  Plus,
  Trash2,
  ShoppingCart,
  Home,
  Zap,
  Info,
  Send,
  LogOut,
  Camera,
  Paperclip,
  CheckCircle2,
  Circle,
  Clock,
  ArrowRight,
  Grid,
  LayoutList,
  Calendar,
  Smile,
  GraduationCap,
  Palmtree,
  Stethoscope,
  Gift,
  MapPin,
  Heart,
  Plane,
  Baby,
  DollarSign,
  Edit3,
  Image as ImageIcon,
  CheckCircle,
  Bell,
  BellOff,
  MessageSquare,
  ListTodo,
  ChevronDown,
  ChevronUp,
  UserPlus,
  User,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Activity,
  Pin,
  RefreshCw,
  Check,
  StickyNote,
  Sun,
  Cloud,
  CloudRain,
  CloudSun,
  CloudDrizzle,
  CloudLightning,
  CloudSnow,
  Wind,
  Thermometer,
  Droplets,
  Search,
  Upload,
  Download,
  Lock,
  Save,
  Bookmark,
  GripVertical,
  Moon,
  History,
  Clipboard,
  Mic,
  Trophy,
  Smartphone,
  Laptop,
  ExternalLink,
} from "lucide-react";
import { FamilyTrophies } from "./FamilyTrophies";
import { InstallAppButton } from "./InstallAppButton";
import {
  categorizeTask,
  getGroceriesSuggestions,
  categorizeMessage,
  generateAiAvatar,
  prioritizeTasks,
} from "../services/aiService";
import {
  LineChart,
  Line,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import ReactMarkdown from "react-markdown";
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  isSameMonth,
  isSameDay,
  addDays,
  parseISO,
  eachDayOfInterval,
} from "date-fns";
import { Language, translations } from "../lib/translations";
import { VoiceInputButton } from "./VoiceInputButton";

// --- Types ---
interface Task {
  id: string;
  title: string;
  category: string;
  subCategory?: string;
  priority: string;
  status: string;
  attachments: string[];
  createdAt: any;
  creatorId?: string;
  familyId?: string;
  dueDate?: string;
  reminderAt?: string;
  reminderTriggered?: boolean;
  isRecurring?: boolean;
  recurrenceFrequency?: "daily" | "weekly" | "monthly";
  recurrenceEndDate?: string;
  recurrenceGroupId?: string;
  assignedTo?: string;
  order?: number;
  completedAt?: string | null;
  tags?: string[];
}

interface Subtask {
  id: string;
  title: string;
  completed: boolean;
  assigneeId?: string;
  createdAt: any;
}

interface Comment {
  id: string;
  content: string;
  authorId: string;
  authorName: string;
  createdAt: any;
}

interface Message {
  id: string;
  content: string;
  authorId: string;
  authorName?: string;
  color: string;
  createdAt: any;
  category?: string;
  tags?: string[];
}

interface Vacation {
  id: string;
  destination: string;
  startDate: string;
  endDate: string;
  budget?: number;
  status: "Planning" | "Confirmed" | "Completed";
  attachments: string[];
  familyId: string;
  createdAt: any;
}

interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: any;
  authorId: string;
  familyId: string;
  vacationId?: string;
}

interface FamilyNotification {
  id: string;
  title: string;
  body: string;
  type: "task" | "message" | "expense" | "photo" | "system";
  read: boolean;
  createdAt: any;
  link?: string;
}

interface Photo {
  id: string;
  url: string;
  caption?: string;
  date: any;
  familyId: string;
  authorId: string;
  authorName?: string;
}

interface CalendarEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  familyId: string;
  authorId: string;
  type: "holiday" | "note" | "birthday" | "anniversary";
  description?: string;
}

interface Trophy {
  id: string;
  title: string;
  description: string;
  category: "tasks" | "expenses" | "messages" | "moods" | "photos" | "custom";
  userId: string;
  familyId: string;
  userDisplayName: string;
  createdAt: any;
  icon: string;
  earnedCriteria?: string;
}

// --- Components ---

const CalendarTaskItem = ({
  task,
  onStatusChange,
  isDark,
  language,
  userData,
  familyProfiles,
}: {
  task: Task;
  onStatusChange: (id: string, status: string) => Promise<void>;
  isDark: boolean;
  language: Language;
  userData: any;
  familyProfiles: Record<string, string>;
}) => {
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const qSubtasks = query(
      collection(db, `tasks/${task.id}/subtasks`),
      orderBy("createdAt", "asc"),
    );
    const unsubSubtasks = onSnapshot(qSubtasks, (snap) => {
      setSubtasks(
        snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Subtask),
      );
    });
    return () => unsubSubtasks();
  }, [task.id]);

  const toggleSubtask = async (sub: Subtask) => {
    try {
      await updateDoc(doc(db, `tasks/${task.id}/subtasks`, sub.id), {
        completed: !sub.completed,
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `tasks/${task.id}/subtasks`);
    }
  };

  const getPriorityColor = (p: string) => {
    switch (p?.toLowerCase()) {
      case "high":
        return "text-rose-500 bg-rose-500/10 border-rose-500/20";
      case "medium":
        return "text-amber-500 bg-amber-500/10 border-amber-500/20";
      case "low":
        return "text-blue-500 bg-blue-500/10 border-blue-500/20";
      default:
        return "text-zinc-500 bg-zinc-500/10 border-zinc-500/20";
    }
  };

  const completedSubtasksCount = subtasks.filter((s) => s.completed).length;

  return (
    <div
      className={`${isDark ? "bg-white/5 border-white/5" : "bg-black/5 border-black/5"} border p-5 rounded-[2rem] flex flex-col gap-3 transition-all hover:border-indigo-500/20`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-4 flex-1 min-w-0">
          <button
            onClick={() =>
              onStatusChange(
                task.id,
                task.status === "Completed" ? "Pending" : "Completed",
              )
            }
            className="mt-1 transition-transform active:scale-95 shrink-0"
          >
            {task.status === "Completed" ? (
              <CheckCircle className="text-emerald-500" size={20} />
            ) : (
              <Circle
                className={
                  isDark
                    ? "text-zinc-550 hover:text-emerald-500"
                    : "text-zinc-400 hover:text-emerald-500"
                }
                size={20}
              />
            )}
          </button>
          <div
            className="flex-1 min-w-0"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <h4
              className={`font-black text-sm uppercase tracking-tight truncate cursor-pointer hover:text-indigo-500 transition-colors flex items-center gap-1.5 task-title-shadow dark:dark-task-title-shadow ${isDark ? "text-zinc-100" : "text-zinc-900"}`}
            >
              {task.isRecurring && (
                <RefreshCw
                  size={12}
                  className="text-emerald-505 animate-spin-slow shrink-0"
                />
              )}
              <span className="relative inline-block max-w-full truncate pr-1">
                <span
                  className={`inline-block truncate transition-colors duration-500 ${task.status === "Completed" ? "text-zinc-550 dark:text-zinc-400 italic opacity-60" : ""}`}
                >
                  {task.title}
                </span>
                <motion.span
                  initial={{ width: "0%" }}
                  animate={{
                    width: task.status === "Completed" ? "100%" : "0%",
                  }}
                  transition={{ type: "spring", stiffness: 120, damping: 18 }}
                  className="absolute left-0 top-1/2 -translate-y-1/2 h-[2px] bg-emerald-500 dark:bg-emerald-400 pointer-events-none rounded"
                />
              </span>
            </h4>
            <div className="flex flex-wrap items-center gap-2 mt-1.5">
              {task.isRecurring && (
                <span className="text-[8px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <RefreshCw
                    size={9}
                    className="animate-spin-slow text-emerald-450"
                  />
                  {task.recurrenceFrequency === "daily"
                    ? language === "es"
                      ? "Diario"
                      : "Daily"
                    : task.recurrenceFrequency === "weekly"
                      ? language === "es"
                        ? "Semanal"
                        : "Weekly"
                      : language === "es"
                        ? "Mensual"
                        : "Monthly"}
                </span>
              )}
              {task.category && (
                <span className="text-[8px] font-black uppercase tracking-wider bg-indigo-500/10 text-indigo-400 border border-indigo-500/10 px-2 py-0.5 rounded-full">
                  {task.category}
                  {task.subCategory ? ` · ${task.subCategory}` : ""}
                </span>
              )}
              {task.priority && (
                <span
                  className={`text-[8px] font-black uppercase tracking-wider border px-2 py-0.5 rounded-full ${getPriorityColor(task.priority)}`}
                >
                  {task.priority}
                </span>
              )}
              {subtasks.length > 0 && (
                <span className="text-[8px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <ListTodo size={10} />
                  {completedSubtasksCount}/{subtasks.length}
                </span>
              )}
            </div>
          </div>
        </div>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={`p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
        >
          <ChevronDown size={16} />
        </button>
      </div>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{
              height: "auto",
              opacity: 1,
              transition: {
                height: { type: "spring", stiffness: 200, damping: 22 },
                opacity: { duration: 0.15, delay: 0.05 },
              },
            }}
            exit={{
              height: 0,
              opacity: 0,
              transition: {
                height: { type: "spring", stiffness: 200, damping: 22 },
                opacity: { duration: 0.1 },
              },
            }}
            className="pt-3 border-t border-black/5 dark:border-white/5 flex flex-col gap-3 overflow-hidden"
          >
            {subtasks.length > 0 ? (
              <div className="space-y-2">
                <p className="text-[9px] font-black uppercase tracking-wider opacity-40">
                  {language === "es" ? "Subtareas:" : "Subtasks:"}
                </p>
                <div className="grid grid-cols-1 gap-2">
                  {subtasks.map((sub) => (
                    <div
                      key={sub.id}
                      className={`flex items-center gap-3 p-2 rounded-xl border ${
                        sub.completed
                          ? isDark
                            ? "bg-emerald-500/5 border-emerald-500/20 opacity-70"
                            : "bg-emerald-50/50 border-emerald-250 opacity-80"
                          : isDark
                            ? "bg-white/5 border-white/5"
                            : "bg-black/[0.03] border-black/5"
                      }`}
                    >
                      <button
                        onClick={() => toggleSubtask(sub)}
                        className="transition-transform active:scale-95 shrink-0"
                      >
                        {sub.completed ? (
                          <CheckCircle size={14} className="text-emerald-500" />
                        ) : (
                          <Circle
                            size={14}
                            className={`transition-colors ${isDark ? "opacity-40 hover:opacity-100 hover:text-emerald-500" : "text-zinc-400 hover:text-emerald-500"}`}
                          />
                        )}
                      </button>
                      <span
                        className={`text-xs flex-1 truncate ${sub.completed ? "line-through opacity-50" : ""}`}
                      >
                        {sub.title}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-[10px] font-bold opacity-30 italic py-1">
                {language === "es" ? "No hay subtareas" : "No subtasks yet"}
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const CalendarHub = ({
  events,
  tasks,
  familyId,
  theme,
  language,
  userData,
  onStatusChange,
  familyProfiles,
}: {
  events: CalendarEvent[];
  tasks: Task[];
  familyId: string;
  theme: any;
  language: Language;
  userData: any;
  onStatusChange: (id: string, status: string) => Promise<void>;
  familyProfiles: Record<string, string>;
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newType, setNewType] = useState<
    "note" | "holiday" | "birthday" | "anniversary"
  >("note");
  const [recurrenceFilter, setRecurrenceFilter] = useState<
    "all" | "recurring" | "events"
  >("all");
  const [highlightRecurring, setHighlightRecurring] = useState(false);
  const t = translations[language];
  const isDark =
    theme.bg.includes("09090B") ||
    theme.bg.includes("020617") ||
    theme.bg.includes("18181B");

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

  const holidayList = [
    { date: "2026-01-01", title: "Año Nuevo / New Year" },
    { date: "2026-01-06", title: "Reyes Magos" },
    { date: "2026-04-03", title: "Viernes Santo / Good Friday" },
    { date: "2026-05-01", title: "Día del Trabajo" },
    { date: "2026-08-15", title: "Asunción" },
    { date: "2026-10-12", title: "Día de la Hispanidad" },
    { date: "2026-11-01", title: "Todos los Santos" },
    { date: "2026-12-06", title: "Constitución" },
    { date: "2026-12-08", title: "Inmaculada Concepción" },
    { date: "2026-12-25", title: "Navidad / Christmas" },
  ];

  const allEventsForCalendar = [
    ...events,
    ...holidayList.map((h) => ({
      id: `h-${h.date}`,
      title: h.title,
      date: h.date,
      type: "holiday" as const,
      familyId: "",
      authorId: "system",
    })),
  ];

  const handleAddEvent = async () => {
    if (!newTitle || !selectedDate) return;
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    try {
      await addDoc(collection(db, "events"), {
        title: newTitle.trim(),
        date: dateStr,
        familyId,
        authorId: userData.uid,
        type: newType,
        createdAt: serverTimestamp(),
      });
      setNewTitle("");
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, "events");
    }
  };

  const deleteEvent = async (id: string) => {
    if (id.startsWith("h-")) return;
    try {
      await deleteDoc(doc(db, "events", id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, "events");
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className={`${theme.card} p-8 rounded-[2.5rem] shadow-sm`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div>
            <h2 className="text-4xl font-black italic tracking-tighter uppercase leading-none">
              {format(currentDate, "MMMM yyyy")}
            </h2>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 mt-2">
              {t.calendar}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentDate(subMonths(currentDate, 1))}
              className="p-4 bg-black/5 hover:bg-black/10 rounded-2xl transition-all shadow-sm"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={() => setCurrentDate(new Date())}
              className="px-8 py-4 bg-zinc-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:scale-105 active:scale-95 transition-all"
            >
              {t.today}
            </button>
            <button
              onClick={() => setCurrentDate(addMonths(currentDate, 1))}
              className="p-4 bg-black/5 hover:bg-black/10 rounded-2xl transition-all shadow-sm"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

        {/* Calendar visual controls and filters */}
        <div className="flex flex-col sm:flex-row items-center justify-center sm:justify-between gap-4 p-4 mb-6 bg-black/[0.02] dark:bg-white/5 rounded-[2rem] border border-black/[0.03] dark:border-white/[0.03]">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 w-full sm:w-auto">
            <span className="text-[10px] font-black uppercase tracking-wider opacity-50 px-2 sm:px-3 text-center">
              {language === "es" ? "Mostrar:" : "Show:"}
            </span>
            <div className="flex flex-wrap justify-center bg-black/[0.04] dark:bg-white/[0.02] p-1 rounded-2xl">
              <button
                onClick={() => setRecurrenceFilter("all")}
                className={`px-3.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                  recurrenceFilter === "all"
                    ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-sm scale-[1.01]"
                    : "opacity-50 hover:opacity-100 text-zinc-650 dark:text-zinc-350"
                }`}
              >
                {language === "es" ? "Todos" : "All"}
              </button>
              <button
                onClick={() => setRecurrenceFilter("recurring")}
                className={`px-3.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                  recurrenceFilter === "recurring"
                    ? "bg-emerald-600 text-white shadow-sm scale-[1.01]"
                    : "opacity-50 hover:opacity-100 text-zinc-650 dark:text-zinc-350"
                }`}
              >
                <RefreshCw
                  size={10}
                  className={
                    recurrenceFilter === "recurring" ? "animate-spin-slow" : ""
                  }
                />
                {language === "es" ? "Recurrentes" : "Recurring"}
              </button>
              <button
                onClick={() => setRecurrenceFilter("events")}
                className={`px-3.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                  recurrenceFilter === "events"
                    ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-sm scale-[1.01]"
                    : "opacity-50 hover:opacity-100 text-zinc-650 dark:text-zinc-350"
                }`}
              >
                {language === "es" ? "Eventos" : "Events"}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-center w-full sm:w-auto gap-2">
            <button
              onClick={() => setHighlightRecurring(!highlightRecurring)}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border flex items-center gap-2 ${
                highlightRecurring
                  ? "bg-emerald-500/10 text-emerald-500 border-emerald-550/20 shadow-sm"
                  : "bg-transparent border-transparent opacity-60 hover:opacity-100 text-zinc-650 dark:text-zinc-350"
              }`}
            >
              <div
                className={`w-2 h-2 rounded-full border border-emerald-550 flex items-center justify-center transition-all ${highlightRecurring ? "bg-emerald-500 animate-pulse" : "bg-transparent"}`}
              />
              {language === "es"
                ? "Resaltar Recurrentes"
                : "Highlight Recurring"}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 sm:gap-3 mb-3">
          {(language === "es"
            ? ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]
            : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
          ).map((d) => (
            <div
              key={d}
              className="text-center py-1 sm:py-2 text-[8px] sm:text-[10px] font-black uppercase tracking-wider sm:tracking-[0.3em] opacity-35"
            >
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1 sm:gap-3">
          {calendarDays.map((day, i) => {
            const dateStr = format(day, "yyyy-MM-dd");
            const dayEvents = allEventsForCalendar.filter(
              (e) => e.date === dateStr,
            );
            const dayTasks = tasks.filter(
              (t) =>
                t.dueDate &&
                format(new Date(t.dueDate), "yyyy-MM-dd") === dateStr,
            );
            const pendingTasks = dayTasks.filter(
              (t) => t.status !== "Completed",
            );
            const hasRecurring = dayTasks.some((t) => t.isRecurring);

            const filteredEvents =
              recurrenceFilter === "recurring" ? [] : dayEvents;
            const filteredTasks =
              recurrenceFilter === "events"
                ? []
                : recurrenceFilter === "recurring"
                  ? dayTasks.filter((t) => t.isRecurring)
                  : dayTasks;
            const filteredPendingTasks = filteredTasks.filter(
              (t) => t.status !== "Completed",
            );

            const isToday = isSameDay(day, new Date());
            const isCurrentMonth = isSameMonth(day, monthStart);
            const hasItems =
              filteredEvents.length > 0 || filteredTasks.length > 0;

            return (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.002 }}
                key={i}
                onClick={() => {
                  setSelectedDate(day);
                  setIsModalOpen(true);
                }}
                className={`min-h-[85px] sm:min-h-[145px] p-2 sm:p-4 rounded-xl sm:rounded-[2rem] border-2 transition-all cursor-pointer relative group flex flex-col justify-between ${
                  isCurrentMonth
                    ? isDark
                      ? "bg-white/5 border-white/5 hover:border-indigo-500/30 hover:bg-white/[0.08]"
                      : "bg-black/[0.02] border-black/[0.03] hover:border-indigo-500/30 hover:bg-black/[0.04]"
                    : isDark
                      ? "bg-white/[0.01] border-white/5 opacity-25 hover:opacity-80"
                      : "bg-black/[0.005] border-black/[0.01] opacity-30 hover:opacity-80"
                } ${isToday ? `border-indigo-500 shadow-xl shadow-indigo-500/10` : ""} ${
                  highlightRecurring && hasRecurring
                    ? "ring-2 ring-emerald-500/20 border-emerald-500/40 bg-emerald-500/[0.03] dark:bg-emerald-500/[0.06]"
                    : ""
                }`}
              >
                <div className="flex justify-between items-center w-full">
                  <span
                    className={`text-[11px] sm:text-sm font-black flex items-center justify-center rounded-full transition-all ${
                      isToday
                        ? "w-5 h-5 sm:w-8 sm:h-8 text-white shadow-md"
                        : isCurrentMonth
                          ? "text-zinc-800 dark:text-zinc-200"
                          : "text-zinc-400 dark:text-zinc-600"
                    }`}
                    style={
                      isToday
                        ? { backgroundColor: theme.accent || "#6366f1" }
                        : undefined
                    }
                  >
                    {format(day, "d")}
                  </span>

                  <div className="flex items-center gap-1.5">
                    {hasRecurring && (
                      <span
                        className="p-1 rounded-md bg-emerald-500/10 text-emerald-500 border border-emerald-500/10 shrink-0"
                        title={
                          language === "es"
                            ? "Tiene tareas recurrentes"
                            : "Has recurring tasks"
                        }
                      >
                        <RefreshCw size={9} className="animate-spin-slow" />
                      </span>
                    )}
                    {hasItems && (
                      <div className="flex gap-0.5 sm:gap-1">
                        {filteredEvents.length > 0 && (
                          <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-indigo-500 shadow-sm animate-pulse" />
                        )}
                        {filteredTasks.length > 0 && (
                          <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-emerald-500 shadow-sm animate-pulse" />
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Mini Indicators for Small Screens (hidden on sm:) */}
                {hasItems && (
                  <div className="flex sm:hidden gap-1 flex-wrap mt-1">
                    {filteredEvents.length > 0 && (
                      <div
                        className="flex items-center gap-0.5 px-1 py-0.5 rounded bg-indigo-500/10 text-indigo-505 border border-indigo-500/10 font-black text-[7.5px] leading-none shrink-0"
                        title={`${filteredEvents.length} Event(s)`}
                      >
                        <span className="w-0.5 h-0.5 rounded-full bg-indigo-550" />
                        <span>{filteredEvents.length}</span>
                      </div>
                    )}
                    {filteredTasks.length > 0 && (
                      <div
                        className={`flex items-center gap-0.5 px-1 py-0.5 rounded font-black text-[7.5px] leading-none shrink-0 border ${
                          filteredPendingTasks.length === 0
                            ? "bg-emerald-500/10 text-emerald-505 border-emerald-500/10"
                            : "bg-amber-500/10 text-amber-505 border-amber-500/10"
                        }`}
                        title={`${filteredTasks.length} Task(s)`}
                      >
                        <span
                          className={`w-0.5 h-0.5 rounded-full ${filteredPendingTasks.length === 0 ? "bg-emerald-500" : "bg-amber-500"}`}
                        />
                        <span>{filteredTasks.length}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Detailed view for Larger Screens (sm:) */}
                <div className="hidden sm:block flex-1 space-y-1 mt-2.5 overflow-hidden w-full">
                  {/* Events */}
                  {filteredEvents.slice(0, 1).map((e) => (
                    <div
                      key={e.id}
                      className={`text-[9px] px-2 py-1 rounded-lg font-bold uppercase tracking-tight truncate leading-none shadow-sm flex items-center gap-1.5 ${
                        e.type === "holiday"
                          ? "bg-amber-100/95 text-amber-800 border border-amber-200/50 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/10"
                          : e.type === "birthday"
                            ? "bg-rose-100/95 text-rose-800 border border-rose-200/50 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/10"
                            : e.type === "anniversary"
                              ? "bg-indigo-100/95 text-indigo-800 border border-indigo-200/50 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/10"
                              : "bg-indigo-100/95 text-indigo-800 border border-indigo-200/50 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/10"
                      }`}
                    >
                      <span
                        className={`w-1 h-1 rounded-full shrink-0 ${
                          e.type === "holiday"
                            ? "bg-amber-500"
                            : e.type === "birthday"
                              ? "bg-rose-500"
                              : e.type === "anniversary"
                                ? "bg-fuchsia-400"
                                : "bg-indigo-500"
                        }`}
                      />
                      <span className="truncate">{e.title}</span>
                    </div>
                  ))}
                  {/* Tasks */}
                  {filteredTasks.slice(0, 1).map((t) => (
                    <div
                      key={t.id}
                      className={`text-[9px] px-2 py-1 rounded-lg font-bold uppercase tracking-tight truncate leading-none shadow-sm flex items-center gap-1 border ${
                        t.status === "Completed"
                          ? "bg-zinc-100/90 text-zinc-400 border-zinc-200 line-through dark:bg-white/5 dark:text-zinc-500 dark:border-transparent"
                          : "bg-emerald-50 text-emerald-800 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20"
                      } ${t.isRecurring ? "border-emerald-300/50 shadow-sm shadow-emerald-500/5" : ""}`}
                    >
                      <CheckCircle
                        size={10}
                        className={
                          t.status === "Completed"
                            ? "text-zinc-400 dark:text-zinc-500 shrink-0"
                            : "text-emerald-500 shrink-0"
                        }
                      />
                      {t.isRecurring && (
                        <RefreshCw
                          size={8}
                          className="text-emerald-505 animate-spin-slow shrink-0"
                        />
                      )}
                      <span className="truncate">{t.title}</span>
                    </div>
                  ))}
                  {filteredEvents.length + filteredTasks.length > 2 && (
                    <div className="text-[7.5px] font-black opacity-50 px-1.5 py-0.5 bg-black/[0.04] dark:bg-white/[0.04] rounded-md inline-block">
                      +{filteredEvents.length + filteredTasks.length - 2}
                    </div>
                  )}
                </div>

                <div className="absolute bottom-1 right-1 sm:bottom-3 sm:right-3 opacity-0 group-hover:opacity-45 transition-opacity pointer-events-none">
                  <Plus size={11} className="text-zinc-400" />
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      <AnimatePresence>
        {isModalOpen &&
          selectedDate &&
          (() => {
            const dateStr = format(selectedDate, "yyyy-MM-dd");
            const dayTasks = tasks.filter(
              (t) =>
                t.dueDate &&
                format(new Date(t.dueDate), "yyyy-MM-dd") === dateStr,
            );
            const dayEvents = allEventsForCalendar.filter(
              (e) => e.date === dateStr,
            );

            const filteredModalEvents =
              recurrenceFilter === "recurring" ? [] : dayEvents;
            const filteredModalTasks =
              recurrenceFilter === "events"
                ? []
                : recurrenceFilter === "recurring"
                  ? dayTasks.filter((t) => t.isRecurring)
                  : dayTasks;

            return (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  onClick={() => setIsModalOpen(false)}
                  className="absolute inset-0 bg-black/85 backdrop-blur-md"
                />
                <motion.div
                  initial={{ scale: 0.92, opacity: 0, y: 40 }}
                  animate={{
                    scale: 1,
                    opacity: 1,
                    y: 0,
                    transition: {
                      type: "spring",
                      stiffness: 280,
                      damping: 24,
                      mass: 0.8,
                    },
                  }}
                  exit={{
                    scale: 0.95,
                    opacity: 0,
                    y: 20,
                    transition: { duration: 0.25, ease: [0.16, 1, 0.3, 1] },
                  }}
                  className={`${theme.card} w-full max-w-4xl p-12 rounded-[3.5rem] relative z-10 shadow-2xl overflow-hidden border border-white/10`}
                >
                  <div className="flex justify-between items-start mb-10">
                    <div>
                      <h3 className="text-3xl font-black italic tracking-tighter uppercase leading-none">
                        {format(selectedDate, "MMM d, yyyy")}
                      </h3>
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 mt-2">
                        {language === "es"
                          ? "Logística y Tareas del Día"
                          : "Day Logistics & Tasks"}
                      </p>
                    </div>
                    <button
                      onClick={() => setIsModalOpen(false)}
                      className="p-3 bg-black/5 rounded-2xl opacity-40 hover:opacity-100 transition-all hover:rotate-90 cursor-pointer"
                    >
                      <X size={24} />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10 max-h-[550px] overflow-y-auto pr-2 custom-scrollbar">
                    {/* Left side: Tasks */}
                    <motion.div
                      initial={{ opacity: 0, x: -15 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{
                        delay: 0.1,
                        duration: 0.4,
                        ease: "easeOut",
                      }}
                      className="space-y-6"
                    >
                      <h4 className="text-xs font-black uppercase tracking-widest opacity-60 flex items-center gap-2">
                        <CheckCircle2
                          size={14}
                          className="text-emerald-500 animate-pulse"
                        />
                        {language === "es"
                          ? "Tareas de Hoy"
                          : "Tasks For Today"}{" "}
                        ({filteredModalTasks.length})
                      </h4>

                      <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1 custom-scrollbar">
                        {filteredModalTasks.map((task) => (
                          <CalendarTaskItem
                            key={task.id}
                            task={task}
                            onStatusChange={onStatusChange}
                            isDark={isDark}
                            language={language}
                            userData={userData}
                            familyProfiles={familyProfiles}
                          />
                        ))}
                        {filteredModalTasks.length === 0 && (
                          <div
                            className={`py-12 border border-dashed rounded-[2rem] flex flex-col items-center justify-center opacity-40 text-center ${isDark ? "border-white/10" : "border-black/10"}`}
                          >
                            <ListTodo
                              size={40}
                              className="mb-3 text-indigo-500"
                            />
                            <p className="text-[10px] font-black uppercase tracking-widest">
                              {language === "es"
                                ? "Sin tareas asignadas"
                                : "Zero tasks due today."}
                            </p>
                          </div>
                        )}
                      </div>
                    </motion.div>

                    {/* Right side: Events */}
                    <motion.div
                      initial={{ opacity: 0, x: 15 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{
                        delay: 0.2,
                        duration: 0.4,
                        ease: "easeOut",
                      }}
                      className="space-y-6"
                    >
                      <h4 className="text-xs font-black uppercase tracking-widest opacity-60 flex items-center gap-2">
                        <Calendar
                          size={14}
                          className="text-indigo-500 animate-bounce"
                        />
                        {language === "es"
                          ? "Eventos y Notas"
                          : "Events & Notes"}{" "}
                        ({filteredModalEvents.length})
                      </h4>

                      <div className="space-y-4 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar">
                        {filteredModalEvents.map((e) => (
                          <div
                            key={e.id}
                            className={`${isDark ? "bg-white/5" : "bg-black/5"} p-5 rounded-[2rem] group flex items-center justify-between border border-transparent hover:border-indigo-500/20 transition-all`}
                          >
                            <div className="flex items-center gap-4">
                              <div
                                className={`w-3 h-3 rounded-full shadow-sm ${
                                  e.type === "holiday"
                                    ? "bg-amber-400"
                                    : e.type === "birthday"
                                      ? "bg-rose-400"
                                      : e.type === "anniversary"
                                        ? "bg-indigo-400"
                                        : "bg-emerald-400"
                                }`}
                              />
                              <div className="flex flex-col">
                                <span className="font-extrabold text-sm tracking-tight uppercase">
                                  {e.title}
                                </span>
                                <span className="text-[8px] font-black opacity-30 mt-0.5 tracking-widest">
                                  {e.type.toUpperCase()}
                                </span>
                              </div>
                            </div>
                            {!e.id.startsWith("h-") && (
                              <button
                                onClick={() => deleteEvent(e.id)}
                                className="opacity-0 group-hover:opacity-100 p-3 hover:bg-rose-500/10 hover:text-rose-500 rounded-xl transition-all"
                              >
                                <Trash2 size={18} />
                              </button>
                            )}
                          </div>
                        ))}
                        {filteredModalEvents.length === 0 && (
                          <div className="py-12 flex flex-col items-center justify-center opacity-20 gap-4">
                            <StickyNote size={36} />
                            <p className="text-[10px] font-black uppercase tracking-widest text-center">
                              No events scheduled.
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="pt-6 border-t border-black/5 dark:border-white/5">
                        <p className="text-[9px] font-black uppercase tracking-widest opacity-35 mb-4 px-2">
                          {language === "es"
                            ? "Añadir Nota o Evento"
                            : "Inject Event"}
                        </p>
                        <div className="space-y-4">
                          <input
                            value={newTitle}
                            onChange={(e) => setNewTitle(e.target.value)}
                            placeholder={
                              language === "es"
                                ? "Título del evento..."
                                : "Event description..."
                            }
                            className={`w-full ${isDark ? "bg-white/5" : "bg-black/5"} px-5 py-3.5 rounded-2xl outline-none font-bold text-sm border-2 border-transparent focus:border-indigo-500/20 transition-all shadow-inner`}
                          />
                          <div className="flex gap-2 p-1.5 bg-black/5 dark:bg-white/5 rounded-[1.5rem]">
                            {(["note", "birthday", "anniversary"] as const).map(
                              (type) => (
                                <button
                                  key={type}
                                  type="button"
                                  onClick={() => setNewType(type)}
                                  className={`flex-1 py-2.5 rounded-xl font-black text-[8px] uppercase tracking-widest transition-all ${newType === type ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-xl" : "opacity-30 hover:opacity-100"}`}
                                >
                                  {type}
                                </button>
                              ),
                            )}
                          </div>
                          <button
                            onClick={handleAddEvent}
                            className="w-full py-4 text-white rounded-2xl shadow-xl hover:scale-[1.01] active:scale-95 transition-all font-black text-xs uppercase tracking-[0.2em]"
                            style={{ background: theme.accent }}
                          >
                            {language === "es"
                              ? "Guardar Evento"
                              : "Transmit Data"}
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  </div>

                  {/* Design accents */}
                  <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2" />
                  <div className="absolute bottom-0 left-0 w-48 h-48 bg-rose-500/5 rounded-full blur-[60px] translate-y-1/3 -translate-x-1/4" />
                </motion.div>
              </div>
            );
          })()}
      </AnimatePresence>
    </div>
  );
};

const MiniCalendar = ({
  events,
  theme,
  language,
}: {
  events: CalendarEvent[];
  theme: any;
  language: Language;
}) => {
  const t = translations[language];
  const today = new Date();
  const dateStr = format(today, "yyyy-MM-dd");
  const dayEvents = events.filter((e) => e.date === dateStr);
  const isDark = theme.bg.includes("09090B") || theme.bg.includes("020617");

  const monthStart = startOfMonth(today);
  const startDate = startOfWeek(monthStart);
  const calendarDays = eachDayOfInterval({
    start: startDate,
    end: addDays(startDate, 34), // 5 weeks
  });

  const holidayList = [
    { date: "2026-01-01", title: "Año Nuevo / New Year" },
    { date: "2026-01-06", title: "Reyes Magos" },
    { date: "2026-04-03", title: "Viernes Santo / Good Friday" },
    { date: "2026-05-01", title: "Día del Trabajo" },
    { date: "2026-08-15", title: "Asunción" },
    { date: "2026-10-12", title: "Día de la Hispanidad" },
    { date: "2026-11-01", title: "Todos los Santos" },
    { date: "2026-12-06", title: "Constitución" },
    { date: "2026-12-08", title: "Inmaculada Concepción" },
    { date: "2026-12-25", title: "Navidad / Christmas" },
  ];

  const allEvents = [
    ...events,
    ...holidayList.map((h) => ({
      id: `h-${h.date}`,
      title: h.title,
      date: h.date,
      type: "holiday" as const,
      familyId: "",
      authorId: "system",
    })),
  ];

  return (
    <div
      className={`${theme.card} p-6 sm:p-8 rounded-[2rem] sm:rounded-[3rem] shadow-sm flex flex-col flex-1 h-auto bg-zinc-900 border-none text-white overflow-hidden relative group shadow-2xl`}
    >
      <div className="relative z-10 flex flex-col h-full">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-lg font-black uppercase tracking-tighter italic leading-none">
              {format(today, "MMMM")}
            </h3>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 mt-1">
              {t.calendar}
            </p>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center font-black text-xs">
            {format(today, "d")}
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-8">
          {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
            <div
              key={`${d}-${i}`}
              className="text-center text-[7px] font-black opacity-20 uppercase tracking-widest"
            >
              {d}
            </div>
          ))}
          {calendarDays.map((day, i) => {
            const dayStr = format(day, "yyyy-MM-dd");
            const hasEvent = allEvents.some((e) => e.date === dayStr);
            const isToday = isSameDay(day, today);
            const isCurrentMonth = isSameMonth(day, today);

            return (
              <div
                key={i}
                className={`aspect-square flex items-center justify-center text-[9px] font-black rounded-lg relative ${!isCurrentMonth ? "opacity-5" : ""} ${isToday ? "text-white shadow-lg" : ""}`}
                style={{ backgroundColor: isToday ? theme.accent : "" }}
              >
                {format(day, "d")}
                {hasEvent && !isToday && (
                  <div
                    className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
                    style={{ backgroundColor: theme.accent }}
                  />
                )}
              </div>
            );
          })}
        </div>

        <div className="flex-1 space-y-3 overflow-hidden">
          <p className="text-[8px] font-black uppercase tracking-widest opacity-30 px-1">
            Upcoming Intel
          </p>
          <div className="space-y-2 overflow-y-auto pr-1 custom-scrollbar max-h-[160px]">
            {allEvents
              .filter(
                (e) =>
                  new Date(e.date) >= new Date(new Date().setHours(0, 0, 0, 0)),
              )
              .sort((a, b) => a.date.localeCompare(b.date))
              .slice(0, 4)
              .map((e) => (
                <div
                  key={e.id}
                  className="flex items-center gap-3 bg-white/5 p-3 rounded-2xl border border-white/5 hover:border-white/10 transition-all"
                >
                  <div
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      e.type === "holiday"
                        ? "bg-amber-400"
                        : e.type === "birthday"
                          ? "bg-rose-400"
                          : e.type === "anniversary"
                            ? "bg-indigo-400"
                            : ""
                    }`}
                    style={{
                      backgroundColor:
                        e.type !== "holiday" &&
                        e.type !== "birthday" &&
                        e.type !== "anniversary"
                          ? theme.accent
                          : undefined,
                    }}
                  />

                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-extrabold truncate uppercase tracking-tight leading-none">
                      {e.title}
                    </p>
                    <p className="text-[8px] font-black opacity-30 mt-1 tracking-widest">
                      {format(parseISO(e.date), "MMM d")}
                    </p>
                  </div>
                </div>
              ))}
            {allEvents.filter(
              (e) =>
                new Date(e.date) >= new Date(new Date().setHours(0, 0, 0, 0)),
            ).length === 0 && (
              <p className="text-[8px] font-black opacity-10 text-center py-4 px-2 italic uppercase">
                Zero signals detected.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Dark background light effects */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-rose-500/10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />
    </div>
  );
};

const AlbumHub = ({
  photos,
  familyId,
  theme,
  language,
  userData,
  sendNotification,
}: {
  photos: Photo[];
  familyId: string;
  theme: any;
  language: Language;
  userData: any;
  sendNotification: any;
}) => {
  const [url, setUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const t = translations[language];
  const isDark = theme.bg.includes("09090B") || theme.bg.includes("020617");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg(
        language === "es"
          ? "La imagen debe ser menor a 5MB"
          : "Image must be under 5MB",
      );
      return;
    }

    setErrorMsg("");
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setUrl(base64String);
    };
    reader.readAsDataURL(file);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userData) return;
    if (!url) {
      setErrorMsg(
        language === "es"
          ? "Introduce una URL o selecciona un archivo"
          : "Enter a URL or select a file",
      );
      return;
    }

    try {
      setErrorMsg("");
      await addDoc(collection(db, "photos"), {
        url,
        caption,
        date: serverTimestamp(),
        familyId,
        authorId: userData.uid,
        authorName: userData.displayName || "Family member",
      });
      sendNotification(
        t.newNotification,
        `${userData.displayName}: ${caption || "📸"}`,
        "photo",
      );
      setUrl("");
      setCaption("");
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, "photos");
    }
  };

  return (
    <div className="flex flex-col gap-12">
      <div
        className={`${theme.card} p-6 sm:p-10 rounded-[2rem] sm:rounded-[3rem] border shadow-sm`}
      >
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-4xl font-black italic uppercase tracking-tighter flex items-center gap-4">
            <Camera size={32} className="text-indigo-500" />
            {t.familyAlbum}
          </h2>
        </div>

        <form onSubmit={handleAdd} className="flex flex-col gap-4 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Box 1: URL or Upload Device */}
            <div
              className={`relative flex items-center px-4 rounded-2xl border transition-all ${
                isDark
                  ? "bg-zinc-900/60 border-white/5 focus-within:border-indigo-500/30"
                  : "bg-slate-50 border-slate-100 focus-within:border-indigo-500/30"
              }`}
            >
              <input
                placeholder={t.photoUrl}
                value={
                  url.startsWith("data:image/")
                    ? language === "es"
                      ? "📷 Imagen Lista"
                      : "📷 Image Ready"
                    : url
                }
                onChange={(e) => {
                  setUrl(e.target.value);
                  setErrorMsg("");
                }}
                disabled={url.startsWith("data:image/")}
                className="flex-1 bg-transparent py-4 outline-none font-bold placeholder:opacity-30 text-sm truncate pr-2 text-zinc-800 dark:text-zinc-100"
              />
              {url ? (
                <button
                  type="button"
                  onClick={() => setUrl("")}
                  className="w-8 h-8 text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all flex items-center justify-center shrink-0"
                  title={language === "es" ? "Quitar imagen" : "Remove image"}
                >
                  <X size={16} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-10 h-10 bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500/20 rounded-xl transition-all flex items-center justify-center shrink-0 border border-indigo-500/10"
                  title={
                    language === "es"
                      ? "Subir desde dispositivo"
                      : "Upload from device"
                  }
                >
                  <Upload size={16} />
                </button>
              )}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
              />
            </div>

            {/* Box 2: Caption or Description */}
            <div
              className={`flex items-center px-4 rounded-2xl border transition-all ${
                isDark
                  ? "bg-zinc-900/60 border-white/5 focus-within:border-indigo-500/30"
                  : "bg-slate-50 border-slate-100 focus-within:border-indigo-500/30"
              }`}
            >
              <input
                placeholder={t.caption}
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                className="flex-1 bg-transparent py-4 outline-none font-bold placeholder:opacity-30 text-sm text-zinc-800 dark:text-zinc-100"
              />
            </div>
          </div>

          {/* Add Photo Button */}
          <button
            type="submit"
            className="w-full py-4 text-white rounded-2xl hover:brightness-110 active:scale-95 transition-all shadow-md font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-3"
            style={{ backgroundColor: theme.accent }}
          >
            <Plus size={18} />
            {t.addPhoto}
          </button>
        </form>

        {url && (
          <div className="mt-4 flex items-center gap-4 p-3 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 w-fit max-w-xs animate-in fade-in duration-200">
            <img
              src={url}
              alt="Preview"
              className="w-16 h-16 rounded-xl object-cover border border-black/10 dark:border-white/10"
            />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400">
                {language === "es" ? "Vista previa" : "Preview"}
              </p>
              <p className="text-xs opacity-60 truncate">
                {caption ||
                  (language === "es" ? "Sin descripción" : "No description")}
              </p>
            </div>
          </div>
        )}

        {errorMsg && (
          <p className="mt-3 text-xs font-black uppercase tracking-wider text-rose-500 animate-pulse">
            ⚠️ {errorMsg}
          </p>
        )}
      </div>

      <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-6 space-y-6">
        {photos.map((photo, i) => (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            key={photo.id}
            className={`break-inside-avoid ${theme.card} rounded-[2rem] border overflow-hidden group relative hover:shadow-2xl transition-all duration-500`}
          >
            <img
              src={photo.url}
              alt={photo.caption}
              className="w-full h-auto object-cover"
            />
            <div className="p-6">
              {photo.caption && (
                <p className="font-bold text-sm mb-2 opacity-90">
                  {photo.caption}
                </p>
              )}
              <div className="flex justify-between items-center">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">
                    {photo.authorName || "Family"}
                  </span>
                  <span className="text-[9px] font-black uppercase tracking-widest opacity-30 mt-0.5">
                    {photo.date?.toDate
                      ? photo.date.toDate().toLocaleDateString()
                      : t.justNow}
                  </span>
                </div>
                <button
                  onClick={async () =>
                    await deleteDoc(doc(db, "photos", photo.id))
                  }
                  className="text-rose-500 opacity-0 group-hover:opacity-100 p-2 hover:bg-rose-50 rounded-xl transition-all"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-10 transition-opacity pointer-events-none" />
          </motion.div>
        ))}
      </div>

      {photos.length === 0 && (
        <div className="py-40 flex flex-col items-center justify-center gap-6 opacity-20">
          <ImageIcon size={64} />
          <p className="font-black uppercase tracking-[0.3em] text-xs text-center">
            {t.noPhotos}
          </p>
        </div>
      )}
    </div>
  );
};

const NotificationCenter = ({
  notifications,
  isOpen,
  onClose,
  theme,
  language,
  markAllRead,
  requestPermission,
  permission,
}: {
  notifications: FamilyNotification[];
  isOpen: boolean;
  onClose: () => void;
  theme: any;
  language: Language;
  markAllRead: () => void;
  requestPermission: () => void;
  permission: string;
}) => {
  const t = translations[language];
  const isDark = theme.bg.includes("09090B") || theme.bg.includes("020617");
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-[100]" onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            className={`fixed top-24 right-6 w-[400px] max-h-[600px] ${theme.card} z-[101] rounded-[2.5rem] border shadow-2xl flex flex-col overflow-hidden`}
          >
            <div className="p-6 border-b border-white/10 flex justify-between items-center">
              <div>
                <h3 className="font-black text-xl italic uppercase tracking-tighter">
                  {t.notifications}
                </h3>
                {unreadCount > 0 && (
                  <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mt-1">
                    {unreadCount} {t.active}
                  </p>
                )}
              </div>
              <button
                onClick={markAllRead}
                className="text-[9px] font-black uppercase tracking-widest opacity-40 hover:opacity-100 transition-opacity"
              >
                {t.markAllAsRead}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {permission === "default" && (
                <div className="p-4 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 mb-4">
                  <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-3">
                    {t.notificationPermissionsInfo}
                  </p>
                  <button
                    onClick={requestPermission}
                    className="w-full py-2 bg-indigo-500 text-white rounded-lg text-[10px] font-black uppercase tracking-widest"
                  >
                    {t.allowNotifications}
                  </button>
                </div>
              )}

              {notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`p-4 rounded-2xl flex gap-4 transition-all ${notif.read ? "opacity-40" : "bg-white/5 border border-white/10"}`}
                >
                  <div
                    className={`w-2 h-2 rounded-full mt-2 ${notif.read ? "bg-transparent" : "bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)]"}`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-sm mb-1">{notif.title}</p>
                    <p className="text-xs opacity-70 leading-relaxed truncate">
                      {notif.body}
                    </p>
                    <span className="text-[8px] font-black uppercase tracking-[0.2em] opacity-30 mt-2 block">
                      {notif.createdAt?.toDate
                        ? notif.createdAt.toDate().toLocaleTimeString()
                        : t.now}
                    </span>
                  </div>
                </div>
              ))}
              {notifications.length === 0 && (
                <div className="py-20 flex flex-col items-center justify-center opacity-20 gap-4">
                  <BellOff size={48} />
                  <p className="text-[10px] font-black uppercase tracking-widest">
                    {t.noNotifications}
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

const FinanceHub = ({
  expenses,
  vacations,
  familyId,
  theme,
  language,
  userData,
  sendNotification,
  familyProfiles = {},
}: {
  expenses: Expense[];
  vacations: Vacation[];
  familyId: string;
  theme: any;
  language: Language;
  userData: any;
  sendNotification: any;
  familyProfiles?: Record<string, string>;
}) => {
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState("");
  const [selectedVacation, setSelectedVacation] = useState("");
  const t = translations[language];
  const isDark =
    theme.bg.includes("09090B") ||
    theme.bg.includes("020617") ||
    theme.bg.includes("0c0a21");

  const monthlyExpensesCount = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    return expenses.filter((exp) => {
      if (!exp.date) return false;
      let d: Date;
      if (exp.date.toDate && typeof exp.date.toDate === "function") {
        d = exp.date.toDate();
      } else {
        d = new Date(exp.date);
      }
      if (isNaN(d.getTime())) return false;
      return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
    }).length;
  }, [expenses]);

  const handleExportCsv = () => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const monthlyExpenses = expenses.filter((exp) => {
      if (!exp.date) return false;
      let d: Date;
      if (exp.date.toDate && typeof exp.date.toDate === "function") {
        d = exp.date.toDate();
      } else {
        d = new Date(exp.date);
      }
      if (isNaN(d.getTime())) return false;
      return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
    });

    if (monthlyExpenses.length === 0) {
      return;
    }

    // Sort by date newest first
    monthlyExpenses.sort((a, b) => {
      const getMs = (exp: Expense) => {
        if (!exp.date) return 0;
        if (exp.date.toDate && typeof exp.date.toDate === "function") {
          return exp.date.toDate().getTime();
        }
        return new Date(exp.date).getTime();
      };
      return getMs(b) - getMs(a);
    });

    const headers = [
      language === "es" ? "Fecha" : "Date",
      language === "es" ? "Descripción" : "Description",
      language === "es" ? "Cantidad" : "Amount",
      language === "es" ? "Categoría" : "Category",
      language === "es" ? "Autor" : "Author",
    ];

    const rows = monthlyExpenses.map((exp) => {
      let dateStr = "";
      if (exp.date) {
        let d: Date;
        if (exp.date.toDate && typeof exp.date.toDate === "function") {
          d = exp.date.toDate();
        } else {
          d = new Date(exp.date);
        }
        if (!isNaN(d.getTime())) {
          dateStr = d.toLocaleDateString(language === "es" ? "es-ES" : "en-US");
        }
      } else {
        dateStr = language === "es" ? "Reciente" : "Now";
      }

      const escapedDesc = `"${(exp.description || "").replace(/"/g, '""')}"`;
      const amountStr = `${exp.amount.toFixed(2)}`;

      let catName = language === "es" ? "General" : "General";
      if (exp.category === "Vacation" && exp.vacationId) {
        const vac = vacations.find((v) => v.id === exp.vacationId);
        catName = vac
          ? vac.destination
          : language === "es"
            ? "Vacaciones"
            : "Vacation";
      } else if (exp.category) {
        catName = exp.category.charAt(0).toUpperCase() + exp.category.slice(1);
      }
      const escapedCat = `"${catName.replace(/"/g, '""')}"`;

      const authorName = familyProfiles[exp.authorId] || "Member";
      const escapedAuthor = `"${authorName.replace(/"/g, '""')}"`;

      return [dateStr, escapedDesc, amountStr, escapedCat, escapedAuthor];
    });

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const monthName = now.toLocaleString(language === "es" ? "es-ES" : "en-US", { month: "long" });
    link.setAttribute("href", url);
    link.setAttribute("download", `expenses_${monthName}_${currentYear}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!desc || !amount || !userData) return;
    try {
      await addDoc(collection(db, "expenses"), {
        description: desc,
        amount: parseFloat(amount),
        category: selectedVacation ? "Vacation" : "General",
        date: serverTimestamp(),
        familyId,
        authorId: userData.uid,
        vacationId: selectedVacation || null,
      });
      sendNotification(
        t.newNotification,
        `${userData.displayName}: ${desc} (${amount}€)`,
        "expense",
      );
      setDesc("");
      setAmount("");
      setSelectedVacation("");
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, "expenses");
    }
  };

  const totalSpent = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const budget = 2500; // Example monthly budget
  const remaining = budget - totalSpent;
  const progress = Math.min((totalSpent / budget) * 100, 100);

  const categoryData = useMemo(() => {
    const groups: { [key: string]: number } = {};
    expenses.forEach((exp) => {
      let catName = language === "es" ? "General" : "General";
      if (exp.category === "Vacation" && exp.vacationId) {
        const vac = vacations.find((v) => v.id === exp.vacationId);
        catName = vac
          ? vac.destination
          : language === "es"
            ? "Vacaciones"
            : "Vacation";
      } else if (exp.category) {
        catName = exp.category.charAt(0).toUpperCase() + exp.category.slice(1);
      }
      groups[catName] = (groups[catName] || 0) + exp.amount;
    });

    return Object.entries(groups).map(([name, value]) => ({
      name,
      value: parseFloat(value.toFixed(2)),
    }));
  }, [expenses, vacations, language]);

  const totalCategorySum = useMemo(() => {
    return categoryData.reduce((sum, entry) => sum + entry.value, 0);
  }, [categoryData]);

  const COLORS = [
    "#6366F1",
    "#10B981",
    "#F59E0B",
    "#EF4444",
    "#EC4899",
    "#3B82F6",
    "#8B5CF6",
    "#14B8A6",
    "#F43F5E",
  ];

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div
          className={`p-4 rounded-2xl shadow-xl border text-xs font-bold leading-none ${isDark ? "bg-zinc-950 border-white/10 text-white" : "bg-white border-slate-100 text-slate-800"}`}
        >
          <p className="mb-2 opacity-50 text-[10px] uppercase tracking-wider">
            {payload[0].name}
          </p>
          <p
            className="text-sm font-black text-indigo-500"
            style={{ color: theme.accent }}
          >
            {payload[0].value.toFixed(2)}€
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-300">
      <div
        className={`${theme.card} p-6 sm:p-10 rounded-[2rem] sm:rounded-[3rem] border shadow-sm grid grid-cols-1 md:grid-cols-3 gap-8`}
      >
        <div className="md:col-span-1 flex flex-col justify-center items-center text-center">
          <div className="relative w-48 h-48 mb-6">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="96"
                cy="96"
                r="88"
                stroke="currentColor"
                strokeWidth="12"
                fill="transparent"
                className={isDark ? "text-white/5" : "text-black/5"}
              />
              <circle
                cx="96"
                cy="96"
                r="88"
                stroke="currentColor"
                strokeWidth="12"
                fill="transparent"
                strokeDasharray={553}
                strokeDashoffset={553 - (553 * progress) / 100}
                className="text-indigo-500 transition-all duration-1000"
                style={{ stroke: theme.accent }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[10px] font-black uppercase tracking-widest opacity-40">
                {t.remaining}
              </span>
              <span className="text-3xl font-black italic">
                {remaining.toFixed(0)}€
              </span>
            </div>
          </div>
          <p
            className="text-[10px] font-black uppercase tracking-wider opacity-40 max-w-full truncate px-2"
            title={`${t.monthlyBudget}: ${budget}€`}
          >
            {t.monthlyBudget}: {budget}€
          </p>
        </div>

        <div className="md:col-span-2 flex flex-col justify-between">
          <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <h2 className="text-2xl sm:text-4xl font-black italic uppercase tracking-tighter flex items-center gap-4">
              <DollarSign
                size={32}
                className="text-emerald-500 animate-pulse"
              />
              {t.finance}
            </h2>
            <button
              onClick={handleExportCsv}
              disabled={monthlyExpensesCount === 0}
              className={`py-2 px-3 sm:px-4 rounded-xl text-[10.5px] font-black uppercase tracking-widest transition-all flex items-center gap-2 border select-none ${
                monthlyExpensesCount === 0
                  ? "opacity-35 cursor-not-allowed bg-transparent border-zinc-500/10 text-zinc-500"
                  : isDark
                    ? "bg-white/5 hover:bg-white/10 border-white/15 text-white active:scale-95"
                    : "bg-black/5 hover:bg-black/10 border-black/10 text-zinc-800 active:scale-95"
              }`}
              style={monthlyExpensesCount > 0 ? { borderColor: `${theme.accent}44`, color: theme.accent } : undefined}
              title={
                monthlyExpensesCount === 0
                  ? language === "es"
                    ? "Sin gastos este mes"
                    : "No expenses this month"
                  : language === "es"
                    ? "Exportar gastos del mes actual como CSV"
                    : "Export current month's expenses as CSV"
              }
            >
              <Download size={14} />
              <span>{language === "es" ? "Exportar CSV" : "Export CSV"}</span>
            </button>
          </div>
            <div className="flex gap-12 mt-6">
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider opacity-40 mb-1">
                  {t.spent}
                </p>
                <p className="text-3xl font-black text-rose-500">
                  {totalSpent.toFixed(2)}€
                </p>
              </div>
            </div>
          </div>

          <form
            onSubmit={handleAdd}
            className={`mt-6 md:mt-10 flex flex-col gap-4 ${isDark ? "bg-white/5" : "bg-black/5"} p-3 sm:p-4 rounded-[1.5rem] sm:rounded-[2rem] border ${isDark ? "border-white/5" : "border-black/5"} shadow-inner`}
          >
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 border-b border-black/5 dark:border-white/5 pb-2 sm:pb-0">
              <input
                placeholder={t.description}
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                className="flex-1 bg-transparent px-4 sm:px-6 py-3 sm:py-4 outline-none font-bold placeholder:opacity-30 text-sm whitespace-nowrap overflow-hidden"
              />
              <input
                type="number"
                placeholder="€"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className={`w-full sm:w-28 bg-transparent px-4 sm:px-2 py-3 sm:py-4 outline-none font-bold text-left sm:text-center border-t sm:border-t-0 sm:border-l ${isDark ? "border-white/10" : "border-black/10"} text-sm`}
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 sm:items-center">
              <select
                value={selectedVacation}
                onChange={(e) => setSelectedVacation(e.target.value)}
                className="w-full sm:flex-1 bg-transparent px-4 sm:px-6 py-2 outline-none font-bold text-xs opacity-50 hover:opacity-100 transition-opacity border-none rounded-xl"
              >
                <option value="" className="text-slate-900">
                  {t.vacation} (Optional)
                </option>
                {vacations.map((v) => (
                  <option key={v.id} value={v.id} className="text-slate-900">
                    {v.destination}
                  </option>
                ))}
              </select>
              <button
                className="w-full sm:w-auto py-3 px-6 sm:p-4 sm:px-8 text-white rounded-xl sm:rounded-2xl hover:brightness-110 active:scale-95 transition-all shadow-xl flex items-center justify-center gap-2 font-black uppercase tracking-widest text-[10px]"
                style={{ backgroundColor: theme.accent }}
              >
                <Plus size={18} />
                {t.inject}
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Pie Chart Card */}
        <div
          className={`${theme.card} p-6 sm:p-10 rounded-[2rem] sm:rounded-[3rem] border shadow-sm lg:col-span-5 flex flex-col`}
        >
          <h3 className="font-black text-xl uppercase tracking-tighter italic mb-6">
            {language === "es" ? "Distribución" : "Distribution"}
          </h3>

          {categoryData.length > 0 ? (
            <div className="flex-1 flex flex-col justify-between gap-6">
              <div className="h-60 w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={75}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-[9px] font-black uppercase tracking-widest opacity-40">
                    {language === "es" ? "Suma" : "Total"}
                  </span>
                  <span className="text-lg font-black italic">
                    {totalCategorySum.toFixed(0)}€
                  </span>
                </div>
              </div>

              {/* Custom Legend */}
              <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                {categoryData.map((entry, index) => {
                  const percent =
                    totalCategorySum > 0
                      ? ((entry.value / totalCategorySum) * 100).toFixed(1)
                      : "0";
                  const color = COLORS[index % COLORS.length];
                  return (
                    <div
                      key={entry.name}
                      className="flex items-center justify-between text-xs font-bold p-1.5 hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-all"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0 animate-pulse"
                          style={{ backgroundColor: color }}
                        />
                        <span className="truncate opacity-80">
                          {entry.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2.5 font-mono">
                        <span className="opacity-40 text-[9px]">
                          {percent}%
                        </span>
                        <span
                          className={isDark ? "text-zinc-200" : "text-zinc-800"}
                        >
                          {entry.value.toFixed(2)}€
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center py-20 text-center">
              <div
                className={`p-4 rounded-full ${isDark ? "bg-white/5" : "bg-black/5"} mb-4 opacity-40`}
              >
                <DollarSign size={28} />
              </div>
              <p className="text-xs font-black uppercase tracking-widest opacity-35">
                {language === "es" ? "Sin datos de gastos" : "No expense data"}
              </p>
            </div>
          )}
        </div>

        {/* Transactions List */}
        <div
          className={`${theme.card} p-6 sm:p-10 rounded-[2rem] sm:rounded-[3rem] border shadow-sm lg:col-span-7 flex flex-col`}
        >
          <h3 className="font-black text-xl uppercase tracking-tighter italic mb-8">
            {t.expenses}
          </h3>
          <div className="space-y-4 max-h-[28rem] overflow-y-auto pr-1">
            {expenses.map((exp) => (
              <div
                key={exp.id}
                className={`flex justify-between items-center gap-4 p-6 ${isDark ? "bg-white/[0.02]" : "bg-black/[0.02]"} rounded-2xl border ${isDark ? "border-white/5" : "border-black/5"} hover:bg-white/10 hover:shadow-lg transition-all group`}
              >
                <div className="flex items-center gap-4 min-w-0 flex-1">
                  <div
                    className={`p-3 ${isDark ? "bg-white/10" : "bg-black/5"} rounded-xl shadow-sm text-slate-400 group-hover:text-indigo-500 transition-colors shrink-0`}
                  >
                    <ShoppingCart size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-sm text-left break-words whitespace-pre-wrap">
                      {exp.description}
                    </p>
                    <p className="text-[9px] font-black uppercase tracking-widest opacity-30 text-left mt-0.5">
                      {exp.date?.toDate
                        ? exp.date.toDate().toLocaleDateString()
                        : t.now}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4 sm:gap-6 shrink-0 ml-2">
                  <span className="font-black text-rose-500 shrink-0">
                    -{exp.amount.toFixed(2)}€
                  </span>
                  <button
                    onClick={async () =>
                      await deleteDoc(doc(db, "expenses", exp.id))
                    }
                    className="text-slate-300 hover:text-rose-500 p-2 opacity-0 group-hover:opacity-100 transition-all shrink-0"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
            {expenses.length === 0 && (
              <div className="py-20 text-center opacity-20 font-black uppercase tracking-widest text-xs">
                No transactions yet
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const toLocalDateTimeString = (utcString?: string) => {
  if (!utcString) return "";
  const date = new Date(utcString);
  if (isNaN(date.getTime())) return "";
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

interface CustomDatePickerProps {
  value: string;
  onChange: (val: string) => void;
  showTime?: boolean;
  label: string;
  isDark: boolean;
  language: "es" | "en";
}

const CustomDatePicker = ({
  value,
  onChange,
  showTime = false,
  label,
  isDark,
  language,
}: CustomDatePickerProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(
    value ? new Date(value) : new Date(),
  );
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        pickerRef.current &&
        !pickerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const parsedDate = value ? new Date(value) : null;

  const handleDayClick = (day: Date) => {
    let newDate = new Date(day);
    if (parsedDate) {
      newDate.setHours(parsedDate.getHours());
      newDate.setMinutes(parsedDate.getMinutes());
      newDate.setSeconds(0);
      newDate.setMilliseconds(0);
    } else {
      newDate.setHours(12);
      newDate.setMinutes(0);
      newDate.setSeconds(0);
      newDate.setMilliseconds(0);
    }
    onChange(newDate.toISOString());
    if (!showTime) {
      setIsOpen(false);
    }
  };

  const handleTimeChange = (hours: number, minutes: number) => {
    const baseDate = parsedDate || new Date();
    const newDate = new Date(baseDate);
    newDate.setHours(hours);
    newDate.setMinutes(minutes);
    newDate.setSeconds(0);
    newDate.setMilliseconds(0);
    onChange(newDate.toISOString());
  };

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const daysGrid: Date[] = [];
  let dayToAdd = startDate;
  while (dayToAdd <= endDate || daysGrid.length < 42) {
    daysGrid.push(dayToAdd);
    dayToAdd = addDays(dayToAdd, 1);
  }

  const weekdays =
    language === "es"
      ? ["Lu", "Ma", "Mi", "Ju", "Vi", "Sá", "Do"]
      : ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

  const triggerLabel = parsedDate
    ? parsedDate.toLocaleString(language === "es" ? "es-ES" : "en-US", {
        day: "numeric",
        month: "short",
        year: "numeric",
        ...(showTime ? { hour: "2-digit", minute: "2-digit" } : {}),
      })
    : language === "es"
      ? "No asignado"
      : "Not set";

  const selectedHour = parsedDate ? parsedDate.getHours() : 12;
  const selectedMinute = parsedDate ? parsedDate.getMinutes() : 0;

  return (
    <div
      className="relative inline-block text-left w-full sm:w-auto"
      ref={pickerRef}
    >
      <div className="flex flex-col gap-1 w-full">
        {label && (
          <span className="text-[10px] font-bold opacity-60 uppercase tracking-wider">
            {label}
          </span>
        )}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-2 justify-between px-3 py-1.5 rounded-xl border transition-all text-[11px] font-bold ${
            parsedDate
              ? isDark
                ? "bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border-indigo-505/30"
                : "bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200"
              : isDark
                ? "bg-white/5 hover:bg-white/10 text-white/60 border-white/10 border-dashed"
                : "bg-black/5 hover:bg-black/10 text-slate-500 border-black/10 border-dashed"
          }`}
        >
          <div className="flex items-center gap-1.5 truncate">
            {showTime ? (
              <Bell
                size={12}
                className={parsedDate ? "text-indigo-500" : "opacity-60"}
              />
            ) : (
              <Calendar
                size={12}
                className={parsedDate ? "text-indigo-500" : "opacity-60"}
              />
            )}
            <span className="truncate">{triggerLabel}</span>
          </div>
          {parsedDate && (
            <span
              onClick={(e) => {
                e.stopPropagation();
                onChange("");
                setIsOpen(false);
              }}
              className="text-[10px] opacity-65 hover:opacity-100 cursor-pointer p-0.5 rounded-full hover:bg-rose-500/10 text-rose-500 font-extrabold"
            >
              ✕
            </span>
          )}
        </button>
      </div>

      {isOpen && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 5 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className={`absolute left-0 mt-2 p-4 rounded-2xl shadow-2xl z-50 border whitespace-nowrap min-w-[280px] ${
            isDark
              ? "bg-[#18181B] text-white border-white/10 shadow-black"
              : "bg-white text-slate-800 border-slate-200 shadow-slate-250/50"
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className={`p-1 rounded-lg ${isDark ? "hover:bg-white/10" : "hover:bg-black/5"}`}
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-xs font-black uppercase tracking-wider">
              {currentMonth.toLocaleString(
                language === "es" ? "es-ES" : "en-US",
                { month: "long", year: "numeric" },
              )}
            </span>
            <button
              type="button"
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className={`p-1 rounded-lg ${isDark ? "hover:bg-white/10" : "hover:bg-black/5"}`}
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center mb-2">
            {weekdays.map((wd, idx) => (
              <span
                key={idx}
                className="text-[9px] font-black uppercase opacity-40"
              >
                {wd}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1 text-center">
            {daysGrid.map((day, idx) => {
              const belongsToCurrentMonth = isSameMonth(day, currentMonth);
              const isSelected = parsedDate && isSameDay(day, parsedDate);
              const isCurrentDay = isSameDay(day, new Date());

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleDayClick(day)}
                  className={`w-8 h-8 rounded-lg text-xs font-bold transition-all flex items-center justify-center ${
                    isSelected
                      ? "bg-indigo-650 text-white shadow-md"
                      : belongsToCurrentMonth
                        ? isCurrentDay
                          ? isDark
                            ? "bg-indigo-500/10 text-indigo-300 ring-1 ring-indigo-500/30"
                            : "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-500/30"
                          : isDark
                            ? "hover:bg-white/15 text-white"
                            : "hover:bg-black/5 text-slate-800"
                        : isDark
                          ? "text-white/20 hover:bg-white/5"
                          : "text-slate-300 hover:bg-black/5"
                  }`}
                >
                  {day.getDate()}
                </button>
              );
            })}
          </div>

          {showTime && parsedDate && (
            <div
              className={`mt-4 pt-3 border-t ${isDark ? "border-white/5" : "border-slate-100"} flex flex-col gap-2`}
            >
              <span className="text-[9px] font-black uppercase opacity-50 tracking-wider">
                {language === "es" ? "Ajustar Hora" : "Select Time"}
              </span>
              <div className="flex items-center gap-2 justify-center">
                <div className="flex flex-col items-center">
                  <select
                    value={selectedHour}
                    onChange={(e) =>
                      handleTimeChange(parseInt(e.target.value), selectedMinute)
                    }
                    className={`text-xs font-bold p-1 rounded-lg outline-none border ${
                      isDark
                        ? "bg-[#18181B] text-white border-white/10"
                        : "bg-slate-50 text-slate-800 border-slate-200"
                    }`}
                  >
                    {Array.from({ length: 24 }).map((_, h) => (
                      <option
                        key={h}
                        value={h}
                        className={
                          isDark
                            ? "bg-[#18181B] text-white"
                            : "bg-white text-slate-800"
                        }
                      >
                        {h.toString().padStart(2, "0")}
                      </option>
                    ))}
                  </select>
                </div>
                <span className="font-bold">:</span>
                <div className="flex flex-col items-center">
                  <select
                    value={selectedMinute}
                    onChange={(e) =>
                      handleTimeChange(selectedHour, parseInt(e.target.value))
                    }
                    className={`text-xs font-bold p-1 rounded-lg outline-none border ${
                      isDark
                        ? "bg-[#18181B] text-white border-white/10"
                        : "bg-slate-50 text-slate-800 border-slate-200"
                    }`}
                  >
                    {Array.from({ length: 60 }).map((_, m) => (
                      <option
                        key={m}
                        value={m}
                        className={
                          isDark
                            ? "bg-[#18181B] text-white"
                            : "bg-white text-slate-800"
                        }
                      >
                        {m.toString().padStart(2, "0")}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          <div
            className={`mt-3 pt-3 border-t ${isDark ? "border-white/5" : "border-slate-100"} flex justify-between gap-2`}
          >
            <button
              type="button"
              onClick={() => {
                const today = new Date();
                if (parsedDate) {
                  today.setHours(parsedDate.getHours());
                  today.setMinutes(parsedDate.getMinutes());
                }
                onChange(today.toISOString());
                setCurrentMonth(today);
              }}
              className={`text-[9.5px] font-black uppercase tracking-wider px-2 py-1 rounded hover:scale-105 transition-all ${
                isDark
                  ? "bg-white/5 hover:bg-white/10 text-white"
                  : "bg-black/5 hover:bg-black/10 text-slate-600"
              }`}
            >
              {language === "es" ? "Hoy" : "Today"}
            </button>
            <button
              type="button"
              onClick={() => {
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                if (parsedDate) {
                  tomorrow.setHours(parsedDate.getHours());
                  tomorrow.setMinutes(parsedDate.getMinutes());
                }
                onChange(tomorrow.toISOString());
                setCurrentMonth(tomorrow);
              }}
              className={`text-[9.5px] font-black uppercase tracking-wider px-2 py-1 rounded hover:scale-105 transition-all ${
                isDark
                  ? "bg-white/5 hover:bg-white/10 text-white"
                  : "bg-black/5 hover:bg-black/10 text-slate-600"
              }`}
            >
              {language === "es" ? "Mañana" : "Tomorrow"}
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
};

interface TaskCardProps {
  key?: React.Key;
  task: Task;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, s: string) => void;
  onAddImage: (id: string, url?: string) => void;
  onRemoveImage?: (id: string, url: string) => void;
  onUpdateTitle: (id: string, title: string) => void;
  onUpdateReminder: (id: string, reminderAt: string | null) => void;
  onUpdateDueDate: (id: string, dueDate: string | null) => void;
  onUpdateAssignment?: (id: string, assignedTo: string) => void;
  className?: string;
  userData: any;
  familyProfiles: Record<string, string>;
  sendNotification: any;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDragLeave?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
  isDragged?: boolean;
  isDragTarget?: boolean;
}

const TaskCard = ({
  task,
  onDelete,
  onStatusChange,
  onAddImage,
  onRemoveImage,
  onUpdateTitle,
  onUpdateReminder,
  onUpdateDueDate,
  onUpdateAssignment,
  className,
  language,
  userData,
  familyProfiles,
  sendNotification,
  draggable,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  isDragged,
  isDragTarget,
}: TaskCardProps & { language: Language }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(task.title);
  const [editedReminder, setEditedReminder] = useState(task.reminderAt || "");
  const [editedDueDate, setEditedDueDate] = useState(task.dueDate || "");
  const [editedTags, setEditedTags] = useState((task.tags || []).join(", "));
  const [showUrlInput, setShowUrlInput] = useState(false);

  useEffect(() => {
    setEditedTags((task.tags || []).join(", "));
  }, [task.tags]);
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [newComment, setNewComment] = useState("");
  const [newSubtask, setNewSubtask] = useState("");

  const { family } = useFamily();
  const t = translations[language];
  const isDark =
    className?.includes("aura") ||
    className?.includes("cosmos") ||
    className?.includes("18181B");

  const papaName = useMemo(
    () => family?.papaName || (language === "es" ? "Papá" : "Dad"),
    [family, language],
  );
  const mamaName = useMemo(
    () => family?.mamaName || (language === "es" ? "Mamá" : "Mom"),
    [family, language],
  );

  const isPapa = (assignee: string | null | undefined) => {
    if (!assignee) return false;
    return assignee === "Papá" || assignee === papaName;
  };

  const isMama = (assignee: string | null | undefined) => {
    if (!assignee) return false;
    return assignee === "Mamá" || assignee === mamaName;
  };

  const customMembers = useMemo(() => {
    if (!family) return [];

    const defaultMembers = [
      {
        id: "papa",
        name: papaName,
        role: family.papaRole || (language === "es" ? "Papá" : "Dad"),
        photoURL: family?.papaPhotoURL || "",
        colorTheme: "blue",
      },
      {
        id: "mama",
        name: mamaName,
        role: family.mamaRole || (language === "es" ? "Mamá" : "Mom"),
        photoURL: family?.mamaPhotoURL || "",
        colorTheme: "rose",
      },
    ];

    if (family.customMembers && Array.isArray(family.customMembers)) {
      return [...defaultMembers, ...family.customMembers];
    }
    return defaultMembers;
  }, [family, language, papaName, mamaName]);

  useEffect(() => {
    const qSubtasks = query(
      collection(db, `tasks/${task.id}/subtasks`),
      orderBy("createdAt", "asc"),
    );
    const unsubSubtasks = onSnapshot(qSubtasks, (snap) => {
      setSubtasks(
        snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Subtask),
      );
    });

    let unsubComments = () => {};
    if (isExpanded) {
      const qComments = query(
        collection(db, `tasks/${task.id}/comments`),
        orderBy("createdAt", "asc"),
      );
      unsubComments = onSnapshot(qComments, (snap) => {
        setComments(
          snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Comment),
        );
      });
    }

    return () => {
      unsubSubtasks();
      unsubComments();
    };
  }, [isExpanded, task.id]);

  const handleAddSubtask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtask.trim()) return;
    const form = e.target as HTMLFormElement;
    const assigneeId = (
      form.elements.namedItem("assignee") as HTMLSelectElement
    ).value;

    try {
      await addDoc(collection(db, `tasks/${task.id}/subtasks`), {
        title: newSubtask.trim(),
        completed: false,
        assigneeId: assigneeId || null,
        createdAt: serverTimestamp(),
      });
      setNewSubtask("");
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `tasks/${task.id}/subtasks`);
    }
  };

  const toggleSubtask = async (sub: Subtask) => {
    try {
      await updateDoc(doc(db, `tasks/${task.id}/subtasks`, sub.id), {
        completed: !sub.completed,
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `tasks/${task.id}/subtasks`);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !userData) return;
    try {
      await addDoc(collection(db, `tasks/${task.id}/comments`), {
        content: newComment.trim(),
        authorId: userData.uid,
        authorName: userData.displayName || "Family member",
        createdAt: serverTimestamp(),
      });
      sendNotification(
        t.newNotification,
        `${userData.displayName}: ${newComment.trim()}`,
        "message",
      );
      setNewComment("");
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `tasks/${task.id}/comments`);
    }
  };

  const icons: Record<string, any> = {
    Shopping: ShoppingCart,
    Home: Home,
    School: GraduationCap,
    Vacation: Palmtree,
    Health: Stethoscope,
    Celebration: Gift,
    Travel: MapPin,
    Other: Info,
  };
  const Icon = icons[task.category] || Info;

  const priorityColors: Record<string, string> = isDark
    ? {
        Low: "bg-[#10B981]/10 text-[#34D399] border border-[#10B981]/20 shadow-[0_2px_8px_rgba(16,185,129,0.05)]",
        Medium:
          "bg-[#3B82F6]/10 text-[#60A5FA] border border-[#3B82F6]/20 shadow-[0_2px_8px_rgba(59,130,246,0.05)]",
        High: "bg-[#F97316]/10 text-[#FB923C] border border-[#F97316]/20 shadow-[0_2px_8px_rgba(249,115,22,0.05)]",
        Critical:
          "bg-[#EF4444]/15 text-[#F87171] border border-[#EF4444]/25 shadow-[0_2px_12px_rgba(239,68,68,0.15)] animate-pulse",
      }
    : {
        Low: "bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0] shadow-sm",
        Medium: "bg-[#EFF6FF] text-[#1E40AF] border border-[#BFDBFE] shadow-sm",
        High: "bg-[#FFF7ED] text-[#9A3412] border border-[#FED7AA] shadow-sm",
        Critical:
          "bg-[#FEF2F2] text-[#991B1B] border border-[#FCA5A5] shadow-sm ring-1 ring-red-105",
      };

  const priorityLabels: Record<string, string> = {
    Low: t.low,
    Medium: t.medium,
    High: t.high,
    Critical: t.critical,
  };

  const normalizedPriority = useMemo(() => {
    const p = (task.priority || "Low").trim();
    return p.charAt(0).toUpperCase() + p.slice(1).toLowerCase();
  }, [task.priority]);

  const getPriorityDotColor = (p: string) => {
    switch (p) {
      case "Critical":
        return "bg-rose-500";
      case "High":
        return "bg-orange-500";
      case "Medium":
        return "bg-blue-500";
      default:
        return "bg-emerald-500";
    }
  };

  const categoryLabels: Record<string, string> = {
    Shopping: t.pantry,
    Home: t.allHouse,
    School: t.school,
    Vacation: t.vacation,
    Health: t.health,
    Celebration: t.celebration,
    Travel: t.travel,
    Other: t.note,
  };

  const startEditing = () => {
    setEditedTitle(task.title);
    setEditedReminder(task.reminderAt || "");
    setEditedDueDate(task.dueDate || "");
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (editedTitle.trim()) {
      if (editedTitle !== task.title) {
        onUpdateTitle(task.id, editedTitle);
      }
      onUpdateReminder(
        task.id,
        editedReminder ? new Date(editedReminder).toISOString() : null,
      );
      onUpdateDueDate(
        task.id,
        editedDueDate ? new Date(editedDueDate).toISOString() : null,
      );

      const tagsArray = editedTags
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t.length > 0);
      try {
        await updateDoc(doc(db, "tasks", task.id), {
          tags: tagsArray,
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `tasks/${task.id}`);
      }
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      setEditedTitle(task.title);
      setEditedReminder(task.reminderAt || "");
      setEditedDueDate(task.dueDate || "");
      setEditedTags((task.tags || []).join(", "));
      setIsEditing(false);
    }
  };

  const handleAddAttachment = () => {
    if (attachmentUrl.trim()) {
      onAddImage(task.id, attachmentUrl.trim());
      setAttachmentUrl("");
      setShowUrlInput(false);
    }
  };

  const isCompleted = task.status === "Completed";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{
        opacity: isCompleted ? 0.7 : 1,
        y: 0,
        scale: isCompleted ? 0.98 : 1,
      }}
      whileHover={{ y: -4, scale: isCompleted ? 0.99 : 1.01 }}
      whileTap={{ scale: 0.97 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{
        type: "spring",
        stiffness: 260,
        damping: 20,
      }}
      draggable={draggable}
      onDragStart={onDragStart as any}
      onDragOver={onDragOver as any}
      onDragLeave={onDragLeave as any}
      onDrop={onDrop as any}
      className={`${className || (isDark ? "bg-[#18181B]" : "bg-white")} p-6 rounded-3xl shadow-sm border ${
        isDragTarget
          ? "border-indigo-500 scale-[1.01] ring-2 ring-indigo-500/20"
          : isDragged
            ? "opacity-40 border-dashed border-zinc-500/50 scale-[0.98]"
            : isDark
              ? "border-white/5"
              : "border-black/5"
      } flex flex-col gap-5 group hover:shadow-xl transition-[background-color,border-color,box-shadow,filter] duration-300 relative ${isCompleted ? "grayscale-[0.2]" : ""} ${draggable ? "cursor-grab active:cursor-grabbing" : ""}`}
    >
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-4 flex-1">
          {draggable && (
            <div className="text-slate-400 opacity-30 group-hover:opacity-100 cursor-grab active:cursor-grabbing hover:scale-110 transition-all p-1">
              <GripVertical size={16} />
            </div>
          )}
          <div
            className={`p-3.5 rounded-2xl ${isDark ? "bg-white/5" : "bg-black/5"} text-slate-400 group-hover:bg-zinc-900 group-hover:text-white transition-all duration-300 ${task.status === "Completed" ? "grayscale opacity-50" : ""}`}
          >
            <Icon size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span
                className={`text-[9px] uppercase tracking-widest font-black px-2.5 py-1 rounded-full flex items-center gap-1.5 relative ${
                  task.status === "Completed"
                    ? "bg-zinc-200/50 text-zinc-500 line-through border border-zinc-300/30"
                    : priorityColors[normalizedPriority] ||
                      (isDark
                        ? "bg-zinc-500/15 text-zinc-400 border border-zinc-500/25"
                        : "bg-zinc-100 text-zinc-700 border border-zinc-200")
                }`}
              >
                {task.status !== "Completed" && (
                  <span className="relative flex h-1.5 w-1.5 shrink-0">
                    <span
                      className={`animate-ping absolute inline-flex h-full w-full rounded-full ${getPriorityDotColor(normalizedPriority)} opacity-75`}
                    />
                    <span
                      className={`relative inline-flex rounded-full h-1.5 w-1.5 ${getPriorityDotColor(normalizedPriority)}`}
                    />
                  </span>
                )}
                <span>
                  {priorityLabels[normalizedPriority] || normalizedPriority}
                </span>
              </span>
              <span className="text-[10px] opacity-40 font-bold capitalize">
                {categoryLabels[task.category] || task.category}
                {task.subCategory ? ` · ${task.subCategory}` : ""}
              </span>
              {task.assignedTo &&
                (() => {
                  let avatarElem = <span>👤</span>;
                  if (isPapa(task.assignedTo) && family?.papaPhotoURL) {
                    avatarElem = (
                      <img
                        src={family.papaPhotoURL}
                        alt={task.assignedTo}
                        className="w-3.5 h-3.5 rounded-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    );
                  } else if (isMama(task.assignedTo) && family?.mamaPhotoURL) {
                    avatarElem = (
                      <img
                        src={family.mamaPhotoURL}
                        alt={task.assignedTo}
                        className="w-3.5 h-3.5 rounded-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    );
                  } else {
                    // Check if customized extra family member has photoURL
                    const cust = customMembers.find(
                      (m: any) => m.name === task.assignedTo,
                    );
                    if (cust?.photoURL) {
                      avatarElem = (
                        <img
                          src={cust.photoURL}
                          alt={task.assignedTo}
                          className="w-3.5 h-3.5 rounded-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      );
                    }
                  }

                  return (
                    <span
                      className={`text-[9px] uppercase tracking-widest font-black px-2.5 py-1 rounded-full flex items-center gap-1.5 border ${
                        isPapa(task.assignedTo)
                          ? "bg-blue-500/10 text-blue-500 border-blue-500/15"
                          : isMama(task.assignedTo)
                            ? "bg-rose-500/10 text-rose-500 border-rose-500/15"
                            : "bg-emerald-500/10 text-emerald-500 border-emerald-500/15"
                      }`}
                    >
                      {avatarElem}
                      <span>{task.assignedTo}</span>
                    </span>
                  );
                })()}
            </div>
            {isEditing ? (
              <div className="flex flex-col gap-2 w-full mt-1">
                <input
                  autoFocus
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className={`w-full font-bold ${isDark ? "bg-white/5 border-white/10 text-white" : "bg-black/5 text-slate-800"} px-3 py-1.5 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/30 text-base border`}
                />
                <div className="flex flex-col gap-3 mt-2.5">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <CustomDatePicker
                      value={editedDueDate}
                      onChange={setEditedDueDate}
                      showTime={false}
                      label={
                        language === "es" ? "Due Date (Entrega):" : "Due Date:"
                      }
                      isDark={isDark}
                      language={language}
                    />
                    <CustomDatePicker
                      value={editedReminder}
                      onChange={setEditedReminder}
                      showTime={true}
                      label={
                        language === "es"
                          ? "Recordatorio (Alarma):"
                          : "Reminder:"
                      }
                      isDark={isDark}
                      language={language}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span
                      className={`text-[11px] font-bold ${isDark ? "text-zinc-400" : "text-zinc-500"}`}
                    >
                      {language === "es"
                        ? "Etiquetas (separadas por comas):"
                        : "Tags (comma-separated):"}
                    </span>
                    <input
                      value={editedTags}
                      onChange={(e) => setEditedTags(e.target.value)}
                      placeholder="e.g. laundry, chores"
                      className={`w-full text-xs font-bold ${isDark ? "bg-[#18181B] border-white/10 text-white" : "bg-white border-black/5 text-slate-800"} px-3 py-1.5 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/30 border`}
                    />
                  </div>
                </div>
                <div className="flex gap-2 mt-3 pt-1 border-t border-white/5">
                  <button
                    onClick={handleSave}
                    className="px-3.5 py-1.5 bg-indigo-600 text-white text-[10px] font-bold uppercase tracking-wider rounded-xl hover:bg-indigo-700 transition-colors shadow-sm"
                  >
                    {language === "es" ? "Guardar" : "Save"}
                  </button>
                  <button
                    onClick={() => {
                      setEditedTitle(task.title);
                      setEditedReminder(task.reminderAt || "");
                      setEditedDueDate(task.dueDate || "");
                      setEditedTags((task.tags || []).join(", "));
                      setIsEditing(false);
                    }}
                    className={`px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-xl transition-colors ${isDark ? "bg-white/10 hover:bg-white/15 text-white/80" : "bg-black/5 hover:bg-black/10 text-slate-705"}`}
                  >
                    {language === "es" ? "Cancelar" : "Cancel"}
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <h3
                  onClick={startEditing}
                  className="font-black text-lg cursor-text truncate tracking-tight flex items-center relative"
                >
                  <div className="relative inline-block max-w-full truncate pr-1">
                    <span
                      className={`inline-block truncate transition-colors duration-500 ${isCompleted ? "text-zinc-550 dark:text-zinc-400 italic" : ""}`}
                    >
                      {task.title}
                    </span>
                    <motion.span
                      initial={{ width: "0%" }}
                      animate={{ width: isCompleted ? "100%" : "0%" }}
                      transition={{
                        type: "spring",
                        stiffness: 120,
                        damping: 18,
                      }}
                      className="absolute left-0 top-1/2 -translate-y-1/2 h-[2.5px] bg-emerald-500 dark:bg-emerald-400 pointer-events-none rounded"
                    />
                  </div>
                </h3>
                {task.tags &&
                  Array.isArray(task.tags) &&
                  task.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {task.tags.map((tag, idx) => (
                        <span
                          key={idx}
                          className={`text-[9.5px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg border ${
                            isDark
                              ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/15"
                              : "bg-indigo-50 text-indigo-600 border-indigo-100"
                          }`}
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
              </div>
            )}
          </div>
        </div>
        <button
          onClick={() => onDelete(task.id)}
          className="text-slate-300 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100 p-2"
        >
          <Trash2 size={16} />
        </button>
      </div>

      {(task.dueDate || task.reminderAt || task.isRecurring) && (
        <div className="flex flex-wrap gap-2">
          {task.dueDate &&
            (() => {
              const isOverdue =
                new Date(task.dueDate).getTime() < Date.now() &&
                task.status !== "Completed";
              return (
                <div
                  className={`flex items-center gap-2 px-3 py-2 ${isOverdue ? (isDark ? "bg-rose-500/10 border border-rose-500/20" : "bg-rose-50 border border-rose-100") : isDark ? "bg-white/5" : "bg-black/5"} rounded-xl w-fit`}
                >
                  <Calendar
                    size={12}
                    className={isOverdue ? "text-rose-500" : "text-slate-400"}
                  />
                  <span
                    className={`text-[10px] font-black uppercase tracking-wider ${isOverdue ? "text-rose-500 font-extrabold" : "text-zinc-500"}`}
                  >
                    {new Date(task.dueDate).toLocaleDateString(
                      language === "es" ? "es-ES" : "en-US",
                      { day: "numeric", month: "short" },
                    )}
                  </span>
                </div>
              );
            })()}
          {task.reminderAt && (
            <div
              className={`flex items-center gap-2 px-3 py-2 ${task.reminderTriggered ? (isDark ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400/80" : "bg-emerald-50 border border-emerald-100 text-emerald-700/80") : isDark ? "bg-indigo-500/10 border border-indigo-500/20 text-indigo-400" : "bg-indigo-50 border border-indigo-100 text-indigo-700"} rounded-xl w-fit`}
            >
              <Bell
                size={12}
                className={
                  task.reminderTriggered
                    ? "opacity-60 text-emerald-500"
                    : "animate-bounce text-indigo-500"
                }
              />
              <span className="text-[10px] font-black uppercase tracking-wider">
                {language === "es" ? "Alarma: " : "Alarm: "}
                {new Date(task.reminderAt).toLocaleString(
                  language === "es" ? "es-ES" : "en-US",
                  {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  },
                )}
              </span>
            </div>
          )}
          {task.isRecurring && (
            <div
              className={`flex items-center gap-2 px-3 py-2 ${isDark ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400" : "bg-emerald-50 border border-emerald-100 text-emerald-700"} rounded-xl w-fit`}
            >
              <RefreshCw
                size={12}
                className="text-emerald-500 animate-spin-slow"
              />
              <span className="text-[10px] font-black uppercase tracking-wider">
                {task.recurrenceFrequency === "daily"
                  ? language === "es"
                    ? "Diario"
                    : "Daily"
                  : task.recurrenceFrequency === "weekly"
                    ? language === "es"
                      ? "Semanal"
                      : "Weekly"
                    : language === "es"
                      ? "Mensual"
                      : "Monthly"}
                {task.recurrenceEndDate &&
                  ` (${language === "es" ? "fin: " : "end: "}${new Date(task.recurrenceEndDate).toLocaleDateString(language === "es" ? "es-ES" : "en-US", { day: "numeric", month: "short" })})`}
              </span>
            </div>
          )}
        </div>
      )}

      {subtasks.length > 0 && (
        <div
          onClick={() => setIsExpanded((prev) => !prev)}
          className={`flex flex-col gap-2.5 p-3 rounded-2xl border ${isDark ? "bg-white/[0.02] border-white/5 hover:bg-white/[0.05]" : "bg-black/[0.01] border-black/5 hover:bg-black/[0.03]"} transition-all cursor-pointer group/progress mt-1`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider opacity-60 flex items-center gap-1.5 transition-colors group-hover/progress:text-indigo-400">
              <ListTodo
                size={12}
                className={
                  subtasks.length === subtasks.filter((s) => s.completed).length
                    ? "text-emerald-500"
                    : "text-indigo-500"
                }
              />
              {language === "es" ? "Subtareas:" : "Subtasks:"}
            </span>
            <span className="text-[10px] font-black opacity-80 flex items-center gap-1">
              <span
                className={
                  subtasks.length === subtasks.filter((s) => s.completed).length
                    ? "text-emerald-400"
                    : "text-indigo-400"
                }
              >
                {subtasks.filter((s) => s.completed).length}
              </span>
              <span className="opacity-40">/</span>
              <span>{subtasks.length}</span>
            </span>
          </div>
          <div
            className={`w-full h-2 rounded-full overflow-hidden ${isDark ? "bg-zinc-800" : "bg-black/5"}`}
          >
            <div
              className={`h-full rounded-full transition-all duration-550 ${subtasks.length === subtasks.filter((s) => s.completed).length ? "bg-emerald-500" : "bg-indigo-500"}`}
              style={{
                width: `${(subtasks.filter((s) => s.completed).length / subtasks.length) * 100}%`,
              }}
            />
          </div>
        </div>
      )}

      {task.attachments?.length > 0 && (
        <div className="flex flex-col gap-1.5 mt-1">
          <span className="text-[10px] font-black uppercase tracking-wider opacity-60 flex items-center gap-1">
            <Paperclip size={10} />
            {language === "es" ? "Archivos Adjuntos:" : "Attachments:"}
          </span>
          <div className="flex gap-3 overflow-x-auto pb-1.5 scrollbar-hide">
            {task.attachments.map((url, i) => (
              <div key={i} className="relative flex-shrink-0 group/img">
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  referrerPolicy="no-referrer"
                  className="block relative overflow-hidden rounded-2xl w-24 h-24 border border-zinc-500/10 hover:border-indigo-500 shadow-sm hover:shadow-md transition-all duration-300 transform hover:-translate-y-0.5"
                >
                  <img
                    src={url}
                    alt="attachment"
                    className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="bg-white/95 text-black hover:bg-white text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full shadow-sm">
                      {language === "es" ? "Ver" : "View"}
                    </span>
                  </div>
                </a>
                {onRemoveImage && (
                  <button
                    type="button"
                    onClick={() => onRemoveImage(task.id, url)}
                    className="absolute -top-1.5 -right-1.5 bg-rose-500 hover:bg-rose-600 text-white p-1 rounded-full shadow-md z-15 transition-transform scale-90 hover:scale-100 flex items-center justify-center w-5 h-5 border border-white/20 font-black text-[9px]"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {showUrlInput && (
        <div className="flex gap-2 animate-in slide-in-from-top-2 duration-300">
          <input
            autoFocus
            placeholder={t.enterImageUrl}
            value={attachmentUrl}
            onChange={(e) => setAttachmentUrl(e.target.value)}
            className={`flex-1 text-[10px] ${isDark ? "bg-white/5" : "bg-black/5"} px-3 py-2 rounded-xl outline-none border ${isDark ? "border-white/10" : "border-black/5"} font-bold`}
            onKeyDown={(e) => e.key === "Enter" && handleAddAttachment()}
          />
          <button
            onClick={handleAddAttachment}
            className="bg-zinc-900 text-white px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest"
          >
            {t.inject}
          </button>
        </div>
      )}

      <div
        className={`flex flex-wrap gap-2 justify-between items-center ${isDark ? "bg-white/[0.03]" : "bg-black/[0.03]"} p-2.5 rounded-2xl border ${isDark ? "border-white/5" : "border-black/5"}`}
      >
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={task.status}
            onChange={(e) => onStatusChange(task.id, e.target.value)}
            className="text-[10px] font-black opacity-60 bg-transparent px-3 py-1 outline-none cursor-pointer uppercase tracking-[0.1em]"
          >
            <option value="Pending" className="text-slate-900">
              {t.pending}
            </option>
            <option value="In Progress" className="text-slate-900">
              {t.inProgress}
            </option>
            <option value="Completed" className="text-slate-900">
              {t.completed}
            </option>
          </select>

          <span className="text-zinc-350 dark:text-zinc-750">|</span>

          <div className="flex items-center gap-1">
            <span className="text-[11px]" title="Asignado a">
              👤
            </span>
            <select
              value={task.assignedTo || ""}
              onChange={(e) => onUpdateAssignment?.(task.id, e.target.value)}
              className="text-[10px] font-black opacity-60 bg-transparent px-1 py-1 outline-none cursor-pointer uppercase tracking-[0.05em]"
            >
              <option value="" className="text-slate-900">
                {language === "es" ? "Ambos" : "Both"}
              </option>
              {customMembers.map((m: any) => (
                <option key={m.id} value={m.name} className="text-slate-900">
                  {m.id === "papa" ? "👦" : m.id === "mama" ? "👩" : "👤"}{" "}
                  {m.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => setShowUrlInput(!showUrlInput)}
            className={`p-2 transition-all shadow-sm rounded-xl ${showUrlInput ? "bg-indigo-500 text-white opacity-100" : "opacity-30 hover:opacity-100 hover:bg-white/10"}`}
          >
            <Paperclip size={16} />
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={`p-2 transition-all shadow-sm rounded-xl ${isExpanded ? "bg-indigo-500 text-white opacity-100" : "opacity-30 hover:opacity-100 hover:bg-white/10"}`}
          >
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{
              height: "auto",
              opacity: 1,
              transition: {
                height: { type: "spring", stiffness: 220, damping: 24 },
                opacity: { duration: 0.18, delay: 0.04 },
              },
            }}
            exit={{
              height: 0,
              opacity: 0,
              transition: {
                height: { type: "spring", stiffness: 220, damping: 24 },
                opacity: { duration: 0.12 },
              },
            }}
            className="overflow-hidden flex flex-col gap-6"
          >
            <div className="pt-4 border-t border-white/5 space-y-4">
              {/* Subtasks */}
              <div>
                <h4 className="text-[9px] font-black uppercase tracking-widest mb-3 opacity-40 flex items-center gap-2">
                  <ListTodo size={12} />
                  {t.subtasks}
                </h4>
                <div className="space-y-2">
                  {subtasks.map((sub) => {
                    const assigneeName = sub.assigneeId
                      ? sub.assigneeId === userData.uid
                        ? userData.displayName || "Me"
                        : familyProfiles[sub.assigneeId] || "Member"
                      : null;
                    const initials = assigneeName
                      ? assigneeName
                          .split(" ")
                          .filter(Boolean)
                          .map((n) => n[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase()
                      : "";

                    return (
                      <div
                        key={sub.id}
                        className={`flex items-center gap-3 p-2 rounded-xl border group/sub transition-all duration-200 ${
                          sub.completed
                            ? isDark
                              ? "bg-emerald-500/5 border-emerald-500/20 opacity-70"
                              : "bg-emerald-50/50 border-emerald-200 opacity-80"
                            : isDark
                              ? "bg-white/5 border-white/5"
                              : "bg-black/[0.03] border-black/5"
                        }`}
                      >
                        <button
                          onClick={() => toggleSubtask(sub)}
                          className="transition-transform active:scale-95 shrink-0"
                        >
                          {sub.completed ? (
                            <CheckCircle
                              size={14}
                              className="text-emerald-400 drop-shadow-[0_0_4px_rgba(52,211,153,0.3)] animate-pulse"
                            />
                          ) : (
                            <Circle
                              size={14}
                              className={`transition-colors ${isDark ? "opacity-40 hover:opacity-100 hover:text-emerald-400" : "text-zinc-400 hover:text-emerald-500"}`}
                            />
                          )}
                        </button>
                        <span
                          className={`text-xs flex-1 truncate transition-all ${sub.completed ? `line-through opacity-45 italic ${isDark ? "text-emerald-400/80" : "text-emerald-700/80"}` : isDark ? "text-white/80" : "text-zinc-700 font-medium"}`}
                        >
                          {sub.title}
                          {sub.completed && (
                            <span
                              className={`ml-2 inline-flex items-center text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border ${isDark ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-emerald-50 text-emerald-600 border-emerald-100"}`}
                            >
                              Done
                            </span>
                          )}
                        </span>
                        {assigneeName && (
                          <div
                            className={`flex items-center gap-1.5 px-1.5 py-0.5 rounded-full border shadow-sm max-w-[124px] shrink-0 opacity-80 hover:opacity-100 transition-opacity ${isDark ? "bg-white/10 border-white/5" : "bg-zinc-100 border-zinc-200"}`}
                          >
                            <div className="w-4 h-4 rounded-full bg-indigo-600 font-black text-[7px] text-white flex items-center justify-center border border-indigo-400/25 shrink-0">
                              {initials}
                            </div>
                            <span
                              className={`text-[7.5px] font-black uppercase tracking-wider max-w-[55px] truncate ${isDark ? "text-white/95" : "text-zinc-600"}`}
                            >
                              {sub.assigneeId === userData.uid
                                ? "Me"
                                : assigneeName.split(" ")[0]}
                            </span>
                          </div>
                        )}
                        <button
                          onClick={async () =>
                            await deleteDoc(
                              doc(db, `tasks/${task.id}/subtasks`, sub.id),
                            )
                          }
                          className="opacity-0 group-hover/sub:opacity-100 text-rose-500 hover:bg-rose-500/10 p-1 rounded-md transition-all shrink-0"
                        >
                          <Trash2 size={10} />
                        </button>
                      </div>
                    );
                  })}
                  <form onSubmit={handleAddSubtask} className="flex gap-2">
                    <input
                      placeholder={t.addSubtask}
                      value={newSubtask}
                      onChange={(e) => setNewSubtask(e.target.value)}
                      className={`flex-1 ${isDark ? "bg-white/5 border-white/10 text-white focus:ring-white/20" : "bg-black/[0.03] border-black/5 text-zinc-800 focus:ring-black/10"} border rounded-xl px-3 py-2 text-xs outline-none focus:ring-1`}
                    />
                    <select
                      value=""
                      onChange={async (e) => {
                        // This is standard select change but we let handleAddSubtask use form naming/refs, so we keep name="assignee"
                      }}
                      className={`${isDark ? "bg-zinc-900 border-white/10 text-white" : "bg-zinc-100 border-zinc-350 text-zinc-700"} border rounded-xl px-2 py-2 text-[10px] outline-none opacity-80 hover:opacity-100 transition-opacity`}
                      name="assignee"
                    >
                      <option
                        value=""
                        className={
                          isDark
                            ? "bg-zinc-900 text-white"
                            : "bg-white text-zinc-800"
                        }
                      >
                        {t.assignedTo || "Assign"}
                      </option>
                      {Object.entries(familyProfiles).map(([uid, name]) => (
                        <option
                          key={uid}
                          value={uid}
                          className={
                            isDark
                              ? "bg-zinc-900 text-white"
                              : "bg-white text-zinc-800"
                          }
                        >
                          {uid === userData.uid ? "Me" : name}
                        </option>
                      ))}
                    </select>
                    <button
                      className={`p-2 rounded-xl transition-all ${isDark ? "bg-white/10 hover:bg-white/20 text-white" : "bg-black/5 hover:bg-black/10 text-zinc-700"}`}
                    >
                      <Plus size={14} />
                    </button>
                  </form>
                </div>
              </div>

              {/* Comments */}
              <div>
                <h4 className="text-[9px] font-black uppercase tracking-widest mb-3 opacity-40 flex items-center gap-2">
                  <MessageSquare size={12} />
                  {t.comments}
                </h4>
                <div className="space-y-3 mb-4">
                  {comments.map((c) => (
                    <div
                      key={c.id}
                      className="bg-white/5 p-3 rounded-2xl border border-white/5"
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[8px] font-black uppercase tracking-widest text-indigo-400">
                          {c.authorName}
                        </span>
                        <span className="text-[7px] opacity-30 font-bold">
                          {c.createdAt?.toDate
                            ? c.createdAt.toDate().toLocaleTimeString()
                            : t.justNow}
                        </span>
                      </div>
                      <p className="text-xs opacity-80 leading-relaxed">
                        {c.content}
                      </p>
                    </div>
                  ))}
                  {comments.length === 0 && (
                    <p className="text-[8px] font-bold opacity-30 uppercase tracking-widest py-4 text-center">
                      {t.noComments}
                    </p>
                  )}
                </div>
                <form onSubmit={handleAddComment} className="flex gap-2">
                  <input
                    placeholder={t.addComment}
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="flex-1 bg-white/5 border border-white/5 rounded-xl px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-white/20"
                  />
                  <button className="p-2 bg-indigo-500 rounded-xl hover:bg-indigo-600 transition-all text-white active:scale-95 transition-transform flex items-center justify-center">
                    <Send size={14} />
                  </button>
                </form>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

interface SmartTaskSuggestion {
  category:
    | "Shopping"
    | "Home"
    | "School"
    | "Vacation"
    | "Health"
    | "Celebration"
    | "Travel"
    | "Other";
  subCategory?: string;
  priority: "Low" | "Medium" | "High" | "Critical";
  dueDate?: string;
  assignedToSuggestion?: string;
}

const useTaskCategorization = (title: string, enabled: boolean) => {
  const [suggestion, setSuggestion] = useState<SmartTaskSuggestion | null>(
    null,
  );
  const [isCategorizing, setIsCategorizing] = useState(false);

  useEffect(() => {
    const trimmed = title.trim();
    if (!enabled || trimmed.length < 3) {
      setSuggestion(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsCategorizing(true);
      try {
        const result = await categorizeTask(trimmed);
        setSuggestion(result);
      } catch (err) {
        console.error("useTaskCategorization error:", err);
      } finally {
        setIsCategorizing(false);
      }
    }, 650);

    return () => clearTimeout(timer);
  }, [title, enabled]);

  return { suggestion, isCategorizing, setSuggestion };
};

export default function Dashboard() {
  const { family, userData } = useFamily();
  const [language, setLanguage] = useState<Language>("es");

  // Set document lang attribute dynamically based on selected language
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const [autoArchiveCompleted, setAutoArchiveCompleted] = useState<boolean>(
    () => {
      return localStorage.getItem("autoArchiveCompleted") === "true";
    },
  );

  useEffect(() => {
    localStorage.setItem("autoArchiveCompleted", String(autoArchiveCompleted));
  }, [autoArchiveCompleted]);

  const t = translations[language];
  const [tasks, setTasks] = useState<Task[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newTask, setNewTask] = useState("");
  const {
    suggestion: liveSuggestion,
    isCategorizing: isLiveCategorizing,
    setSuggestion: setLiveSuggestion,
  } = useTaskCategorization(newTask, true);
  const [newTaskReminder, setNewTaskReminder] = useState("");
  const [newTaskIsRecurring, setNewTaskIsRecurring] = useState(false);
  const [newTaskRecurrenceFrequency, setNewTaskRecurrenceFrequency] = useState<
    "daily" | "weekly" | "monthly"
  >("weekly");
  const [newTaskRecurrenceEndDate, setNewTaskRecurrenceEndDate] = useState("");
  const [newTaskAssignedTo, setNewTaskAssignedTo] = useState("");
  const [newTaskTags, setNewTaskTags] = useState("");
  const [assigneeFilter, setAssigneeFilter] = useState<"all" | "papa" | "mama">(
    () => {
      const saved = localStorage.getItem("assigneeFilter");
      return saved === "all" || saved === "papa" || saved === "mama"
        ? saved
        : "all";
    },
  );

  useEffect(() => {
    localStorage.setItem("assigneeFilter", assigneeFilter);
  }, [assigneeFilter]);

  const [boardCategory, setBoardCategory] = useState<string>("all");
  const triggeredRemindersRef = useRef<Set<string>>(new Set());
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [isPrioritizing, setIsPrioritizing] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [groceries, setGroceries] = useState<string[]>([]);
  const [vacations, setVacations] = useState<Vacation[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [trophies, setTrophies] = useState<Trophy[]>([]);
  const [familyProfiles, setFamilyProfiles] = useState<Record<string, string>>(
    {},
  );
  const [notifications, setNotifications] = useState<FamilyNotification[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const [notifPermission, setNotifPermission] =
    useState<NotificationPermission>("default");
  const [dbError, setDbError] = useState<string | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [globalSearchQuery, setGlobalSearchQuery] = useState("");
  const [selectedSearchTask, setSelectedSearchTask] = useState<Task | null>(
    null,
  );

  const [isEditingFamilyName, setIsEditingFamilyName] = useState(false);
  const [newFamilyName, setNewFamilyName] = useState("");

  const [isEditingHqName, setIsEditingHqName] = useState(false);
  const [newHqName, setNewHqName] = useState("");

  const [completedSearch, setCompletedSearch] = useState("");
  const [completedFilterCategory, setCompletedFilterCategory] = useState("All");
  const [completedFilterAssignee, setCompletedFilterAssignee] = useState("All");
  const [completedSortOrder, setCompletedSortOrder] = useState<
    "newest" | "oldest"
  >("newest");

  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", taskId);
    setDraggedTaskId(taskId);
  };

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (draggedTaskId === targetId) return;
    setDropTargetId(targetId);
  };

  const handleDragLeave = () => {
    setDropTargetId(null);
  };

  const handleDrop = async (
    e: React.DragEvent,
    targetTaskId: string,
    visibleTasks: Task[],
  ) => {
    e.preventDefault();
    const sourceTaskId = e.dataTransfer.getData("text/plain") || draggedTaskId;
    setDraggedTaskId(null);
    setDropTargetId(null);

    if (!sourceTaskId || sourceTaskId === targetTaskId) return;

    const sourceIdx = visibleTasks.findIndex((t) => t.id === sourceTaskId);
    const targetIdx = visibleTasks.findIndex((t) => t.id === targetTaskId);
    if (sourceIdx === -1 || targetIdx === -1) return;

    const reordered = [...visibleTasks];
    const [draggedItem] = reordered.splice(sourceIdx, 1);
    reordered.splice(targetIdx, 0, draggedItem);

    try {
      const promises = reordered.map((task, idx) => {
        return updateDoc(doc(db, "tasks", task.id), {
          order: idx,
        });
      });
      await Promise.all(promises);
    } catch (err) {
      console.error("Error updating tasks order:", err);
    }
  };

  useEffect(() => {
    if (!family) return;

    const tasksPath = "tasks";
    const qTasks = query(
      collection(db, "tasks"),
      where("familyId", "==", family.id),
    );
    const unsubTasks = onSnapshot(
      qTasks,
      (snap) => {
        const fetchedTasks = snap.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() }) as Task,
        );
        // Sort in-memory with order preference
        fetchedTasks.sort((a, b) => {
          const orderA =
            a.order !== undefined ? a.order : Number.MAX_SAFE_INTEGER;
          const orderB =
            b.order !== undefined ? b.order : Number.MAX_SAFE_INTEGER;
          if (orderA !== orderB) {
            return orderA - orderB;
          }
          return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
        });
        setTasks(fetchedTasks);
      },
      (error) => {
        console.error("Dashboard: Tasks listen error", error);
        setDbError("Permission denied reading tasks.");
      },
    );

    const messagesPath = "messages";
    const qMsgs = query(
      collection(db, "messages"),
      where("familyId", "==", family.id),
    );
    const unsubMsgs = onSnapshot(
      qMsgs,
      (snap) => {
        const fetchedMsgs = snap.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() }) as Message,
        );
        // Sort in-memory
        fetchedMsgs.sort(
          (a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0),
        );
        setMessages(fetchedMsgs);
      },
      (error) => {
        console.error("Dashboard: Messages listen error", error);
        setDbError("Permission denied reading messages.");
      },
    );

    const qVacations = query(
      collection(db, "vacations"),
      where("familyId", "==", family.id),
    );
    const unsubVacations = onSnapshot(
      qVacations,
      (snap) => {
        const fetchedVacations = snap.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() }) as Vacation,
        );
        fetchedVacations.sort(
          (a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0),
        );
        setVacations(fetchedVacations);
      },
      (error) => {
        console.error("Dashboard: Vacations listen error", error);
        setDbError("Permission denied reading vacations.");
      },
    );

    const qExpenses = query(
      collection(db, "expenses"),
      where("familyId", "==", family.id),
    );
    const unsubExpenses = onSnapshot(
      qExpenses,
      (snap) => {
        const fetchedExpenses = snap.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() }) as Expense,
        );
        fetchedExpenses.sort(
          (a, b) => (b.date?.seconds || 0) - (a.date?.seconds || 0),
        );
        setExpenses(fetchedExpenses);
      },
      (error) => {
        console.error("Dashboard: Expenses listen error", error);
        setDbError("Permission denied reading expenses.");
      },
    );

    const qPhotos = query(
      collection(db, "photos"),
      where("familyId", "==", family.id),
    );
    const unsubPhotos = onSnapshot(
      qPhotos,
      (snap) => {
        const fetchedPhotos = snap.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() }) as Photo,
        );
        fetchedPhotos.sort(
          (a, b) => (b.date?.seconds || 0) - (a.date?.seconds || 0),
        );
        setPhotos(fetchedPhotos);
      },
      (error) => {
        console.error("Dashboard: Photos listen error", error);
        setDbError("Permission denied reading photos.");
      },
    );

    const qEvents = query(
      collection(db, "events"),
      where("familyId", "==", family.id),
    );
    const unsubEvents = onSnapshot(
      qEvents,
      (snap) => {
        const fetchedEvents = snap.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() }) as CalendarEvent,
        );
        setEvents(fetchedEvents);
      },
      (error) => {
        console.error("Dashboard: Events listen error", error);
      },
    );

    const qTrophies = query(
      collection(db, "trophies"),
      where("familyId", "==", family.id),
    );
    const unsubTrophies = onSnapshot(
      qTrophies,
      (snap) => {
        const fetchedTrophies = snap.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() }) as Trophy,
        );
        fetchedTrophies.sort((a, b) => {
          return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
        });
        setTrophies(fetchedTrophies);
      },
      (error) => {
        console.error("Dashboard: Trophies listen error", error);
      },
    );

    const qUsers = query(
      collection(db, "users"),
      where("familyId", "==", family.id),
    );
    const unsubUsers = onSnapshot(qUsers, (snap) => {
      const profiles: Record<string, string> = {};
      snap.docs.forEach((doc) => {
        const data = doc.data();
        profiles[doc.id] = data.displayName || "Member";
      });
      setFamilyProfiles(profiles);
    });

    const qNotifs = query(
      collection(db, `users/${userData?.uid}/notifications`),
      orderBy("createdAt", "desc"),
    );
    const unsubNotifs = onSnapshot(
      qNotifs,
      (snap) => {
        const fetchedNotifs = snap.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() }) as FamilyNotification,
        );
        setNotifications(fetchedNotifs);

        snap.docChanges().forEach((change) => {
          if (change.type === "added" && !change.doc.data().read) {
            const data = change.doc.data();
            if (Notification.permission === "granted") {
              new Notification(data.title, { body: data.body });
            }
          }
        });
      },
      (error) => {
        console.error("Dashboard: Notifications listen error", error);
      },
    );

    return () => {
      unsubTasks();
      unsubMsgs();
      unsubVacations();
      unsubExpenses();
      unsubPhotos();
      unsubEvents();
      unsubTrophies();
      unsubUsers();
      unsubNotifs();
    };
  }, [family, userData?.uid]);

  useEffect(() => {
    if ("Notification" in window) {
      setNotifPermission(Notification.permission);
    }
  }, []);

  const requestNotifPermission = async () => {
    if ("Notification" in window) {
      const permission = await Notification.requestPermission();
      setNotifPermission(permission);
    }
  };

  const sendNotificationToFamily = async (
    title: string,
    body: string,
    type: FamilyNotification["type"],
  ) => {
    if (!family || !userData) return;

    family.members.forEach(async (memberUid: string) => {
      if (memberUid === userData.uid) return;
      try {
        await addDoc(collection(db, `users/${memberUid}/notifications`), {
          title,
          body,
          type,
          read: false,
          createdAt: serverTimestamp(),
        });
      } catch (e) {
        console.error("Error sending notification", e);
      }
    });
  };

  const markAllRead = async () => {
    if (!userData) return;
    const unread = notifications.filter((n) => !n.read);
    unread.forEach(async (n) => {
      await updateDoc(doc(db, `users/${userData.uid}/notifications`, n.id), {
        read: true,
      });
    });
  };

  const handleAddImage = async (taskId: string, providedUrl?: string) => {
    const url = providedUrl || prompt(t.enterImageUrl);
    if (!url || !family) return;
    await updateDoc(doc(db, "tasks", taskId), {
      attachments: arrayUnion(url),
    });
  };

  const handleAiPrioritizeTasks = async () => {
    const activeTasks = tasks.filter((t) => t.status !== "Completed");
    if (activeTasks.length === 0) {
      alert(
        language === "es"
          ? "No hay tareas activas para priorizar."
          : "No active tasks to prioritize.",
      );
      return;
    }

    setIsPrioritizing(true);
    try {
      const results = await prioritizeTasks(
        activeTasks.map((t) => ({
          id: t.id,
          title: t.title,
          category: t.category,
          dueDate: t.dueDate,
          priority: t.priority,
        })),
      );

      if (results && results.length > 0) {
        let updatedCount = 0;
        await Promise.all(
          results.map(async (item) => {
            const originalTask = tasks.find((t) => t.id === item.id);
            if (originalTask && originalTask.priority !== item.priority) {
              await updateDoc(doc(db, "tasks", item.id), {
                priority: item.priority,
              });
              updatedCount++;
            }
          }),
        );

        if (updatedCount > 0) {
          sendNotificationToFamily(
            language === "es"
              ? "Prioridades Optimizadas ⚡"
              : "Optimal Priorities Set ⚡",
            language === "es"
              ? "La IA ha analizado las fechas de vencimiento y completado el plan de prioridades familiares."
              : "AI analyzed due dates and descriptions to optimize cooperation priorities.",
            "task",
          );
          alert(
            language === "es"
              ? `¡Se han optimizado las prioridades de ${updatedCount} tareas!`
              : `Optimized priorities for ${updatedCount} tasks!`,
          );
        } else {
          alert(
            language === "es"
              ? "Las prioridades de las tareas de la familia ya están optimizadas."
              : "All family tasks are already optimally prioritized!",
          );
        }
      } else {
        alert(
          language === "es"
            ? "La IA no pudo prioritizar las tareas en este momento."
            : "The AI could not prioritize tasks at this moment.",
        );
      }
    } catch (e: any) {
      console.error("AI Prioritize Error:", e);
      alert(
        language === "es"
          ? "Error al contactar con la IA para priorizar."
          : "Failed to consult AI for priority optimization.",
      );
    } finally {
      setIsPrioritizing(false);
    }
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.trim() || !family || !userData) return;

    setIsAiProcessing(true);
    try {
      // Use liveSuggestion hook result if already loaded to avoid duplicate API calls
      const suggestion = liveSuggestion || (await categorizeTask(newTask));

      let computedAssignment = newTaskAssignedTo || null;
      let computedCategory = activeHub;

      if (activeHub.startsWith("member_")) {
        const memberId = activeHub.replace("member_", "");
        const member = customMembers.find((m: any) => m.id === memberId);
        if (member) {
          computedAssignment = member.name;
        }
        computedCategory = suggestion.category || "General";
      } else if (
        activeHub === "Dashboard" ||
        activeHub === "Today" ||
        activeHub === "Papa" ||
        activeHub === "Mama"
      ) {
        computedCategory = suggestion.category || "General";
        if (activeHub === "Papa") computedAssignment = papaName;
        if (activeHub === "Mama") computedAssignment = mamaName;
      }

      const tagsList = newTaskTags
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      const baseDueDateStr =
        activeHub === "Today"
          ? new Date().toISOString()
          : suggestion.dueDate || new Date().toISOString();
      const baseReminderStr = newTaskReminder
        ? new Date(newTaskReminder).toISOString()
        : null;

      if (newTaskIsRecurring && newTaskRecurrenceEndDate) {
        const start = new Date(baseDueDateStr);
        const end = new Date(newTaskRecurrenceEndDate);
        const recurrenceGroupId = Math.random().toString(36).substring(2, 11);

        let currentInstanceDate = new Date(start);
        let safetyCounter = 0;

        while (currentInstanceDate <= end && safetyCounter < 100) {
          safetyCounter++;

          let occurrenceReminderStr = null;
          if (baseReminderStr) {
            const baseReminder = new Date(baseReminderStr);
            const diffMs = baseReminder.getTime() - start.getTime();
            occurrenceReminderStr = new Date(
              currentInstanceDate.getTime() + diffMs,
            ).toISOString();
          }

          await addDoc(collection(db, "tasks"), {
            title: newTask,
            category: computedCategory,
            subCategory: suggestion.subCategory || null,
            priority: suggestion.priority,
            status: "Pending",
            attachments: [],
            creatorId: userData.uid,
            familyId: family.id,
            createdAt: serverTimestamp(),
            dueDate: currentInstanceDate.toISOString(),
            reminderAt: occurrenceReminderStr,
            reminderTriggered: false,
            isRecurring: true,
            recurrenceFrequency: newTaskRecurrenceFrequency,
            recurrenceEndDate: new Date(newTaskRecurrenceEndDate).toISOString(),
            recurrenceGroupId: recurrenceGroupId,
            assignedTo: computedAssignment,
            tags: tagsList,
          });

          if (newTaskRecurrenceFrequency === "daily") {
            currentInstanceDate = addDays(currentInstanceDate, 1);
          } else if (newTaskRecurrenceFrequency === "weekly") {
            currentInstanceDate = addDays(currentInstanceDate, 7);
          } else if (newTaskRecurrenceFrequency === "monthly") {
            currentInstanceDate = addMonths(currentInstanceDate, 1);
          } else {
            break;
          }
        }
      } else {
        await addDoc(collection(db, "tasks"), {
          title: newTask,
          category: computedCategory,
          subCategory: suggestion.subCategory || null,
          priority: suggestion.priority,
          status: "Pending",
          attachments: [],
          creatorId: userData.uid,
          familyId: family.id,
          createdAt: serverTimestamp(),
          dueDate:
            activeHub === "Today"
              ? new Date().toISOString()
              : suggestion.dueDate || null,
          reminderAt: newTaskReminder
            ? new Date(newTaskReminder).toISOString()
            : null,
          reminderTriggered: false,
          assignedTo: computedAssignment,
          tags: tagsList,
        });
      }

      sendNotificationToFamily(
        t.newNotification,
        `${userData.displayName}: ${newTask}`,
        "task",
      );
      setNewTask("");
      setNewTaskReminder("");
      setNewTaskIsRecurring(false);
      setNewTaskRecurrenceEndDate("");
      setNewTaskAssignedTo("");
      setNewTaskTags("");
    } finally {
      setIsAiProcessing(false);
    }
  };

  const handleAddMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !family || !userData) return;

    const content = newMessage.trim();
    setNewMessage("");

    // Vibrate / Playful sticky note colors (Soft palette)
    const softColors = [
      "#FFFAB7",
      "#D0F4DE",
      "#A9DEF9",
      "#E4C1F9",
      "#FFD6FF",
      "#FFCFD2",
    ];
    const randomColor =
      softColors[Math.floor(Math.random() * softColors.length)];

    try {
      // Background AI call to categorize and tag
      const aiSuggestions = await categorizeMessage(content);

      await addDoc(collection(db, "messages"), {
        content,
        authorId: userData.uid,
        authorName: userData.displayName || t.unidentified,
        familyId: family.id,
        color: randomColor,
        category: aiSuggestions.category,
        tags: aiSuggestions.tags,
        createdAt: serverTimestamp(),
      });
      sendNotificationToFamily(
        t.newNotification,
        `${userData.displayName}: ${content}`,
        "message",
      );
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, "messages");
    }
  };

  const handleClearAllCompleted = async () => {
    const completedTasks = tasks.filter((t) => t.status === "Completed");
    if (completedTasks.length === 0) return;

    const confirmClear = window.confirm(
      language === "es"
        ? `¿Estás seguro de que deseas eliminar permanentemente todas las ${completedTasks.length} misiones completadas?`
        : `Are you sure you want to permanently delete all ${completedTasks.length} completed missions?`,
    );

    if (confirmClear) {
      try {
        const batch = writeBatch(db);
        completedTasks.forEach((task) => {
          batch.delete(doc(db, "tasks", task.id));
        });
        await batch.commit();
      } catch (e) {
        handleFirestoreError(e, OperationType.WRITE, "tasks");
      }
    }
  };

  const handleDeleteTask = async (id: string) => {
    const taskToDelete = tasks.find((t) => t.id === id);
    if (taskToDelete?.isRecurring && taskToDelete?.recurrenceGroupId) {
      const deleteSeries = window.confirm(
        language === "es"
          ? "¿Deseas eliminar todas las repeticiones de esta tarea recurrente?"
          : "Do you want to delete all occurrences of this recurring task?",
      );
      if (deleteSeries) {
        try {
          const q = query(
            collection(db, "tasks"),
            where("familyId", "==", family?.id),
            where("recurrenceGroupId", "==", taskToDelete.recurrenceGroupId),
          );
          const snapshot = await getDocs(q);
          const batch = writeBatch(db);
          snapshot.docs.forEach((docSnap) => {
            batch.delete(docSnap.ref);
          });
          await batch.commit();
          return;
        } catch (e) {
          handleFirestoreError(e, OperationType.WRITE, "tasks");
        }
      }
    }
    await deleteDoc(doc(db, "tasks", id));
  };

  const handleStatusChange = async (id: string, status: string) => {
    const updatePayload: any = { status };
    if (status === "Completed") {
      updatePayload.completedAt = new Date().toISOString();
    } else {
      updatePayload.completedAt = null;
    }
    await updateDoc(doc(db, "tasks", id), updatePayload);
  };

  const handleUpdateTitle = async (id: string, title: string) => {
    await updateDoc(doc(db, "tasks", id), { title });
  };

  const handleUpdateReminder = async (
    id: string,
    reminderAt: string | null,
  ) => {
    await updateDoc(doc(db, "tasks", id), {
      reminderAt: reminderAt ? new Date(reminderAt).toISOString() : null,
      reminderTriggered: false,
    });
  };

  const handleUpdateDueDate = async (id: string, dueDate: string | null) => {
    await updateDoc(doc(db, "tasks", id), {
      dueDate: dueDate ? new Date(dueDate).toISOString() : null,
    });
  };

  const handleUpdateAssignment = async (id: string, assignedTo: string) => {
    await updateDoc(doc(db, "tasks", id), {
      assignedTo: assignedTo || null,
    });
  };

  const handleRemoveImage = async (id: string, url: string) => {
    await updateDoc(doc(db, "tasks", id), {
      attachments: arrayRemove(url),
    });
  };

  useEffect(() => {
    if (!family || !userData) return;

    const checkReminders = async () => {
      const now = new Date();
      for (const t of tasks) {
        if (t.reminderAt && !t.reminderTriggered && t.status !== "Completed") {
          const reminderTime = new Date(t.reminderAt);
          if (reminderTime <= now && !triggeredRemindersRef.current.has(t.id)) {
            // Guard locally first
            triggeredRemindersRef.current.add(t.id);
            try {
              // Update firestore first
              await updateDoc(doc(db, "tasks", t.id), {
                reminderTriggered: true,
              });

              const reminderTitle =
                language === "es"
                  ? "Recordatorio de Tarea ⏰"
                  : "Task Reminder ⏰";
              const reminderBody =
                language === "es"
                  ? `Es hora de la tarea: "${t.title}"`
                  : `Time for task: "${t.title}"`;
              await sendNotificationToFamily(
                reminderTitle,
                reminderBody,
                "task",
              );
              console.log(`Triggered reminder for task ${t.id}: ${t.title}`);
            } catch (err) {
              console.error(`Failed to trigger reminder for task ${t.id}`, err);
              triggeredRemindersRef.current.delete(t.id);
            }
          }
        }
      }
    };

    checkReminders();
    const intervalId = setInterval(checkReminders, 15000);

    return () => clearInterval(intervalId);
  }, [tasks, family, userData, language]);

  // Auto-archive completed tasks older than 24 hours
  useEffect(() => {
    if (!family || !tasks || !autoArchiveCompleted) return;

    const runAutoArchive = async () => {
      const now = new Date();
      const archiveThreshold = 24 * 60 * 60 * 1000; // 24 hours in ms
      const toArchiveOrDelete = tasks.filter((t) => {
        if (t.status !== "Completed") return false;

        const completedTime = t.completedAt ? new Date(t.completedAt) : null;
        if (completedTime) {
          return now.getTime() - completedTime.getTime() >= archiveThreshold;
        }

        const fallbackTime = t.createdAt?.seconds
          ? new Date(t.createdAt.seconds * 1000)
          : t.dueDate
            ? new Date(t.dueDate)
            : null;

        if (fallbackTime) {
          return now.getTime() - fallbackTime.getTime() >= archiveThreshold;
        }

        return false;
      });

      if (toArchiveOrDelete.length > 0) {
        try {
          const batch = writeBatch(db);
          toArchiveOrDelete.forEach((task) => {
            batch.delete(doc(db, "tasks", task.id));
          });
          await batch.commit();
          console.log(
            `Auto-archived ${toArchiveOrDelete.length} tasks successfully.`,
          );
        } catch (err) {
          console.error("Failed to auto-archive completed tasks:", err);
        }
      }
    };

    runAutoArchive();
    const intervalId = setInterval(runAutoArchive, 60000); // Check every minute
    return () => clearInterval(intervalId);
  }, [tasks, autoArchiveCompleted, family]);

  const [isFamilyManagerOpen, setIsFamilyManagerOpen] = useState(false);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState("");
  const [newMemName, setNewMemName] = useState("");
  const [newMemRole, setNewMemRole] = useState("");
  const [newMemHideFinance, setNewMemHideFinance] = useState(false);
  const [editHideFinance, setEditHideFinance] = useState(false);
  const [newMemPhoto, setNewMemPhoto] = useState("");
  const [editPhoto, setEditPhoto] = useState("");
  const [newMemBirthdate, setNewMemBirthdate] = useState("");
  const [editBirthdate, setEditBirthdate] = useState("");
  const [newMemAllergies, setNewMemAllergies] = useState("");
  const [editAllergies, setEditAllergies] = useState("");

  const isFinanceRestricted = useMemo(() => {
    if (!family || !userData) return false;
    const restrictedList = family.restrictedFinanceMembers || [];
    const myProfileName = userData.displayName;

    // We check if any restricted profile ID matches the current user's profile
    // 1. Check Papa/Mama
    const pName = family.papaName || (language === "es" ? "Papá" : "Dad");
    const mName = family.mamaName || (language === "es" ? "Mamá" : "Mom");

    if (myProfileName === pName && restrictedList.includes("papa")) return true;
    if (myProfileName === mName && restrictedList.includes("mama")) return true;

    // 2. Check custom members
    if (family.customMembers && Array.isArray(family.customMembers)) {
      const myCustomProfile = family.customMembers.find(
        (m: any) => m.name === myProfileName,
      );
      if (myCustomProfile && restrictedList.includes(myCustomProfile.id))
        return true;
    }

    return false;
  }, [family, userData, language]);

  const customMembers = useMemo(() => {
    if (!family) return [];
    const papaName = family.papaName || (language === "es" ? "Papá" : "Dad");
    const papaRole = family.papaRole || (language === "es" ? "Papá" : "Dad");
    const mamaName = family.mamaName || (language === "es" ? "Mamá" : "Mom");
    const mamaRole = family.mamaRole || (language === "es" ? "Mamá" : "Mom");

    const defaultMembers = [
      {
        id: "papa",
        name: papaName,
        role: papaRole,
        photoURL: family?.papaPhotoURL || "",
        colorTheme: "blue",
        birthdate: family?.papaBirthdate || "",
        allergies: family?.papaAllergies || "",
      },
      {
        id: "mama",
        name: mamaName,
        role: mamaRole,
        photoURL: family?.mamaPhotoURL || "",
        colorTheme: "rose",
        birthdate: family?.mamaBirthdate || "",
        allergies: family?.mamaAllergies || "",
      },
    ];

    if (family.customMembers && Array.isArray(family.customMembers)) {
      return [...defaultMembers, ...family.customMembers];
    }
    return defaultMembers;
  }, [family, language]);

  const papaName = useMemo(
    () => family?.papaName || (language === "es" ? "Papá" : "Dad"),
    [family, language],
  );
  const mamaName = useMemo(
    () => family?.mamaName || (language === "es" ? "Mamá" : "Mom"),
    [family, language],
  );

  const isPapa = (assignee: string | null | undefined) => {
    if (!assignee) return false;
    return assignee === "Papá" || assignee === papaName;
  };

  const isMama = (assignee: string | null | undefined) => {
    if (!assignee) return false;
    return assignee === "Mamá" || assignee === mamaName;
  };

  const handleAddMember = async () => {
    setIsFamilyManagerOpen(true);
  };

  const handleSaveMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!family) return;

    if (editingMemberId) {
      if (!editName.trim() || !editRole.trim()) return;

      const currentRestricted = family.restrictedFinanceMembers || [];
      const updatedRestricted = editHideFinance
        ? currentRestricted.includes(editingMemberId)
          ? currentRestricted
          : [...currentRestricted, editingMemberId]
        : currentRestricted.filter((id) => id !== editingMemberId);

      if (editingMemberId === "papa") {
        try {
          await updateDoc(doc(db, "families", family.id), {
            papaName: editName.trim(),
            papaRole: editRole.trim(),
            restrictedFinanceMembers: updatedRestricted,
            papaPhotoURL: editPhoto,
            papaBirthdate: editBirthdate,
            papaAllergies: editAllergies,
          });
          setEditingMemberId(null);
          setEditName("");
          setEditRole("");
          setEditPhoto("");
          setEditBirthdate("");
          setEditAllergies("");
          setEditHideFinance(false);
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, "families");
        }
        return;
      }

      if (editingMemberId === "mama") {
        try {
          await updateDoc(doc(db, "families", family.id), {
            mamaName: editName.trim(),
            mamaRole: editRole.trim(),
            restrictedFinanceMembers: updatedRestricted,
            mamaPhotoURL: editPhoto,
            mamaBirthdate: editBirthdate,
            mamaAllergies: editAllergies,
          });
          setEditingMemberId(null);
          setEditName("");
          setEditRole("");
          setEditPhoto("");
          setEditBirthdate("");
          setEditAllergies("");
          setEditHideFinance(false);
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, "families");
        }
        return;
      }

      const currentList =
        family.customMembers && Array.isArray(family.customMembers)
          ? family.customMembers
          : [];
      const updated = currentList.map((m) => {
        if (m.id === editingMemberId) {
          return {
            ...m,
            name: editName.trim(),
            role: editRole.trim(),
            photoURL: editPhoto,
            birthdate: editBirthdate,
            allergies: editAllergies,
          };
        }
        return m;
      });

      try {
        await updateDoc(doc(db, "families", family.id), {
          customMembers: updated,
          restrictedFinanceMembers: updatedRestricted,
        });
        setEditingMemberId(null);
        setEditName("");
        setEditRole("");
        setEditPhoto("");
        setEditBirthdate("");
        setEditAllergies("");
        setEditHideFinance(false);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, "families");
      }
    } else {
      if (!newMemName.trim() || !newMemRole.trim()) return;

      const currentList =
        family.customMembers && Array.isArray(family.customMembers)
          ? family.customMembers
          : [];
      let nextColor = "emerald";
      const colors = ["emerald", "amber", "purple", "indigo", "orange", "teal"];
      nextColor = colors[currentList.length % colors.length];

      const newId = `member_${Date.now()}`;
      const newMember = {
        id: newId,
        name: newMemName.trim(),
        role: newMemRole.trim(),
        photoURL: newMemPhoto,
        colorTheme: nextColor,
        birthdate: newMemBirthdate,
        allergies: newMemAllergies,
      };

      const currentRestricted = family.restrictedFinanceMembers || [];
      const updatedRestricted = newMemHideFinance
        ? [...currentRestricted, newId]
        : currentRestricted;

      try {
        await updateDoc(doc(db, "families", family.id), {
          customMembers: [...currentList, newMember],
          restrictedFinanceMembers: updatedRestricted,
        });
        setNewMemName("");
        setNewMemRole("");
        setNewMemPhoto("");
        setNewMemBirthdate("");
        setNewMemAllergies("");
        setNewMemHideFinance(false);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, "families");
      }
    }
  };

  const handleDeleteMember = async (memberId: string) => {
    if (!family) return;
    if (memberId === "papa" || memberId === "mama") {
      alert(
        language === "es"
          ? "No se puede eliminar a los fundadores predeterminados."
          : "Can't delete default founders.",
      );
      return;
    }

    const confirmMsg =
      language === "es"
        ? `¿Estás seguro de que deseas eliminar a este familiar?`
        : "Are you sure you want to remove this family member?";

    if (!window.confirm(confirmMsg)) return;

    const currentList =
      family.customMembers && Array.isArray(family.customMembers)
        ? family.customMembers
        : [];
    const updated = currentList.filter((m) => m.id !== memberId);

    try {
      await updateDoc(doc(db, "families", family.id), {
        customMembers: updated,
      });
      if (editingMemberId === memberId) {
        setEditingMemberId(null);
        setEditName("");
        setEditRole("");
        setEditPhoto("");
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, "families");
    }
  };

  const handleUpdateFamilyName = async () => {
    if (!newFamilyName.trim() || !family) return;
    try {
      await updateDoc(doc(db, "families", family.id), {
        name: newFamilyName.trim(),
      });
      setIsEditingFamilyName(false);
      await sendNotificationToFamily(
        language === "es"
          ? "🏠 Nombre del Family Hub actualizado"
          : "🏠 Family Hub name updated",
        language === "es"
          ? `El nuevo nombre de la familia es "${newFamilyName.trim()}"`
          : `The new family name is "${newFamilyName.trim()}"`,
        "system",
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, "families");
    }
  };

  const handleUpdateHqName = async () => {
    if (!newHqName.trim() || !family) return;
    try {
      await updateDoc(doc(db, "families", family.id), {
        hqName: newHqName.trim(),
      });
      setIsEditingHqName(false);
      await sendNotificationToFamily(
        language === "es"
          ? "🚀 Nombre HQ de la familia actualizado"
          : "🚀 Family HQ name updated",
        language === "es"
          ? `El nuevo nombre del cuartel general HQ es "${newHqName.trim()}"`
          : `The new HQ name is "${newHqName.trim()}"`,
        "system",
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, "families");
    }
  };

  const handleAwardTrophy = async (
    title: string,
    description: string,
    category: "custom",
    userId: string,
    icon: string,
  ) => {
    if (!family || !userData) return;
    try {
      const userDisplayName = familyProfiles[userId] || "Member";
      const newTrophy = {
        title,
        description,
        category,
        userId,
        familyId: family.id,
        userDisplayName,
        createdAt: serverTimestamp(),
        icon,
      };
      await addDoc(collection(db, "trophies"), newTrophy);

      await sendNotificationToFamily(
        language === "es"
          ? "🏆 ¡Nuevo trofeo otorgado!"
          : "🏆 Custom Trophy Awarded!",
        language === "es"
          ? `${userDisplayName} ha recibido el trofeo especial: "${title}"`
          : `${userDisplayName} has been awarded a special trophy: "${title}"`,
        "system",
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, "trophies");
    }
  };

  const handleDeleteTrophy = async (id: string) => {
    try {
      await deleteDoc(doc(db, "trophies", id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `trophies/${id}`);
    }
  };

  const isUserAssignee = (assignee: any, memberId: string) => {
    if (!assignee) return false;
    const profileName = familyProfiles[memberId];
    if (profileName) {
      const pLower = profileName.toLowerCase();
      if (pLower === "papá" || pLower === "papa") {
        return (
          assignee === "Papá" ||
          assignee === "papa" ||
          assignee.toLowerCase() === "papa" ||
          assignee === memberId
        );
      }
      if (pLower === "mamá" || pLower === "mama") {
        return (
          assignee === "Mamá" ||
          assignee === "mama" ||
          assignee.toLowerCase() === "mama" ||
          assignee === memberId
        );
      }
      return assignee === profileName || assignee === memberId;
    }
    return assignee === memberId;
  };

  useEffect(() => {
    if (!family || !userData || trophies === undefined) return;
    if (
      tasks.length === 0 &&
      expenses.length === 0 &&
      messages.length === 0 &&
      photos.length === 0
    )
      return;

    const awardAutoTrophy = async (
      title: string,
      description: string,
      category: "tasks" | "expenses" | "messages" | "moods" | "photos",
      userId: string,
      criteriaId: string,
      icon: string,
    ) => {
      if (
        trophies.some(
          (t) => t.userId === userId && t.earnedCriteria === criteriaId,
        )
      ) {
        return;
      }

      try {
        const userDisplayName = familyProfiles[userId] || "Member";
        const newTrophy = {
          title,
          description,
          category,
          userId,
          familyId: family.id,
          userDisplayName,
          createdAt: serverTimestamp(),
          icon,
          earnedCriteria: criteriaId,
        };
        await addDoc(collection(db, "trophies"), newTrophy);

        await sendNotificationToFamily(
          language === "es"
            ? "🏆 ¡Hito Desbloqueado!"
            : "🏆 Milestone Unlocked!",
          language === "es"
            ? `¡${userDisplayName} ha ganado el trofeo "${title}"!`
            : `${userDisplayName} unlocked the "${title}" trophy!`,
          "system",
        );
      } catch (err) {
        console.error("Error auto-awarding trophy:", err);
      }
    };

    family.members.forEach((memberId: string) => {
      const completedTasksCount = tasks.filter(
        (t) =>
          t.status === "Completed" && isUserAssignee(t.assignedTo, memberId),
      ).length;

      if (completedTasksCount >= 1) {
        awardAutoTrophy(
          language === "es" ? "Primer Logro" : "First Achievement",
          language === "es"
            ? "Completó su primera tarea familiar."
            : "Completed their very first family task.",
          "tasks",
          memberId,
          "tasks_1",
          "⭐️",
        );
      }
      if (completedTasksCount >= 5) {
        awardAutoTrophy(
          language === "es" ? "Campeón de Tareas" : "Task Champion",
          language === "es"
            ? "Completó 5 tareas familiares con éxito."
            : "Successfully completed 5 family tasks.",
          "tasks",
          memberId,
          "tasks_5",
          "🥉",
        );
      }
      if (completedTasksCount >= 15) {
        awardAutoTrophy(
          language === "es" ? "Leyenda del Hogar" : "Household Legend",
          language === "es"
            ? "Completó 15 tareas en el hogar."
            : "Successfully completed 15 tasks for the family.",
          "tasks",
          memberId,
          "tasks_15",
          "🥈",
        );
      }
      if (completedTasksCount >= 30) {
        awardAutoTrophy(
          language === "es" ? "Héroe Supremo" : "Supreme Household Hero",
          language === "es"
            ? "¡Un nivel de apoyo legendario con 30 tareas!"
            : "An incredible milestone level of support with 30 tasks completed!",
          "tasks",
          memberId,
          "tasks_30",
          "👑",
        );
      }

      const expensesCount = expenses.filter(
        (e) => e.authorId === memberId,
      ).length;
      if (expensesCount >= 1) {
        awardAutoTrophy(
          language === "es" ? "Contable Junior" : "Junior Accountant",
          language === "es"
            ? "Registró su primer gasto familiar."
            : "Registered their first family expense.",
          "expenses",
          memberId,
          "expenses_1",
          "💸",
        );
      }
      if (expensesCount >= 10) {
        awardAutoTrophy(
          language === "es" ? "Gurú Financiero" : "Financial Guru",
          language === "es"
            ? "Ha contribuido con un seguimiento riguroso de 10 gastos."
            : "Contributed track record of 10 expenses.",
          "expenses",
          memberId,
          "expenses_10",
          "💳",
        );
      }

      const messagesCount = messages.filter(
        (m) => m.authorId === memberId,
      ).length;
      if (messagesCount >= 5) {
        awardAutoTrophy(
          language === "es" ? "Mente Conectada" : "Social Butterfly",
          language === "es"
            ? "Dejó 5 notas o anuncios útiles en el muro familiar."
            : "Posted 5 active notes on the family message board.",
          "messages",
          memberId,
          "messages_5",
          "💬",
        );
      }

      const photosCount = photos.filter((p) => p.authorId === memberId).length;
      if (photosCount >= 3) {
        awardAutoTrophy(
          language === "es" ? "Cronista del Álbum" : "Album Historian",
          language === "es"
            ? "Añadió 3 fotos memorables al álbum familiar."
            : "Added 3 memorable photographs to the family album.",
          "photos",
          memberId,
          "photos_3",
          "📷",
        );
      }
    });
  }, [
    family,
    userData,
    tasks,
    expenses,
    messages,
    photos,
    trophies,
    familyProfiles,
    language,
  ]);

  const fetchGroceries = async () => {
    if (tasks.length === 0) return;
    const shoppingTasks = tasks
      .filter((t) => t.category === "Shopping")
      .map((t) => t.title);
    const suggestions = await getGroceriesSuggestions(shoppingTasks);
    setGroceries(suggestions);
  };

  const [viewMode, setViewMode] = useState<"bento" | "linear" | "calendar">(
    "bento",
  );
  const [theme, setTheme] = useState<
    | "aura"
    | "paper"
    | "nordic"
    | "cosmos"
    | "earth"
    | "fresh"
    | "rose"
    | "sunny"
  >(() => {
    // Usar directamente el tema de Firestore si ya fue cargado por useFamily()
    const dbTheme = userData?.theme;
    if (dbTheme && [
      "aura",
      "paper",
      "nordic",
      "cosmos",
      "earth",
      "fresh",
      "rose",
      "sunny",
    ].includes(dbTheme)) {
      return dbTheme as any;
    }
    const saved = localStorage.getItem("theme") as any;
    return [
      "aura",
      "paper",
      "nordic",
      "cosmos",
      "earth",
      "fresh",
      "rose",
      "sunny",
    ].includes(saved)
      ? saved
      : "fresh";
  });

  const lastLocalWriteRef = useRef<number>(0);

  const handleThemeChange = (newTheme: any) => {
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    lastLocalWriteRef.current = Date.now();
    if (userData?.uid) {
      updateDoc(doc(db, "users", userData.uid), {
        theme: newTheme,
      }).catch((err) => {
        console.error("Error saving theme preference to Firestore:", err);
      });
    }
  };

  useEffect(() => {
    // Si cambiamos el tema localmente hace menos de 5 segundos, protegemos el estado local de rebotes
    // de Firestore (evita que la latencia, cache o snapshots pendientes reviertan el tema)
    if (Date.now() - lastLocalWriteRef.current < 5000) {
      return;
    }

    if (
      userData?.theme &&
      [
        "aura",
        "paper",
        "nordic",
        "cosmos",
        "earth",
        "fresh",
        "rose",
        "sunny",
      ].includes(userData.theme)
    ) {
      if (userData.theme !== theme) {
        setTheme(userData.theme as any);
        localStorage.setItem("theme", userData.theme);
      }
    }
  }, [userData?.theme, theme]);
  const [activeHub, setActiveHub] = useState<string>(() => {
    const saved = localStorage.getItem("activeHub");
    return saved || "Dashboard";
  });

  useEffect(() => {
    localStorage.setItem("activeHub", activeHub);
  }, [activeHub]);

  const [holidays, setHolidays] = useState<{ date: string; name: string }[]>(
    [],
  );

  // Voice Command History tracking states and handlers
  const [voiceHistory, setVoiceHistory] = useState<string[]>(() => {
    const saved = localStorage.getItem("voiceCommandHistory");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed.slice(0, 10);
      } catch (e) {
        console.error(e);
      }
    }
    return [];
  });
  const [isVoiceHistoryOpen, setIsVoiceHistoryOpen] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const addVoiceCommand = (text: string) => {
    if (!text || !text.trim()) return;
    setVoiceHistory((prev) => {
      const cleaned = text.trim();
      const filtered = prev.filter((item) => item !== cleaned);
      const updated = [cleaned, ...filtered].slice(0, 10);
      localStorage.setItem("voiceCommandHistory", JSON.stringify(updated));
      return updated;
    });
  };

  const handleVoiceCommandClick = (text: string, index: number) => {
    // 1. Re-insert into current active newTask input field
    setNewTask(text);
    // 2. Copy to clipboard
    navigator.clipboard.writeText(text).catch((err) => console.error(err));
    // 3. Visual feedback
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  useEffect(() => {
    const handleCapture = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      if (customEvent.detail) {
        addVoiceCommand(customEvent.detail);
      }
    };
    window.addEventListener("voice-input-captured", handleCapture);
    return () => {
      window.removeEventListener("voice-input-captured", handleCapture);
    };
  }, []);

  const [showAvatarModal, setShowAvatarModal] = useState<string | null>(null);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);

  const handleInstallApp = async () => {
    setIsInstallModalOpen(true);
  };

  // States for interactive DiceBear generator and Gemini AI generator
  const [dicebearStyle, setDicebearStyle] = useState<string>("lorelei");
  const [dicebearSeed, setDicebearSeed] = useState<string>("");
  const [aiAvatarPrompt, setAiAvatarPrompt] = useState<string>("");
  const [isGeneratingAiAvatar, setIsGeneratingAiAvatar] =
    useState<boolean>(false);
  const [generatedAiSvg, setGeneratedAiSvg] = useState<string>("");
  const [activeAvatarTab, setActiveAvatarTab] = useState<
    "presets" | "dicebear" | "ai" | "upload"
  >("presets");

  const papaPresets = [
    {
      name: "Casual Papa",
      url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
    },
    {
      name: "Tech Papa",
      url: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
    },
    {
      name: "Bearded Papa",
      url: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
    },
    {
      name: "Sporty Papa",
      url: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
    },
    {
      name: "Classic Papa",
      url: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
    },
    {
      name: "Stylish Papa",
      url: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
    },
  ];

  const mamaPresets = [
    {
      name: "Cheerful Mama",
      url: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
    },
    {
      name: "Warm Mama",
      url: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
    },
    {
      name: "Tech Mama",
      url: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
    },
    {
      name: "Joyful Mama",
      url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
    },
    {
      name: "Creative Mama",
      url: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
    },
    {
      name: "Elegant Mama",
      url: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
    },
  ];

  const kidsAndOtherPresets = [
    {
      name: "Boy 1",
      url: "https://images.unsplash.com/photo-1503919545889-aef636e10ad4?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
    },
    {
      name: "Girl 1",
      url: "https://images.unsplash.com/photo-1517677129300-07b130802f46?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
    },
    {
      name: "Boy 2",
      url: "https://images.unsplash.com/photo-1505373877841-8d25f7d46678?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
    },
    {
      name: "Girl 2",
      url: "https://images.unsplash.com/photo-1519699047748-de8e457a634e?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
    },
    {
      name: "Pet Cat",
      url: "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=256&h=256&q=80",
    },
    {
      name: "Pet Dog",
      url: "https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=256&h=256&q=80",
    },
  ];

  const updateAvatar = async (memberId: string, url: string) => {
    if (!family) return;
    try {
      if (memberId === "papa" || memberId === "mama") {
        const field = memberId === "papa" ? "papaPhotoURL" : "mamaPhotoURL";
        await updateDoc(doc(db, "families", family.id), {
          [field]: url,
        });
      } else {
        const updated = customMembers.map((m) => {
          if (m.id === memberId) {
            return { ...m, photoURL: url };
          }
          return m;
        });
        await updateDoc(doc(db, "families", family.id), {
          customMembers: updated,
        });
      }
      setShowAvatarModal(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, "families");
    }
  };

  const getSelectedMemberDetails = () => {
    if (!showAvatarModal) return null;
    if (showAvatarModal === "papa") {
      return {
        id: "papa",
        name: language === "es" ? "Papá" : "Dad",
        photoURL: family?.papaPhotoURL || "",
        color: "border-indigo-500",
        bg: "bg-indigo-500/20 text-indigo-500",
      };
    }
    if (showAvatarModal === "mama") {
      return {
        id: "mama",
        name: language === "es" ? "Mamá" : "Mom",
        photoURL: family?.mamaPhotoURL || "",
        color: "border-rose-500",
        bg: "bg-rose-500/20 text-rose-500",
      };
    }
    const member = customMembers.find((m) => m.id === showAvatarModal);
    if (member) {
      return {
        id: member.id,
        name: member.name,
        photoURL: member.photoURL || "",
        color: "border-teal-500",
        bg: "bg-teal-500/20 text-teal-500",
      };
    }
    return null;
  };

  const handleGenerateAiAvatar = async () => {
    if (!aiAvatarPrompt.trim()) return;
    setIsGeneratingAiAvatar(true);
    setGeneratedAiSvg("");
    try {
      const svgMarkup = await generateAiAvatar(aiAvatarPrompt);
      setGeneratedAiSvg(svgMarkup);
    } catch (err) {
      console.error(err);
      alert(
        language === "es"
          ? "Error al generar el avatar con IA. Intenta con otro prompt."
          : "Error generating AI avatar. Please try another prompt.",
      );
    } finally {
      setIsGeneratingAiAvatar(false);
    }
  };

  const handleApplyAiAvatar = async () => {
    if (!generatedAiSvg || !showAvatarModal) return;
    try {
      const base64Svg = `data:image/svg+xml;base64,${btoa(encodeURIComponent(generatedAiSvg).replace(/%([0-9A-F]{2})/g, (match, p1) => String.fromCharCode(parseInt(p1, 16))))}`;
      await updateAvatar(showAvatarModal, base64Svg);
      setGeneratedAiSvg("");
      setAiAvatarPrompt("");
    } catch (err) {
      console.error("Failed to encode SVG", err);
    }
  };

  const handleApplyDiceBear = async () => {
    if (!showAvatarModal) return;
    const seed = dicebearSeed.trim() || "avatar";
    const dicebearUrl = `https://api.dicebear.com/7.x/${dicebearStyle}/svg?seed=${encodeURIComponent(seed)}`;
    await updateAvatar(showAvatarModal, dicebearUrl);
    setDicebearSeed("");
  };

  const handleAvatarFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    memberId: string,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1.5 * 1024 * 1024) {
      alert(
        language === "es"
          ? "La imagen es demasiado grande. Por favor, elige una imagen de menos de 1.5MB."
          : "The image is too large. Please choose an image under 1.5MB.",
      );
      return;
    }

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      await updateAvatar(memberId, base64String);
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    const fetchHolidays = async () => {
      try {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        let countryCode = "US";

        if (tz.includes("Madrid")) countryCode = "ES";
        else if (tz.includes("London")) countryCode = "GB";
        else if (tz.includes("Paris")) countryCode = "FR";
        else if (tz.includes("Berlin")) countryCode = "DE";
        else if (tz.includes("Rome")) countryCode = "IT";
        else if (tz.includes("Mexico")) countryCode = "MX";
        else if (tz.includes("Bogota")) countryCode = "CO";
        else if (tz.includes("Buenos_Aires")) countryCode = "AR";
        else if (tz.includes("Sao_Paulo")) countryCode = "BR";

        const year = new Date().getFullYear();
        const res = await fetch(
          `https://date.nager.at/api/v3/PublicHolidays/${year}/${countryCode}`,
        );
        if (res.ok) {
          const data = await res.json();
          setHolidays(
            data.map((h: any) => ({
              date: h.date,
              name: h.localName || h.name,
            })),
          );
        } else {
          console.warn(
            `Holidays not available for ${countryCode} using Nager.at API`,
          );
        }
      } catch (err) {
        // Silently fail but log for dev, preventing global fetch error from bothering user too much
        console.log("Skipping holiday fetch due to connectivity or API limit");
      }
    };
    fetchHolidays();
  }, []);

  const themes = {
    aura: {
      bg: "bg-gradient-to-br from-[#0c0a21] via-[#09090c] to-[#04040a]",
      sidebar: "bg-[#13131A]/80 border-r border-[#222230]/70 backdrop-blur-md",
      card: "bg-[#18181B]/85 border-[#27272A]/70 shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-md",
      text: "text-zinc-100",
      accent: "#6366F1",
      header: "text-white font-black tracking-tighter",
    },
    paper: {
      bg: "bg-gradient-to-br from-[#FAF9F6] via-[#FAF9F6] to-[#ECE6D9]",
      sidebar: "bg-[#F2ECE0]/90 border-r border-[#DECDB3] backdrop-blur-md",
      card: "bg-white/95 border-zinc-200 shadow-md backdrop-blur-md",
      text: "text-zinc-900",
      accent: "#18181B",
      header: "text-zinc-950 font-serif italic font-bold",
    },
    nordic: {
      bg: "bg-gradient-to-br from-[#F4F7FB] via-[#E9EEF4] to-[#C9D6E5]",
      sidebar: "bg-[#DCE5EF]/90 border-r border-[#CAD7E8] backdrop-blur-md",
      card: "bg-white/95 border-[#CAD7E8]/70 shadow-[0_8px_32px_rgba(0,0,0,0.03)] backdrop-blur-md",
      text: "text-slate-800",
      accent: "#3B82F6",
      header: "text-slate-900 font-bold tracking-tight",
    },
    fresh: {
      bg: "bg-gradient-to-br from-[#f2f9f5] via-[#ebf4f0] to-[#cfe4da]",
      sidebar: "bg-[#E2EAE6]/90 border-r border-[#CCD9D2] backdrop-blur-md",
      card: "bg-white/95 border-slate-100 shadow-[0_8px_32px_rgba(16,185,129,0.04)] backdrop-blur-md",
      text: "text-slate-700",
      accent: "#10B981",
      header: "text-slate-950 font-black",
    },
    cosmos: {
      bg: "bg-[#020617] bg-[radial-gradient(ellipse_at_top_right,_#311042_0%,_#0f0b2f_40%,_#020617_100%)]",
      sidebar: "bg-[#0B1026]/85 border-r border-[#232450]/70 backdrop-blur-md",
      card: "bg-[#1e293b]/40 border-white/10 shadow-2xl backdrop-blur-md",
      text: "text-zinc-200",
      accent: "#F97316",
      header:
        "text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-rose-400 font-extrabold tracking-tighter",
    },
    earth: {
      bg: "bg-gradient-to-br from-[#FCFAF8] via-[#EFEBDF] to-[#DECBB4]",
      sidebar: "bg-[#EFEAE4]/90 border-r border-[#DDD3C7] backdrop-blur-md",
      card: "bg-[#FFFFFF]/95 border-[#DDD3C7]/80 shadow-sm backdrop-blur-md",
      text: "text-[#4A453E]",
      accent: "#8B735B",
      header: "text-[#4A453E] font-black",
    },
    rose: {
      bg: "bg-gradient-to-br from-[#FFF0F2] via-[#FFE4E6] to-[#FBCFE8]",
      sidebar: "bg-[#FFE4E6]/90 border-r border-[#FDA4AF] backdrop-blur-md",
      card: "bg-white/95 border-[#FECDD3]/85 shadow-[0_8px_32px_rgba(225,29,72,0.04)] backdrop-blur-md",
      text: "text-[#881133]",
      accent: "#E11D48",
      header: "text-[#9F1239] font-black tracking-tighter",
    },
    sunny: {
      bg: "bg-gradient-to-br from-[#FFFDF5] via-[#FEF3C7] to-[#FCE78D]",
      sidebar: "bg-[#FEF3C7]/90 border-r border-[#FCD34D] backdrop-blur-md",
      card: "bg-white/95 border-[#FDE68A]/85 shadow-[0_8px_32px_rgba(217,119,6,0.04)] backdrop-blur-md",
      text: "text-[#78350F]",
      accent: "#D97706",
      header: "text-[#78350F] font-black tracking-tighter",
    },
  };

  const currentTheme = themes[theme];
  const isDark = theme === "aura" || theme === "cosmos";

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDark]);

  const upcomingTasks = tasks.filter(
    (t) => t.status !== "Completed" && t.category !== "Shopping",
  );
  const completedMissions = tasks.filter(
    (t) => t.status === "Completed",
  ).length;
  const completionRate =
    tasks.length > 0 ? Math.round((completedMissions / tasks.length) * 100) : 0;

  const hubs = (
    [
      { id: "Dashboard", label: t.dashboard, icon: LayoutList },
      { id: "Today", label: t.today, icon: Sun },
      { id: "Papa", label: papaName, icon: User },
      { id: "Mama", label: mamaName, icon: Heart },
      { id: "Shopping", label: t.shopping, icon: ShoppingCart },
      { id: "School", label: t.school, icon: GraduationCap },
      { id: "Health", label: t.health, icon: Stethoscope },
      { id: "Vacation", label: t.vacation, icon: Palmtree },
      { id: "Travel", label: t.travel, icon: Plane },
      { id: "Celebration", label: t.celebration, icon: Gift },
      { id: "Calendar", label: t.calendar, icon: Calendar },
      { id: "Finance", label: t.finance, icon: DollarSign },
      { id: "Album", label: t.album, icon: Camera },
      {
        id: "Trophies",
        label: language === "es" ? "Trofeos" : "Trophies",
        icon: Trophy,
      },
      {
        id: "Completed",
        label: language === "es" ? "Completadas" : "Completed",
        icon: CheckCircle2,
      },
    ] as const
  ).filter((hub) => {
    if (hub.id === "Finance" && isFinanceRestricted) return false;
    return true;
  });

  const filteredTasks =
    activeHub === "Dashboard"
      ? tasks
      : activeHub === "Today"
        ? tasks.filter(
            (t) =>
              t.dueDate &&
              format(new Date(t.dueDate), "yyyy-MM-dd") ===
                format(new Date(), "yyyy-MM-dd"),
          )
        : activeHub === "Papa"
          ? tasks.filter((t) => isPapa(t.assignedTo))
          : activeHub === "Mama"
            ? tasks.filter((t) => isMama(t.assignedTo))
            : activeHub === "Completed"
              ? tasks.filter((t) => t.status === "Completed")
              : tasks.filter((t) => t.category === activeHub);

  return (
    <div
      className={`relative flex min-h-screen ${currentTheme.bg} ${currentTheme.text} font-sans transition-colors duration-500 overflow-hidden`}
    >
      {/* Dynamic Ambient Blur Blobs for custom visual appeal */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div
          className="absolute w-[45rem] h-[45rem] rounded-full blur-[130px] opacity-[0.22] dark:opacity-[0.15] -top-[15rem] -left-[15rem] transition-colors duration-1000"
          style={{ backgroundColor: currentTheme.accent }}
        />
        <div
          className="absolute w-[35rem] h-[35rem] rounded-full blur-[110px] opacity-[0.18] dark:opacity-[0.12] bottom-[5rem] -right-[5rem] transition-colors duration-1000"
          style={{ backgroundColor: currentTheme.accent }}
        />
        <div
          className="absolute w-[30rem] h-[30rem] rounded-full blur-[120px] opacity-[0.15] dark:opacity-[0.10] top-[40%] left-[60%] -translate-x-1/2 transition-colors duration-1000"
          style={{ backgroundColor: isDark ? "#A78BFA" : "#60A5FA" }}
        />
      </div>

      {/* Sidebar Navigation */}
      <aside
        className={`${isSidebarCollapsed ? "w-20" : "w-64"} hidden lg:flex flex-col flex-shrink-0 ${currentTheme.sidebar} sticky top-0 h-screen z-20 transition-all duration-300 ease-in-out`}
      >
        <div className="p-8 flex items-center justify-between">
         {family?.id && !isSidebarCollapsed && (
  <div className={`mx-2 mb-3 p-3 rounded-2xl border flex items-center justify-between gap-2 ${isDark ? "bg-indigo-500/10 border-indigo-500/20" : "bg-indigo-50 border-indigo-100"}`}>
    <div className="min-w-0 flex-1">
      <p className={`text-[9px] font-black uppercase tracking-wider mb-0.5 ${isDark ? "text-indigo-400" : "text-indigo-500"}`}>
        {language === "es" ? "Código Familiar" : "Family Code"}
      </p>
      <p className={`text-[10px] font-mono font-bold truncate ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>
        {family.id}
      </p>
    </div>
    <button
      onClick={() => {
        navigator.clipboard.writeText(family.id);
        alert(language === "es" ? "¡Código copiado!" : "Code copied!");
      }}
      className="shrink-0 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider bg-indigo-500 text-white hover:bg-indigo-400 active:scale-95 transition-all flex items-center gap-1.5"
    >
      <Clipboard size={12} />
      <span>{language === "es" ? "Copiar" : "Copy"}</span>
    </button>
  </div>
)}

{!isSidebarCollapsed && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {isEditingHqName ? (
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={newHqName}
                    onChange={(e) => setNewHqName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleUpdateHqName();
                      if (e.key === "Escape") setIsEditingHqName(false);
                    }}
                    className={`text-xl px-2 py-0.5 rounded border outline-none font-black max-w-[130px] ${
                      isDark
                        ? "bg-zinc-800 border-white/10 text-white focus:border-amber-500/50"
                        : "bg-black/5 border-black/5 text-zinc-900 focus:border-amber-500/50"
                    }`}
                    autoFocus
                  />
                  <button
                    onClick={handleUpdateHqName}
                    className="p-1 rounded bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500/30 transition-colors"
                    title={language === "es" ? "Guardar" : "Save"}
                  >
                    <Check size={10} />
                  </button>
                  <button
                    onClick={() => {
                      setIsEditingHqName(false);
                    }}
                    className="p-1 rounded bg-rose-500/20 text-rose-500 hover:bg-rose-500/30 transition-colors"
                    title={language === "es" ? "Cancelar" : "Cancel"}
                  >
                    <X size={10} />
                  </button>
                </div>
              ) : (
                <h1
                  onClick={() => {
                    setNewHqName(family?.hqName || "ParrHQ");
                    setIsEditingHqName(true);
                  }}
                  className={`text-2xl font-black tracking-tight cursor-pointer hover:opacity-80 transition-opacity flex items-center gap-1.5 group ${currentTheme.header}`}
                  title={
                    language === "es"
                      ? "Haga clic para editar nombre del HQ"
                      : "Click to edit HQ name"
                  }
                >
                  <span>{family?.hqName || "ParrHQ"}</span>
                  <Edit3
                    size={12}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-amber-500 shrink-0"
                  />
                </h1>
              )}
              {isEditingFamilyName ? (
                <div className="flex items-center gap-1.5 mt-1">
                  <input
                    type="text"
                    value={newFamilyName}
                    onChange={(e) => setNewFamilyName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleUpdateFamilyName();
                      if (e.key === "Escape") setIsEditingFamilyName(false);
                    }}
                    className={`text-xs px-2 py-0.5 rounded border outline-none font-bold max-w-[120px] ${
                      isDark
                        ? "bg-zinc-800 border-white/10 text-white focus:border-amber-500/50"
                        : "bg-black/5 border-black/5 text-zinc-900 focus:border-amber-500/50"
                    }`}
                    autoFocus
                  />
                  <button
                    onClick={handleUpdateFamilyName}
                    className="p-1 rounded bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500/30 transition-colors"
                    title={language === "es" ? "Guardar" : "Save"}
                  >
                    <Check size={10} />
                  </button>
                  <button
                    onClick={() => {
                      setIsEditingFamilyName(false);
                    }}
                    className="p-1 rounded bg-rose-500/20 text-rose-500 hover:bg-rose-500/30 transition-colors"
                    title={language === "es" ? "Cancelar" : "Cancel"}
                  >
                    <X size={10} />
                  </button>
                </div>
              ) : (
                <p
                  onClick={() => {
                    setNewFamilyName(family?.name || "");
                    setIsEditingFamilyName(true);
                  }}
                  className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-45 mt-1 cursor-pointer hover:opacity-100 transition-opacity flex items-center gap-1 group"
                  title={
                    language === "es"
                      ? "Haga clic para editar nombre de la familia"
                      : "Click to edit family name"
                  }
                >
                  <span>{family?.name || "Family Hub"}</span>
                  <Edit3
                    size={10}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-amber-500 shrink-0"
                  />
                </p>
              )}
            </motion.div>
          )}
          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className={`p-2 rounded-xl transition-all ${isDark ? "hover:bg-white/10" : "hover:bg-black/5"} ${isSidebarCollapsed ? "mx-auto" : ""}`}
          >
            {isSidebarCollapsed ? (
              <ChevronRight size={20} />
            ) : (
              <ChevronLeft size={20} />
            )}
          </button>
        </div>
{family?.id && (
                <div className={`mx-6 mb-4 p-3 rounded-2xl border flex items-center justify-between gap-2 ${isDark ? "bg-indigo-500/10 border-indigo-500/20" : "bg-indigo-50 border-indigo-100"}`}>
                  <div className="min-w-0 flex-1">
                    <p className={`text-[9px] font-black uppercase tracking-wider mb-0.5 ${isDark ? "text-indigo-400" : "text-indigo-500"}`}>
                      {language === "es" ? "Código Familiar" : "Family Code"}
                    </p>
                    <p className={`text-[10px] font-mono font-bold truncate ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>
                      {family.id}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(family.id);
                      alert(language === "es" ? "¡Código copiado!" : "Code copied!");
                    }}
                    className="shrink-0 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider bg-indigo-500 text-white hover:bg-indigo-400 active:scale-95 transition-all flex items-center gap-1.5"
                  >
                    <Clipboard size={12} />
                    <span>{language === "es" ? "Copiar" : "Copy"}</span>
                  </button>
                </div>
              )}
        <nav className="flex-1 px-4 space-y-1 overflow-y-auto custom-scrollbar">
          {hubs.map((hub) => {
            const HubIcon = hub.icon;
            const isActive = activeHub === hub.id;
            return (
              <button
                key={hub.id}
                onClick={() => setActiveHub(hub.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                  isActive
                    ? `bg-zinc-900/5 ${isDark ? "bg-white/10 text-white" : "bg-black/5 text-zinc-900"} font-bold`
                    : `opacity-60 hover:opacity-100 hover:bg-zinc-900/5 ${isDark ? "hover:bg-white/5" : ""}`
                } ${isSidebarCollapsed ? "justify-center" : ""}`}
                title={isSidebarCollapsed ? hub.label : ""}
              >
                <div
                  className={`p-1.5 rounded-lg transition-colors ${isActive ? "bg-white shadow-sm text-zinc-900" : "bg-transparent"}`}
                  style={{ color: isActive ? currentTheme.accent : "" }}
                >
                  <HubIcon size={18} />
                </div>
                {!isSidebarCollapsed && (
                  <motion.span
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="text-xs font-bold tracking-tight"
                  >
                    {hub.label}
                  </motion.span>
                )}
                {isActive && !isSidebarCollapsed && (
                  <motion.div
                    layoutId="active-indicator"
                    className="ml-auto w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: currentTheme.accent }}
                  />
                )}
              </button>
            );
          })}
        </nav>

        <div
          className={`p-6 space-y-4 ${isSidebarCollapsed ? "flex flex-col items-center" : ""}`}
        >
          {!isSidebarCollapsed ? (
            <div className="flex items-center gap-2 px-2 text-xs font-black uppercase tracking-widest">
              {(["es", "en"] as const).map((l) => (
                <button
                  key={l}
                  onClick={() => setLanguage(l)}
                  className={`px-2 transition-all ${language === l ? "opacity-100 underline underline-offset-4 decoration-2" : "opacity-30 hover:opacity-60"}`}
                  style={{ color: language === l ? currentTheme.accent : "" }}
                >
                  {l}
                </button>
              ))}
            </div>
          ) : (
            <button
              onClick={() => setLanguage(language === "en" ? "es" : "en")}
              className="w-10 h-10 rounded-xl bg-black/5 flex items-center justify-center font-black text-[10px]"
            >
              {language.toUpperCase()}
            </button>
          )}

          {/* Family Mini Dock */}
          <div className="py-4 border-t border-black/5 w-full">
            {!isSidebarCollapsed && (
              <p className="text-[9px] font-black uppercase tracking-[0.3em] opacity-40 mb-3 px-2">
                {language === "es" ? "La Familia" : "The Family"}
              </p>
            )}
            <div
              className={`flex ${isSidebarCollapsed ? "flex-col items-center gap-2" : "-space-x-2"}`}
            >
              <div
                className={`w-8 h-8 rounded-full border-2 ${isDark ? "border-slate-800" : "border-white"} bg-zinc-900 text-white flex items-center justify-center font-black text-[10px] shadow-sm relative group cursor-pointer hover:-translate-y-1 transition-all`}
                title={userData?.displayName || "Me"}
                onClick={() => setActiveHub("Dashboard")}
              >
                {userData?.displayName?.slice(0, 1).toUpperCase() || "M"}
                <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-slate-900" />
              </div>
              {customMembers.map((m: any, i: number) => {
                let avatarContent: React.ReactNode = m.name
                  .slice(0, 1)
                  .toUpperCase();
                if (m.photoURL) {
                  avatarContent = (
                    <img
                      src={m.photoURL}
                      alt={m.name}
                      className="w-full h-full rounded-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  );
                }

                return (
                  <div
                    key={m.id}
                    onClick={() => setActiveHub(`member_${m.id}`)}
                    className={`w-8 h-8 rounded-full border-2 ${isDark ? "border-slate-800" : "border-white"} ${isDark ? "bg-white/10" : "bg-slate-200"} flex items-center justify-center font-black text-[10px] shadow-sm hover:-translate-y-1 transition-all cursor-pointer overflow-hidden relative group`}
                    title={`${m.name} (${m.role})`}
                  >
                    {avatarContent}
                  </div>
                );
              })}
              <button
                onClick={() => setIsFamilyManagerOpen(true)}
                className={`w-8 h-8 rounded-full border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400 hover:border-indigo-500 hover:text-indigo-500 transition-all ${isSidebarCollapsed ? "" : "ml-2"}`}
                title={
                  language === "es" ? "Administrar Familia" : "Manage Family"
                }
              >
                <Plus size={14} />
              </button>
            </div>
          </div>

          <div className="w-full">
            <InstallAppButton
              isDark={isDark}
              language={language === "es" ? "es" : "en"}
              variant={isSidebarCollapsed ? "icon" : "sidebar"}
            />
          </div>

          <button
            onClick={logout}
            className={`flex items-center gap-3 rounded-xl opacity-60 hover:opacity-100 hover:bg-rose-500/10 hover:text-rose-500 transition-all ${isSidebarCollapsed ? "p-3 justify-center" : "px-4 py-3 w-full text-[10px] font-black uppercase tracking-widest"}`}
            title={isSidebarCollapsed ? t.signOut : ""}
          >
            <LogOut size={16} />
            {!isSidebarCollapsed && <span>{t.signOut}</span>}
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
            />
            <motion.aside
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -100, opacity: 0 }}
              className={`fixed left-0 top-0 bottom-0 w-72 z-50 flex flex-col ${currentTheme.sidebar} ${currentTheme.text} lg:hidden`}
            >
              <div className="p-8 flex items-center justify-between">
                <div>
                  {isEditingHqName ? (
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={newHqName}
                        onChange={(e) => setNewHqName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleUpdateHqName();
                          if (e.key === "Escape") setIsEditingHqName(false);
                        }}
                        className={`text-xl px-2 py-0.5 rounded border outline-none font-black max-w-[130px] ${
                          isDark
                            ? "bg-zinc-800 border-white/10 text-white focus:border-amber-500/50"
                            : "bg-black/5 border-black/5 text-zinc-900 focus:border-amber-500/50"
                        }`}
                        autoFocus
                      />
                      <button
                        onClick={handleUpdateHqName}
                        className="p-1 rounded bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500/30 transition-colors"
                        title={language === "es" ? "Guardar" : "Save"}
                      >
                        <Check size={10} />
                      </button>
                      <button
                        onClick={() => {
                          setIsEditingHqName(false);
                        }}
                        className="p-1 rounded bg-rose-500/20 text-rose-500 hover:bg-rose-500/30 transition-colors"
                        title={language === "es" ? "Cancelar" : "Cancel"}
                      >
                        <X size={10} />
                      </button>
                    </div>
                  ) : (
                    <h1
                      onClick={() => {
                        setNewHqName(family?.hqName || "ParrHQ");
                        setIsEditingHqName(true);
                      }}
                      className={`text-2xl font-black tracking-tight cursor-pointer hover:opacity-80 transition-opacity flex items-center gap-1.5 group ${currentTheme.header}`}
                      title={
                        language === "es"
                          ? "Haga clic para editar nombre del HQ"
                          : "Click to edit HQ name"
                      }
                    >
                      <span>{family?.hqName || "ParrHQ"}</span>
                      <Edit3
                        size={12}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-amber-500 shrink-0"
                      />
                    </h1>
                  )}
                  {isEditingFamilyName ? (
                    <div className="flex items-center gap-1.5 mt-1">
                      <input
                        type="text"
                        value={newFamilyName}
                        onChange={(e) => setNewFamilyName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleUpdateFamilyName();
                          if (e.key === "Escape") setIsEditingFamilyName(false);
                        }}
                        className={`text-[10px] px-2 py-0.5 rounded border outline-none font-bold max-w-[125px] ${
                          isDark
                            ? "bg-zinc-800 border-white/10 text-white focus:border-amber-500/50"
                            : "bg-black/5 border-black/5 text-zinc-900 focus:border-amber-500/50"
                        }`}
                        autoFocus
                      />
                      <button
                        onClick={handleUpdateFamilyName}
                        className="p-1 rounded bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500/30 transition-colors"
                        title={language === "es" ? "Guardar" : "Save"}
                      >
                        <Check size={10} />
                      </button>
                      <button
                        onClick={() => {
                          setIsEditingFamilyName(false);
                        }}
                        className="p-1 rounded bg-rose-500/20 text-rose-500 hover:bg-rose-500/30 transition-colors"
                        title={language === "es" ? "Cancelar" : "Cancel"}
                      >
                        <X size={10} />
                      </button>
                    </div>
                  ) : (
                    <p
                      onClick={() => {
                        setNewFamilyName(family?.name || "");
                        setIsEditingFamilyName(true);
                      }}
                      className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-45 mt-1 cursor-pointer hover:opacity-100 transition-opacity flex items-center gap-1 group"
                      title={
                        language === "es"
                          ? "Haga clic para editar nombre de la familia"
                          : "Click to edit family name"
                      }
                    >
                      <span>{family?.name || "Family Hub"}</span>
                      <Edit3
                        size={10}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-amber-500 shrink-0"
                      />
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2 opacity-40 hover:opacity-100"
                >
                  <X size={24} />
                </button>
              </div>

              <nav className="flex-1 px-6 space-y-2 overflow-y-auto custom-scrollbar">
                {hubs.map((hub) => {
                  const HubIcon = hub.icon;
                  const isActive = activeHub === hub.id;
                  return (
                    <button
                      key={hub.id}
                      onClick={() => {
                        setActiveHub(hub.id);
                        setIsMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all duration-200 ${
                        isActive
                          ? `bg-zinc-900/5 ${isDark ? "bg-white/10 text-white" : "bg-black/5 text-zinc-900"} font-bold`
                          : `opacity-60 hover:opacity-100`
                      }`}
                    >
                      <HubIcon
                        size={20}
                        style={{ color: isActive ? currentTheme.accent : "" }}
                      />
                      <span className="text-sm font-bold tracking-tight">
                        {hub.label}
                      </span>
                    </button>
                  );
                })}
              </nav>

              <div className="p-8 space-y-4">
                <div className="flex items-center gap-4 px-2 text-xs font-black uppercase tracking-widest">
                  {(["es", "en"] as const).map((l) => (
                    <button
                      key={l}
                      onClick={() => setLanguage(l)}
                      className={`px-3 py-1 rounded-lg transition-all ${language === l ? "bg-zinc-900 text-white" : "opacity-30"}`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
                <div className="w-full">
                  <InstallAppButton
                    isDark={isDark}
                    language={language === "es" ? "es" : "en"}
                    variant="sidebar"
                    onInstallStarted={() => setIsMobileMenuOpen(false)}
                  />
                </div>
                <button
                  onClick={logout}
                  className="w-full flex items-center gap-4 px-6 py-4 rounded-2xl bg-rose-500/10 text-rose-500 font-black text-xs uppercase tracking-widest"
                >
                  <LogOut size={20} />
                  {t.signOut}
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden relative z-10">
        {dbError && (
          <div className="bg-[#FFE5E5] border border-rose-100 text-rose-700 p-4 m-8 rounded-2xl text-xs font-bold flex justify-between items-center shadow-sm">
            <span>⚠️ {dbError}</span>
            <button
              onClick={() => setDbError(null)}
              className="opacity-50 hover:opacity-100 uppercase tracking-widest text-[10px]"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Top Header */}
        <header className="h-20 flex items-center justify-between px-8 bg-transparent shrink-0">
          <div className="flex items-center gap-4 lg:hidden">
            <button
              className="p-2 -ml-2"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu size={24} />
            </button>
            <h1
              className={`text-xl font-black tracking-tight ${currentTheme.header}`}
            >
              {family?.hqName || "ParrHQ"}
            </h1>
          </div>

          <div className="hidden lg:flex flex-col">
            <h2 className="text-xl font-black tracking-tight opacity-90 capitalize">
              {(t as any)[activeHub.toLowerCase()] || activeHub}
            </h2>
            <p className="text-[10px] font-bold uppercase tracking-widest opacity-30">
              {new Date().toLocaleDateString(language, {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </p>
          </div>

          {/* Global Search Bar */}
          <div className="flex-1 max-w-xs md:max-w-md mx-4 relative">
            <div className="relative flex items-center w-full">
              <Search
                size={14}
                className="absolute left-4 opacity-45 pointer-events-none"
              />
              <input
                type="text"
                value={globalSearchQuery}
                onChange={(e) => setGlobalSearchQuery(e.target.value)}
                placeholder={t.searchTasks || "Search all tasks..."}
                className={`w-full pl-10 pr-9 py-2 text-xs rounded-xl outline-none border transition-all ${
                  isDark
                    ? "bg-white/5 border-white/10 focus:border-indigo-500/30 text-white placeholder-white/30"
                    : "bg-black/5 border-black/5 focus:border-indigo-500/20 text-zinc-800 placeholder-zinc-400"
                }`}
              />
              {globalSearchQuery && (
                <button
                  onClick={() => setGlobalSearchQuery("")}
                  className="absolute right-3 p-1 opacity-50 hover:opacity-100 transition-opacity cursor-pointer"
                >
                  <X size={12} className="text-slate-500" />
                </button>
              )}
            </div>

            {/* Search Results Dropdown */}
            <AnimatePresence>
              {globalSearchQuery && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.98 }}
                  transition={{ duration: 0.15 }}
                  className={`${currentTheme.card} absolute top-full right-0 md:left-0 mt-2 w-[300px] sm:w-[400px] max-h-[400px] overflow-y-auto rounded-2xl shadow-2xl p-3 z-50 flex flex-col gap-1.5 border border-black/5 dark:border-white/10 custom-scrollbar`}
                >
                  {(() => {
                    const queryWords = globalSearchQuery
                      .toLowerCase()
                      .split(/\s+/)
                      .filter(Boolean);
                    const matchedTasks = tasks.filter((task) => {
                      const titleMatch = queryWords.every((word) =>
                        task.title?.toLowerCase().includes(word),
                      );
                      return titleMatch;
                    });

                    if (matchedTasks.length === 0) {
                      return (
                        <div className="py-8 text-center">
                          <p className="text-xs font-black uppercase tracking-widest opacity-35">
                            {t.noTasksFound || "No tasks found"}
                          </p>
                        </div>
                      );
                    }

                    return (
                      <div className="flex flex-col gap-1">
                        <div className="px-1.5 pb-2 border-b border-black/5 dark:border-white/5 flex justify-between items-center">
                          <span className="text-[9px] font-black uppercase tracking-widest opacity-40">
                            {language === "es"
                              ? "Resultados de Búsqueda"
                              : "Search Results"}{" "}
                            ({matchedTasks.length})
                          </span>
                        </div>
                        <div className="space-y-1 max-h-[300px] overflow-y-auto pr-1 mt-1 custom-scrollbar">
                          {matchedTasks.map((task) => {
                            const isCompleted = task.status === "Completed";
                            return (
                              <div
                                key={task.id}
                                className={`flex items-center justify-between p-2 rounded-xl transition-all cursor-pointer ${
                                  isDark
                                    ? "hover:bg-white/5"
                                    : "hover:bg-black/5"
                                }`}
                                onClick={() => {
                                  setSelectedSearchTask(task);
                                  setGlobalSearchQuery("");
                                }}
                              >
                                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                  <button
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      await handleStatusChange(
                                        task.id,
                                        isCompleted ? "Pending" : "Completed",
                                      );
                                    }}
                                    className="transition-transform active:scale-90 shrink-0 cursor-pointer p-0.5"
                                  >
                                    {isCompleted ? (
                                      <CheckCircle
                                        className="text-emerald-500 animate-in zoom-in duration-200"
                                        size={15}
                                      />
                                    ) : (
                                      <Circle
                                        className={
                                          isDark
                                            ? "text-zinc-550 hover:text-emerald-500"
                                            : "text-zinc-400 hover:text-emerald-500"
                                        }
                                        size={15}
                                      />
                                    )}
                                  </button>

                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span
                                        className={`text-xs font-bold truncate ${isCompleted ? "line-through opacity-45" : ""}`}
                                      >
                                        {task.title}
                                      </span>
                                      {task.priority &&
                                        task.priority !== "Medium" && (
                                          <span
                                            className={`text-[7px] font-black uppercase tracking-widest px-1 py-0.25 rounded ${
                                              task.priority === "High" ||
                                              task.priority === "Critical"
                                                ? "bg-rose-500/10 text-rose-500"
                                                : "bg-blue-500/10 text-blue-500"
                                            }`}
                                          >
                                            {task.priority}
                                          </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 mt-0.5">
                                      <span className="text-[8px] font-black uppercase tracking-widest opacity-45 bg-black/[0.04] dark:bg-white/5 px-1 py-0.25 rounded-md">
                                        {task.category || "General"}
                                      </span>
                                      {task.assignedTo && (
                                        <span className="text-[8px] opacity-50 font-medium italic">
                                          {language === "es" ? "para " : "for "}
                                          {task.assignedTo}
                                        </span>
                                      )}
                                      {task.dueDate && (
                                        <span className="text-[8px] opacity-40 font-bold flex items-center gap-0.5">
                                          📅{" "}
                                          {new Date(
                                            task.dueDate,
                                          ).toLocaleDateString(
                                            language === "es" ? "es" : "en",
                                            { day: "numeric", month: "short" },
                                          )}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <ChevronRight
                                  size={12}
                                  className="opacity-30 shrink-0"
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="flex items-center gap-4">
            {/* Voice Command History Toggle Button */}
            <button
              onClick={() => setIsVoiceHistoryOpen(!isVoiceHistoryOpen)}
              className={`p-2.5 rounded-xl transition-all relative ${
                isVoiceHistoryOpen
                  ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/20"
                  : isDark
                    ? "bg-white/10 text-zinc-350 hover:bg-white/15 hover:text-white"
                    : "bg-black/5 text-slate-700 hover:bg-black/10"
              }`}
              title={
                language === "es"
                  ? "Historial de comandos de voz"
                  : "Voice command history"
              }
            >
              <History size={18} />
              {voiceHistory.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-emerald-500 text-white rounded-full text-[8px] font-black flex items-center justify-center animate-bounce shadow-md">
                  {voiceHistory.length}
                </span>
              )}
            </button>

            {/* Global Light/Dark Theme Toggle Button */}
            <button
              onClick={() => handleThemeChange(isDark ? "fresh" : "cosmos")}
              className={`p-2.5 rounded-xl transition-all relative ${
                isDark
                  ? "bg-white/10 text-yellow-400 hover:bg-white/15"
                  : "bg-black/5 text-slate-700 hover:bg-black/10"
              }`}
              title={
                language === "es"
                  ? "Alternar modo claro/oscuro"
                  : "Toggle light/dark mode"
              }
            >
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {/* Theme Selector */}
            <div className="relative flex items-center">
              <select
                value={theme}
                onChange={(e) => handleThemeChange(e.target.value as any)}
                className={`text-[11px] font-black uppercase tracking-wider py-2 pl-3 pr-8 rounded-xl border appearance-none outline-none cursor-pointer transition-all ${
                  isDark
                    ? "bg-white/10 text-white border-white/15 hover:bg-white/15"
                    : "bg-black/5 text-zinc-800 border-black/5 hover:bg-black/10"
                }`}
                style={{
                  backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='${isDark ? "white" : "black"}' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='m6 9 6 6 6-6'/></svg>")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 8px center',
                  backgroundSize: '12px'
                }}
                title={language === "es" ? "Cambiar paleta de colores" : "Change color palette"}
              >
                {[
                  { key: "fresh", name: language === "es" ? "🥑 Suave" : "🥑 Fresh" },
                  { key: "nordic", name: language === "es" ? "❄️ Ártico" : "❄️ Nordic" },
                  { key: "paper", name: language === "es" ? "📝 Papel" : "📝 Paper" },
                  { key: "rose", name: language === "es" ? "🌺 Rosado" : "🌺 Rose" },
                  { key: "sunny", name: language === "es" ? "☀️ Soleado" : "☀️ Sunny" },
                  { key: "aura", name: language === "es" ? "⚡ Aura" : "⚡ Aura" },
                  { key: "cosmos", name: language === "es" ? "🌌 Cosmos" : "🌌 Cosmos" },
                  { key: "earth", name: language === "es" ? "🪵 Tierra" : "🪵 Earth" },
                ].map((item) => (
                  <option
                    key={item.key}
                    value={item.key}
                    className={isDark ? "bg-[#18181B] text-white" : "bg-white text-zinc-800"}
                  >
                    {item.name}
                  </option>
                ))}
              </select>
            </div>

            <div
              className={`w-px h-6 mx-2 ${isDark ? "bg-white/10" : "bg-black/5"}`}
            />

            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode("bento")}
                className={`p-2 rounded-lg transition-all ${viewMode === "bento" ? (isDark ? "bg-white/10 text-indigo-400" : "bg-black/5 text-zinc-900") : "opacity-20 hover:opacity-100"}`}
              >
                <Grid size={16} />
              </button>
              <button
                onClick={() => setViewMode("linear")}
                className={`p-2 rounded-lg transition-all ${viewMode === "linear" ? (isDark ? "bg-white/10 text-indigo-400" : "bg-black/5 text-zinc-900") : "opacity-20 hover:opacity-100"}`}
              >
                <LayoutList size={16} />
              </button>
            </div>

            <div className="relative ml-2">
              <button
                onClick={() => setShowNotifs(!showNotifs)}
                className={`p-2.5 rounded-xl transition-all relative ${showNotifs ? "bg-indigo-500 text-white shadow-lg" : "bg-black/5 text-slate-500 hover:bg-black/10"}`}
              >
                <Bell size={18} />
                {notifications.filter((n) => !n.read).length > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full border border-white" />
                )}
              </button>
              <NotificationCenter
                notifications={notifications}
                isOpen={showNotifs}
                onClose={() => setShowNotifs(false)}
                theme={currentTheme}
                language={language}
                markAllRead={markAllRead}
                requestPermission={requestNotifPermission}
                permission={notifPermission}
              />
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-8 pb-12 custom-scrollbar">
          <div className="max-w-7xl mx-auto w-full pt-4">
            {/* Mobile Navigation Hub Strip */}
            <div className="lg:hidden flex gap-2 overflow-x-auto pb-4 mb-4 scrollbar-none snap-x snap-mandatory">
              {hubs.map((hub) => {
                const HubIcon = hub.icon;
                const isActive = activeHub === hub.id;
                return (
                  <button
                    key={hub.id}
                    onClick={() => setActiveHub(hub.id)}
                    className={`flex items-center gap-2 px-5 py-3 rounded-full text-xs font-black uppercase tracking-tight transition-all shrink-0 snap-start ${
                      isActive
                        ? "text-white shadow-md"
                        : `${isDark ? "bg-white/5 opacity-60" : "bg-black/5 opacity-60"}`
                    }`}
                    style={{
                      backgroundColor: isActive
                        ? currentTheme.accent
                        : undefined,
                    }}
                  >
                    <HubIcon size={14} />
                    {hub.label}
                  </button>
                );
              })}
            </div>

            <motion.div
              key={activeHub}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2 }}
              className="w-full"
            >
              {activeHub === "Dashboard" && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  {/* Hero / Welcome & Quick Add */}
                  <div className="lg:col-span-8">
                    <div
                      className={`${currentTheme.card} p-6 sm:p-10 rounded-[2rem] sm:rounded-[3rem] shadow-sm relative overflow-hidden h-full flex flex-col justify-between group`}
                    >
                      <div className="relative z-10">
                        <div className="flex items-center gap-4 mb-4">
                          <motion.div
                            whileHover={{ rotate: 15, scale: 1.1 }}
                            className="w-14 h-14 bg-indigo-500 rounded-2xl flex items-center justify-center text-white shadow-xl shrink-0"
                          >
                            <Sparkles size={28} />
                          </motion.div>
                          <div className="min-w-0 flex-1">
                            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black italic tracking-tighter uppercase leading-tight pb-1 break-words">
                              {t.dashboard_welcome}
                            </h2>
                            <p className="text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] opacity-40 mt-1 break-words leading-normal">
                              {t.missions_overview}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="mt-12 relative z-10">
                        <h3 className="text-[9px] font-black uppercase tracking-[0.3em] opacity-30 mb-4 ml-2">
                          {t.dispatchNewMission}
                        </h3>
                        <form
                          onSubmit={handleAddTask}
                          className="flex flex-col gap-3"
                        >
                          <div className="flex flex-col sm:flex-row gap-3 w-full">
                            <div className="flex-grow flex gap-2 items-center min-w-0">
                              <input
                                value={newTask}
                                onChange={(e) => setNewTask(e.target.value)}
                                placeholder={t.addTodo}
                                className={`w-full min-w-0 ${isDark ? "bg-white/5" : "bg-black/5"} px-5 py-4 sm:px-8 sm:py-6 rounded-xl sm:rounded-[2.5rem] outline-none font-extrabold text-sm sm:text-lg lg:text-xl placeholder:opacity-20 border-2 border-transparent focus:border-indigo-500/20 transition-all shadow-inner`}
                              />
                              <VoiceInputButton
                                value={newTask}
                                onChange={setNewTask}
                                language={language}
                                isDark={isDark}
                                className="shrink-0"
                                onDictationCaptured={addVoiceCommand}
                              />
                            </div>
                            <button
                              type="submit"
                              className="px-5 py-4 sm:px-12 sm:py-6 bg-zinc-900 text-white rounded-xl sm:rounded-[2.5rem] shadow-2xl hover:scale-[1.02] active:scale-95 transition-all font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2"
                              style={{ background: currentTheme.accent }}
                            >
                              <Plus size={18} className="shrink-0" />
                              <span className="truncate">{t.inject}</span>
                            </button>
                          </div>
                          {/* AI Live Categorization Suggestion */}
                          {isLiveCategorizing && (
                            <div className="flex items-center gap-2 text-xs font-bold opacity-60 animate-pulse text-indigo-500 py-1.5 px-3 bg-indigo-500/5 dark:bg-indigo-500/5 rounded-xl w-full">
                              <Sparkles
                                size={14}
                                className="animate-spin text-indigo-400 shrink-0"
                              />
                              <span>
                                {language === "es"
                                  ? "AI analizando detalles de la tarea..."
                                  : "AI analyzing task details..."}
                              </span>
                            </div>
                          )}
                          {!isLiveCategorizing && liveSuggestion && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.98 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className="flex flex-wrap items-center gap-2 p-3 bg-indigo-500/5 dark:bg-indigo-500/10 border border-indigo-505/10 dark:border-indigo-500/25 rounded-xl text-xs font-bold w-full"
                            >
                              <Sparkles
                                size={14}
                                className="text-indigo-500 shrink-0"
                              />
                              <span className="text-zinc-500 dark:text-zinc-400">
                                {language === "es"
                                  ? "Categoría Sugerida:"
                                  : "Suggested Category:"}
                              </span>
                              <span className="px-2.5 py-1 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-800 text-[10px] uppercase font-black tracking-wider">
                                {liveSuggestion.category}
                              </span>
                              {liveSuggestion.subCategory && (
                                <span className="px-2.5 py-1 rounded-lg bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400 border border-purple-200/50 dark:border-purple-800 text-[10px] uppercase font-black tracking-wider">
                                  {liveSuggestion.subCategory}
                                </span>
                              )}
                              <span
                                className={`px-2.5 py-1 rounded-lg text-[10px] uppercase font-black tracking-wider border ${
                                  liveSuggestion.priority === "Critical"
                                    ? "bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-450 border-rose-200/50"
                                    : liveSuggestion.priority === "High"
                                      ? "bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-450 border-amber-200/50"
                                      : "bg-slate-100 dark:bg-slate-800 text-slate-650 dark:text-slate-400 border-zinc-200/50 dark:border-zinc-700"
                                }`}
                              >
                                {liveSuggestion.priority}
                              </span>
                              {liveSuggestion.assignedToSuggestion && (
                                <span className="text-[10px] text-indigo-500 dark:text-indigo-405">
                                  Assigned:{" "}
                                  <strong className="font-extrabold">
                                    {liveSuggestion.assignedToSuggestion}
                                  </strong>
                                </span>
                              )}
                              <span className="text-[10px] opacity-40 ml-auto hidden sm:inline-block font-normal italic text-slate-400">
                                {language === "es"
                                  ? "(Se aplicará automáticamente)"
                                  : "(Will apply automatically)"}
                              </span>
                            </motion.div>
                          )}

                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 xl:grid-cols-4 gap-4 mt-4 bg-black/5 dark:bg-white/5 p-4 rounded-3xl border border-transparent dark:border-white/5">
                            {/* Option 1: Reminder */}
                            <div className="flex flex-col gap-1.5 min-w-0">
                              <span
                                className={`text-[11px] uppercase tracking-wider font-extrabold flex items-center gap-1.5 ${isDark ? "text-zinc-400" : "text-zinc-500"}`}
                              >
                                <Bell
                                  size={13}
                                  className="text-indigo-500 animate-pulse"
                                />
                                {language === "es"
                                  ? "Recordatorio"
                                  : "Reminder"}
                              </span>
                              <div className="flex items-center gap-2">
                                <input
                                  type="datetime-local"
                                  value={newTaskReminder}
                                  onChange={(e) =>
                                    setNewTaskReminder(e.target.value)
                                  }
                                  className={`text-xs px-3 py-2 w-full rounded-xl outline-none font-bold border min-w-0 ${isDark ? "bg-[#18181B] border-white/10 text-white" : "bg-white border-black/5 text-zinc-800"}`}
                                />
                                {newTaskReminder && (
                                  <button
                                    type="button"
                                    onClick={() => setNewTaskReminder("")}
                                    className={`text-[10px] px-2.5 py-2 rounded-xl font-black transition-colors uppercase tracking-[0.05em] border shrink-0 ${isDark ? "bg-white/5 border-white/10 text-white hover:bg-white/10" : "bg-black/5 border-black/5 text-zinc-650 hover:bg-black/10"}`}
                                  >
                                    ✕
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Option 2: Recurring Task */}
                            <div className="flex flex-col gap-1.5 min-w-0">
                              <label
                                className={`flex items-center gap-1.5 text-[11px] uppercase tracking-wider font-extrabold cursor-pointer ${isDark ? "text-zinc-400" : "text-zinc-500"}`}
                              >
                                <input
                                  type="checkbox"
                                  checked={newTaskIsRecurring}
                                  onChange={(e) =>
                                    setNewTaskIsRecurring(e.target.checked)
                                  }
                                  className="w-3.5 h-3.5 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                />
                                <span className="flex items-center gap-1">
                                  <RefreshCw
                                    size={12}
                                    className="text-indigo-500"
                                  />
                                  {language === "es"
                                    ? "Recurrente"
                                    : "Recurring"}
                                </span>
                              </label>
                              <div className="flex flex-wrap items-center gap-1.5 w-full min-h-[34px]">
                                {newTaskIsRecurring ? (
                                  <div className="flex items-center gap-1 w-full min-w-0 animate-in fade-in slide-in-from-left-2 duration-200">
                                    <select
                                      value={newTaskRecurrenceFrequency}
                                      onChange={(e) =>
                                        setNewTaskRecurrenceFrequency(
                                          e.target.value as any,
                                        )
                                      }
                                      className={`text-xs px-2 py-2 rounded-xl outline-none font-bold border min-w-0 shrink bg-transparent ${isDark ? "border-white/10 text-white bg-[#18181B]" : "border-black/5 text-zinc-805 bg-white"}`}
                                    >
                                      <option value="daily" className={isDark ? "bg-[#18181B] text-white" : "bg-white text-zinc-850"}>
                                        {language === "es" ? "Diario" : "Daily"}
                                      </option>
                                      <option value="weekly" className={isDark ? "bg-[#18181B] text-white" : "bg-white text-zinc-850"}>
                                        {language === "es" ? "Semanal" : "Weekly"}
                                      </option>
                                      <option value="monthly" className={isDark ? "bg-[#18181B] text-white" : "bg-white text-zinc-850"}>
                                        {language === "es" ? "Mensual" : "Monthly"}
                                      </option>
                                    </select>
                                    <span className="text-[10px] font-bold opacity-40 shrink-0">→</span>
                                    <div className="min-w-0 flex-1">
                                      <CustomDatePicker
                                        value={newTaskRecurrenceEndDate}
                                        onChange={setNewTaskRecurrenceEndDate}
                                        showTime={false}
                                        label=""
                                        isDark={isDark}
                                        language={language}
                                      />
                                    </div>
                                  </div>
                                ) : (
                                  <span className={`text-[10px] font-bold italic opacity-30 ${isDark ? "text-zinc-500" : "text-zinc-400"}`}>
                                    {language === "es" ? "Una sola vez" : "One-time"}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Option 3: Assign to */}
                            <div className="flex flex-col gap-1.5 min-w-0">
                              <span
                                className={`text-[11px] uppercase tracking-wider font-extrabold flex items-center gap-1.5 ${isDark ? "text-zinc-400" : "text-zinc-500"}`}
                              >
                                👤 {language === "es" ? "Asignar a" : "Assign to"}
                              </span>
                              <select
                                value={newTaskAssignedTo}
                                onChange={(e) =>
                                  setNewTaskAssignedTo(e.target.value)
                                }
                                className={`text-xs px-3 py-2 w-full rounded-xl outline-none font-bold border min-w-0 ${isDark ? "bg-[#18181B] border-white/10 text-white" : "bg-white border-black/5 text-zinc-804"}`}
                              >
                                <option value="" className={isDark ? "bg-[#18181B] text-white" : "bg-white text-zinc-850"}>
                                  {language === "es"
                                    ? "Ambos (Sin asignar)"
                                    : "Both (Unassigned)"}
                                </option>
                                {customMembers.map((m: any) => (
                                  <option key={m.id} value={m.name} className={isDark ? "bg-[#18181B] text-white" : "bg-white text-zinc-850"}>
                                    {m.id === "papa"
                                      ? "👦"
                                      : m.id === "mama"
                                        ? "👩"
                                        : "👤"}{" "}
                                    {m.name}
                                  </option>
                                ))}
                              </select>
                            </div>

                            {/* Option 4: Tags */}
                            <div className="flex flex-col gap-1.5 min-w-0">
                              <span
                                className={`text-[11px] uppercase tracking-wider font-extrabold flex items-center gap-1.5 ${isDark ? "text-zinc-400" : "text-zinc-500"}`}
                              >
                                🏷️ {language === "es" ? "Etiquetas" : "Tags"}
                              </span>
                              <input
                                type="text"
                                value={newTaskTags}
                                onChange={(e) => setNewTaskTags(e.target.value)}
                                placeholder="e.g. laundry, urgent"
                                className={`text-xs px-3 py-2 w-full rounded-xl outline-none font-bold border min-w-0 ${isDark ? "bg-[#18181B] border-white/10 text-white" : "bg-white border-black/5 text-zinc-805"}`}
                              />
                            </div>
                          </div>
                        </form>
                      </div>

                      {/* Gradient light effects */}
                      <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />
                      <div className="absolute bottom-0 left-0 w-64 h-64 bg-rose-500/5 rounded-full blur-[80px] translate-y-1/3 -translate-x-1/4" />
                    </div>
                  </div>

                  {/* Efficiency Score / Stats */}
                  <div className="lg:col-span-4">
                    <div className="p-10 rounded-[3rem] h-full flex flex-col items-center justify-center text-center relative overflow-hidden group border-none bg-zinc-900 text-white shadow-2xl">
                      <div className="relative z-10">
                        <div className="w-40 h-40 rounded-full border-8 border-white/5 flex items-center justify-center relative mb-8 mx-auto transition-transform group-hover:scale-110">
                          <svg className="absolute inset-0 w-full h-full -rotate-90">
                            <circle
                              cx="80"
                              cy="80"
                              r="72"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="8"
                              className="text-white/5"
                            />
                            <motion.circle
                              initial={{ strokeDasharray: "0, 452" }}
                              animate={{
                                strokeDasharray: `${(completionRate / 100) * 452}, 452`,
                              }}
                              transition={{
                                duration: 2,
                                delay: 0.5,
                                ease: "circOut",
                              }}
                              cx="80"
                              cy="80"
                              r="72"
                              fill="none"
                              stroke={currentTheme.accent}
                              strokeWidth="12"
                              strokeLinecap="round"
                            />
                          </svg>
                          <div className="flex flex-col items-center">
                            <span className="text-4xl font-black italic tracking-tighter leading-none">
                              {completionRate}%
                            </span>
                            <span className="text-[8px] font-black uppercase tracking-widest opacity-40 mt-1">
                              Ready
                            </span>
                          </div>
                        </div>
                        <h3 className="text-2xl font-black uppercase tracking-tighter italic leading-none">
                          {t.completion_score}
                        </h3>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-30 mt-4 leading-relaxed">
                          {completedMissions} missions
                          <br />
                          accomplished
                        </p>
                      </div>
                      {/* Dark gradient mesh */}
                      <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/20 via-transparent to-rose-500/20 opacity-40" />
                      <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-zinc-800 rounded-full blur-3xl opacity-50" />
                    </div>
                  </div>

                  <div className="lg:col-span-4">
                    <div
                      className={`${currentTheme.card} p-6 sm:p-10 rounded-[2rem] sm:rounded-[3rem] shadow-sm h-full`}
                    >
                      <div className="flex justify-between items-center mb-8 gap-2">
                        <h3 className="text-lg font-black uppercase tracking-tighter italic flex items-center gap-3">
                          <Activity
                            size={20}
                            style={{ color: currentTheme.accent }}
                          />
                          {t.active_missions}
                        </h3>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={handleAiPrioritizeTasks}
                            disabled={isPrioritizing}
                            className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1 cursor-pointer ${
                              isPrioritizing
                                ? "bg-indigo-500/20 text-indigo-400 border-indigo-500/20"
                                : "bg-indigo-600 text-white border-transparent hover:bg-indigo-700 shadow-sm active:scale-95"
                            }`}
                            style={{
                              backgroundColor: isPrioritizing
                                ? undefined
                                : currentTheme.accent,
                            }}
                          >
                            <Sparkles
                              size={8}
                              className={isPrioritizing ? "animate-pulse" : ""}
                            />
                            {isPrioritizing
                              ? language === "es"
                                ? "Priorizando..."
                                : "Prioritizing..."
                              : language === "es"
                                ? "Priorizar IA"
                                : "AI Prioritize"}
                          </button>
                          <button
                            onClick={() => setViewMode("linear")}
                            className="text-[9px] font-black uppercase tracking-widest opacity-30 hover:opacity-100 transition-opacity"
                          >
                            View All
                          </button>
                        </div>
                      </div>

                      <div className="flex bg-black/5 dark:bg-white/5 p-1 rounded-xl mb-6 gap-1 border border-black/5 dark:border-white/5">
                        <button
                          onClick={() => setAssigneeFilter("all")}
                          type="button"
                          className={`flex-1 text-[10px] font-black uppercase tracking-wider py-2 rounded-lg transition-all ${assigneeFilter === "all" ? "bg-[#4338CA] text-white shadow-sm dark:bg-zinc-800" : "opacity-40 hover:opacity-100 dark:text-zinc-400"}`}
                        >
                          👥 {language === "es" ? "Ambos" : "Both"}
                        </button>
                        <button
                          onClick={() => setAssigneeFilter("papa")}
                          type="button"
                          className={`flex-1 text-[10px] font-black uppercase tracking-wider py-2 rounded-lg transition-all ${assigneeFilter === "papa" ? "bg-blue-600 text-white shadow-sm" : "opacity-40 hover:opacity-100 dark:text-zinc-400"}`}
                        >
                          👦 Papá
                        </button>
                        <button
                          onClick={() => setAssigneeFilter("mama")}
                          type="button"
                          className={`flex-1 text-[10px] font-black uppercase tracking-wider py-2 rounded-lg transition-all ${assigneeFilter === "mama" ? "bg-rose-600 text-white shadow-sm" : "opacity-40 hover:opacity-100 dark:text-zinc-400"}`}
                        >
                          👩 Mamá
                        </button>
                      </div>

                      <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                        {(() => {
                          const dashboardFilteredTasks = upcomingTasks.filter(
                            (t) => {
                              if (assigneeFilter === "papa")
                                return isPapa(t.assignedTo);
                              if (assigneeFilter === "mama")
                                return isMama(t.assignedTo);
                              return true;
                            },
                          );

                          return dashboardFilteredTasks
                            .slice(0, 6)
                            .map((task, idx) => {
                              const isDragged = draggedTaskId === task.id;
                              const isDragTarget = dropTargetId === task.id;

                              return (
                                <motion.div
                                  layout
                                  initial={{ opacity: 0, y: 20 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: idx * 0.1 }}
                                  key={task.id}
                                  draggable={true}
                                  onDragStart={(e) =>
                                    handleDragStart(e as any, task.id)
                                  }
                                  onDragOver={(e) =>
                                    handleDragOver(e as any, task.id)
                                  }
                                  onDragLeave={handleDragLeave as any}
                                  onDrop={(e) =>
                                    handleDrop(
                                      e as any,
                                      task.id,
                                      dashboardFilteredTasks,
                                    )
                                  }
                                  className={`${isDark ? "bg-white/5 border-white/5" : "bg-black/5 border-black/5"} py-4 px-6 rounded-2xl border ${
                                    isDragTarget
                                      ? "border-indigo-500 scale-[1.01] ring-2 ring-indigo-500/20"
                                      : isDragged
                                        ? "opacity-40 border-dashed border-zinc-500/50 scale-[0.98]"
                                        : ""
                                  } flex items-center gap-5 group hover:bg-zinc-900 hover:text-white transition-all cursor-pointer ${
                                    draggedTaskId
                                      ? "cursor-grabbing"
                                      : "cursor-grab active:cursor-grabbing"
                                  }`}
                                  onClick={() =>
                                    handleStatusChange(task.id, "Completed")
                                  }
                                >
                                  <div className="text-slate-400 opacity-20 group-hover:opacity-100 cursor-grab active:cursor-grabbing hover:scale-110 transition-all p-1">
                                    <GripVertical size={16} />
                                  </div>
                                  <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                                    {task.category === "Shopping"
                                      ? "🛒"
                                      : task.category === "School"
                                        ? "📚"
                                        : task.category === "Health"
                                          ? "🏥"
                                          : "📋"}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="font-extrabold text-sm truncate uppercase tracking-tight">
                                      {task.title}
                                    </p>
                                    <div className="flex items-center gap-3 mt-1">
                                      <span className="text-[8px] font-black uppercase tracking-widest opacity-40 group-hover:opacity-60">
                                        {task.category}
                                        {task.subCategory
                                          ? ` · ${task.subCategory}`
                                          : ""}
                                      </span>
                                      {task.priority === "Critical" && (
                                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                                      )}
                                    </div>
                                  </div>
                                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Check
                                      size={20}
                                      className="text-emerald-400"
                                    />
                                  </div>
                                </motion.div>
                              );
                            });
                        })()}
                        {upcomingTasks.length === 0 && (
                          <div className="py-20 flex flex-col items-center justify-center opacity-20 gap-4">
                            <CheckCircle size={64} />
                            <p className="text-[10px] font-black uppercase tracking-widest text-center">
                              No active missions. Enjoy the peace.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Bulletin Board / Whiteboard */}
                  <div className="lg:col-span-4">
                    <div className="p-6 sm:p-10 rounded-[2rem] sm:rounded-[3rem] shadow-sm relative overflow-hidden bg-[#FFFAB7] border-none text-zinc-900 h-full flex flex-col min-h-[480px] sm:min-h-[520px]">
                      <div className="flex justify-between items-center mb-8 relative z-10">
                        <h2 className="text-lg font-black uppercase tracking-tighter italic flex items-center gap-3">
                          <Pin size={24} className="text-rose-500" />
                          {t.whiteboard}
                        </h2>
                      </div>

                      <div className="flex-1 min-h-0 space-y-6 overflow-y-auto pr-2 custom-scrollbar relative z-10">
                        {messages.map((msg) => (
                          <div
                            key={msg.id}
                            className="pb-6 border-b border-black/5 last:border-0 relative group"
                          >
                            <p className="font-bold text-base leading-snug italic tracking-tight">
                              "{msg.content}"
                            </p>
                            <div className="flex justify-between items-center mt-3">
                              <div className="flex items-center gap-2">
                                <div className="w-5 h-5 rounded-full bg-black/10 flex items-center justify-center text-[8px] font-black">
                                  {msg.authorName?.slice(0, 1).toUpperCase()}
                                </div>
                                <span className="text-[9px] font-black uppercase tracking-widest opacity-40">
                                  {msg.authorName}
                                </span>
                              </div>
                              <button
                                onClick={() =>
                                  deleteDoc(doc(db, "messages", msg.id))
                                }
                                className="opacity-0 group-hover:opacity-100 transition-opacity p-2"
                              >
                                <Trash2 size={12} className="text-rose-500" />
                              </button>
                            </div>
                          </div>
                        ))}
                        {messages.length === 0 && (
                          <div className="py-20 flex flex-col items-center justify-center opacity-10 gap-4">
                            <StickyNote size={64} />
                            <p className="text-[10px] font-black uppercase tracking-widest text-center">
                              {t.emptyBoard}
                            </p>
                          </div>
                        )}
                      </div>

                      <form
                        onSubmit={handleAddMessage}
                        className="mt-6 flex gap-2 relative z-10 w-full min-w-0"
                      >
                        <input
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          placeholder={t.addNote}
                          className="flex-grow min-w-0 bg-white/60 px-4 py-4 rounded-xl sm:rounded-2xl outline-none font-bold placeholder:text-zinc-500/35 border border-black/5 focus:bg-white transition-all text-sm shadow-inner"
                        />
                        <button
                          type="submit"
                          className="shrink-0 p-4 bg-zinc-900 text-white rounded-xl sm:rounded-2xl shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center justify-center"
                          title={t.addNote || "Add note"}
                        >
                          <Send size={18} className="shrink-0" />
                        </button>
                      </form>

                      {/* Paper texture overlay */}
                      <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/paper-fibers.png')]" />
                    </div>
                  </div>

                  {/* Weather & Mini Calendar Column */}
                  <div className="lg:col-span-4 flex flex-col gap-8">
                    <WeatherWidget
                      language={language}
                      theme={currentTheme}
                      isDark={isDark}
                    />
                    <MiniCalendar
                      events={events}
                      theme={currentTheme}
                      language={language}
                    />

                    {trophies.length > 0 && (
                      <div
                        className={`${currentTheme.card} p-6 rounded-[2rem] shadow-sm space-y-4`}
                      >
                        <div className="flex justify-between items-center pb-2 border-b border-black/5 dark:border-white/5">
                          <div className="flex items-center gap-2">
                            <Trophy size={16} className="text-amber-500" />
                            <h3 className="text-xs font-black uppercase tracking-wider">
                              {language === "es"
                                ? "Trofeos Recientes"
                                : "Recent Trophies"}
                            </h3>
                          </div>
                          <button
                            onClick={() => setActiveHub("Trophies")}
                            className="text-[9px] font-black uppercase text-amber-500 hover:underline"
                          >
                            {language === "es" ? "Ver Todos" : "View All"}
                          </button>
                        </div>
                        <div className="space-y-3">
                          {trophies.slice(0, 3).map((trophy) => (
                            <div
                              key={trophy.id}
                              className="flex items-center gap-3 p-2 bg-black/[0.01] dark:bg-white/[0.01] rounded-xl"
                            >
                              <span className="text-2xl p-1 bg-amber-500/5 rounded-lg">
                                {trophy.icon || "🏆"}
                              </span>
                              <div className="min-w-0 flex-1">
                                <h4 className="font-extrabold text-xs truncate">
                                  {trophy.title}
                                </h4>
                                <p className="text-[9px] text-zinc-400 truncate">
                                  🏆 {trophy.userDisplayName}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Shopping Copilot Bottom Bar */}
                  <div className="lg:col-span-12">
                    <div className="p-8 rounded-[3rem] border-none bg-indigo-600 text-white shadow-xl shadow-indigo-500/20 overflow-hidden relative group">
                      <div className="flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
                        <div className="flex items-center gap-5">
                          <div className="w-16 h-16 bg-white/20 rounded-3xl flex items-center justify-center backdrop-blur-md">
                            <Zap size={32} className="text-indigo-200" />
                          </div>
                          <div>
                            <h3 className="font-black text-2xl uppercase tracking-tighter italic leading-none mb-2">
                              {t.groceriesAI}
                            </h3>
                            <p className="text-xs font-bold text-indigo-200 opacity-60">
                              Intelligent pantry optimization based on your
                              history.
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 justify-center">
                          {groceries.length > 0 ? (
                            groceries.slice(0, 5).map((g, i) => (
                              <button
                                key={i}
                                onClick={() =>
                                  addDoc(collection(db, "tasks"), {
                                    title: g,
                                    category: "Shopping",
                                    status: "Pending",
                                    creatorId: userData?.uid,
                                    familyId: family?.id,
                                    createdAt: serverTimestamp(),
                                  })
                                }
                                className="px-6 py-3 bg-white/10 rounded-2xl hover:bg-white text-white font-extrabold text-xs transition-all hover:text-indigo-600 shadow-sm"
                              >
                                {g}
                              </button>
                            ))
                          ) : (
                            <p className="text-xs font-bold text-white/50">
                              No suggestions yet. Start shopping!
                            </p>
                          )}
                          <button
                            onClick={fetchGroceries}
                            className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/20 transition-all ml-4"
                          >
                            <RefreshCw
                              size={20}
                              className={isAiProcessing ? "animate-spin" : ""}
                            />
                          </button>
                        </div>
                      </div>

                      {/* Background grid pattern */}
                      <div
                        className="absolute inset-0 opacity-10 pointer-events-none"
                        style={{
                          backgroundImage:
                            "radial-gradient(circle at 2px 2px, white 1px, transparent 0)",
                          backgroundSize: "24px 24px",
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeHub === "Today" && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
                  <div className="p-6 sm:p-10 rounded-[2rem] sm:rounded-[3rem] bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-white border-none shadow-xl shadow-amber-500/20 relative overflow-hidden">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
                      <div className="flex items-center gap-4 sm:gap-6">
                        <Sun className="w-8 h-8 sm:w-12 sm:h-12 text-white/50 animate-[spin_32s_linear_infinite]" />
                        <div>
                          <h2 className="text-2xl sm:text-4xl font-black italic uppercase tracking-tighter">
                            {language === "es"
                              ? "Tareas de Hoy"
                              : "Today's Tasks"}
                          </h2>
                          <p className="text-xs sm:text-sm font-bold opacity-80 mt-1 capitalize">
                            {new Date().toLocaleDateString(
                              language === "es" ? "es-ES" : "en-US",
                              {
                                weekday: "long",
                                day: "numeric",
                                month: "long",
                                year: "numeric",
                              },
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="px-5 py-2.5 bg-white/10 backdrop-blur-md rounded-2xl border border-white/15">
                        <span className="text-xs sm:text-sm font-black tracking-tight">
                          {
                            tasks.filter(
                              (t) =>
                                t.dueDate &&
                                format(new Date(t.dueDate), "yyyy-MM-dd") ===
                                  format(new Date(), "yyyy-MM-dd") &&
                                t.status !== "Completed",
                            ).length
                          }{" "}
                          {language === "es"
                            ? "Misiones Pendientes"
                            : "Pending Missions"}
                        </span>
                      </div>
                    </div>

                    <form
                      onSubmit={handleAddTask}
                      className="flex flex-col gap-3"
                    >
                      <div className="flex flex-col sm:flex-row gap-3 w-full">
                        <div className="flex-grow flex gap-2 items-center min-w-0">
                          <input
                            value={newTask}
                            onChange={(e) => setNewTask(e.target.value)}
                            placeholder={
                              language === "es"
                                ? "Añadir nueva tarea para hoy..."
                                : "Add a new task for today..."
                            }
                            className="w-full bg-white/10 placeholder:text-white/40 px-6 py-4 sm:px-8 sm:py-4 rounded-xl outline-none font-bold text-sm sm:text-lg border border-white/5 focus:bg-white/20 transition-all shadow-inner"
                          />
                          <VoiceInputButton
                            value={newTask}
                            onChange={setNewTask}
                            language={language}
                            isDark={isDark}
                            className="shrink-0"
                          />
                        </div>
                        <button
                          type="submit"
                          className="px-6 py-4 bg-zinc-900 text-white rounded-xl font-black uppercase tracking-widest text-xs shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 shrink-0"
                        >
                          <Plus size={16} />
                          {t.inject}
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* Division Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Main Tasks List */}
                    <div className="lg:col-span-8 space-y-6">
                      <div className="flex items-center justify-between px-2 flex-wrap gap-4">
                        <div className="flex items-center gap-3 flex-wrap">
                          <h3 className="font-black text-xs uppercase tracking-[0.3em] opacity-40">
                            {language === "es"
                              ? "Lista de misiones para hoy"
                              : "Today's Missions"}
                          </h3>

                          <button
                            onClick={handleAiPrioritizeTasks}
                            disabled={isPrioritizing}
                            className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-wider rounded-xl transition-all flex items-center gap-1 hover:scale-105 active:scale-95 cursor-pointer ${
                              isPrioritizing
                                ? "bg-indigo-500/20 text-indigo-400"
                                : "bg-indigo-600 text-white shadow-md"
                            }`}
                            style={{
                              backgroundColor: isPrioritizing
                                ? undefined
                                : currentTheme.accent,
                            }}
                          >
                            <Sparkles
                              size={10}
                              className={isPrioritizing ? "animate-pulse" : ""}
                            />
                            {isPrioritizing
                              ? language === "es"
                                ? "Priorizando..."
                                : "Prioritizing..."
                              : language === "es"
                                ? "Priorizador IA"
                                : "AI Prioritizer"}
                          </button>
                        </div>

                        <div className="flex bg-black/5 dark:bg-white/5 p-1 rounded-2xl gap-1 border border-black/5 dark:border-white/5">
                          <button
                            onClick={() => setAssigneeFilter("all")}
                            className={`px-4 py-1.5 text-[9px] font-black uppercase tracking-wider rounded-xl transition-all ${assigneeFilter === "all" ? (isDark ? "bg-white text-zinc-900 shadow-md" : "bg-zinc-950 text-white shadow-md") : "opacity-40 hover:opacity-105 dark:text-zinc-400"}`}
                          >
                            {language === "es" ? "Todos" : "All"}
                          </button>
                          <button
                            onClick={() => setAssigneeFilter("papa")}
                            className={`px-4 py-1.5 text-[9px] font-black uppercase tracking-wider rounded-xl transition-all ${assigneeFilter === "papa" ? "bg-blue-600 text-white shadow-sm" : "opacity-40 hover:opacity-105"}`}
                          >
                            Papá
                          </button>
                          <button
                            onClick={() => setAssigneeFilter("mama")}
                            className={`px-4 py-1.5 text-[9px] font-black uppercase tracking-wider rounded-xl transition-all ${assigneeFilter === "mama" ? "bg-rose-600 text-white shadow-sm" : "opacity-40 hover:opacity-105"}`}
                          >
                            Mamá
                          </button>
                        </div>
                      </div>{" "}
                      <div className="grid grid-cols-1 gap-4">
                        {(() => {
                          const todayTasksList = tasks
                            .filter(
                              (t) =>
                                t.dueDate &&
                                format(new Date(t.dueDate), "yyyy-MM-dd") ===
                                  format(new Date(), "yyyy-MM-dd"),
                            )
                            .filter((t) => {
                              if (assigneeFilter === "papa")
                                return isPapa(t.assignedTo);
                              if (assigneeFilter === "mama")
                                return isMama(t.assignedTo);
                              return true;
                            });
                          return todayTasksList.map((task) => (
                            <TaskCard
                              key={task.id}
                              task={task}
                              onDelete={handleDeleteTask}
                              onStatusChange={handleStatusChange}
                              onAddImage={handleAddImage}
                              onRemoveImage={handleRemoveImage}
                              onUpdateTitle={handleUpdateTitle}
                              onUpdateReminder={handleUpdateReminder}
                              onUpdateDueDate={handleUpdateDueDate}
                              onUpdateAssignment={handleUpdateAssignment}
                              className={currentTheme.card}
                              language={language}
                              userData={userData}
                              familyProfiles={familyProfiles}
                              sendNotification={sendNotificationToFamily}
                              draggable={true}
                              onDragStart={(e) => handleDragStart(e, task.id)}
                              onDragOver={(e) => handleDragOver(e, task.id)}
                              onDragLeave={handleDragLeave}
                              onDrop={(e) =>
                                handleDrop(e, task.id, todayTasksList)
                              }
                              isDragged={draggedTaskId === task.id}
                              isDragTarget={dropTargetId === task.id}
                            />
                          ));
                        })()}

                        {tasks.filter(
                          (t) =>
                            t.dueDate &&
                            format(new Date(t.dueDate), "yyyy-MM-dd") ===
                              format(new Date(), "yyyy-MM-dd"),
                        ).length === 0 && (
                          <div
                            className={`${currentTheme.card} p-12 py-24 rounded-[2.5rem] flex flex-col items-center justify-center border-none text-center shadow-inner`}
                          >
                            <CheckCircle
                              size={64}
                              className="text-amber-500 animate-[pulse_2s_infinite]"
                            />
                            <h3 className="text-xl font-black uppercase tracking-tighter italic mt-6">
                              {language === "es"
                                ? "¡Todo Listo!"
                                : "All Clear!"}
                            </h3>
                            <p className="text-xs font-bold opacity-40 mt-2 max-w-sm">
                              {language === "es"
                                ? "No tienes tareas programadas para hoy. ¡Disfruta del día con la familia!"
                                : "No scheduled tasks for today. Enjoy your day with the family!"}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Sidebar widgets specific to Today */}
                    <div className="lg:col-span-4">
                      {/* Today's Stats & Summary */}
                      <div
                        className={`${currentTheme.card} p-8 rounded-[2.5rem] shadow-sm flex flex-col justify-between relative overflow-hidden h-full min-h-[300px]`}
                      >
                        <div className="relative z-10">
                          <span className="text-[10px] font-black uppercase tracking-widest opacity-40">
                            {language === "es"
                              ? "Copiloto de Hogar"
                              : "Home Copilot"}
                          </span>
                          <h4 className="text-xl font-black uppercase tracking-tighter italic mt-2">
                            {language === "es"
                              ? "Energía Familiar"
                              : "Family Synergy"}
                          </h4>
                          <p className="text-xs font-bold opacity-50 mt-4 leading-relaxed">
                            {language === "es"
                              ? "Completar tareas del día con regularidad incrementa vuestra puntuación de eficiencia. ¡Colaborar es ganar!"
                              : "Completing daily tasks on time will fuel your collective score. Helping each other makes family projects turn out flawless!"}
                          </p>
                        </div>

                        <div className="mt-8 relative z-10 flex items-end gap-6">
                          <div>
                            <span className="text-5xl font-black italic tracking-tighter block leading-none text-amber-500">
                              {
                                tasks.filter(
                                  (t) =>
                                    t.dueDate &&
                                    format(
                                      new Date(t.dueDate),
                                      "yyyy-MM-dd",
                                    ) === format(new Date(), "yyyy-MM-dd") &&
                                    t.status === "Completed",
                                ).length
                              }
                            </span>
                            <span className="text-[9px] font-black uppercase tracking-wider opacity-40 mt-2 block">
                              {language === "es"
                                ? "Completadas de Hoy"
                                : "Today's Done"}
                            </span>
                          </div>
                          <div className="h-10 w-[1.5px] bg-black/10 dark:bg-white/10"></div>
                          <div>
                            <span className="text-5xl font-black italic tracking-tighter block leading-none">
                              {
                                tasks.filter(
                                  (t) =>
                                    t.dueDate &&
                                    format(
                                      new Date(t.dueDate),
                                      "yyyy-MM-dd",
                                    ) === format(new Date(), "yyyy-MM-dd"),
                                ).length
                              }
                            </span>
                            <span className="text-[9px] font-black uppercase tracking-wider opacity-40 mt-2 block">
                              {language === "es"
                                ? "Totales de Hoy"
                                : "Today's Total"}
                            </span>
                          </div>
                        </div>

                        {/* Ambient background decoration */}
                        <div className="absolute -bottom-20 -right-20 w-48 h-48 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeHub === "Papa" && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
                  <div className="p-6 sm:p-10 rounded-[2rem] sm:rounded-[3rem] bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-500 text-white border-none shadow-xl shadow-blue-500/25 relative overflow-hidden">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
                      <div className="flex items-center gap-4 sm:gap-6">
                        <div
                          onClick={() => setShowAvatarModal("papa")}
                          className="relative group/avatar cursor-pointer shrink-0"
                          title={
                            language === "es"
                              ? "Cambiar foto de Papá"
                              : "Change Dad's photo"
                          }
                        >
                          {family?.papaPhotoURL ? (
                            <img
                              src={family.papaPhotoURL}
                              alt="Dad"
                              className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl object-cover border-2 border-white/20 shadow-md group-hover/avatar:scale-105 transition-all duration-300 animate-in fade-in"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-white/10 rounded-2xl flex items-center justify-center p-2 text-white/90 group-hover/avatar:scale-105 transition-all duration-300 animate-in fade-in">
                              <User className="w-full h-full" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black/40 rounded-2xl opacity-0 group-hover/avatar:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                            <Camera
                              size={18}
                              className="text-white hover:scale-110 active:scale-95 transition-transform"
                            />
                          </div>
                        </div>
                        <div>
                          <h2 className="text-2xl sm:text-4xl font-black italic uppercase tracking-tighter">
                            {language === "es"
                              ? `Misiones de ${papaName}`
                              : `${papaName}'s Missions`}
                          </h2>
                          <p className="text-xs sm:text-sm font-bold opacity-80 mt-1">
                            {language === "es"
                              ? `Espacio exclusivo de ${papaName} para objetivos y responsabilidades`
                              : `${papaName}'s exclusive workspace for personal responsibilities`}
                          </p>
                        </div>
                      </div>
                      <div className="px-5 py-2.5 bg-white/10 backdrop-blur-md rounded-2xl border border-white/15">
                        <span className="text-xs sm:text-sm font-black tracking-tight">
                          {
                            tasks.filter(
                              (t) =>
                                isPapa(t.assignedTo) &&
                                t.status !== "Completed",
                            ).length
                          }{" "}
                          {language === "es" ? "Pendientes" : "Pending"}
                        </span>
                      </div>
                    </div>

                    <form
                      onSubmit={handleAddTask}
                      className="flex flex-col gap-3"
                    >
                      <div className="flex flex-col sm:flex-row gap-3 w-full">
                        <div className="flex-grow flex gap-2 items-center min-w-0">
                          <input
                            value={newTask}
                            onChange={(e) => setNewTask(e.target.value)}
                            placeholder={
                              language === "es"
                                ? `Añadir nueva tarea para ${papaName}...`
                                : `Add a new task for ${papaName}...`
                            }
                            className="w-full bg-white/10 placeholder:text-white/40 px-6 py-4 sm:px-8 sm:py-4 rounded-xl outline-none font-bold text-sm sm:text-lg border border-white/5 focus:bg-white/20 transition-all shadow-inner"
                          />
                          <VoiceInputButton
                            value={newTask}
                            onChange={setNewTask}
                            language={language}
                            isDark={isDark}
                            className="shrink-0"
                          />
                        </div>
                        <button
                          type="submit"
                          className="px-6 py-4 bg-zinc-950 text-white rounded-xl font-black uppercase tracking-widest text-xs shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 shrink-0"
                        >
                          <Plus size={16} />
                          {t.inject}
                        </button>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 mt-3 px-4 py-3 bg-white/5 rounded-2xl border border-white/5">
                        {/* Reminder Picker */}
                        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                          <span className="text-xs font-bold opacity-80 flex items-center gap-1">
                            <Clock size={14} />
                            {language === "es" ? "Recordatorio:" : "Reminder:"}
                          </span>
                          <input
                            type="datetime-local"
                            value={newTaskReminder}
                            onChange={(e) => setNewTaskReminder(e.target.value)}
                            className="text-xs px-3 py-1.5 rounded-xl outline-none font-bold bg-white/10 border border-white/5 text-white w-full sm:w-auto min-w-0 max-w-full shrink"
                          />
                          {newTaskReminder && (
                            <button
                              type="button"
                              onClick={() => setNewTaskReminder("")}
                              className="text-[9px] px-2 py-1 rounded-lg font-black uppercase bg-white/10 border border-white/5 hover:bg-white/25"
                            >
                              {language === "es" ? "Limpiar" : "Clear"}
                            </button>
                          )}
                        </div>

                        <div className="h-4 w-[1px] bg-white/10 hidden sm:block"></div>

                        {/* Recurrence Option */}
                        <div className="flex items-center gap-2">
                          <label className="flex items-center gap-1.5 text-xs font-bold cursor-pointer opacity-80">
                            <input
                              type="checkbox"
                              checked={newTaskIsRecurring}
                              onChange={(e) =>
                                setNewTaskIsRecurring(e.target.checked)
                              }
                              className="w-4 h-4 rounded border-white/20 bg-white/10 text-indigo-550 focus:ring-indigo-505 cursor-pointer"
                            />
                            <span className="flex items-center gap-1">
                              <RefreshCw size={12} />
                              {language === "es" ? "Recurrente" : "Recurring"}
                            </span>
                          </label>

                          {newTaskIsRecurring && (
                            <div className="flex items-center gap-2 animate-in fade-in duration-200">
                              <select
                                value={newTaskRecurrenceFrequency}
                                onChange={(e) =>
                                  setNewTaskRecurrenceFrequency(
                                    e.target.value as any,
                                  )
                                }
                                className="text-xs px-2 py-1 rounded-xl outline-none font-bold bg-white/10 border border-white/5 text-white"
                              >
                                <option
                                  value="daily"
                                  className="bg-zinc-900 text-white"
                                >
                                  {language === "es" ? "Diario" : "Daily"}
                                </option>
                                <option
                                  value="weekly"
                                  className="bg-zinc-900 text-white"
                                >
                                  {language === "es" ? "Semanal" : "Weekly"}
                                </option>
                                <option
                                  value="monthly"
                                  className="bg-zinc-900 text-white"
                                >
                                  {language === "es" ? "Mensual" : "Monthly"}
                                </option>
                              </select>
                            </div>
                          )}
                        </div>
                      </div>
                    </form>
                  </div>

                  {/* Division Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Main Tasks List */}
                    <div className="lg:col-span-8 space-y-6">
                      <div className="flex items-center justify-between px-2 flex-wrap gap-4 select-none">
                        <h3 className="font-black text-xs uppercase tracking-[0.3em] opacity-40">
                          {language === "es"
                            ? `Lista de misiones de ${papaName}`
                            : `${papaName}'s Active Missions`}
                        </h3>

                        <button
                          onClick={handleAiPrioritizeTasks}
                          disabled={isPrioritizing}
                          className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-wider rounded-xl transition-all flex items-center gap-1 hover:scale-105 active:scale-95 cursor-pointer ${
                            isPrioritizing
                              ? "bg-indigo-505/20 text-indigo-400"
                              : "bg-[#4f46e5]/10 text-indigo-500 hover:bg-[#4f46e5]/20"
                          }`}
                        >
                          <Sparkles
                            size={10}
                            className={isPrioritizing ? "animate-pulse" : ""}
                          />
                          {isPrioritizing
                            ? language === "es"
                              ? "Priorizando..."
                              : "Prioritizing..."
                            : language === "es"
                              ? "Priorizar IA"
                              : "AI Prioritize"}
                        </button>
                      </div>{" "}
                      <div className="grid grid-cols-1 gap-4">
                        {(() => {
                          const papaActiveTasks = tasks.filter(
                            (t) =>
                              isPapa(t.assignedTo) && t.status !== "Completed",
                          );
                          return papaActiveTasks.map((task) => (
                            <TaskCard
                              key={task.id}
                              task={task}
                              onDelete={handleDeleteTask}
                              onStatusChange={handleStatusChange}
                              onAddImage={handleAddImage}
                              onRemoveImage={handleRemoveImage}
                              onUpdateTitle={handleUpdateTitle}
                              onUpdateReminder={handleUpdateReminder}
                              onUpdateDueDate={handleUpdateDueDate}
                              onUpdateAssignment={handleUpdateAssignment}
                              className={currentTheme.card}
                              language={language}
                              userData={userData}
                              familyProfiles={familyProfiles}
                              sendNotification={sendNotificationToFamily}
                              draggable={true}
                              onDragStart={(e) => handleDragStart(e, task.id)}
                              onDragOver={(e) => handleDragOver(e, task.id)}
                              onDragLeave={handleDragLeave}
                              onDrop={(e) =>
                                handleDrop(e, task.id, papaActiveTasks)
                              }
                              isDragged={draggedTaskId === task.id}
                              isDragTarget={dropTargetId === task.id}
                            />
                          ));
                        })()}

                        {tasks.filter(
                          (t) =>
                            isPapa(t.assignedTo) && t.status !== "Completed",
                        ).length === 0 && (
                          <div
                            className={`${currentTheme.card} p-12 py-20 rounded-[2.5rem] flex flex-col items-center justify-center border-none text-center shadow-inner`}
                          >
                            <CheckCircle
                              size={64}
                              className="text-blue-500 animate-[pulse_2s_infinite]"
                            />
                            <h3 className="text-xl font-black uppercase tracking-tighter italic mt-6">
                              {language === "es"
                                ? "¡Todo Al Día!"
                                : "All Caught Up!"}
                            </h3>
                            <p className="text-xs font-bold opacity-40 mt-2 max-w-sm">
                              {language === "es"
                                ? `${papaName} no tiene misiones pendientes en este momento.`
                                : `${papaName} has no active missions right now.`}
                            </p>
                          </div>
                        )}
                      </div>
                      {/* Collapsible Completed Missions for Papá */}
                      {tasks.filter(
                        (t) => isPapa(t.assignedTo) && t.status === "Completed",
                      ).length > 0 && (
                        <div className="pt-6 border-t border-black/5 dark:border-white/5 space-y-4">
                          <h4 className="font-black text-xs uppercase tracking-[0.3em] opacity-40 px-2 flex items-center gap-2">
                            <span>
                              {language === "es"
                                ? "Misiones Completadas"
                                : "Completed Missions"}
                            </span>
                            <span className="px-2 py-0.5 bg-black/5 dark:bg-white/10 rounded-full text-[10px] scale-90">
                              {
                                tasks.filter(
                                  (t) =>
                                    isPapa(t.assignedTo) &&
                                    t.status === "Completed",
                                ).length
                              }
                            </span>
                          </h4>
                          <div className="grid grid-cols-1 gap-4 opacity-75">
                            {tasks
                              .filter(
                                (t) =>
                                  isPapa(t.assignedTo) &&
                                  t.status === "Completed",
                              )
                              .map((task) => (
                                <TaskCard
                                  key={task.id}
                                  task={task}
                                  onDelete={handleDeleteTask}
                                  onStatusChange={handleStatusChange}
                                  onAddImage={handleAddImage}
                                  onRemoveImage={handleRemoveImage}
                                  onUpdateTitle={handleUpdateTitle}
                                  onUpdateReminder={handleUpdateReminder}
                                  onUpdateDueDate={handleUpdateDueDate}
                                  onUpdateAssignment={handleUpdateAssignment}
                                  className={currentTheme.card}
                                  language={language}
                                  userData={userData}
                                  familyProfiles={familyProfiles}
                                  sendNotification={sendNotificationToFamily}
                                />
                              ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Sidebar widgets specific to Dad */}
                    <div className="lg:col-span-4 justify-start">
                      <div
                        className={`${currentTheme.card} p-8 rounded-[2.5rem] shadow-sm flex flex-col justify-between relative overflow-hidden h-fit`}
                      >
                        <div className="relative z-10">
                          <span className="text-[10px] font-black uppercase tracking-widest opacity-40">
                            {language === "es"
                              ? `Perfil de ${papaName}`
                              : `${papaName}'s Profile`}
                          </span>
                          <h4 className="text-xl font-black uppercase tracking-tighter italic mt-2">
                            {language === "es" ? "Rendimiento" : "Productivity"}
                          </h4>
                          <p className="text-xs font-bold opacity-50 mt-4 leading-relaxed">
                            {language === "es"
                              ? `Un espacio diseñado para que ${papaName} mantenga enfocados sus objetivos diarios y controle sus tareas del hogar sin distracciones.`
                              : `A clean space designed to keep ${papaName} focused on daily targets and keep household tasks running smoothly without clutter.`}
                          </p>
                        </div>

                        <div className="mt-8 relative z-10 flex items-end gap-6">
                          <div>
                            <span className="text-5xl font-black italic tracking-tighter block leading-none text-blue-500">
                              {
                                tasks.filter(
                                  (t) =>
                                    isPapa(t.assignedTo) &&
                                    t.status === "Completed",
                                ).length
                              }
                            </span>
                            <span className="text-[9px] font-black uppercase tracking-wider opacity-40 mt-2 block">
                              {language === "es" ? "Completadas" : "Done"}
                            </span>
                          </div>
                          <div className="h-10 w-[1.5px] bg-black/10 dark:bg-white/10"></div>
                          <div>
                            <span className="text-5xl font-black italic tracking-tighter block leading-none">
                              {tasks.filter((t) => isPapa(t.assignedTo)).length}
                            </span>
                            <span className="text-[9px] font-black uppercase tracking-wider opacity-40 mt-2 block">
                              {language === "es" ? "Totales" : "Total"}
                            </span>
                          </div>
                        </div>

                        {/* Ambient background decoration */}
                        <div className="absolute -bottom-20 -right-20 w-48 h-48 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeHub.startsWith("member_") &&
                (() => {
                  const memberId = activeHub.replace("member_", "");
                  const member = customMembers.find(
                    (m: any) => m.id === memberId,
                  );
                  if (!member) return null;

                  const isDad =
                    member.role.toLowerCase().includes("papá") ||
                    member.role.toLowerCase().includes("padre");
                  const isMom =
                    member.role.toLowerCase().includes("mamá") ||
                    member.role.toLowerCase().includes("madre");
                  const themeColor = isDad
                    ? "blue"
                    : isMom
                      ? "rose"
                      : "emerald";
                  const titleColorClass = isDad
                    ? "text-blue-500"
                    : isMom
                      ? "text-rose-500"
                      : "text-emerald-500";
                  const bannerBg = isDad
                    ? "bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-500 shadow-blue-500/25"
                    : isMom
                      ? "bg-gradient-to-r from-rose-500 via-pink-600 to-purple-500 shadow-rose-500/25"
                      : "bg-gradient-to-r from-emerald-500 via-teal-600 to-cyan-500 shadow-emerald-500/25";
                  const bannerIcon = isDad ? (
                    <User className="w-full h-full" />
                  ) : isMom ? (
                    <Heart className="w-full h-full fill-white/20" />
                  ) : (
                    <Smile className="w-full h-full text-white/50" />
                  );
                  const checkIconColor = isDad
                    ? "text-blue-500"
                    : isMom
                      ? "text-rose-500"
                      : "text-emerald-500";

                  return (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
                      <div
                        className={`p-6 sm:p-10 rounded-[2rem] sm:rounded-[3rem] ${bannerBg} text-white border-none shadow-xl relative overflow-hidden`}
                      >
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
                          <div className="flex items-center gap-4 sm:gap-6">
                            <div
                              onClick={() => setShowAvatarModal(member.id)}
                              className="relative group/avatar cursor-pointer shrink-0"
                              title={
                                language === "es"
                                  ? `Cambiar foto de ${member.name}`
                                  : `Change ${member.name}'s photo`
                              }
                            >
                              {member.photoURL ? (
                                <img
                                  src={member.photoURL}
                                  alt={member.name}
                                  className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl object-cover border-2 border-white/20 shadow-md group-hover/avatar:scale-105 transition-all duration-300 animate-in fade-in"
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-white/10 rounded-2xl flex items-center justify-center p-2 text-white/90 group-hover/avatar:scale-105 transition-all duration-300 animate-in fade-in">
                                  {bannerIcon}
                                </div>
                              )}
                              <div className="absolute inset-0 bg-black/40 rounded-2xl opacity-0 group-hover/avatar:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                                <Camera
                                  size={18}
                                  className="text-white hover:scale-110 active:scale-95 transition-transform"
                                />
                              </div>
                            </div>
                            <div>
                              <h2 className="text-2xl sm:text-4xl font-black italic uppercase tracking-tighter">
                                {language === "es"
                                  ? `Misiones de ${member.name}`
                                  : `${member.name}'s Missions`}
                              </h2>
                              <p className="text-xs sm:text-sm font-bold opacity-80 mt-1">
                                {language === "es"
                                  ? `Espacio exclusivo de ${member.name} para objetivos y responsabilidades`
                                  : `${member.name}’s exclusive workspace for personal responsibilities`}
                              </p>
                            </div>
                          </div>
                          <div className="px-5 py-2.5 bg-white/10 backdrop-blur-md rounded-2xl border border-white/15">
                            <span className="text-xs sm:text-sm font-black tracking-tight">
                              {
                                tasks.filter(
                                  (t) =>
                                    t.assignedTo === member.name &&
                                    t.status !== "Completed",
                                ).length
                              }{" "}
                              {language === "es" ? "Pendientes" : "Pending"}
                            </span>
                          </div>
                        </div>

                        <form
                          onSubmit={handleAddTask}
                          className="flex flex-col gap-3"
                        >
                          <div className="flex flex-col sm:flex-row gap-3 w-full">
                            <div className="flex-grow flex gap-2 items-center min-w-0">
                              <input
                                value={newTask}
                                onChange={(e) => setNewTask(e.target.value)}
                                placeholder={
                                  language === "es"
                                    ? `Añadir nueva tarea para ${member.name}...`
                                    : `Add a new task for ${member.name}...`
                                }
                                className="w-full bg-white/10 placeholder:text-white/40 px-6 py-4 sm:px-8 sm:py-4 rounded-xl outline-none font-bold text-sm sm:text-lg border border-white/5 focus:bg-white/20 transition-all shadow-inner"
                              />
                              <VoiceInputButton
                                value={newTask}
                                onChange={setNewTask}
                                language={language}
                                isDark={isDark}
                                className="shrink-0"
                              />
                            </div>
                            <button
                              type="submit"
                              className="px-6 py-4 bg-zinc-950 text-white rounded-xl font-black uppercase tracking-widest text-xs shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 shrink-0"
                            >
                              <Plus size={16} />
                              {t.inject}
                            </button>
                          </div>

                          <div className="flex flex-wrap items-center gap-4 mt-3 px-4 py-3 bg-white/5 rounded-2xl border border-white/5">
                            {/* Reminder Picker */}
                            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                              <span className="text-xs font-bold opacity-80 flex items-center gap-1">
                                <Clock size={14} />
                                {language === "es"
                                  ? "Recordatorio:"
                                  : "Reminder:"}
                              </span>
                              <input
                                type="datetime-local"
                                value={newTaskReminder}
                                onChange={(e) =>
                                  setNewTaskReminder(e.target.value)
                                }
                                className="text-xs px-3 py-1.5 rounded-xl outline-none font-bold bg-white/10 border border-white/5 text-white w-full sm:w-auto min-w-0 max-w-full shrink"
                              />
                              {newTaskReminder && (
                                <button
                                  type="button"
                                  onClick={() => setNewTaskReminder("")}
                                  className="text-[9px] px-2 py-1 rounded-lg font-black uppercase bg-white/10 border border-white/5 hover:bg-white/25"
                                >
                                  {language === "es" ? "Limpiar" : "Clear"}
                                </button>
                              )}
                            </div>

                            <div className="h-4 w-[1px] bg-white/10 hidden sm:block"></div>

                            {/* Recurrence Option */}
                            <div className="flex items-center gap-2">
                              <label className="flex items-center gap-1.5 text-xs font-bold cursor-pointer opacity-80">
                                <input
                                  type="checkbox"
                                  checked={newTaskIsRecurring}
                                  onChange={(e) =>
                                    setNewTaskIsRecurring(e.target.checked)
                                  }
                                  className="w-4 h-4 rounded border-white/20 bg-white/10 text-indigo-550 focus:ring-indigo-505 cursor-pointer"
                                />
                                <span className="flex items-center gap-1">
                                  <RefreshCw size={12} />
                                  {language === "es"
                                    ? "Recurrente"
                                    : "Recurring"}
                                </span>
                              </label>

                              {newTaskIsRecurring && (
                                <div className="flex items-center gap-2 animate-in fade-in duration-200">
                                  <select
                                    value={newTaskRecurrenceFrequency}
                                    onChange={(e) =>
                                      setNewTaskRecurrenceFrequency(
                                        e.target.value as any,
                                      )
                                    }
                                    className="text-xs px-2 py-1 rounded-xl outline-none font-bold bg-white/10 border border-white/5 text-white"
                                  >
                                    <option
                                      value="daily"
                                      className="bg-zinc-900 text-white"
                                    >
                                      {language === "es" ? "Diario" : "Daily"}
                                    </option>
                                    <option
                                      value="weekly"
                                      className="bg-zinc-900 text-white"
                                    >
                                      {language === "es" ? "Semanal" : "Weekly"}
                                    </option>
                                    <option
                                      value="monthly"
                                      className="bg-zinc-900 text-white"
                                    >
                                      {language === "es"
                                        ? "Mensual"
                                        : "Monthly"}
                                    </option>
                                  </select>
                                </div>
                              )}
                            </div>
                          </div>
                        </form>
                      </div>

                      {/* Division Grid */}
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                        {/* Main Tasks List */}
                        <div className="lg:col-span-8 space-y-6">
                          <div className="flex items-center justify-between px-2 flex-wrap gap-4 select-none">
                            <h3 className="font-black text-xs uppercase tracking-[0.3em] opacity-40">
                              {language === "es"
                                ? `Lista de misiones de ${member.name}`
                                : `${member.name}'s Active Missions`}
                            </h3>

                            <button
                              onClick={handleAiPrioritizeTasks}
                              disabled={isPrioritizing}
                              className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-wider rounded-xl transition-all flex items-center gap-1 hover:scale-105 active:scale-95 cursor-pointer ${
                                isPrioritizing
                                  ? "bg-indigo-505/20 text-indigo-400"
                                  : "bg-[#4f46e5]/10 text-indigo-500 hover:bg-[#4f46e5]/20"
                              }`}
                            >
                              <Sparkles
                                size={10}
                                className={
                                  isPrioritizing ? "animate-pulse" : ""
                                }
                              />
                              {isPrioritizing
                                ? language === "es"
                                  ? "Priorizando..."
                                  : "Prioritizing..."
                                : language === "es"
                                  ? "Priorizar IA"
                                  : "AI Prioritize"}
                            </button>
                          </div>

                          <div className="grid grid-cols-1 gap-4">
                            {(() => {
                              const memberActiveTasks = tasks.filter(
                                (t) =>
                                  t.assignedTo === member.name &&
                                  t.status !== "Completed",
                              );
                              return memberActiveTasks.map((task) => (
                                <TaskCard
                                  key={task.id}
                                  task={task}
                                  onDelete={handleDeleteTask}
                                  onStatusChange={handleStatusChange}
                                  onAddImage={handleAddImage}
                                  onRemoveImage={handleRemoveImage}
                                  onUpdateTitle={handleUpdateTitle}
                                  onUpdateReminder={handleUpdateReminder}
                                  onUpdateDueDate={handleUpdateDueDate}
                                  onUpdateAssignment={handleUpdateAssignment}
                                  className={currentTheme.card}
                                  language={language}
                                  userData={userData}
                                  familyProfiles={familyProfiles}
                                  sendNotification={sendNotificationToFamily}
                                  draggable={true}
                                  onDragStart={(e) =>
                                    handleDragStart(e, task.id)
                                  }
                                  onDragOver={(e) => handleDragOver(e, task.id)}
                                  onDragLeave={handleDragLeave}
                                  onDrop={(e) =>
                                    handleDrop(e, task.id, memberActiveTasks)
                                  }
                                  isDragged={draggedTaskId === task.id}
                                  isDragTarget={dropTargetId === task.id}
                                />
                              ));
                            })()}

                            {tasks.filter(
                              (t) =>
                                t.assignedTo === member.name &&
                                t.status !== "Completed",
                            ).length === 0 && (
                              <div
                                className={`${currentTheme.card} p-12 py-20 rounded-[2.5rem] flex flex-col items-center justify-center border-none text-center shadow-inner`}
                              >
                                <CheckCircle
                                  size={64}
                                  className={`${checkIconColor} animate-[pulse_2s_infinite]`}
                                />
                                <h3 className="text-xl font-black uppercase tracking-tighter italic mt-6">
                                  {language === "es"
                                    ? "¡Todo Al Día!"
                                    : "All Caught Up!"}
                                </h3>
                                <p className="text-xs font-bold opacity-40 mt-2 max-w-sm">
                                  {language === "es"
                                    ? `${member.name} no tiene misiones pendientes en este momento.`
                                    : `${member.name} has no active missions right now.`}
                                </p>
                              </div>
                            )}
                          </div>

                          {/* Collapsible Completed Missions for member */}
                          {tasks.filter(
                            (t) =>
                              t.assignedTo === member.name &&
                              t.status === "Completed",
                          ).length > 0 && (
                            <div className="pt-6 border-t border-black/5 dark:border-white/5 space-y-4">
                              <h4 className="font-black text-xs uppercase tracking-[0.3em] opacity-40 px-2 flex items-center gap-2">
                                <span>
                                  {language === "es"
                                    ? "Misiones Completadas"
                                    : "Completed Missions"}
                                </span>
                                <span className="px-2 py-0.5 bg-black/5 dark:bg-white/10 rounded-full text-[10px] scale-90">
                                  {
                                    tasks.filter(
                                      (t) =>
                                        t.assignedTo === member.name &&
                                        t.status === "Completed",
                                    ).length
                                  }
                                </span>
                              </h4>
                              <div className="grid grid-cols-1 gap-4 opacity-75">
                                {tasks
                                  .filter(
                                    (t) =>
                                      t.assignedTo === member.name &&
                                      t.status === "Completed",
                                  )
                                  .map((task) => (
                                    <TaskCard
                                      key={task.id}
                                      task={task}
                                      onDelete={handleDeleteTask}
                                      onStatusChange={handleStatusChange}
                                      onAddImage={handleAddImage}
                                      onRemoveImage={handleRemoveImage}
                                      onUpdateTitle={handleUpdateTitle}
                                      onUpdateReminder={handleUpdateReminder}
                                      onUpdateDueDate={handleUpdateDueDate}
                                      onUpdateAssignment={
                                        handleUpdateAssignment
                                      }
                                      className={currentTheme.card}
                                      language={language}
                                      userData={userData}
                                      familyProfiles={familyProfiles}
                                      sendNotification={
                                        sendNotificationToFamily
                                      }
                                    />
                                  ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Sidebar widgets specific to member */}
                        <div className="lg:col-span-4 justify-start">
                          <div
                            className={`${currentTheme.card} p-8 rounded-[2.5rem] shadow-sm flex flex-col justify-between relative overflow-hidden h-fit`}
                          >
                            <div className="relative z-10">
                              <span className="text-[10px] font-black uppercase tracking-widest opacity-40">
                                {language === "es"
                                  ? `Perfil de ${member.name}`
                                  : `${member.name}'s Profile`}
                              </span>
                              <h4 className="text-xl font-black uppercase tracking-tighter italic mt-2">
                                {language === "es"
                                  ? "Rendimiento"
                                  : "Productivity"}
                              </h4>
                              <p className="text-xs font-bold opacity-50 mt-4 leading-relaxed">
                                {language === "es"
                                  ? `Un espacio diseñado para que ${member.name} mantenga enfocados sus objetivos diarios y controle sus tareas del hogar sin distracciones.`
                                  : `A clean space designed to keep ${member.name} focused on daily targets and keep household tasks running smoothly without clutter.`}
                              </p>
                            </div>

                            <div className="mt-8 relative z-10 flex items-end gap-6">
                              <div>
                                <span
                                  className={`text-5xl font-black italic tracking-tighter block leading-none ${titleColorClass}`}
                                >
                                  {
                                    tasks.filter(
                                      (t) =>
                                        t.assignedTo === member.name &&
                                        t.status === "Completed",
                                    ).length
                                  }
                                </span>
                                <span className="text-[9px] font-black uppercase tracking-wider opacity-40 mt-2 block">
                                  {language === "es" ? "Completadas" : "Done"}
                                </span>
                              </div>
                              <div className="h-10 w-[1.5px] bg-black/10 dark:bg-white/10"></div>
                              <div>
                                <span className="text-5xl font-black italic tracking-tighter block leading-none">
                                  {
                                    tasks.filter(
                                      (t) => t.assignedTo === member.name,
                                    ).length
                                  }
                                </span>
                                <span className="text-[9px] font-black uppercase tracking-wider opacity-40 mt-2 block">
                                  {language === "es" ? "Totales" : "Total"}
                                </span>
                              </div>
                            </div>

                            {/* Ambient background decoration */}
                            <div
                              className={`absolute -bottom-20 -right-20 w-48 h-48 rounded-full bg-${themeColor === "rose" ? "rose" : themeColor === "blue" ? "blue" : "emerald"}-500/10 blur-3xl pointer-events-none`}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

              {activeHub === "Mama" && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
                  <div className="p-6 sm:p-10 rounded-[2rem] sm:rounded-[3rem] bg-gradient-to-r from-rose-500 via-pink-600 to-purple-500 text-white border-none shadow-xl shadow-rose-500/25 relative overflow-hidden">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
                      <div className="flex items-center gap-4 sm:gap-6">
                        <div
                          onClick={() => setShowAvatarModal("mama")}
                          className="relative group/avatar cursor-pointer shrink-0"
                          title={
                            language === "es"
                              ? "Cambiar foto de Mamá"
                              : "Change Mom's photo"
                          }
                        >
                          {family?.mamaPhotoURL ? (
                            <img
                              src={family.mamaPhotoURL}
                              alt="Mom"
                              className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl object-cover border-2 border-white/20 shadow-md group-hover/avatar:scale-105 transition-all duration-300 animate-in fade-in"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-white/10 rounded-2xl flex items-center justify-center p-2 text-white/90 group-hover/avatar:scale-105 transition-all duration-300 animate-in fade-in">
                              <Heart className="w-full h-full fill-white/20" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black/40 rounded-2xl opacity-0 group-hover/avatar:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                            <Camera
                              size={18}
                              className="text-white hover:scale-110 active:scale-95 transition-transform"
                            />
                          </div>
                        </div>
                        <div>
                          <h2 className="text-2xl sm:text-4xl font-black italic uppercase tracking-tighter">
                            {language === "es"
                              ? `Misiones de ${mamaName}`
                              : `${mamaName}'s Missions`}
                          </h2>
                          <p className="text-xs sm:text-sm font-bold opacity-80 mt-1">
                            {language === "es"
                              ? `Espacio exclusivo de ${mamaName} para objetivos y responsabilidades`
                              : `${mamaName}’s exclusive workspace for personal responsibilities`}
                          </p>
                        </div>
                      </div>
                      <div className="px-5 py-2.5 bg-white/10 backdrop-blur-md rounded-2xl border border-white/15">
                        <span className="text-xs sm:text-sm font-black tracking-tight">
                          {
                            tasks.filter(
                              (t) =>
                                isMama(t.assignedTo) &&
                                t.status !== "Completed",
                            ).length
                          }{" "}
                          {language === "es" ? "Pendientes" : "Pending"}
                        </span>
                      </div>
                    </div>

                    <form
                      onSubmit={handleAddTask}
                      className="flex flex-col gap-3"
                    >
                      <div className="flex flex-col sm:flex-row gap-3 w-full">
                        <div className="flex-grow flex gap-2 items-center min-w-0">
                          <input
                            value={newTask}
                            onChange={(e) => setNewTask(e.target.value)}
                            placeholder={
                              language === "es"
                                ? `Añadir nueva tarea para ${mamaName}...`
                                : `Add a new task for ${mamaName}...`
                            }
                            className="w-full bg-white/10 placeholder:text-white/40 px-6 py-4 sm:px-8 sm:py-4 rounded-xl outline-none font-bold text-sm sm:text-lg border border-white/5 focus:bg-white/20 transition-all shadow-inner"
                          />
                          <VoiceInputButton
                            value={newTask}
                            onChange={setNewTask}
                            language={language}
                            isDark={isDark}
                            className="shrink-0"
                          />
                        </div>
                        <button
                          type="submit"
                          className="px-6 py-4 bg-zinc-950 text-white rounded-xl font-black uppercase tracking-widest text-xs shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 shrink-0"
                        >
                          <Plus size={16} />
                          {t.inject}
                        </button>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 mt-3 px-4 py-3 bg-white/5 rounded-2xl border border-white/5">
                        {/* Reminder Picker */}
                        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                          <span className="text-xs font-bold opacity-80 flex items-center gap-1">
                            <Clock size={14} />
                            {language === "es" ? "Recordatorio:" : "Reminder:"}
                          </span>
                          <input
                            type="datetime-local"
                            value={newTaskReminder}
                            onChange={(e) => setNewTaskReminder(e.target.value)}
                            className="text-xs px-3 py-1.5 rounded-xl outline-none font-bold bg-white/10 border border-white/5 text-white w-full sm:w-auto min-w-0 max-w-full shrink"
                          />
                          {newTaskReminder && (
                            <button
                              type="button"
                              onClick={() => setNewTaskReminder("")}
                              className="text-[9px] px-2 py-1 rounded-lg font-black uppercase bg-white/10 border border-white/5 hover:bg-white/25"
                            >
                              {language === "es" ? "Limpiar" : "Clear"}
                            </button>
                          )}
                        </div>

                        <div className="h-4 w-[1px] bg-white/10 hidden sm:block"></div>

                        {/* Recurrence Option */}
                        <div className="flex items-center gap-2">
                          <label className="flex items-center gap-1.5 text-xs font-bold cursor-pointer opacity-80">
                            <input
                              type="checkbox"
                              checked={newTaskIsRecurring}
                              onChange={(e) =>
                                setNewTaskIsRecurring(e.target.checked)
                              }
                              className="w-4 h-4 rounded border-white/20 bg-white/10 text-indigo-550 focus:ring-indigo-505 cursor-pointer"
                            />
                            <span className="flex items-center gap-1">
                              <RefreshCw size={12} />
                              {language === "es" ? "Recurrente" : "Recurring"}
                            </span>
                          </label>

                          {newTaskIsRecurring && (
                            <div className="flex items-center gap-2 animate-in fade-in duration-200">
                              <select
                                value={newTaskRecurrenceFrequency}
                                onChange={(e) =>
                                  setNewTaskRecurrenceFrequency(
                                    e.target.value as any,
                                  )
                                }
                                className="text-xs px-2 py-1 rounded-xl outline-none font-bold bg-white/10 border border-white/5 text-white"
                              >
                                <option
                                  value="daily"
                                  className="bg-zinc-900 text-white"
                                >
                                  {language === "es" ? "Diario" : "Daily"}
                                </option>
                                <option
                                  value="weekly"
                                  className="bg-zinc-900 text-white"
                                >
                                  {language === "es" ? "Semanal" : "Weekly"}
                                </option>
                                <option
                                  value="monthly"
                                  className="bg-zinc-900 text-white"
                                >
                                  {language === "es" ? "Mensual" : "Monthly"}
                                </option>
                              </select>
                            </div>
                          )}
                        </div>
                      </div>
                    </form>
                  </div>

                  {/* Division Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Main Tasks List */}
                    <div className="lg:col-span-8 space-y-6">
                      <div className="flex items-center justify-between px-2 flex-wrap gap-4 select-none">
                        <h3 className="font-black text-xs uppercase tracking-[0.3em] opacity-40">
                          {language === "es"
                            ? `Lista de misiones de ${mamaName}`
                            : `${mamaName}'s Active Missions`}
                        </h3>

                        <button
                          onClick={handleAiPrioritizeTasks}
                          disabled={isPrioritizing}
                          className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-wider rounded-xl transition-all flex items-center gap-1 hover:scale-105 active:scale-95 cursor-pointer ${
                            isPrioritizing
                              ? "bg-indigo-505/20 text-indigo-400"
                              : "bg-[#4f46e5]/10 text-indigo-500 hover:bg-[#4f46e5]/20"
                          }`}
                        >
                          <Sparkles
                            size={10}
                            className={isPrioritizing ? "animate-pulse" : ""}
                          />
                          {isPrioritizing
                            ? language === "es"
                              ? "Priorizando..."
                              : "Prioritizing..."
                            : language === "es"
                              ? "Priorizar IA"
                              : "AI Prioritize"}
                        </button>
                      </div>{" "}
                      <div className="grid grid-cols-1 gap-4">
                        {(() => {
                          const mamaActiveTasks = tasks.filter(
                            (t) =>
                              isMama(t.assignedTo) && t.status !== "Completed",
                          );
                          return mamaActiveTasks.map((task) => (
                            <TaskCard
                              key={task.id}
                              task={task}
                              onDelete={handleDeleteTask}
                              onStatusChange={handleStatusChange}
                              onAddImage={handleAddImage}
                              onRemoveImage={handleRemoveImage}
                              onUpdateTitle={handleUpdateTitle}
                              onUpdateReminder={handleUpdateReminder}
                              onUpdateDueDate={handleUpdateDueDate}
                              onUpdateAssignment={handleUpdateAssignment}
                              className={currentTheme.card}
                              language={language}
                              userData={userData}
                              familyProfiles={familyProfiles}
                              sendNotification={sendNotificationToFamily}
                              draggable={true}
                              onDragStart={(e) => handleDragStart(e, task.id)}
                              onDragOver={(e) => handleDragOver(e, task.id)}
                              onDragLeave={handleDragLeave}
                              onDrop={(e) =>
                                handleDrop(e, task.id, mamaActiveTasks)
                              }
                              isDragged={draggedTaskId === task.id}
                              isDragTarget={dropTargetId === task.id}
                            />
                          ));
                        })()}

                        {tasks.filter(
                          (t) =>
                            isMama(t.assignedTo) && t.status !== "Completed",
                        ).length === 0 && (
                          <div
                            className={`${currentTheme.card} p-12 py-20 rounded-[2.5rem] flex flex-col items-center justify-center border-none text-center shadow-inner`}
                          >
                            <CheckCircle
                              size={64}
                              className="text-rose-500 animate-[pulse_2s_infinite]"
                            />
                            <h3 className="text-xl font-black uppercase tracking-tighter italic mt-6">
                              {language === "es"
                                ? "¡Todo Al Día!"
                                : "All Caught Up!"}
                            </h3>
                            <p className="text-xs font-bold opacity-40 mt-2 max-w-sm">
                              {language === "es"
                                ? `${mamaName} no tiene misiones pendientes en este momento.`
                                : `${mamaName} has no active missions right now.`}
                            </p>
                          </div>
                        )}
                      </div>
                      {/* Collapsible Completed Missions for Mamá */}
                      {tasks.filter(
                        (t) => isMama(t.assignedTo) && t.status === "Completed",
                      ).length > 0 && (
                        <div className="pt-6 border-t border-black/5 dark:border-white/5 space-y-4">
                          <h4 className="font-black text-xs uppercase tracking-[0.3em] opacity-40 px-2 flex items-center gap-2">
                            <span>
                              {language === "es"
                                ? "Misiones Completadas"
                                : "Completed Missions"}
                            </span>
                            <span className="px-2 py-0.5 bg-black/5 dark:bg-white/10 rounded-full text-[10px] scale-90">
                              {
                                tasks.filter(
                                  (t) =>
                                    isMama(t.assignedTo) &&
                                    t.status === "Completed",
                                ).length
                              }
                            </span>
                          </h4>
                          <div className="grid grid-cols-1 gap-4 opacity-75">
                            {tasks
                              .filter(
                                (t) =>
                                  isMama(t.assignedTo) &&
                                  t.status === "Completed",
                              )
                              .map((task) => (
                                <TaskCard
                                  key={task.id}
                                  task={task}
                                  onDelete={handleDeleteTask}
                                  onStatusChange={handleStatusChange}
                                  onAddImage={handleAddImage}
                                  onRemoveImage={handleRemoveImage}
                                  onUpdateTitle={handleUpdateTitle}
                                  onUpdateReminder={handleUpdateReminder}
                                  onUpdateDueDate={handleUpdateDueDate}
                                  onUpdateAssignment={handleUpdateAssignment}
                                  className={currentTheme.card}
                                  language={language}
                                  userData={userData}
                                  familyProfiles={familyProfiles}
                                  sendNotification={sendNotificationToFamily}
                                />
                              ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Sidebar widgets specific to Mom */}
                    <div className="lg:col-span-4 justify-start">
                      <div
                        className={`${currentTheme.card} p-8 rounded-[2.5rem] shadow-sm flex flex-col justify-between relative overflow-hidden h-fit`}
                      >
                        <div className="relative z-10">
                          <span className="text-[10px] font-black uppercase tracking-widest opacity-40">
                            {language === "es"
                              ? `Perfil de ${mamaName}`
                              : `${mamaName}'s Profile`}
                          </span>
                          <h4 className="text-xl font-black uppercase tracking-tighter italic mt-2">
                            {language === "es" ? "Rendimiento" : "Productivity"}
                          </h4>
                          <p className="text-xs font-bold opacity-50 mt-4 leading-relaxed">
                            {language === "es"
                              ? `Un espacio diseñado para que ${mamaName} mantenga enfocados sus objetivos diarios y controle sus tareas del hogar de forma ágil y sincronizada.`
                              : `A clean space designed to keep ${mamaName} focused on daily targets and keep household tasks running smoothly and collaboratively.`}
                          </p>
                        </div>

                        <div className="mt-8 relative z-10 flex items-end gap-6">
                          <div>
                            <span className="text-5xl font-black italic tracking-tighter block leading-none text-rose-500">
                              {
                                tasks.filter(
                                  (t) =>
                                    isMama(t.assignedTo) &&
                                    t.status === "Completed",
                                ).length
                              }
                            </span>
                            <span className="text-[9px] font-black uppercase tracking-wider opacity-40 mt-2 block">
                              {language === "es" ? "Completadas" : "Done"}
                            </span>
                          </div>
                          <div className="h-10 w-[1.5px] bg-black/10 dark:bg-white/10"></div>
                          <div>
                            <span className="text-5xl font-black italic tracking-tighter block leading-none">
                              {tasks.filter((t) => isMama(t.assignedTo)).length}
                            </span>
                            <span className="text-[9px] font-black uppercase tracking-wider opacity-40 mt-2 block">
                              {language === "es" ? "Totales" : "Total"}
                            </span>
                          </div>
                        </div>

                        {/* Ambient background decoration */}
                        <div className="absolute -bottom-20 -right-20 w-48 h-48 rounded-full bg-rose-500/10 blur-3xl pointer-events-none" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeHub === "Shopping" && (
                <div className="space-y-8">
                  <div className="p-6 sm:p-10 rounded-[2rem] sm:rounded-[3rem] bg-emerald-500 text-white border-none shadow-xl shadow-emerald-500/20 relative overflow-hidden">
                    <div className="flex items-center gap-4 sm:gap-6 mb-6 sm:mb-8">
                      <ShoppingCart className="w-8 h-8 sm:w-12 sm:h-12 text-white/40" />
                      <h2 className="text-2xl sm:text-4xl font-black italic uppercase tracking-tighter">
                        {t.shopping}
                      </h2>
                    </div>
                    <form
                      onSubmit={handleAddTask}
                      className="flex flex-col gap-3"
                    >
                      <div className="flex flex-col sm:flex-row gap-3 w-full">
                        <div className="flex-grow flex gap-2 items-center min-w-0">
                          <input
                            value={newTask}
                            onChange={(e) => setNewTask(e.target.value)}
                            placeholder={t.addTodo}
                            className="w-full bg-white/20 px-6 py-4 sm:px-8 sm:py-5 rounded-2xl sm:rounded-3xl outline-none font-bold text-base sm:text-lg placeholder:text-white/40 border-2 border-transparent focus:bg-white/30 transition-all"
                          />
                          <VoiceInputButton
                            value={newTask}
                            onChange={setNewTask}
                            language={language}
                            isDark={isDark}
                            className="shrink-0"
                          />
                        </div>{" "}
                        <button className="px-6 py-4 sm:px-10 sm:py-5 bg-white text-emerald-600 rounded-2xl sm:rounded-3xl font-black uppercase tracking-widest text-xs hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2">
                          <Plus size={16} />
                          {t.inject}
                        </button>
                      </div>
                      {/* AI Live Categorization Suggestion */}
                      {isLiveCategorizing && (
                        <div className="flex items-center gap-2 text-xs font-bold opacity-80 animate-pulse text-white/80 py-1.5 px-3 bg-white/10 rounded-xl w-full">
                          <Sparkles
                            size={14}
                            className="animate-spin text-white shrink-0"
                          />
                          <span>
                            {language === "es"
                              ? "AI analizando detalles..."
                              : "AI analyzing details..."}
                          </span>
                        </div>
                      )}
                      {!isLiveCategorizing && liveSuggestion && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.98 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="flex flex-wrap items-center gap-2 p-3 bg-white/10 border border-white/20 rounded-xl text-xs font-bold w-full"
                        >
                          <Sparkles size={14} className="text-white shrink-0" />
                          <span className="text-white">
                            {language === "es"
                              ? "Categoría Sugerida:"
                              : "Suggested Category:"}
                          </span>
                          <span className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white border border-white/30 text-[10px] uppercase font-black tracking-wider">
                            {liveSuggestion.category}
                          </span>
                          {liveSuggestion.subCategory && (
                            <span className="px-2.5 py-1 rounded-lg bg-purple-700 text-white border border-white/30 text-[10px] uppercase font-extrabold tracking-wider">
                              {liveSuggestion.subCategory}
                            </span>
                          )}
                          <span className="px-2.5 py-1 rounded-lg bg-white/25 text-white border border-white/20 text-[10px] uppercase font-black tracking-wider">
                            {liveSuggestion.priority}
                          </span>
                          {liveSuggestion.assignedToSuggestion && (
                            <span className="text-[10px] text-white">
                              Assigned:{" "}
                              <strong className="font-extrabold">
                                {liveSuggestion.assignedToSuggestion}
                              </strong>
                            </span>
                          )}
                        </motion.div>
                      )}

                      <div className="flex flex-col md:flex-row md:items-center gap-4 mt-3 px-2 bg-white/5 p-4 rounded-2xl border border-white/10">
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="text-xs font-bold text-white/80 flex items-center gap-1.5">
                            🏷️
                            {language === "es" ? "Etiquetas:" : "Tags:"}
                          </span>
                          <input
                            type="text"
                            value={newTaskTags}
                            onChange={(e) => setNewTaskTags(e.target.value)}
                            placeholder="e.g. groceries, fresh"
                            className="text-xs bg-white/10 px-4 py-2 rounded-xl outline-none text-white font-bold border border-white/15 w-full sm:w-auto min-w-0 max-w-full shrink"
                          />
                        </div>

                        <div className="h-4 w-[1px] bg-white/20 hidden md:block"></div>

                        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                          <span className="text-xs font-bold text-white/80 flex items-center gap-1.5">
                            <Bell
                              size={14}
                              className="text-white/60 animate-bounce"
                            />
                            {language === "es"
                              ? "Programar Recordatorio:"
                              : "Set Reminder:"}
                          </span>
                          <input
                            type="datetime-local"
                            value={newTaskReminder}
                            onChange={(e) => setNewTaskReminder(e.target.value)}
                            className="text-xs bg-white/10 px-4 py-2 rounded-xl outline-none text-white font-bold border border-white/15 w-full sm:w-auto min-w-0 max-w-full shrink"
                          />
                          {newTaskReminder && (
                            <button
                              type="button"
                              onClick={() => setNewTaskReminder("")}
                              className="text-[10px] bg-white/5 border border-white/15 px-3 py-2 rounded-xl font-black hover:bg-white/15 text-white transition-colors uppercase tracking-[0.05em]"
                            >
                              {language === "es" ? "Limpiar" : "Clear"}
                            </button>
                          )}
                        </div>

                        <div className="h-4 w-[1px] bg-white/20 hidden md:block"></div>

                        <div className="flex flex-wrap items-center gap-3">
                          <label className="flex items-center gap-2 text-xs font-bold cursor-pointer text-white/80">
                            <input
                              type="checkbox"
                              checked={newTaskIsRecurring}
                              onChange={(e) =>
                                setNewTaskIsRecurring(e.target.checked)
                              }
                              className="w-4 h-4 rounded border-white/20 bg-white/10 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                            />
                            <span className="flex items-center gap-1.5 font-bold">
                              <RefreshCw size={14} className="text-white" />
                              {language === "es"
                                ? "Tarea Recurrente"
                                : "Recurring Task"}
                            </span>
                          </label>

                          {newTaskIsRecurring && (
                            <div className="flex flex-wrap items-center gap-2 animate-in fade-in slide-in-from-left-2 duration-200">
                              <select
                                value={newTaskRecurrenceFrequency}
                                onChange={(e) =>
                                  setNewTaskRecurrenceFrequency(
                                    e.target.value as any,
                                  )
                                }
                                className="text-xs px-3 py-2 rounded-xl outline-none font-bold border border-white/15 bg-[#10B981] text-white"
                              >
                                <option
                                  value="daily"
                                  className="bg-[#10B981] text-white"
                                >
                                  {language === "es" ? "Diario" : "Daily"}
                                </option>
                                <option
                                  value="weekly"
                                  className="bg-[#10B981] text-white"
                                >
                                  {language === "es" ? "Semanal" : "Weekly"}
                                </option>
                                <option
                                  value="monthly"
                                  className="bg-[#10B981] text-white"
                                >
                                  {language === "es" ? "Mensual" : "Monthly"}
                                </option>
                              </select>

                              <span className="text-[11px] font-bold text-white/60">
                                {language === "es" ? "hasta" : "until"}
                              </span>

                              <CustomDatePicker
                                value={newTaskRecurrenceEndDate}
                                onChange={setNewTaskRecurrenceEndDate}
                                showTime={false}
                                label=""
                                isDark={true}
                                language={language}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </form>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <h3 className="font-black text-xs uppercase tracking-[0.3em] opacity-40 px-4">
                        {t.pending}
                      </h3>
                      {tasks
                        .filter(
                          (t) =>
                            t.category === "Shopping" &&
                            t.status !== "Completed",
                        )
                        .map((item) => (
                          <div
                            key={item.id}
                            className={`${currentTheme.card} p-6 rounded-[2.5rem] flex items-center justify-between group border-black/5`}
                          >
                            <div className="flex items-center gap-4">
                              <button
                                onClick={() =>
                                  handleStatusChange(item.id, "Completed")
                                }
                                className="w-7 h-7 rounded-full border-2 border-slate-200 hover:bg-emerald-500 hover:border-emerald-500 transition-all"
                              />
                              <span className="font-black text-lg tracking-tight">
                                {item.title}
                              </span>
                            </div>
                            <button
                              onClick={() => handleDeleteTask(item.id)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity text-rose-500 p-2"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        ))}
                    </div>
                    <div
                      className={`p-8 rounded-[3rem] border transition-all ${isDark ? "bg-indigo-950/20 border-indigo-500/10 text-indigo-205" : "bg-indigo-50 border-[#DECDB3]/30 text-indigo-900"}`}
                    >
                      <h3
                        className={`text-lg font-black mb-6 flex items-center gap-3 ${isDark ? "text-indigo-300 font-black" : "text-indigo-900 font-extrabold"}`}
                      >
                        <Zap size={24} className="text-indigo-400" />
                        {t.groceriesAI}
                      </h3>
                      <div className="space-y-3">
                        {groceries.map((item, i) => (
                          <div
                            key={i}
                            className={`flex items-center justify-between p-4 rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer group ${isDark ? "bg-white/5 hover:bg-white/10 border border-white/5" : "bg-white"}`}
                            onClick={() =>
                              addDoc(collection(db, "tasks"), {
                                title: item,
                                category: "Shopping",
                                status: "Pending",
                                creatorId: userData?.uid,
                                familyId: family?.id,
                                createdAt: serverTimestamp(),
                              })
                            }
                          >
                            <span
                              className={`text-sm font-bold ${isDark ? "text-zinc-200" : "text-indigo-900"}`}
                            >
                              {item}
                            </span>
                            <Plus
                              size={16}
                              className={`${isDark ? "text-indigo-455" : "text-indigo-300"} group-hover:text-indigo-500`}
                            />
                          </div>
                        ))}
                        <button
                          onClick={fetchGroceries}
                          className={`w-full py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest mt-4 shadow-lg transition-all ${isDark ? "bg-indigo-600 text-white hover:bg-indigo-500 shadow-indigo-950/50" : "bg-indigo-500 text-white hover:bg-indigo-600 shadow-indigo-200"}`}
                        >
                          {t.generateGroceries}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeHub === "Album" && (
                <AlbumHub
                  photos={photos}
                  familyId={family?.id || ""}
                  theme={currentTheme}
                  language={language}
                  userData={userData}
                  sendNotification={sendNotificationToFamily}
                />
              )}

              {activeHub === "Finance" &&
                (!isFinanceRestricted ? (
                  <FinanceHub
                    expenses={expenses}
                    vacations={vacations}
                    familyId={family?.id || ""}
                    theme={currentTheme}
                    language={language}
                    userData={userData}
                    sendNotification={sendNotificationToFamily}
                    familyProfiles={familyProfiles}
                  />
                ) : (
                  <div
                    className={`${currentTheme.card} p-12 text-center rounded-[3rem]`}
                  >
                    <Lock size={48} className="mx-auto mb-4 text-amber-500" />
                    <h3 className="text-xl font-black">
                      {language === "es"
                        ? "Acceso Restringido"
                        : "Restricted Access"}
                    </h3>
                    <p className="text-xs opacity-50 mt-2">
                      {language === "es"
                        ? "No tienes permisos para ver la sección de finanzas."
                        : "You do not have permissions to view the finance section."}
                    </p>
                  </div>
                ))}

              {activeHub === "Calendar" && (
                <CalendarHub
                  events={events}
                  tasks={tasks}
                  familyId={family?.id || ""}
                  theme={currentTheme}
                  language={language}
                  userData={userData}
                  onStatusChange={handleStatusChange}
                  familyProfiles={familyProfiles}
                />
              )}

              {activeHub === "Vacation" && (
                <div className="space-y-8">
                  <VacationPlanner
                    vacations={vacations}
                    expenses={expenses}
                    familyId={family?.id || ""}
                    theme={currentTheme}
                    language={language}
                    userData={userData}
                    sendNotification={sendNotificationToFamily}
                    isFinanceRestricted={isFinanceRestricted}
                  />

                  <div className="flex items-center justify-between mb-6 flex-wrap gap-4 select-none px-2 w-full">
                    <h3 className="font-black text-xs uppercase tracking-[0.3em] opacity-40">
                      {language === "es"
                        ? "Lista de misiones"
                        : "Missions list"}
                    </h3>
                    <div className="flex bg-black/5 dark:bg-white/5 p-1 rounded-2xl gap-1 border border-black/5 dark:border-white/5 w-full sm:w-auto">
                      <button
                        onClick={() => setAssigneeFilter("all")}
                        type="button"
                        className={`px-5 py-2 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all ${assigneeFilter === "all" ? (isDark ? "bg-white text-zinc-900 shadow-md" : "bg-zinc-950 text-white shadow-md") : "opacity-40 hover:opacity-100 dark:text-zinc-400"}`}
                      >
                        👥 {language === "es" ? "Ambos" : "Both"}
                      </button>
                      <button
                        onClick={() => setAssigneeFilter("papa")}
                        type="button"
                        className={`px-5 py-2 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all ${assigneeFilter === "papa" ? "bg-blue-600 text-white shadow-sm" : "opacity-40 hover:opacity-100 dark:text-zinc-400"}`}
                      >
                        👦 Papá
                      </button>
                      <button
                        onClick={() => setAssigneeFilter("mama")}
                        type="button"
                        className={`px-5 py-2 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all ${assigneeFilter === "mama" ? "bg-rose-600 text-white shadow-sm" : "opacity-40 hover:opacity-100 dark:text-zinc-400"}`}
                      >
                        👩 Mamá
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {(() => {
                      const vacationActiveTasks = tasks
                        .filter(
                          (t) =>
                            t.category === "Vacation" &&
                            t.status !== "Completed",
                        )
                        .filter((t) => {
                          if (assigneeFilter === "papa")
                            return isPapa(t.assignedTo);
                          if (assigneeFilter === "mama")
                            return isMama(t.assignedTo);
                          return true;
                        });
                      return vacationActiveTasks.map((task) => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          onDelete={handleDeleteTask}
                          onStatusChange={handleStatusChange}
                          onAddImage={handleAddImage}
                          onRemoveImage={handleRemoveImage}
                          onUpdateTitle={handleUpdateTitle}
                          onUpdateReminder={handleUpdateReminder}
                          onUpdateDueDate={handleUpdateDueDate}
                          className={currentTheme.card}
                          language={language}
                          userData={userData}
                          familyProfiles={familyProfiles}
                          sendNotification={sendNotificationToFamily}
                          draggable={true}
                          onDragStart={(e) => handleDragStart(e, task.id)}
                          onDragOver={(e) => handleDragOver(e, task.id)}
                          onDragLeave={handleDragLeave}
                          onDrop={(e) =>
                            handleDrop(e, task.id, vacationActiveTasks)
                          }
                          isDragged={draggedTaskId === task.id}
                          isDragTarget={dropTargetId === task.id}
                        />
                      ));
                    })()}
                  </div>
                </div>
              )}

              {activeHub === "Completed" && (
                <div className="space-y-6">
                  {/* Title Card */}
                  <div
                    className={`${currentTheme.card} p-6 sm:p-10 rounded-[2rem] sm:rounded-[3rem] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-6`}
                  >
                    <div className="flex items-center gap-4">
                      <span
                        className="p-3 bg-emerald-500/10 dark:bg-emerald-500/15 rounded-2xl"
                        style={{ color: "#10B981" }}
                      >
                        <CheckCircle2 className="w-8 h-8 sm:w-10 sm:h-10 text-emerald-500" />
                      </span>
                      <div>
                        <h2 className="text-2xl sm:text-4xl font-black italic uppercase tracking-tighter">
                          {language === "es"
                            ? "Misiones Completadas"
                            : "Completed Missions"}
                        </h2>
                        <p className="text-xs opacity-50 font-bold uppercase tracking-widest mt-1">
                          {language === "es"
                            ? `${tasks.filter((t) => t.status === "Completed").length} tareas archivadas con éxito`
                            : `${tasks.filter((t) => t.status === "Completed").length} successfully archived tasks`}
                        </p>
                      </div>
                    </div>

                    {tasks.filter((t) => t.status === "Completed").length >
                      0 && (
                      <button
                        onClick={handleClearAllCompleted}
                        className="px-6 py-3.5 bg-rose-500/10 hover:bg-rose-600 border border-rose-500/20 hover:border-transparent text-rose-600 dark:text-rose-450 hover:text-white rounded-2xl font-black uppercase text-xs tracking-widest transition-all duration-300 flex items-center justify-center gap-2"
                      >
                        <Trash2 size={16} />
                        <span>
                          {language === "es" ? "Limpiar Todo" : "Clear All"}
                        </span>
                      </button>
                    )}
                  </div>

                  {/* Auto-Archive Settings Card */}
                  <div
                    className={`${currentTheme.card} p-5 sm:p-6 rounded-[1.5rem] sm:rounded-[2rem] shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-indigo-500/20 bg-indigo-500/[0.04]`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-indigo-500/10 dark:bg-indigo-500/15 rounded-2xl text-indigo-500 flex items-center justify-center">
                        <Clock size={20} className="text-indigo-500 shrink-0" />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-sm sm:text-base tracking-tight">
                          {language === "es"
                            ? "Auto-archivar de forma automática tras 24 horas"
                            : "Automatically auto-archive after 24 hours"}
                        </h4>
                        <p className="text-[10px] sm:text-xs opacity-70 font-bold uppercase tracking-wide mt-1 text-slate-400">
                          {language === "es"
                            ? "Borra misiones completadas tras 24 horas para mantener tu espacio de trabajo completamente limpio."
                            : "Cleans up completed missions after 24 hours to keep the family task list perfectly clean."}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setAutoArchiveCompleted(!autoArchiveCompleted)
                      }
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        autoArchiveCompleted
                          ? "bg-emerald-500"
                          : "bg-slate-300 dark:bg-zinc-700"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                          autoArchiveCompleted
                            ? "translate-x-5"
                            : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>

                  {/* Filters Bar Card */}
                  <div
                    className={`${currentTheme.card} p-4 sm:p-6 rounded-[1.5rem] sm:rounded-[2rem] shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4`}
                  >
                    {/* Search Field */}
                    <div className="relative flex items-center w-full">
                      <Search className="absolute left-4 w-4 h-4 opacity-40" />
                      <input
                        type="text"
                        value={completedSearch}
                        onChange={(e) => setCompletedSearch(e.target.value)}
                        placeholder={
                          language === "es"
                            ? "Buscar por título..."
                            : "Search by title..."
                        }
                        className={`w-full pl-11 pr-4 py-3 sm:py-3.5 rounded-xl text-xs font-bold outline-none border transition-all ${
                          isDark
                            ? "bg-white/5 border-white/10 focus:border-white/20 text-white placeholder:text-white/30"
                            : "bg-black/5 border-black/5 focus:border-black/10 text-zinc-900 placeholder:text-zinc-650/40"
                        }`}
                      />
                    </div>

                    {/* Category Filter */}
                    <div className="flex items-center gap-2 w-full">
                      <span className="text-[10px] uppercase font-black tracking-wider opacity-50 shrink-0">
                        {language === "es" ? "Categoría:" : "Category:"}
                      </span>
                      <select
                        value={completedFilterCategory}
                        onChange={(e) =>
                          setCompletedFilterCategory(e.target.value)
                        }
                        className={`w-full px-4 py-3 sm:py-3.5 rounded-xl text-xs font-bold outline-none border transition-all ${
                          isDark
                            ? "bg-[#18181B] border-white/10 text-white focus:border-white/20"
                            : "bg-white border-zinc-200 text-zinc-850 focus:border-zinc-350"
                        }`}
                      >
                        <option value="All">
                          {language === "es" ? "Todas" : "All"}
                        </option>
                        <option value="Shopping">
                          {language === "es" ? "Despensa" : "Shopping"}
                        </option>
                        <option value="Home">
                          {language === "es" ? "Toda la casa" : "Home"}
                        </option>
                        <option value="School">
                          {language === "es" ? "Escuela" : "School"}
                        </option>
                        <option value="Vacation">
                          {language === "es" ? "Vacaciones" : "Vacation"}
                        </option>
                        <option value="Health">
                          {language === "es" ? "Salud" : "Health"}
                        </option>
                        <option value="Celebration">
                          {language === "es" ? "Celebración" : "Celebration"}
                        </option>
                        <option value="Travel">
                          {language === "es" ? "Viaje" : "Travel"}
                        </option>
                        <option value="Other">
                          {language === "es" ? "Otro" : "Other"}
                        </option>
                      </select>
                    </div>

                    {/* Assignee Filter */}
                    <div className="flex items-center gap-2 w-full">
                      <span className="text-[10px] uppercase font-black tracking-wider opacity-50 shrink-0">
                        {language === "es" ? "Asignado:" : "Assignee:"}
                      </span>
                      <select
                        value={completedFilterAssignee}
                        onChange={(e) =>
                          setCompletedFilterAssignee(e.target.value)
                        }
                        className={`w-full px-4 py-3 sm:py-3.5 rounded-xl text-xs font-bold outline-none border transition-all ${
                          isDark
                            ? "bg-[#18181B] border-white/10 text-white focus:border-white/20"
                            : "bg-white border-zinc-200 text-zinc-850 focus:border-zinc-350"
                        }`}
                      >
                        <option value="All">
                          {language === "es" ? "Todos" : "All"}
                        </option>
                        <option value="papa">{papaName}</option>
                        <option value="mama">{mamaName}</option>
                        {Object.entries(familyProfiles).map(([uid, name]) => {
                          // Avoid duplicate Papá / Mamá mappings
                          if (name === papaName || name === mamaName)
                            return null;
                          return (
                            <option key={uid} value={uid}>
                              {name}
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    {/* Date Sort Toggle */}
                    <div className="flex items-center gap-2 w-full">
                      <span className="text-[10px] uppercase font-black tracking-wider opacity-50 shrink-0">
                        {language === "es" ? "Orden:" : "Sort:"}
                      </span>
                      <select
                        value={completedSortOrder}
                        onChange={(e) =>
                          setCompletedSortOrder(
                            e.target.value as "newest" | "oldest",
                          )
                        }
                        className={`w-full px-4 py-3 sm:py-3.5 rounded-xl text-xs font-bold outline-none border transition-all ${
                          isDark
                            ? "bg-[#18181B] border-white/10 text-white focus:border-white/20"
                            : "bg-white border-zinc-200 text-zinc-850 focus:border-zinc-350"
                        }`}
                      >
                        <option value="newest">
                          {language === "es" ? "Recientes" : "Newest"}
                        </option>
                        <option value="oldest">
                          {language === "es" ? "Antiguos" : "Oldest"}
                        </option>
                      </select>
                    </div>
                  </div>

                  {/* Results List */}
                  <div className="space-y-4">
                    {(() => {
                      const completedTasks = tasks.filter(
                        (t) => t.status === "Completed",
                      );
                      const filtered = completedTasks.filter((t) => {
                        const matchesSearch = t.title
                          .toLowerCase()
                          .includes(completedSearch.toLowerCase());
                        const matchesCategory =
                          completedFilterCategory === "All" ||
                          t.category === completedFilterCategory;
                        const matchesAssignee =
                          completedFilterAssignee === "All" ||
                          (completedFilterAssignee === "papa" &&
                            isPapa(t.assignedTo)) ||
                          (completedFilterAssignee === "mama" &&
                            isMama(t.assignedTo)) ||
                          completedFilterAssignee === t.assignedTo;
                        return (
                          matchesSearch && matchesCategory && matchesAssignee
                        );
                      });

                      if (completedTasks.length === 0) {
                        return (
                          <div
                            className={`${currentTheme.card} p-12 text-center rounded-[2.5rem] flex flex-col items-center justify-center border-none shadow-inner`}
                          >
                            <CheckCircle2
                              size={48}
                              className="text-emerald-500/40 mb-4 animate-bounce"
                            />
                            <h3 className="text-xl font-black">
                              {language === "es"
                                ? "¡Todo al día!"
                                : "All Clear!"}
                            </h3>
                            <p className="text-xs opacity-50 mt-2 max-w-md mx-auto">
                              {language === "es"
                                ? "No hay misiones completadas registradas en el servidor. ¡Sigue completando tareas pendientes para verlas archivadas aquí!"
                                : "No completed missions are stored on the server. Complete some pending tasks to see them archived right here!"}
                            </p>
                          </div>
                        );
                      }

                      // Sort completed tasks by completedAt timestamp, with fallback to createdAt
                      filtered.sort((a, b) => {
                        const getMs = (task: Task) => {
                          if (task.completedAt) {
                            return new Date(task.completedAt).getTime();
                          }
                          if (task.createdAt) {
                            if (task.createdAt.seconds) {
                              return task.createdAt.seconds * 1000;
                            }
                            if (typeof task.createdAt === "string") {
                              return new Date(task.createdAt).getTime();
                            }
                            if (task.createdAt instanceof Date) {
                              return task.createdAt.getTime();
                            }
                          }
                          return 0;
                        };

                        const timeA = getMs(a);
                        const timeB = getMs(b);

                        if (completedSortOrder === "newest") {
                          return timeB - timeA;
                        } else {
                          return timeA - timeB;
                        }
                      });

                      if (filtered.length === 0) {
                        return (
                          <div
                            className={`${currentTheme.card} p-10 text-center rounded-[2rem] flex flex-col items-center justify-center border-none shadow-sm`}
                          >
                            <span className="text-3xl mb-3">🔍</span>
                            <h3 className="font-extrabold text-sm">
                              {language === "es"
                                ? "Sin Coincidencias"
                                : "No Matches"}
                            </h3>
                            <p className="text-xs opacity-40 mt-1">
                              {language === "es"
                                ? "Ninguna misión completada coincide con tus filtros de búsqueda."
                                : "No completed missions match your filtering criteria."}
                            </p>
                          </div>
                        );
                      }

                      const categoryInfo: Record<
                        string,
                        {
                          label: string;
                          bg: string;
                          text: string;
                          icon: string;
                        }
                      > = {
                        Shopping: {
                          label: language === "es" ? "Despensa" : "Shopping",
                          bg: "bg-emerald-500/10",
                          text: "text-emerald-500",
                          icon: "🛒",
                        },
                        Home: {
                          label: language === "es" ? "Casa" : "Home",
                          bg: "bg-blue-500/10",
                          text: "text-blue-500",
                          icon: "🏠",
                        },
                        School: {
                          label: language === "es" ? "Escuela" : "School",
                          bg: "bg-indigo-500/10",
                          text: "text-indigo-500",
                          icon: "📚",
                        },
                        Vacation: {
                          label: language === "es" ? "Vacaciones" : "Vacation",
                          bg: "bg-amber-500/10",
                          text: "text-amber-500",
                          icon: "🌴",
                        },
                        Health: {
                          label: language === "es" ? "Salud" : "Health",
                          bg: "bg-rose-500/10",
                          text: "text-rose-500",
                          icon: "❤️",
                        },
                        Celebration: {
                          label: language === "es" ? "Fiesta" : "Celebration",
                          bg: "bg-purple-500/10",
                          text: "text-purple-500",
                          icon: "🎁",
                        },
                        Travel: {
                          label: language === "es" ? "Viaje" : "Travel",
                          bg: "bg-cyan-500/10",
                          text: "text-cyan-500",
                          icon: "📍",
                        },
                        Other: {
                          label: language === "es" ? "Otro" : "Other",
                          bg: "bg-zinc-500/10",
                          text: "text-zinc-500",
                          icon: "📋",
                        },
                      };

                      return (
                        <div className="grid grid-cols-1 gap-3.5">
                          <AnimatePresence mode="popLayout">
                            {filtered.map((task) => {
                              const cat =
                                categoryInfo[task.category] ||
                                categoryInfo["Other"];
                              return (
                                <motion.div
                                  layout
                                  key={task.id}
                                  initial={{ opacity: 0, y: 15 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, x: -50 }}
                                  className={`${currentTheme.card} p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-black/5 dark:border-white/5 hover:shadow-md transition-shadow duration-200 group`}
                                >
                                  <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
                                    <div className="p-2 sm:p-2.5 bg-emerald-500/10 rounded-xl text-emerald-500 mt-1 sm:mt-0">
                                      <Check size={18} strokeWidth={3} />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <h4 className="font-extrabold text-sm sm:text-base tracking-tight line-through opacity-60 text-slate-500 truncate">
                                        {task.title}
                                      </h4>
                                      <div className="flex flex-wrap items-center gap-2 mt-1.5">
                                        {/* Category Stamp */}
                                        <span
                                          className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider ${cat.bg} ${cat.text} flex items-center gap-1`}
                                        >
                                          <span>{cat.icon}</span>
                                          <span>{cat.label}</span>
                                        </span>

                                        {/* Priority Indicator */}
                                        <span
                                          className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider ${
                                            task.priority === "Critical"
                                              ? "bg-rose-500/10 text-rose-500"
                                              : task.priority === "High"
                                                ? "bg-orange-500/10 text-orange-500"
                                                : task.priority === "Medium"
                                                  ? "bg-blue-500/10 text-blue-500"
                                                  : "bg-slate-500/10 text-slate-500"
                                          }`}
                                        >
                                          {task.priority || "Low"}
                                        </span>

                                        {/* Assignee Badge */}
                                        {task.assignedTo && (
                                          <span className="px-2 py-0.5 rounded-lg bg-zinc-500/5 text-zinc-500 text-[9px] font-extrabold uppercase tracking-wide flex items-center gap-1 border border-zinc-500/5">
                                            👤{" "}
                                            {isPapa(task.assignedTo)
                                              ? papaName
                                              : isMama(task.assignedTo)
                                                ? mamaName
                                                : familyProfiles[
                                                    task.assignedTo
                                                  ] || task.assignedTo}
                                          </span>
                                        )}

                                        {/* Completion Date */}
                                        {task.dueDate && (
                                          <span className="px-2 py-0.5 rounded-lg bg-zinc-500/5 text-zinc-400 text-[9px] font-bold tracking-wide">
                                            📅{" "}
                                            {format(
                                              new Date(task.dueDate),
                                              "dd / MM",
                                            )}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2.5 w-full sm:w-auto shrink-0 sm:opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                    {/* Restore Button */}
                                    <button
                                      onClick={() =>
                                        handleStatusChange(task.id, "Pending")
                                      }
                                      className={`flex-1 sm:flex-none px-3.5 py-2 sm:py-2.5 rounded-xl text-xs font-black uppercase tracking-widest border transition-all duration-200 flex items-center justify-center gap-1.5 ${
                                        isDark
                                          ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-white"
                                          : "bg-emerald-50 border-emerald-100/50 text-emerald-600 hover:bg-emerald-600 hover:text-white"
                                      }`}
                                    >
                                      <RefreshCw size={13} strokeWidth={2.5} />
                                      <span className="text-[10px]">
                                        {language === "es"
                                          ? "Recuperar"
                                          : "Restore"}
                                      </span>
                                    </button>

                                    {/* Delete Permanently Button */}
                                    <button
                                      onClick={() => handleDeleteTask(task.id)}
                                      className={`flex-1 sm:flex-none px-3.5 py-2 sm:py-2.5 rounded-xl text-xs font-black uppercase tracking-widest border transition-all duration-200 flex items-center justify-center gap-1.5 ${
                                        isDark
                                          ? "bg-rose-500/10 border-rose-500/20 text-rose-400 hover:bg-rose-500 hover:text-white"
                                          : "bg-rose-50 border-rose-100/50 text-rose-600 hover:bg-rose-600 hover:text-white"
                                      }`}
                                    >
                                      <Trash2 size={13} />
                                      <span className="text-[10px]">
                                        {language === "es"
                                          ? "Eliminar"
                                          : "Delete"}
                                      </span>
                                    </button>
                                  </div>
                                </motion.div>
                              );
                            })}
                          </AnimatePresence>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}

              {activeHub === "Trophies" && (
                <FamilyTrophies
                  trophies={trophies}
                  family={family}
                  familyProfiles={familyProfiles}
                  language={language}
                  theme={currentTheme}
                  userData={userData}
                  onAwardTrophy={handleAwardTrophy}
                  onDeleteTrophy={handleDeleteTrophy}
                  tasks={tasks}
                  expenses={expenses}
                  messages={messages}
                  photos={photos}
                />
              )}

              {![
                "Dashboard",
                "Today",
                "Papa",
                "Mama",
                "Shopping",
                "Album",
                "Vacation",
                "Calendar",
                "Finance",
                "Completed",
                "Trophies",
              ].includes(activeHub) && (
                <div className="space-y-8">
                  <div
                    className={`${currentTheme.card} p-6 sm:p-12 rounded-[2rem] sm:rounded-[4rem] shadow-sm`}
                  >
                    <h2 className="text-2xl sm:text-5xl font-black italic uppercase tracking-tighter mb-6 sm:mb-8 flex items-center gap-4 sm:gap-6">
                      <span
                        className="p-3 sm:p-4 bg-black/5 rounded-2xl sm:rounded-3xl"
                        style={{ color: currentTheme.accent }}
                      >
                        {activeHub === "Dashboard" ? (
                          <Home className="w-8 h-8 sm:w-12 sm:h-12" />
                        ) : (
                          hubs.find((h) => h.id === activeHub)?.icon &&
                          React.createElement(
                            hubs.find((h) => h.id === activeHub)!.icon,
                            { className: "w-8 h-8 sm:w-12 sm:h-12" },
                          )
                        )}
                      </span>
                      {(t as any)[activeHub.toLowerCase()] || activeHub}
                    </h2>
                    <form
                      onSubmit={handleAddTask}
                      className="flex flex-col gap-3 sm:gap-4"
                    >
                      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full">
                        <div className="flex-grow flex gap-2 items-center min-w-0">
                          <input
                            value={newTask}
                            onChange={(e) => setNewTask(e.target.value)}
                            placeholder={t.addTodo}
                            className="w-full bg-black/5 px-6 py-4 sm:px-10 sm:py-6 rounded-2xl sm:rounded-[2.5rem] outline-none font-bold text-base sm:text-2xl placeholder:opacity-20 border-2 border-transparent focus:border-indigo-500/20 transition-all shadow-inner"
                          />
                          <VoiceInputButton
                            value={newTask}
                            onChange={setNewTask}
                            language={language}
                            isDark={isDark}
                            className="shrink-0"
                            onDictationCaptured={addVoiceCommand}
                          />
                        </div>{" "}
                        <button
                          className="px-6 py-4 sm:px-12 sm:py-6 bg-zinc-900 text-white rounded-2xl sm:rounded-[2.5rem] font-black uppercase tracking-widest text-xs sm:text-sm shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 shrink-0"
                          style={{ backgroundColor: currentTheme.accent }}
                        >
                          <Plus size={16} />
                          {t.inject}
                        </button>
                      </div>
                      {/* AI Live Categorization Suggestion */}
                      {isLiveCategorizing && (
                        <div className="flex items-center gap-2 text-xs font-bold opacity-60 animate-pulse text-indigo-500 py-1.5 px-3 bg-indigo-500/5 dark:bg-indigo-505/5 rounded-xl w-full">
                          <Sparkles
                            size={14}
                            className="animate-spin text-indigo-400 shrink-0"
                          />
                          <span>
                            {language === "es"
                              ? "AI analizando detalles de la tarea..."
                              : "AI analyzing task details..."}
                          </span>
                        </div>
                      )}
                      {!isLiveCategorizing && liveSuggestion && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.98 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="flex flex-wrap items-center gap-2 p-3 bg-indigo-500/5 dark:bg-indigo-500/10 border border-indigo-505/10 dark:border-indigo-500/25 rounded-xl text-xs font-bold w-full"
                        >
                          <Sparkles
                            size={14}
                            className="text-indigo-500 shrink-0"
                          />
                          <span className="text-zinc-500 dark:text-zinc-400">
                            {language === "es"
                              ? "Categoría Sugerida:"
                              : "Suggested Category:"}
                          </span>
                          <span className="px-2.5 py-1 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-800 text-[10px] uppercase font-black tracking-wider">
                            {liveSuggestion.category}
                          </span>
                          {liveSuggestion.subCategory && (
                            <span className="px-2.5 py-1 rounded-lg bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400 border border-purple-200/50 dark:border-purple-800 text-[10px] uppercase font-black tracking-wider font-extrabold">
                              {liveSuggestion.subCategory}
                            </span>
                          )}
                          <span
                            className={`px-2.5 py-1 rounded-lg text-[10px] uppercase font-black tracking-wider border ${
                              liveSuggestion.priority === "Critical"
                                ? "bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-450 border-rose-200/50"
                                : liveSuggestion.priority === "High"
                                  ? "bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-450 border-amber-200/50"
                                  : "bg-slate-100 dark:bg-slate-800 text-slate-650 dark:text-slate-400 border-zinc-200/50 dark:border-zinc-700"
                            }`}
                          >
                            {liveSuggestion.priority}
                          </span>
                          {liveSuggestion.assignedToSuggestion && (
                            <span className="text-[10px] text-indigo-500 dark:text-indigo-405">
                              Assigned:{" "}
                              <strong className="font-extrabold">
                                {liveSuggestion.assignedToSuggestion}
                              </strong>
                            </span>
                          )}
                          <span className="text-[10px] opacity-40 ml-auto hidden sm:inline-block font-normal italic text-slate-400">
                            {language === "es"
                              ? "(Se aplicará automáticamente)"
                              : "(Will apply automatically)"}
                          </span>
                        </motion.div>
                      )}

                      <div className="flex flex-col md:flex-row md:items-center gap-4 mt-3 px-2 bg-black/5 dark:bg-white/5 p-4 rounded-2xl border border-transparent dark:border-white/5">
                        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                          <span
                            className={`text-xs font-bold flex items-center gap-1.5 ${isDark ? "text-zinc-400" : "text-zinc-650"}`}
                          >
                            <Bell
                              size={14}
                              className="text-indigo-500 animate-bounce"
                            />
                            {language === "es"
                              ? "Programar Recordatorio:"
                              : "Set Reminder:"}
                          </span>
                          <input
                            type="datetime-local"
                            value={newTaskReminder}
                            onChange={(e) => setNewTaskReminder(e.target.value)}
                            className={`text-xs px-4 py-2 rounded-xl outline-none font-bold border w-full sm:w-auto min-w-0 max-w-full shrink ${isDark ? "bg-[#18181B] border-white/10 text-white" : "bg-white border-black/5 text-zinc-805"}`}
                          />
                          {newTaskReminder && (
                            <button
                              type="button"
                              onClick={() => setNewTaskReminder("")}
                              className={`text-[10px] px-3 py-2 rounded-xl font-black transition-colors uppercase tracking-[0.05em] border ${isDark ? "bg-white/5 border-white/10 text-white hover:bg-white/10" : "bg-black/5 border-black/5 text-zinc-605 hover:bg-black/10"}`}
                            >
                              {language === "es" ? "Limpiar" : "Clear"}
                            </button>
                          )}
                        </div>

                        <div className="h-4 w-[1px] bg-zinc-300 dark:bg-zinc-800 hidden md:block"></div>

                        <div className="flex flex-wrap items-center gap-3">
                          <label
                            className={`flex items-center gap-2 text-xs font-bold cursor-pointer ${isDark ? "text-zinc-400" : "text-zinc-650"}`}
                          >
                            <input
                              type="checkbox"
                              checked={newTaskIsRecurring}
                              onChange={(e) =>
                                setNewTaskIsRecurring(e.target.checked)
                              }
                              className="w-4 h-4 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-505 cursor-pointer"
                            />
                            <span className="flex items-center gap-1.5 font-bold">
                              <RefreshCw
                                size={14}
                                className="text-indigo-505"
                              />
                              {language === "es"
                                ? "Tarea Recurrente"
                                : "Recurring Task"}
                            </span>
                          </label>

                          {newTaskIsRecurring && (
                            <div className="flex flex-wrap items-center gap-2 animate-in fade-in slide-in-from-left-2 duration-200">
                              <select
                                value={newTaskRecurrenceFrequency}
                                onChange={(e) =>
                                  setNewTaskRecurrenceFrequency(
                                    e.target.value as any,
                                  )
                                }
                                className={`text-xs px-3 py-2 rounded-xl outline-none font-bold border ${isDark ? "bg-[#18181B] border-white/10 text-white" : "bg-white border-black/5 text-zinc-808"}`}
                              >
                                <option
                                  value="daily"
                                  className={
                                    isDark
                                      ? "bg-[#18181B] text-white"
                                      : "bg-white text-zinc-850"
                                  }
                                >
                                  {language === "es" ? "Diario" : "Daily"}
                                </option>
                                <option
                                  value="weekly"
                                  className={
                                    isDark
                                      ? "bg-[#18181B] text-white"
                                      : "bg-white text-zinc-850"
                                  }
                                >
                                  {language === "es" ? "Semanal" : "Weekly"}
                                </option>
                                <option
                                  value="monthly"
                                  className={
                                    isDark
                                      ? "bg-[#18181B] text-white"
                                      : "bg-white text-zinc-850"
                                  }
                                >
                                  {language === "es" ? "Mensual" : "Monthly"}
                                </option>
                              </select>

                              <span
                                className={`text-[11px] font-bold ${isDark ? "text-zinc-505" : "text-zinc-400"}`}
                              >
                                {language === "es" ? "hasta" : "until"}
                              </span>

                              <CustomDatePicker
                                value={newTaskRecurrenceEndDate}
                                onChange={setNewTaskRecurrenceEndDate}
                                showTime={false}
                                label=""
                                isDark={isDark}
                                language={language}
                              />
                            </div>
                          )}
                        </div>

                        <div className="h-4 w-[1px] bg-zinc-300 dark:bg-zinc-800 hidden md:block"></div>

                        <div className="flex flex-wrap items-center gap-3">
                          <span
                            className={`text-xs font-bold flex items-center gap-1.5 ${isDark ? "text-zinc-400" : "text-zinc-650"}`}
                          >
                            👤
                            {language === "es" ? "Asignar a:" : "Assign to:"}
                          </span>
                          <select
                            value={newTaskAssignedTo}
                            onChange={(e) =>
                              setNewTaskAssignedTo(e.target.value)
                            }
                            className={`text-xs px-4 py-2 rounded-xl outline-none font-bold border ${isDark ? "bg-[#18181B] border-white/10 text-white" : "bg-white border-black/5 text-zinc-811"}`}
                          >
                            <option value="">
                              {language === "es"
                                ? "Ambos (Sin asignar)"
                                : "Both (Unassigned)"}
                            </option>
                            {customMembers.map((m: any) => (
                              <option key={m.id} value={m.name}>
                                {m.id === "papa"
                                  ? "👦"
                                  : m.id === "mama"
                                    ? "👩"
                                    : "👤"}{" "}
                                {m.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="h-4 w-[1px] bg-zinc-300 dark:bg-zinc-800 hidden md:block"></div>

                        <div className="flex flex-wrap items-center gap-3">
                          <span
                            className={`text-xs font-bold flex items-center gap-1.5 ${isDark ? "text-zinc-400" : "text-zinc-650"}`}
                          >
                            🏷️
                            {language === "es" ? "Etiquetas:" : "Tags:"}
                          </span>
                          <input
                            type="text"
                            value={newTaskTags}
                            onChange={(e) => setNewTaskTags(e.target.value)}
                            placeholder="e.g. laundry, urgent"
                            className={`text-xs px-4 py-2 rounded-xl outline-none font-bold border ${isDark ? "bg-[#18181B] border-white/10 text-white" : "bg-white border-black/5 text-zinc-809"}`}
                          />
                        </div>
                      </div>
                    </form>
                  </div>
                  <div className="flex items-center justify-between mb-6 flex-wrap gap-4 select-none px-2 w-full">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="font-black text-xs uppercase tracking-[0.3em] opacity-40">
                        {language === "es"
                          ? "Lista de misiones"
                          : "Missions list"}
                      </h3>

                      <button
                        onClick={handleAiPrioritizeTasks}
                        disabled={isPrioritizing}
                        type="button"
                        className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-wider rounded-xl transition-all flex items-center gap-1 hover:scale-105 active:scale-95 cursor-pointer ${
                          isPrioritizing
                            ? "bg-indigo-555/20 text-indigo-400"
                            : "bg-[#4f46e5]/10 text-indigo-500 hover:bg-[#4f46e5]/20"
                        }`}
                      >
                        <Sparkles
                          size={10}
                          className={isPrioritizing ? "animate-pulse" : ""}
                        />
                        {isPrioritizing
                          ? language === "es"
                            ? "Priorizando..."
                            : "Prioritizing..."
                          : language === "es"
                            ? "Priorizar IA"
                            : "AI Prioritize"}
                      </button>
                    </div>
                    <div className="flex bg-black/5 dark:bg-white/5 p-1 rounded-2xl gap-1 border border-black/5 dark:border-white/5 w-full sm:w-auto">
                      <button
                        onClick={() => setAssigneeFilter("all")}
                        type="button"
                        className={`px-5 py-2 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all ${assigneeFilter === "all" ? (isDark ? "bg-white text-zinc-900 shadow-md" : "bg-zinc-950 text-white shadow-md") : "opacity-40 hover:opacity-100 dark:text-zinc-400"}`}
                      >
                        👥 {language === "es" ? "Ambos" : "Both"}
                      </button>
                      <button
                        onClick={() => setAssigneeFilter("papa")}
                        type="button"
                        className={`px-5 py-2 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all ${assigneeFilter === "papa" ? "bg-blue-600 text-white shadow-sm" : "opacity-40 hover:opacity-100 dark:text-zinc-400"}`}
                      >
                        👦 Papá
                      </button>
                      <button
                        onClick={() => setAssigneeFilter("mama")}
                        type="button"
                        className={`px-5 py-2 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all ${assigneeFilter === "mama" ? "bg-rose-600 text-white shadow-sm" : "opacity-40 hover:opacity-100 dark:text-zinc-400"}`}
                      >
                        👩 Mamá
                      </button>
                    </div>
                  </div>{" "}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {(() => {
                      const categoryActiveTasks = tasks
                        .filter(
                          (t) =>
                            t.category === activeHub &&
                            t.status !== "Completed",
                        )
                        .filter((t) => {
                          if (assigneeFilter === "papa")
                            return isPapa(t.assignedTo);
                          if (assigneeFilter === "mama")
                            return isMama(t.assignedTo);
                          return true;
                        });
                      return categoryActiveTasks.map((task) => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          onDelete={handleDeleteTask}
                          onStatusChange={handleStatusChange}
                          onAddImage={handleAddImage}
                          onRemoveImage={handleRemoveImage}
                          onUpdateTitle={handleUpdateTitle}
                          onUpdateReminder={handleUpdateReminder}
                          onUpdateDueDate={handleUpdateDueDate}
                          className={currentTheme.card}
                          language={language}
                          userData={userData}
                          familyProfiles={familyProfiles}
                          sendNotification={sendNotificationToFamily}
                          draggable={true}
                          onDragStart={(e) => handleDragStart(e, task.id)}
                          onDragOver={(e) => handleDragOver(e, task.id)}
                          onDragLeave={handleDragLeave}
                          onDrop={(e) =>
                            handleDrop(e, task.id, categoryActiveTasks)
                          }
                          isDragged={draggedTaskId === task.id}
                          isDragTarget={dropTargetId === task.id}
                        />
                      ));
                    })()}
                  </div>
                </div>
              )}
            </motion.div>

            {/* Elegant scroll-to footer at the bottom of the content stage */}
            <footer
              className={`mt-16 pt-8 border-t ${isDark ? "border-white/5" : "border-black/5"} flex flex-col sm:flex-row justify-between items-center gap-4 opacity-30 hover:opacity-80 transition-opacity`}
            >
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                <p className="text-[9px] font-black uppercase tracking-widest">
                  {t.familyNodeEncrypted}
                </p>
              </div>
              <p className="text-[9px] font-black uppercase tracking-widest">
                v2.4.0_STABLE
              </p>
            </footer>
          </div>
        </div>
      </main>

      {/* Voice Command History Sidebar Drawer */}
      <AnimatePresence>
        {isVoiceHistoryOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsVoiceHistoryOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[150] cursor-pointer"
            />

            {/* Sidebar drawer panel */}
            <motion.div
              key="voice-history-panel"
              initial={{ x: "100%", opacity: 0.95 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "100%", opacity: 0.95 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className={`fixed top-0 right-0 bottom-0 w-full max-w-md z-[160] flex flex-col ${
                isDark
                  ? "bg-zinc-900/95 border-l border-white/5 text-white"
                  : "bg-white/95 border-l border-slate-200 text-slate-800"
              } backdrop-blur-md shadow-2xl p-6 sm:p-8`}
            >
              <div className="flex items-center justify-between pb-6 border-b border-black/5 dark:border-white/5">
                <div className="flex items-center gap-3">
                  <div className="p-2 sm:p-2.5 bg-indigo-500/10 text-indigo-500 rounded-xl">
                    <Mic size={20} className="animate-pulse" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
                      {language === "es"
                        ? "Historial de Voz"
                        : "Voice Command History"}
                    </h2>
                    <p className="text-[10px] font-bold uppercase tracking-widest opacity-40 mt-0.5">
                      {language === "es"
                        ? "Últimas 10 dictados"
                        : "Last 10 dictations"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsVoiceHistoryOpen(false)}
                  className={`p-2 rounded-xl transition-all ${
                    isDark
                      ? "hover:bg-white/10 text-white/60 hover:text-white"
                      : "hover:bg-black/5 text-slate-400 hover:text-slate-800"
                  }`}
                >
                  <X size={20} />
                </button>
              </div>

              {/* List of dictations */}
              <div className="flex-1 overflow-y-auto py-6 space-y-4 custom-scrollbar">
                {voiceHistory.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center opacity-40 py-12 px-4">
                    <History
                      size={48}
                      className="stroke-[1.5] mb-4 text-indigo-500/60"
                    />
                    <p className="text-sm font-black uppercase tracking-wider">
                      {language === "es"
                        ? "Sin historial de dictado"
                        : "No dictation history"}
                    </p>
                    <p className="text-xs font-medium opacity-70 mt-2 max-w-xs">
                      {language === "es"
                        ? "Las misiones dictadas usando el botón de micrófono en cualquier formulario se guardarán aquí."
                        : "Missions spoken using the microphone button on any form will be tracked here."}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {voiceHistory.map((text, idx) => (
                      <motion.div
                        key={`v-cmd-${idx}-${text}`}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.04 }}
                        whileHover={{ scale: 1.01 }}
                        onClick={() => handleVoiceCommandClick(text, idx)}
                        className={`p-4 rounded-2xl cursor-pointer border relative overflow-hidden transition-all flex flex-col justify-between gap-3 text-left
                          ${
                            isDark
                              ? "bg-white/5 hover:bg-white/10 border-white/5 hover:border-white/10"
                              : "bg-slate-50 hover:bg-slate-100 border-slate-100"
                          }
                        `}
                      >
                        <div className="flex items-start gap-3">
                          <span className="p-1.5 h-6 w-6 rounded-lg bg-black/5 dark:bg-white/5 flex items-center justify-center font-mono text-[10px] font-bold text-indigo-500">
                            #{idx + 1}
                          </span>
                          <p className="flex-1 text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 break-words line-clamp-3">
                            "{text}"
                          </p>
                        </div>

                        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider pt-2 border-t border-black/5 dark:border-white/5">
                          <span className="opacity-40">
                            {language === "es"
                              ? "Haz clic para insertar"
                              : "Click to insert"}
                          </span>
                          <span className="text-indigo-550 dark:text-indigo-400 flex items-center gap-1">
                            {copiedIndex === idx ? (
                              <>
                                <Check
                                  size={12}
                                  className="text-emerald-500 animate-bounce"
                                />
                                <span className="text-emerald-500 font-extrabold">
                                  {language === "es"
                                    ? "Insertado!"
                                    : "Inserted!"}
                                </span>
                              </>
                            ) : (
                              <>
                                <Clipboard size={12} />
                                <span>
                                  {language === "es"
                                    ? "Copiar e insertar"
                                    : "Copy & Insert"}
                                </span>
                              </>
                            )}
                          </span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>

              {voiceHistory.length > 0 && (
                <div className="pt-6 border-t border-black/5 dark:border-white/5">
                  <button
                    onClick={() => {
                      if (
                        window.confirm(
                          language === "es"
                            ? "¿Estás seguro de que deseas borrar todo el historial de voz?"
                            : "Are you sure you want to clear the voice history?",
                        )
                      ) {
                        setVoiceHistory([]);
                        localStorage.removeItem("voiceCommandHistory");
                      }
                    }}
                    className="w-full py-3.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 rounded-2xl font-black text-xs uppercase tracking-widest transition-all duration-200 flex items-center justify-center gap-2"
                  >
                    <Trash2 size={14} />
                    {language === "es" ? "Borrar Historial" : "Clear History"}
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* View Mode Toggle Overlay (Mobile) */}
      <div className="fixed bottom-6 right-6 flex lg:hidden bg-white shadow-2xl rounded-2xl p-1 z-50 border border-slate-100">
        <button
          onClick={() => setViewMode("bento")}
          className={`p-3 rounded-xl ${viewMode === "bento" ? "bg-indigo-500 text-white" : "opacity-40"}`}
        >
          <Grid size={24} />
        </button>
        <button
          onClick={() => setViewMode("linear")}
          className={`p-3 rounded-xl ${viewMode === "linear" ? "bg-indigo-500 text-white" : "opacity-40"}`}
        >
          <LayoutList size={24} />
        </button>
      </div>

      {/* Modern Teams-Like Avatar Selection Modal */}
      <AnimatePresence>
        {showAvatarModal &&
          (() => {
            const memberDetails = getSelectedMemberDetails();
            if (!memberDetails) return null;

            return (
              <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[150] flex items-center justify-center p-4 min-h-screen">
                <div
                  className={`w-full max-w-lg ${isDark ? "bg-[#0c0a21] border border-white/10 text-white" : "bg-white text-zinc-900 border border-slate-100"} rounded-[2.5rem] shadow-2xl p-8 sm:p-10 relative overflow-hidden animate-in fade-in zoom-in-95 duration-200`}
                >
                  <div className="absolute top-0 right-0 p-6">
                    <button
                      onClick={() => setShowAvatarModal(null)}
                      className={`p-2 rounded-xl transition-all ${isDark ? "hover:bg-white/10" : "hover:bg-black/5"}`}
                    >
                      <X size={18} />
                    </button>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-[#6366F1]">
                        {language === "es"
                          ? "Avatar de la Familia"
                          : "Family Avatar"}
                      </span>
                      <h3 className="text-2xl sm:text-3xl font-black uppercase tracking-tighter italic mt-1">
                        {language === "es"
                          ? `Foto de ${memberDetails.name}`
                          : `${memberDetails.name}'s Avatar`}
                      </h3>
                      <p className="text-xs font-bold opacity-60 mt-2">
                        {language === "es"
                          ? "Elige un preset, genera uno interactivo con DiceBear, pídelo al creador con IA o sube tu propia foto."
                          : "Choose a preset, generate interactive style with DiceBear, make one with AI, or upload yours."}
                      </p>
                    </div>

                    {/* Current Avatar State */}
                    <div className="flex items-center gap-6 p-4 rounded-3xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5">
                      <div className="relative w-16 h-16 shrink-0">
                        {memberDetails.photoURL ? (
                          <img
                            src={memberDetails.photoURL}
                            alt="Current"
                            className={`w-16 h-16 rounded-2xl object-cover border-2 ${memberDetails.color}`}
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div
                            className={`w-16 h-16 rounded-2xl flex items-center justify-center ${memberDetails.bg}`}
                          >
                            <User size={28} />
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="font-extrabold text-sm">
                          {memberDetails.name}
                        </p>
                        <p className="text-[10px] font-bold opacity-50 mt-1">
                          {memberDetails.photoURL
                            ? language === "es"
                              ? "Foto activa"
                              : "Active photo"
                            : language === "es"
                              ? "Sin foto asignada"
                              : "No photo assigned"}
                        </p>
                        {memberDetails.photoURL && (
                          <button
                            onClick={() => updateAvatar(showAvatarModal, "")}
                            className="text-[10px] font-black uppercase text-red-500 hover:underline mt-2 flex items-center gap-1"
                          >
                            <Trash2 size={10} />
                            {language === "es"
                              ? "Eliminar foto"
                              : "Remove photo"}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Tabs Navigation */}
                    <div className="flex border-b border-black/10 dark:border-white/10 gap-2 pb-0.5">
                      {(["presets", "dicebear", "ai", "upload"] as const).map(
                        (tab) => (
                          <button
                            key={tab}
                            type="button"
                            onClick={() => setActiveAvatarTab(tab)}
                            className={`pb-2 px-3 text-xs font-black uppercase tracking-wider border-b-2 transition-all ${
                              activeAvatarTab === tab
                                ? "border-indigo-500 text-indigo-500"
                                : "border-transparent opacity-40 hover:opacity-100"
                            }`}
                          >
                            {tab === "presets" &&
                              (language === "es" ? "Presets" : "Presets")}
                            {tab === "dicebear" &&
                              (language === "es" ? "Diseñar" : "Design")}
                            {tab === "ai" &&
                              (language === "es" ? "Creador IA" : "AI Maker")}
                            {tab === "upload" &&
                              (language === "es" ? "Someter" : "Upload")}
                          </button>
                        ),
                      )}
                    </div>

                    {/* Tab 1: Presets */}
                    {activeAvatarTab === "presets" && (
                      <div className="space-y-3">
                        <p className="text-[10px] font-black uppercase tracking-wider opacity-40">
                          {language === "es"
                            ? "Presets recomendados"
                            : "Recommended presets"}
                        </p>
                        <div className="grid grid-cols-6 gap-3">
                          {(showAvatarModal === "papa"
                            ? papaPresets
                            : showAvatarModal === "mama"
                              ? mamaPresets
                              : kidsAndOtherPresets
                          ).map((preset, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() =>
                                updateAvatar(showAvatarModal, preset.url)
                              }
                              className="relative group aspect-square rounded-2xl overflow-hidden border-2 border-transparent hover:border-indigo-500 active:scale-95 transition-all shadow-md"
                              title={preset.name}
                            >
                              <img
                                src={preset.url}
                                alt={preset.name}
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                                referrerPolicy="no-referrer"
                              />
                              <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors" />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Tab 2: DiceBear */}
                    {activeAvatarTab === "dicebear" && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-wider opacity-40">
                              {language === "es"
                                ? "Estilo de Avatar"
                                : "Avatar Style"}
                            </label>
                            <select
                              value={dicebearStyle}
                              onChange={(e) => setDicebearStyle(e.target.value)}
                              className={`w-full text-xs px-3 py-2.5 rounded-xl border ${isDark ? "bg-white/5 border-white/10 text-white" : "bg-transparent border-black/10 text-slate-800"} font-bold outline-none focus:ring-2 focus:ring-indigo-500/30`}
                            >
                              <option value="lorelei">
                                {language === "es"
                                  ? "Caras de Personas"
                                  : "People Faces"}
                              </option>
                              <option value="adventurer">
                                {language === "es"
                                  ? "Aventureros"
                                  : "Adventurers"}
                              </option>
                              <option value="avataaars">
                                {language === "es"
                                  ? "Clásicos"
                                  : "Classic Avataars"}
                              </option>
                              <option value="bottts">
                                {language === "es" ? "Robots" : "Robots"}
                              </option>
                              <option value="fun-emoji">
                                {language === "es"
                                  ? "Emoji Gracioso"
                                  : "Fun Emojis"}
                              </option>
                              <option value="pixel-art">
                                {language === "es" ? "Pixel Art" : "Pixel Art"}
                              </option>
                            </select>
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-wider opacity-40">
                              {language === "es"
                                ? "Semilla o Nombre"
                                : "Seed or Name"}
                            </label>
                            <input
                              type="text"
                              value={dicebearSeed}
                              onChange={(e) => setDicebearSeed(e.target.value)}
                              placeholder={memberDetails.name}
                              className={`w-full text-xs px-3 py-2.5 rounded-xl border ${isDark ? "bg-white/5 border-white/10 text-white placeholder:text-white/20" : "bg-transparent border-black/10 text-slate-800 placeholder:text-black/30"} outline-none focus:ring-2 focus:ring-indigo-500/30 font-bold`}
                            />
                          </div>
                        </div>

                        <div className="flex flex-col items-center gap-3 p-4 rounded-3xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5">
                          <p className="text-[10px] font-black uppercase tracking-wider opacity-40">
                            {language === "es"
                              ? "Vista previa en vivo"
                              : "Live Preview"}
                          </p>
                          <div className="w-24 h-24 rounded-2xl bg-white shadow-inner flex items-center justify-center overflow-hidden border border-black/10">
                            <img
                              src={`https://api.dicebear.com/7.x/${dicebearStyle}/svg?seed=${encodeURIComponent(dicebearSeed.trim() || memberDetails.name)}`}
                              alt="DiceBear Preview"
                              className="w-20 h-20 object-contain"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={handleApplyDiceBear}
                            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg transition-all"
                          >
                            {language === "es"
                              ? "Aplicar Avatar"
                              : "Apply Avatar"}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Tab 3: Creador IA (Gemini SVG) */}
                    {activeAvatarTab === "ai" && (
                      <div className="space-y-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black uppercase tracking-wider opacity-40">
                            {language === "es"
                              ? "¿Cómo imaginas tu avatar?"
                              : "Describe what you want"}
                          </label>
                          <textarea
                            rows={2}
                            value={aiAvatarPrompt}
                            onChange={(e) => setAiAvatarPrompt(e.target.value)}
                            placeholder={
                              language === "es"
                                ? "Ej. Un astronauta sonriente estilo caricatura 3D, fondo morado..."
                                : "Eg. A smiling astronaut cartoon, purple background..."
                            }
                            className={`w-full text-xs px-4 py-3 rounded-xl border ${isDark ? "bg-white/5 border-white/10 text-white placeholder:text-white/20" : "bg-transparent border-black/10 text-slate-800 placeholder:text-black/30"} outline-none focus:ring-2 focus:ring-indigo-500/30 font-bold resize-none`}
                          />
                        </div>

                        {generatedAiSvg ? (
                          <div className="flex flex-col items-center gap-3 p-4 rounded-3xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5">
                            <p className="text-[10px] font-black uppercase tracking-wider opacity-40">
                              {language === "es"
                                ? "Avatar de IA Generado"
                                : "Generated AI Avatar"}
                            </p>
                            <div
                              className="w-28 h-28 rounded-2xl bg-[#1e1a3b] dark:bg-black/20 flex items-center justify-center overflow-hidden shadow-md [&>svg]:w-24 [&>svg]:h-24"
                              dangerouslySetInnerHTML={{
                                __html: generatedAiSvg,
                              }}
                            />
                            <div className="flex gap-2 w-full justify-center">
                              <button
                                type="button"
                                onClick={() => {
                                  setGeneratedAiSvg("");
                                  setAiAvatarPrompt("");
                                }}
                                className={`px-4 py-2 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all ${isDark ? "bg-white/10 hover:bg-white/20" : "bg-black/5 hover:bg-black/10 text-zinc-600"}`}
                              >
                                {language === "es" ? "Descartar" : "Discard"}
                              </button>
                              <button
                                type="button"
                                onClick={handleApplyAiAvatar}
                                className="px-4 py-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg transition-all"
                              >
                                {language === "es"
                                  ? "Guardar e Instalar"
                                  : "Save & Install"}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={handleGenerateAiAvatar}
                            disabled={
                              isGeneratingAiAvatar || !aiAvatarPrompt.trim()
                            }
                            className={`w-full py-3.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 disabled:opacity-50 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg transition-all flex items-center justify-center gap-2`}
                          >
                            {isGeneratingAiAvatar ? (
                              <>
                                <span className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white animate-spin"></span>
                                {language === "es"
                                  ? "Dibujando Avatar..."
                                  : "Generating Avatar..."}
                              </>
                            ) : (
                              <>
                                <Sparkles size={12} className="animate-pulse" />
                                {language === "es"
                                  ? "Generar con Gemini IA"
                                  : "Generate with Gemini AI"}
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    )}

                    {/* Tab 4: Upload File or URL */}
                    {activeAvatarTab === "upload" && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* File Upload Option */}
                        <div className="space-y-2">
                          <p className="text-[10px] font-black uppercase tracking-wider opacity-40">
                            {language === "es"
                              ? "Sube una foto"
                              : "Upload photo"}
                          </p>
                          <label
                            className={`w-full h-28 rounded-2xl border-2 border-dashed ${isDark ? "border-white/10 hover:border-white/30 bg-white/[0.02]" : "border-black/10 hover:border-black/20 bg-black/[0.02]"} flex flex-col items-center justify-center gap-1 cursor-pointer transition-all p-3 hover:bg-black/[0.04] dark:hover:bg-white/[0.04] group`}
                          >
                            <Upload
                              size={16}
                              className="text-indigo-400 group-hover:scale-110 transition-transform animate-bounce"
                            />
                            <span className="text-[10px] font-bold text-center leading-tight">
                              {language === "es"
                                ? "Explorar imagen"
                                : "Browse image"}
                            </span>
                            <span className="text-[8px] opacity-40 text-center uppercase tracking-widest mt-0.5">
                              Max 1.5MB
                            </span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) =>
                                handleAvatarFileChange(e, showAvatarModal)
                              }
                              className="hidden"
                            />
                          </label>
                        </div>

                        {/* Paste URL Option */}
                        <div className="space-y-2 flex flex-col justify-between">
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-wider opacity-40">
                              {language === "es"
                                ? "Pegar URL de foto"
                                : "Paste photo URL"}
                            </p>
                            <form
                              onSubmit={(e) => {
                                e.preventDefault();
                                const target =
                                  e.currentTarget as HTMLFormElement;
                                const urlInput = target.elements.namedItem(
                                  "avatarUrl",
                                ) as HTMLInputElement;
                                if (urlInput.value.trim()) {
                                  updateAvatar(
                                    showAvatarModal,
                                    urlInput.value.trim(),
                                  );
                                  urlInput.value = "";
                                }
                              }}
                              className="mt-2 space-y-2"
                            >
                              <input
                                name="avatarUrl"
                                type="url"
                                placeholder="https://example.com/avatar.jpg..."
                                className={`w-full text-xs px-4 py-2.5 rounded-xl border ${isDark ? "bg-white/5 border-white/10 text-white placeholder:text-white/20" : "bg-transparent border-black/10 text-slate-800 placeholder:text-black/30"} outline-none focus:ring-2 focus:ring-indigo-500/30 font-bold`}
                              />
                              <button
                                type="submit"
                                className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg transition-all"
                              >
                                {language === "es"
                                  ? "Aplicar URL"
                                  : "Apply URL"}
                              </button>
                            </form>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex justify-end pt-4 border-t border-black/5 dark:border-white/5 gap-3">
                      <button
                        type="button"
                        onClick={() => setShowAvatarModal(null)}
                        className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider ${isDark ? "bg-white/5 hover:bg-white/10 text-zinc-300" : "bg-black/5 hover:bg-black/10 text-zinc-600"} transition-all`}
                      >
                        {language === "es" ? "Cerrar" : "Close"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
      </AnimatePresence>

      {/* PWA Installation Modal */}
      {isInstallModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[200] flex items-center justify-center p-4 overflow-y-auto">
          <div
            className={`relative w-full max-w-lg ${isDark ? "bg-[#0c0a21] border border-white/10 text-white" : "bg-white text-zinc-900 border border-slate-100"} rounded-[2.5rem] shadow-2xl p-8 sm:p-10 my-8 transition-transform animate-in fade-in zoom-in-95 duration-200`}
          >
            {/* Close Button */}
            <div className="absolute top-0 right-0 p-6">
              <button
                onClick={() => setIsInstallModalOpen(false)}
                className={`p-2 rounded-xl transition-all ${isDark ? "hover:bg-white/10" : "hover:bg-black/5"}`}
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-4">
              <InstallAppButton
                isDark={isDark}
                language={language === "es" ? "es" : "en"}
                variant="full"
                onInstallCompleted={() => setIsInstallModalOpen(false)}
              />
            </div>

            {/* Footer buttons */}
            <div className="flex justify-end pt-6 mt-6 border-t border-black/5 dark:border-white/5 gap-3">
              <button
                type="button"
                onClick={() => setIsInstallModalOpen(false)}
                className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-wider ${isDark ? "bg-white/5 hover:bg-white/10 text-zinc-300" : "bg-black/5 hover:bg-black/10 text-zinc-650"} transition-all`}
              >
                {language === "es" ? "Cerrar" : "Close"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dynamic Family Manager Modal */}
      {isFamilyManagerOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[160] flex items-center justify-center p-4 overflow-y-auto">
          <div
            className={`relative w-full max-w-xl ${isDark ? "bg-[#0c0a21] border border-white/10 text-white" : "bg-white text-zinc-900 border border-slate-100"} rounded-[2.5rem] shadow-2xl p-8 sm:p-10 my-8 transition-transform animate-in fade-in zoom-in-95 duration-200`}
          >
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-2xl font-black uppercase tracking-tighter italic flex items-center gap-2">
                  <span>👪</span>
                  {language === "es" ? "Administrar Familia" : "Manage Family"}
                </h3>
                <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mt-1">
                  {language === "es"
                    ? "Agrega o edita miembros de tu familia"
                    : "Add or edit family members"}
                </p>
              </div>
              <button
                onClick={() => {
                  setIsFamilyManagerOpen(false);
                  setEditingMemberId(null);
                  setEditName("");
                  setEditRole("");
                  setEditPhoto("");
                  setEditBirthdate("");
                  setEditAllergies("");
                  setNewMemName("");
                  setNewMemRole("");
                  setNewMemPhoto("");
                  setNewMemBirthdate("");
                  setNewMemAllergies("");
                }}
                className={`p-2 rounded-xl transition-all ${isDark ? "hover:bg-white/10" : "hover:bg-black/5"}`}
              >
                <X size={18} />
              </button>
            </div>

            {/* Family Code (Join Code) */}
            <div className={`mb-6 p-4 rounded-2xl border ${isDark ? "bg-white/[0.03] border-white/5 text-zinc-300" : "bg-zinc-50 border-black/[0.04] text-zinc-700"}`}>
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-indigo-500 block">
                    {language === "es" ? "Código de Familia" : "Family Code"}
                  </span>
                  <span className="text-xs font-mono font-bold select-all tracking-wider break-all block mt-0.5 opacity-95">
                    {family?.id || "Generando..."}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (family?.id) {
                      navigator.clipboard.writeText(family.id);
                      alert(language === "es" ? "¡Código de familia copiado al portapapeles!" : "Family code copied to clipboard!");
                    }
                  }}
                  className="px-3 py-2 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all text-white shadow-md flex items-center gap-1.5 shrink-0 active:scale-95 duration-150"
                  style={{ backgroundColor: currentTheme.accent }}
                >
                  <Clipboard size={12} />
                  <span>{language === "es" ? "Copiar" : "Copy"}</span>
                </button>
              </div>
              <p className="text-[10px] opacity-50 font-bold mt-2 leading-relaxed">
                {language === "es"
                  ? "Comparte este código con tu pareja o familiares. Al iniciar sesión con su cuenta de Google, podrán elegir 'Unirme a una' y pegar este código para sincronizar instantáneamente todas las notas y tareas."
                  : "Share this code with your partner or family members. When they log in, they can choose 'Join an existing' and key in this code to synchronize all notes and tasks instantly."}
              </p>
            </div>

            {/* Members List */}
            <div className="space-y-3 mb-8 max-h-[220px] overflow-y-auto pr-2 custom-scrollbar">
              {customMembers.map((m: any) => {
                const isDefault = m.id === "papa" || m.id === "mama";
                return (
                  <div
                    key={m.id}
                    className={`flex items-center justify-between p-4 rounded-2xl border ${isDark ? "bg-white/[0.02] border-white/5" : "bg-black/[0.02] border-black/5"} m-0 hover:bg-white/5 transition-all`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center font-black overflow-hidden border-2 text-[12px] bg-indigo-500/10 text-indigo-500 border-indigo-500/20`}
                      >
                        {m.photoURL ? (
                          <img
                            src={m.photoURL}
                            alt={m.name}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          m.name.slice(0, 1).toUpperCase()
                        )}
                      </div>
                      <div>
                        <p className="font-extrabold text-sm uppercase tracking-tight">
                          {m.name}
                        </p>
                        <p className="text-[9px] font-black uppercase tracking-wider opacity-40">
                          {m.role}
                        </p>
                        {(m.birthdate || m.allergies) && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {m.birthdate && (
                              <span
                                className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${isDark ? "bg-white/10 text-zinc-350" : "bg-black/5 text-zinc-600"}`}
                              >
                                🎂 {m.birthdate}
                              </span>
                            )}
                            {m.allergies && (
                              <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400">
                                ⚠️ {m.allergies}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingMemberId(m.id);
                          setEditName(m.name);
                          setEditRole(m.role);
                          setEditHideFinance(
                            family.restrictedFinanceMembers?.includes(m.id) ||
                              false,
                          );
                          setEditPhoto(m.photoURL || "");
                          setEditBirthdate(m.birthdate || "");
                          setEditAllergies(m.allergies || "");
                        }}
                        className={`p-2 rounded-lg text-xs font-bold transition-all ${isDark ? "hover:bg-white/10 text-zinc-300" : "hover:bg-black/5 text-zinc-700"}`}
                        title={
                          language === "es" ? "Editar personaje" : "Edit member"
                        }
                      >
                        <Edit3 size={14} />
                      </button>
                      {!isDefault && (
                        <button
                          type="button"
                          onClick={() => handleDeleteMember(m.id)}
                          className="p-2 rounded-lg text-xs font-bold text-rose-500 hover:bg-rose-500/10 transition-all"
                          title={
                            language === "es"
                              ? "Eliminar personaje"
                              : "Delete member"
                          }
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Dynamic Add / Edit Form */}
            <form
              onSubmit={handleSaveMember}
              className={`p-5 rounded-3xl border ${isDark ? "bg-white/5 border-white/5 shadow-inner" : "bg-black/[0.03] border-black/5 shadow-inner"}`}
            >
              <h4 className="text-xs font-black uppercase tracking-widest opacity-60 mb-4">
                {editingMemberId
                  ? language === "es"
                    ? "Editar Información"
                    : "Edit Information"
                  : language === "es"
                    ? "Añadir Nuevo Familiar"
                    : "Add New Family Member"}
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-[9px] font-black uppercase tracking-wider opacity-40 mb-1.5">
                    {language === "es" ? "Nombre" : "Name"}
                  </label>
                  <input
                    type="text"
                    required
                    value={editingMemberId ? editName : newMemName}
                    onChange={(e) =>
                      editingMemberId
                        ? setEditName(e.target.value)
                        : setNewMemName(e.target.value)
                    }
                    placeholder={
                      language === "es"
                        ? "Ej. Abuela Carmen, Sofía..."
                        : "e.g. Grandma, Sophie..."
                    }
                    className={`w-full px-4 py-3 rounded-xl text-xs outline-none font-bold border ${isDark ? "bg-[#18181B] border-white/10 text-white focus:bg-[#121214]" : "bg-white border-black/5 text-zinc-800"}`}
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-black uppercase tracking-wider opacity-40 mb-1.5">
                    {language === "es" ? "Rol / Parentesco" : "Role / Position"}
                  </label>
                  <input
                    type="text"
                    required
                    value={editingMemberId ? editRole : newMemRole}
                    onChange={(e) =>
                      editingMemberId
                        ? setEditRole(e.target.value)
                        : setNewMemRole(e.target.value)
                    }
                    placeholder={
                      language === "es"
                        ? "Ej. Abuela, Hija..."
                        : "e.g. Grandma, Daughter..."
                    }
                    className={`w-full px-4 py-3 rounded-xl text-xs outline-none font-bold border ${isDark ? "bg-[#18181B] border-white/10 text-white focus:bg-[#121214]" : "bg-white border-black/5 text-zinc-800"}`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-[9px] font-black uppercase tracking-wider opacity-40 mb-1.5">
                    {language === "es" ? "Fecha de Nacimiento" : "Birthdate"}
                  </label>
                  <input
                    type="date"
                    value={editingMemberId ? editBirthdate : newMemBirthdate}
                    onChange={(e) =>
                      editingMemberId
                        ? setEditBirthdate(e.target.value)
                        : setNewMemBirthdate(e.target.value)
                    }
                    className={`w-full px-4 py-3 rounded-xl text-xs outline-none font-bold border ${isDark ? "bg-[#18181B] border-white/10 text-white focus:bg-[#121214]" : "bg-white border-black/5 text-zinc-800"}`}
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-black uppercase tracking-wider opacity-40 mb-1.5">
                    {language === "es"
                      ? "Alergias / Notas Médicas"
                      : "Allergies / Medical Notes"}
                  </label>
                  <input
                    type="text"
                    value={editingMemberId ? editAllergies : newMemAllergies}
                    onChange={(e) =>
                      editingMemberId
                        ? setEditAllergies(e.target.value)
                        : setNewMemAllergies(e.target.value)
                    }
                    placeholder={
                      language === "es"
                        ? "Ej. Polen, Penicilina, Ninguna..."
                        : "e.g. Pollen, Penicillin, None..."
                    }
                    className={`w-full px-4 py-3 rounded-xl text-xs outline-none font-bold border ${isDark ? "bg-[#18181B] border-white/10 text-white focus:bg-[#121214]" : "bg-white border-black/5 text-zinc-800"}`}
                  />
                </div>
              </div>

              {/* PROFILE PHOTO FILE UPLOAD */}
              <div className="mb-4">
                <label className="block text-[9px] font-black uppercase tracking-wider opacity-40 mb-1.5">
                  {language === "es" ? "Foto de Perfil" : "Profile Photo"}
                </label>
                <div className="flex items-center gap-4 p-3 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5">
                  <div
                    className={`w-14 h-14 rounded-full flex items-center justify-center font-black overflow-hidden border-2 text-sm shrink-0 ${isDark ? "bg-white/10 text-white border-white/20" : "bg-black/5 text-zinc-700 border-black/10"}`}
                  >
                    {(editingMemberId ? editPhoto : newMemPhoto) ? (
                      <img
                        src={editingMemberId ? editPhoto : newMemPhoto}
                        alt="Preview"
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : editingMemberId ? (
                      editName ? (
                        editName.slice(0, 1).toUpperCase()
                      ) : (
                        "?"
                      )
                    ) : newMemName ? (
                      newMemName.slice(0, 1).toUpperCase()
                    ) : (
                      "?"
                    )}
                  </div>
                  <div className="flex-grow">
                    <div className="flex flex-wrap items-center gap-2">
                      <label
                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${isDark ? "bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20" : "bg-indigo-50 text-indigo-600 hover:bg-indigo-100"}`}
                      >
                        {language === "es" ? "Subir Foto" : "Upload Photo"}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            if (file.size > 1.5 * 1024 * 1024) {
                              alert(
                                language === "es"
                                  ? "La imagen es demasiado grande. Máximo 1.5MB."
                                  : "The image is too large. Max 1.5MB.",
                              );
                              return;
                            }
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              const base64String = reader.result as string;
                              if (editingMemberId) {
                                setEditPhoto(base64String);
                              } else {
                                setNewMemPhoto(base64String);
                              }
                            };
                            reader.readAsDataURL(file);
                          }}
                          className="hidden"
                        />
                      </label>
                      {(editingMemberId ? editPhoto : newMemPhoto) && (
                        <button
                          type="button"
                          onClick={() => {
                            if (editingMemberId) {
                              setEditPhoto("");
                            } else {
                              setNewMemPhoto("");
                            }
                          }}
                          className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${isDark ? "bg-rose-500/10 text-rose-400 hover:bg-rose-500/20" : "bg-rose-50 text-rose-600 hover:bg-rose-100"}`}
                        >
                          {language === "es" ? "Eliminar" : "Remove"}
                        </button>
                      )}
                    </div>
                    <p className="text-[8px] opacity-40 font-bold mt-1 uppercase tracking-widest">
                      {language === "es"
                        ? "Formatos: JPG, PNG. Recomendado cuadrado."
                        : "Formats: JPG, PNG. Square recommended."}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 mb-6 p-4 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5">
                <div className="flex-1">
                  <p className="text-[10px] font-black uppercase tracking-wider">
                    {language === "es"
                      ? "Restringir Finanzas"
                      : "Restrict Finance Area"}
                  </p>
                  <p className="text-[8px] opacity-40 font-bold mt-0.5">
                    {language === "es"
                      ? "Ocultar sección de gastos y presupuestos para este miembro."
                      : "Hide expenses and budgets section for this member."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    editingMemberId
                      ? setEditHideFinance(!editHideFinance)
                      : setNewMemHideFinance(!newMemHideFinance)
                  }
                  className={`w-10 h-5 rounded-full relative transition-colors ${(editingMemberId ? editHideFinance : newMemHideFinance) ? "bg-indigo-500" : "bg-zinc-400"}`}
                >
                  <motion.div
                    animate={{
                      x: (editingMemberId ? editHideFinance : newMemHideFinance)
                        ? 22
                        : 2,
                    }}
                    className="absolute top-1 w-3 h-3 bg-white rounded-full shadow-sm"
                  />
                </button>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                {editingMemberId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingMemberId(null);
                      setEditName("");
                      setEditRole("");
                      setEditPhoto("");
                      setEditBirthdate("");
                      setEditAllergies("");
                    }}
                    className={`px-4 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest ${isDark ? "bg-white/5 hover:bg-white/10 text-zinc-300" : "bg-black/5 hover:bg-black/10 text-zinc-600"} transition-all`}
                  >
                    {language === "es" ? "Cancelar" : "Cancel"}
                  </button>
                )}
                <button
                  type="submit"
                  className="px-6 py-3 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all shadow-md font-bold"
                  style={{ backgroundColor: currentTheme.accent }}
                >
                  {editingMemberId
                    ? language === "es"
                      ? "Guardar Cambios"
                      : "Save Changes"
                    : language === "es"
                      ? "Añadir Familiar"
                      : "Add Member"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Global Search Task Detail Modal Overlay */}
      <AnimatePresence>
        {selectedSearchTask && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            {/* Background Backdrop with motion fade */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedSearchTask(null)}
              className="absolute inset-0 bg-black/75 backdrop-blur-sm"
            />

            {/* Modal Content container sliding from bottom */}
            <motion.div
              initial={{ scale: 0.95, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 15, opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="relative z-10 w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-[2.5rem] shadow-2xl custom-scrollbar"
            >
              <div className="absolute top-6 right-6 z-20">
                <button
                  onClick={() => setSelectedSearchTask(null)}
                  className={`p-2 rounded-xl transition-all cursor-pointer ${
                    isDark
                      ? "bg-white/10 hover:bg-white/20 text-white"
                      : "bg-black/5 hover:bg-black/10 text-zinc-700"
                  }`}
                  title={language === "es" ? "Cerrar" : "Close"}
                >
                  <X size={16} />
                </button>
              </div>

              {(() => {
                const liveTask =
                  tasks.find((t) => t.id === selectedSearchTask.id) ||
                  selectedSearchTask;
                return (
                  <TaskCard
                    task={liveTask}
                    onDelete={(id) => {
                      handleDeleteTask(id);
                      setSelectedSearchTask(null);
                    }}
                    onStatusChange={handleStatusChange}
                    onAddImage={handleAddImage}
                    onRemoveImage={handleRemoveImage}
                    onUpdateTitle={handleUpdateTitle}
                    onUpdateReminder={handleUpdateReminder}
                    onUpdateDueDate={handleUpdateDueDate}
                    onUpdateAssignment={handleUpdateAssignment}
                    className={currentTheme.card}
                    language={language}
                    userData={userData}
                    familyProfiles={familyProfiles}
                    sendNotification={sendNotificationToFamily}
                  />
                );
              })()}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// --- Calendar Component ---

interface CalendarViewProps {
  tasks: Task[];
  theme: any;
  onStatusChange: (id: string, s: string) => void;
  holidays: { date: string; name: string }[];
}

const VacationCard = ({
  v,
  expenses,
  t,
  theme,
  handleStatusChange,
  handleAddAttachment,
  handleRemoveAttachment,
  handleDelete,
  language,
  isFinanceRestricted,
}: {
  v: Vacation;
  expenses: Expense[];
  t: any;
  theme: any;
  handleStatusChange: any;
  handleAddAttachment: any;
  handleRemoveAttachment: any;
  handleDelete: any;
  language: Language;
  isFinanceRestricted?: boolean;
}) => {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  useEffect(() => {
    if (lightboxIndex === null) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!v.attachments || v.attachments.length <= 1) return;
      if (e.key === "ArrowLeft") {
        setLightboxIndex((prev) =>
          prev !== null
            ? prev === 0
              ? v.attachments.length - 1
              : prev - 1
            : 0,
        );
      } else if (e.key === "ArrowRight") {
        setLightboxIndex((prev) =>
          prev !== null
            ? prev === v.attachments.length - 1
              ? 0
              : prev + 1
            : 0,
        );
      } else if (e.key === "Escape") {
        setLightboxIndex(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lightboxIndex, v.attachments]);

  const spent = expenses
    .filter((e) => e.vacationId === v.id)
    .reduce((sum, e) => sum + e.amount, 0);
  const per = Math.min((spent / (v.budget || 1)) * 100, 100);
  const isDark =
    theme.bg?.includes("0c0a21") ||
    theme.bg?.includes("020617") ||
    theme.card?.includes("18181B") ||
    theme.card?.includes("1e293b");

  const getDaysDiff = (startDateStr: string) => {
    if (!startDateStr) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(startDateStr);
    start.setHours(0, 0, 0, 0);
    const diffTime = start.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getOngoingStatus = (startDateStr: string, endDateStr: string) => {
    if (!startDateStr || !endDateStr) return "past";
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(startDateStr);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDateStr);
    end.setHours(0, 0, 0, 0);

    if (today >= start && today <= end) return "ongoing";
    if (today > end) return "past";
    return "future";
  };

  const daysLeft = getDaysDiff(v.startDate);
  const tripStatus = getOngoingStatus(v.startDate, v.endDate);

  return (
    <motion.div
      layout
      key={v.id}
      className={`${theme.card} p-6 sm:p-8 rounded-[2.5rem] border relative group hover:shadow-2xl transition-all duration-500 overflow-hidden`}
    >
      <div className="relative z-10">
        <div className="flex justify-between items-start mb-6 gap-3">
          <div className="flex gap-2 min-w-0">
            <select
              value={v.status}
              onChange={(e) => handleStatusChange(v.id, e.target.value)}
              className={`px-3.5 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest outline-none border-none cursor-pointer ${isDark ? "bg-emerald-950/40 text-emerald-400 border border-emerald-500/10" : "bg-emerald-50 text-emerald-600"}`}
            >
              <option value="Planning">{t.pending}</option>
              <option value="Confirmed">{t.inProgress}</option>
              <option value="Completed">{t.completed}</option>
            </select>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => handleAddAttachment(v)}
              className={`p-1.5 transition-colors ${isDark ? "text-zinc-500 hover:text-indigo-400" : "text-slate-300 hover:text-indigo-500"}`}
              title={t.addAttachment}
            >
              <Paperclip size={16} />
            </button>
            <button
              onClick={() => handleDelete(v.id)}
              className={`opacity-0 group-hover:opacity-100 transition-opacity p-1.5 ${isDark ? "text-zinc-500 hover:text-rose-400" : "text-slate-300 hover:text-rose-500"}`}
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        <h4 className="font-black text-xl sm:text-2xl uppercase tracking-tight mb-2 flex items-center gap-2 break-words min-w-0 overflow-hidden">
          <MapPin size={18} className="text-slate-400 shrink-0" />
          <span className="truncate">{v.destination}</span>
        </h4>

        {/* Countdown Widget inside individual card */}
        {daysLeft !== null &&
          (() => {
            if (tripStatus === "ongoing") {
              return (
                <div
                  className={`mt-3 mb-4 p-3 rounded-2xl flex items-center gap-3 border ${isDark ? "bg-purple-500/10 border-purple-500/20 text-purple-300" : "bg-purple-50 border-purple-100 text-purple-700"}`}
                >
                  <Sparkles
                    size={16}
                    className="shrink-0 animate-spin"
                    style={{ animationDuration: "6s" }}
                  />
                  <div className="flex-1 text-xs">
                    <span className="font-black uppercase tracking-tight block">
                      {language === "es"
                        ? "¡EN CURSO! 🏖️"
                        : "TRIP IN PROGRESS! 🏖️"}
                    </span>
                    <span className="block text-[9px] font-bold opacity-60">
                      {language === "es"
                        ? "Disfrutando el momento"
                        : "Enjoying the adventure"}
                    </span>
                  </div>
                </div>
              );
            } else if (tripStatus === "past") {
              return (
                <div
                  className={`mt-3 mb-4 p-3 rounded-2xl flex items-center gap-3 border ${isDark ? "bg-zinc-500/10 border-white/5 text-zinc-400" : "bg-zinc-50 border-zinc-100 text-zinc-500"}`}
                >
                  <CheckCircle size={16} className="shrink-0 text-zinc-400" />
                  <div className="flex-1 text-xs">
                    <span className="font-black uppercase tracking-tight block">
                      {language === "es"
                        ? "VIAJE FINALIZADO"
                        : "TRIP COMPLETED"}
                    </span>
                    <span className="block text-[9px] font-bold opacity-60">
                      {language === "es"
                        ? "Lindos recuerdos creados"
                        : "Beautiful memories created"}
                    </span>
                  </div>
                </div>
              );
            } else if (daysLeft === 0) {
              return (
                <div
                  className={`mt-3 mb-4 p-3 rounded-2xl flex items-center gap-3 border animate-pulse ${isDark ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300" : "bg-emerald-50 border-emerald-100 text-emerald-700"}`}
                >
                  <Plane
                    size={16}
                    className="shrink-0 animate-bounce text-emerald-500"
                  />
                  <div className="flex-1 text-xs">
                    <span className="font-black uppercase tracking-tight block">
                      {language === "es"
                        ? "¡INICIA HOY! ✈️"
                        : "DEPARTS TODAY! ✈️"}
                    </span>
                    <span className="block text-[9px] font-bold opacity-60">
                      {language === "es"
                        ? "¡Prepara las maletas!"
                        : "Prepare your bags!"}
                    </span>
                  </div>
                </div>
              );
            } else if (daysLeft === 1) {
              return (
                <div
                  className={`mt-3 mb-4 p-3 rounded-2xl flex items-center gap-3 border ${isDark ? "bg-blue-500/10 border-blue-500/20 text-blue-300" : "bg-blue-50 border-blue-100 text-blue-700"}`}
                >
                  <Clock
                    size={16}
                    className="shrink-0 animate-pulse animate-bounce"
                  />
                  <div className="flex-1 text-xs">
                    <span className="font-black uppercase tracking-tight block">
                      {language === "es"
                        ? "¡EMPIEZA MAÑANA!"
                        : "DEPARTS TOMORROW!"}
                    </span>
                    <span className="block text-[9px] font-bold opacity-60">
                      {language === "es"
                        ? "Casi listo para salir"
                        : "Get ready for travel"}
                    </span>
                  </div>
                </div>
              );
            } else {
              return (
                <div
                  className={`mt-3 mb-4 p-3 rounded-2xl flex items-center gap-3 border ${isDark ? "bg-indigo-500/10 border-indigo-500/20 text-indigo-300" : "bg-indigo-50 border-indigo-100 text-indigo-700"}`}
                >
                  <Clock size={16} className="animate-pulse shrink-0" />
                  <div className="flex-1 text-xs">
                    <span className="font-black uppercase tracking-tight block">
                      {language === "es"
                        ? `Faltan ${daysLeft} días`
                        : `${daysLeft} days remaining`}
                    </span>
                    <span className="block text-[9px] font-bold opacity-60">
                      {language === "es"
                        ? "Para tu escape familiar"
                        : "Until your family escape"}
                    </span>
                  </div>
                </div>
              );
            }
          })()}

        {v.attachments && v.attachments.length > 0 && (
          <div className="mt-4 space-y-2">
            <span
              className={`text-[10px] font-black uppercase tracking-widest block mb-1.5 ${isDark ? "text-zinc-500" : "text-slate-400"}`}
            >
              📸 {language === "es" ? "Galería de Recuerdos" : "Memory Gallery"}
            </span>

            {v.attachments.length === 1 && (
              <div
                onClick={() => setLightboxIndex(0)}
                className="relative h-44 rounded-2xl overflow-hidden cursor-pointer group shadow-sm border border-black/5"
              >
                <img
                  src={v.attachments[0]}
                  alt="vacation"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors duration-300" />
              </div>
            )}

            {v.attachments.length === 2 && (
              <div className="grid grid-cols-2 gap-2 h-28">
                {v.attachments.map((url, i) => (
                  <div
                    key={i}
                    onClick={() => setLightboxIndex(i)}
                    className="relative rounded-xl overflow-hidden cursor-pointer group shadow-sm border border-black/5"
                  >
                    <img
                      src={url}
                      alt="vacation"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors duration-300" />
                  </div>
                ))}
              </div>
            )}

            {v.attachments.length >= 3 && (
              <div className="grid grid-cols-3 gap-2 h-28">
                <div
                  onClick={() => setLightboxIndex(0)}
                  className="col-span-2 relative rounded-2xl overflow-hidden cursor-pointer group shadow-sm border border-black/5"
                >
                  <img
                    src={v.attachments[0]}
                    alt="vacation"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors duration-300" />
                </div>
                <div className="col-span-1 grid grid-rows-2 gap-2 h-full">
                  <div
                    onClick={() => setLightboxIndex(1)}
                    className="relative rounded-xl overflow-hidden cursor-pointer group shadow-sm border border-black/5"
                  >
                    <img
                      src={v.attachments[1]}
                      alt="vacation"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors duration-300" />
                  </div>
                  <div
                    onClick={() => setLightboxIndex(2)}
                    className="relative rounded-xl overflow-hidden cursor-pointer group shadow-sm border border-black/5"
                  >
                    <img
                      src={v.attachments[2]}
                      alt="vacation"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      referrerPolicy="no-referrer"
                    />
                    {v.attachments.length > 3 ? (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white text-[11px] font-black tracking-wider uppercase group-hover:bg-black/50 transition-colors">
                        +{v.attachments.length - 2}
                      </div>
                    ) : (
                      <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors duration-300" />
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <AnimatePresence>
          {lightboxIndex !== null &&
            v.attachments &&
            v.attachments.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex flex-col justify-between bg-zinc-950/95 backdrop-blur-md text-white p-4 sm:p-6 md:p-8 select-none"
              >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div className="flex items-center gap-3">
                    <Palmtree className="text-emerald-400" size={24} />
                    <div>
                      <h3 className="font-black text-sm sm:text-base uppercase tracking-wider">
                        {language === "es"
                          ? "Recuerdos del Viaje"
                          : "Trip Album"}
                      </h3>
                      <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1">
                        <MapPin size={10} /> {v.destination}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        if (lightboxIndex !== null && v.attachments) {
                          const urlToRemove = v.attachments[lightboxIndex];
                          if (v.attachments.length <= 1) {
                            setLightboxIndex(null);
                          } else {
                            setLightboxIndex((prev) =>
                              prev === 0 ? 0 : prev ? prev - 1 : 0,
                            );
                          }
                          await handleRemoveAttachment(v, urlToRemove);
                        }
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-[9px] font-black uppercase tracking-widest bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-xl transition-all"
                      title={
                        language === "es" ? "Eliminar Foto" : "Delete Photo"
                      }
                    >
                      <Trash2 size={12} />
                      <span className="hidden sm:inline">
                        {language === "es" ? "Eliminar" : "Delete"}
                      </span>
                    </button>
                    <button
                      onClick={() => setLightboxIndex(null)}
                      className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white transition-all animate-none"
                    >
                      <X size={20} />
                    </button>
                  </div>
                </div>

                {/* Main Carousel Slider */}
                <div className="flex-1 flex items-center justify-between gap-4 py-8 relative">
                  {/* Previous Button */}
                  {v.attachments.length > 1 ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setLightboxIndex((prev) =>
                          prev !== null
                            ? prev === 0
                              ? v.attachments.length - 1
                              : prev - 1
                            : 0,
                        );
                      }}
                      className="p-3 rounded-full bg-white/5 hover:bg-white/15 text-white/80 hover:text-white transition-all border border-white/5"
                    >
                      <ChevronLeft size={24} />
                    </button>
                  ) : (
                    <div className="w-12 h-12" />
                  )}

                  {/* Central Photo View */}
                  <div className="flex-1 flex items-center justify-center h-full max-h-[55vh]">
                    <motion.img
                      key={lightboxIndex}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      src={v.attachments[lightboxIndex]}
                      alt={`Trip attachment ${lightboxIndex + 1}`}
                      className="max-w-full max-h-full object-contain rounded-2xl sm:rounded-3xl shadow-2xl border border-white/10"
                      referrerPolicy="no-referrer"
                    />
                  </div>

                  {/* Next Button */}
                  {v.attachments.length > 1 ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setLightboxIndex((prev) =>
                          prev !== null
                            ? prev === v.attachments.length - 1
                              ? 0
                              : prev + 1
                            : 0,
                        );
                      }}
                      className="p-3 rounded-full bg-white/5 hover:bg-white/15 text-white/80 hover:text-white transition-all border border-white/5"
                    >
                      <ChevronRight size={24} />
                    </button>
                  ) : (
                    <div className="w-12 h-12" />
                  )}
                </div>

                {/* Footer navigation */}
                <div className="space-y-4 pt-4 border-t border-white/5">
                  <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-zinc-400">
                    <span>
                      {language === "es"
                        ? "Navegación de Galería"
                        : "Gallery Navigation"}
                    </span>
                    <span>
                      {lightboxIndex + 1} / {v.attachments.length}
                    </span>
                  </div>

                  <div className="flex justify-center gap-2 overflow-x-auto py-2 max-w-full scrollbar-none scroll-smooth">
                    {v.attachments.map((url, i) => (
                      <div
                        key={i}
                        onClick={(e) => {
                          e.stopPropagation();
                          setLightboxIndex(i);
                        }}
                        className={`relative w-12 h-12 flex-shrink-0 rounded-xl overflow-hidden cursor-pointer transition-all border-2 ${
                          i === lightboxIndex
                            ? "border-emerald-400 scale-110 shadow-[0_0_12px_rgba(52,211,153,0.3)]"
                            : "border-transparent opacity-50 hover:opacity-100"
                        }`}
                      >
                        <img
                          src={url}
                          alt="thumbnail"
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
        </AnimatePresence>

        <div
          className={`space-y-3 mt-6 pt-6 border-t font-bold ${isDark ? "border-white/10" : "border-slate-100"}`}
        >
          <div className="flex flex-wrap items-center justify-between gap-1.5 text-xs">
            <span className="opacity-30 uppercase tracking-widest text-[9px]">
              {t.date}
            </span>
            <span
              className={`italic break-words text-right text-[11px] sm:text-xs ${isDark ? "text-zinc-300" : "text-slate-600"}`}
            >
              {v.startDate} — {v.endDate}
            </span>
          </div>
          {v.budget && !isFinanceRestricted && (
            <div
              className={`space-y-4 pt-4 border-t border-dotted mt-4 ${isDark ? "border-white/10" : "border-slate-150"}`}
            >
              <div className="flex justify-between items-center text-xs">
                <span className="opacity-30 uppercase tracking-widest text-[9px]">
                  {t.budget}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-emerald-500 font-black">
                    {v.budget} €
                  </span>
                  <button
                    onClick={async () => {
                      const newBudget = prompt(t.budget, v.budget?.toString());
                      if (newBudget) {
                        await updateDoc(doc(db, "vacations", v.id), {
                          budget: parseFloat(newBudget),
                        });
                      }
                    }}
                    className={`p-1 rounded opacity-0 group-hover:opacity-100 transition-all font-normal ${isDark ? "hover:bg-white/10 text-zinc-400" : "hover:bg-slate-150 text-slate-500"}`}
                  >
                    <Edit3 size={10} />
                  </button>
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between items-center text-[8px] font-black uppercase tracking-widest">
                  <span className="opacity-40">{t.spent}</span>
                  <span
                    className={
                      spent > (v.budget || 0)
                        ? "text-rose-500"
                        : isDark
                          ? "text-indigo-400"
                          : "text-indigo-500"
                    }
                  >
                    {spent.toFixed(2)}€
                  </span>
                </div>
                <div
                  className={`h-1 rounded-full overflow-hidden ${isDark ? "bg-white/10" : "bg-slate-100"}`}
                >
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${per}%` }}
                    className={`h-full ${spent > (v.budget || 0) ? "bg-rose-500" : "bg-indigo-500"}`}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <div
        className={`absolute -bottom-12 -right-12 w-32 h-32 rounded-full group-hover:scale-150 transition-transform duration-700 pointer-events-none ${isDark ? "bg-white/5" : "bg-slate-50"}`}
      />
    </motion.div>
  );
};

const WeatherWidget = ({
  language,
  theme,
  isDark,
}: {
  language: "es" | "en";
  theme: any;
  isDark: boolean;
}) => {
  const [cityName, setCityName] = useState<string>("");
  const [weatherData, setWeatherData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [showSearch, setShowSearch] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [unit, setUnit] = useState<"C" | "F">("C");

  const tw = {
    es: {
      loading: "Cargando clima...",
      error: "Error al cargar",
      searchPlaceholder: "Buscar ciudad...",
      feelsLike: "Sensación",
      wind: "Viento",
      humidity: "Humedad",
      precip: "Precipitaciones",
      searchCity: "Cambiar ubicación",
      geoPrompt: "Usar ubicación actual",
      noResults: "No encontrados",
    },
    en: {
      loading: "Loading weather...",
      error: "Error loading weather",
      searchPlaceholder: "Search city...",
      feelsLike: "Feels like",
      wind: "Wind",
      humidity: "Humidity",
      precip: "Precipitation",
      searchCity: "Change location",
      geoPrompt: "Use current location",
      noResults: "No results found",
    },
  }[language] || {
    loading: "Loading weather...",
    error: "Error loading weather",
    searchPlaceholder: "Search city...",
    feelsLike: "Feels like",
    wind: "Wind",
    humidity: "Humidity",
    precip: "Precipitation",
    searchCity: "Change location",
    geoPrompt: "Use current location",
    noResults: "No results found",
  };

  const weatherDescriptionsEs: {
    [key: number]: { label: string; icon: any; color: string };
  } = {
    0: { label: "Cielo Despejado", icon: Sun, color: "text-amber-500" },
    1: {
      label: "Mayormente Despejado",
      icon: CloudSun,
      color: "text-amber-400",
    },
    2: { label: "Parcialmente Nublado", icon: CloudSun, color: "text-sky-400" },
    3: { label: "Cubierto", icon: Cloud, color: "text-zinc-400" },
    45: { label: "Niebla", icon: Cloud, color: "text-zinc-500" },
    48: { label: "Niebla con Escarcha", icon: Cloud, color: "text-zinc-500" },
    51: {
      label: "Llovizna Ligera",
      icon: CloudDrizzle,
      color: "text-blue-300",
    },
    53: {
      label: "Llovizna Moderada",
      icon: CloudDrizzle,
      color: "text-blue-400",
    },
    55: { label: "Llovizna Densa", icon: CloudDrizzle, color: "text-blue-500" },
    56: {
      label: "Llovizna Helada Ligera",
      icon: CloudSnow,
      color: "text-teal-300",
    },
    57: {
      label: "Llovizna Helada Densa",
      icon: CloudSnow,
      color: "text-teal-500",
    },
    61: { label: "Lluvia Ligera", icon: CloudRain, color: "text-blue-400" },
    63: { label: "Lluvia Moderada", icon: CloudRain, color: "text-blue-500" },
    65: { label: "Lluvia Fuerte", icon: CloudRain, color: "text-blue-600" },
    66: {
      label: "Lluvia Helada Ligera",
      icon: CloudSnow,
      color: "text-teal-400",
    },
    67: {
      label: "Lluvia Helada Fuerte",
      icon: CloudSnow,
      color: "text-teal-600",
    },
    71: { label: "Nieve Ligera", icon: CloudSnow, color: "text-sky-200" },
    73: { label: "Nieve Moderada", icon: CloudSnow, color: "text-sky-300" },
    75: { label: "Nieve Fuerte", icon: CloudSnow, color: "text-sky-400" },
    77: { label: "Granos de Nieve", icon: CloudSnow, color: "text-sky-500" },
    80: {
      label: "Chubascos de Lluvia Ligeros",
      icon: CloudRain,
      color: "text-blue-400",
    },
    81: {
      label: "Chubascos de Lluvia Moderados",
      icon: CloudRain,
      color: "text-blue-500",
    },
    82: {
      label: "Chubascos de Lluvia Fuertes",
      icon: CloudRain,
      color: "text-blue-600",
    },
    85: {
      label: "Chubascos de Nieve Ligeros",
      icon: CloudSnow,
      color: "text-sky-300",
    },
    86: {
      label: "Chubascos de Nieve Fuertes",
      icon: CloudSnow,
      color: "text-sky-500",
    },
    95: { label: "Tormenta", icon: CloudLightning, color: "text-amber-600" },
    96: {
      label: "Tormenta con Granizo",
      icon: CloudLightning,
      color: "text-amber-700",
    },
    99: {
      label: "Tormenta con Granizo Fuerte",
      icon: CloudLightning,
      color: "text-amber-800",
    },
  };

  const weatherDescriptionsEn: {
    [key: number]: { label: string; icon: any; color: string };
  } = {
    0: { label: "Clear Sky", icon: Sun, color: "text-amber-500" },
    1: { label: "Mainly Clear", icon: CloudSun, color: "text-amber-400" },
    2: { label: "Partly Cloudy", icon: CloudSun, color: "text-sky-400" },
    3: { label: "Overcast", icon: Cloud, color: "text-zinc-400" },
    45: { label: "Foggy", icon: Cloud, color: "text-zinc-500" },
    48: { label: "Depositing Rime Fog", icon: Cloud, color: "text-zinc-500" },
    51: { label: "Light Drizzle", icon: CloudDrizzle, color: "text-blue-300" },
    53: {
      label: "Moderate Drizzle",
      icon: CloudDrizzle,
      color: "text-blue-400",
    },
    55: { label: "Dense Drizzle", icon: CloudDrizzle, color: "text-blue-500" },
    56: {
      label: "Light Freezing Drizzle",
      icon: CloudSnow,
      color: "text-teal-300",
    },
    57: {
      label: "Dense Freezing Drizzle",
      icon: CloudSnow,
      color: "text-teal-500",
    },
    61: { label: "Slight Rain", icon: CloudRain, color: "text-blue-400" },
    63: { label: "Moderate Rain", icon: CloudRain, color: "text-blue-500" },
    65: { label: "Heavy Rain", icon: CloudRain, color: "text-blue-600" },
    66: {
      label: "Light Freezing Rain",
      icon: CloudSnow,
      color: "text-teal-400",
    },
    67: {
      label: "Heavy Freezing Rain",
      icon: CloudSnow,
      color: "text-teal-600",
    },
    71: { label: "Slight Snow", icon: CloudSnow, color: "text-sky-200" },
    73: { label: "Moderate Snow", icon: CloudSnow, color: "text-sky-300" },
    75: { label: "Heavy Snow", icon: CloudSnow, color: "text-sky-400" },
    77: { label: "Snow Grains", icon: CloudSnow, color: "text-sky-500" },
    80: {
      label: "Slight Rain Showers",
      icon: CloudRain,
      color: "text-blue-400",
    },
    81: {
      label: "Moderate Rain Showers",
      icon: CloudRain,
      color: "text-blue-500",
    },
    82: {
      label: "Violent Rain Showers",
      icon: CloudRain,
      color: "text-blue-600",
    },
    85: {
      label: "Slight Snow Showers",
      icon: CloudSnow,
      color: "text-sky-300",
    },
    86: { label: "Heavy Snow Showers", icon: CloudSnow, color: "text-sky-500" },
    95: {
      label: "Thunderstorm",
      icon: CloudLightning,
      color: "text-amber-600",
    },
    96: {
      label: "Thunderstorm with Hail",
      icon: CloudLightning,
      color: "text-amber-700",
    },
    99: {
      label: "Thunderstorm with Heavy Hail",
      icon: CloudLightning,
      color: "text-amber-800",
    },
  };

  const weatherDescriptions =
    language === "es" ? weatherDescriptionsEs : weatherDescriptionsEn;

  const fetchWeather = async (lat: number, lon: number) => {
    setLoading(true);
    setError(null);
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch weather");
      const data = await res.json();

      const current = data.current;
      const daily = data.daily;

      setWeatherData({
        temp: current.temperature_2m,
        apparentTemp: current.apparent_temperature,
        humidity: current.relative_humidity_2m,
        windSpeed: current.wind_speed_10m,
        weatherCode: current.weather_code,
        precipitation: current.precipitation,
        daily: {
          time: daily.time,
          weatherCode: daily.weather_code,
          tempMax: daily.temperature_2m_max,
          tempMin: daily.temperature_2m_min,
        },
      });
    } catch (err: any) {
      console.warn("Weather fetch failed (handled gracefully):", err?.message || err);
      setError(tw.error);
    } finally {
      setLoading(false);
    }
  };

  const loadAutomaticLocation = () => {
    // 1. Instantly set up default fallback so the user registers a beautiful, working weather widget on the first frame
    const defaultCity = language === "es" ? "Madrid, ES" : "London, GB";
    const defaultLat = language === "es" ? 40.4165 : 51.5074;
    const defaultLon = language === "es" ? -3.7026 : -0.1278;

    setCityName(defaultCity);
    fetchWeather(defaultLat, defaultLon);

    // 2. Silently attempt to get their real location in the background
    if (navigator.geolocation) {
      try {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;
            const defaultLabel =
              language === "es" ? "Tu ubicación" : "Your location";
            setCityName(defaultLabel);
            localStorage.setItem("weatherCity", defaultLabel);
            localStorage.setItem("weatherLat", String(lat));
            localStorage.setItem("weatherLon", String(lon));
            fetchWeather(lat, lon);
          },
          (err) => {
            console.log("Background silent geolocation skipped/denied (normal):", err);
            // Save fallback so we don't prompt in every restart if they already denied/can't grant
            localStorage.setItem("weatherCity", defaultCity);
            localStorage.setItem("weatherLat", String(defaultLat));
            localStorage.setItem("weatherLon", String(defaultLon));
          },
          { timeout: 4000 },
        );
      } catch (e) {
        console.warn("Background geolocation block inside iframe sandbox:", e);
        localStorage.setItem("weatherCity", defaultCity);
        localStorage.setItem("weatherLat", String(defaultLat));
        localStorage.setItem("weatherLon", String(defaultLon));
      }
    } else {
      localStorage.setItem("weatherCity", defaultCity);
      localStorage.setItem("weatherLat", String(defaultLat));
      localStorage.setItem("weatherLon", String(defaultLon));
    }
  };

  const setupFallback = () => {
    const defaultCity = language === "es" ? "Madrid, ES" : "London, GB";
    const defaultLat = language === "es" ? 40.4165 : 51.5074;
    const defaultLon = language === "es" ? -3.7026 : -0.1278;
    setCityName(defaultCity);
    localStorage.setItem("weatherCity", defaultCity);
    localStorage.setItem("weatherLat", String(defaultLat));
    localStorage.setItem("weatherLon", String(defaultLon));
    fetchWeather(defaultLat, defaultLon);
  };

  useEffect(() => {
    const savedCity = localStorage.getItem("weatherCity");
    const savedLat = localStorage.getItem("weatherLat");
    const savedLon = localStorage.getItem("weatherLon");

    if (savedCity && savedLat && savedLon) {
      setCityName(savedCity);
      fetchWeather(parseFloat(savedLat), parseFloat(savedLon));
    } else {
      loadAutomaticLocation();
    }
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    setError(null);
    try {
      const res = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(searchQuery)}&count=5&language=${language === "es" ? "es" : "en"}`,
      );
      if (!res.ok) throw new Error("Geocoding failed");
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        setSearchResults(data.results);
      } else {
        setSearchResults([]);
        setError(tw.noResults);
      }
    } catch (err: any) {
      console.error(err);
      setError(language === "es" ? "Error al buscar" : "Search failed");
    } finally {
      setIsSearching(false);
    }
  };

  const selectCity = (result: any) => {
    const name = `${result.name}, ${result.country_code || result.country || ""}`;
    setCityName(name);
    localStorage.setItem("weatherCity", name);
    localStorage.setItem("weatherLat", String(result.latitude));
    localStorage.setItem("weatherLon", String(result.longitude));
    fetchWeather(result.latitude, result.longitude);
    setSearchResults([]);
    setSearchQuery("");
    setShowSearch(false);
  };

  const convertTemp = (tempC: number) => {
    if (unit === "F") {
      return Math.round((tempC * 9) / 5 + 32);
    }
    return Math.round(tempC);
  };

  const getDayName = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(language === "es" ? "es-ES" : "en-US", {
      weekday: "short",
    });
  };

  const currentCondition = weatherData
    ? weatherDescriptions[weatherData.weatherCode] || {
        label: language === "es" ? "Despejado" : "Clear",
        icon: Sun,
        color: "text-amber-500",
      }
    : null;
  const CurrentIcon = currentCondition ? currentCondition.icon : Sun;

  return (
    <div
      className={`${theme.card} p-6 sm:p-8 rounded-[2rem] sm:rounded-[3rem] shadow-sm relative overflow-hidden flex flex-col group transition-all flex-1 h-auto`}
    >
      <div className="relative z-10 flex flex-col h-full justify-between gap-4">
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1 min-w-0 pr-2">
            <button
              type="button"
              onClick={() => setShowSearch(!showSearch)}
              className="text-[9px] font-black uppercase tracking-[0.15em] opacity-40 hover:opacity-100 transition-opacity flex items-center gap-1.5 text-left min-w-0 max-w-full"
            >
              <MapPin size={9} className="shrink-0" />
              <span className="truncate">{cityName || "..."}</span>
            </button>
            <div className="text-xs font-black uppercase mt-0.5 tracking-tight flex items-center gap-2 truncate">
              <span>{currentCondition?.label || "..."}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setUnit((u) => (u === "C" ? "F" : "C"))}
              className={`text-[9px] font-black transition-colors rounded-lg px-2 py-1 uppercase tracking-widest border ${isDark ? "bg-white/5 border-white/10 text-white hover:bg-white/10" : "bg-black/5 border-black/5 text-zinc-650 hover:bg-black/10"}`}
            >
              °{unit}
            </button>
            <button
              onClick={() => {
                setShowSearch(false);
                if (weatherData) {
                  const savedLat = localStorage.getItem("weatherLat");
                  const savedLon = localStorage.getItem("weatherLon");
                  if (savedLat && savedLon) {
                    fetchWeather(parseFloat(savedLat), parseFloat(savedLon));
                  } else {
                    loadAutomaticLocation();
                  }
                }
              }}
              className={`p-1.5 rounded-lg border transition-colors ${isDark ? "bg-white/5 border-white/10 text-white hover:bg-white/10" : "bg-black/5 border-black/5 text-zinc-650 hover:bg-black/10"}`}
            >
              <RefreshCw
                size={11}
                className={loading && !showSearch ? "animate-spin" : ""}
              />
            </button>
          </div>
        </div>

        {showSearch ? (
          <div className="flex-1 min-h-[140px] flex flex-col justify-start">
            <form onSubmit={handleSearch} className="flex gap-2 mb-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={tw.searchPlaceholder}
                className={`flex-1 min-w-0 px-3 py-1.5 rounded-xl text-xs outline-none font-bold border ${isDark ? "bg-[#18181B] border-white/10 text-white" : "bg-white border-black/5 text-zinc-800"}`}
                autoFocus
              />
              <button
                type="submit"
                className="p-2 bg-indigo-500 rounded-xl text-white hover:scale-105 active:scale-95 transition-transform"
              >
                <Search size={12} />
              </button>
            </form>

            <div className="space-y-1 overflow-y-auto max-h-[110px] pr-1 custom-scrollbar">
              {isSearching && (
                <div className="py-2 text-[10px] font-black uppercase text-center opacity-40 animate-pulse">
                  {tw.loading}
                </div>
              )}
              {searchResults.map((res, i) => (
                <button
                  key={i}
                  onClick={() => selectCity(res)}
                  className={`w-full text-left text-xs font-bold px-3 py-1.5 rounded-lg border transition-all ${isDark ? "border-white/5 bg-white/5 hover:bg-white/10 text-white" : "border-black/5 bg-black/5 hover:bg-black/10 text-zinc-800"}`}
                >
                  {res.name},{" "}
                  <span className="opacity-50">
                    {res.admin1} {res.country}
                  </span>
                </button>
              ))}
              {!isSearching && searchResults.length === 0 && (
                <button
                  onClick={loadAutomaticLocation}
                  className={`w-full text-center text-[10px] font-black uppercase py-4 rounded-xl border border-dashed transition-all ${isDark ? "border-white/10 hover:bg-white/5 text-zinc-400" : "border-zinc-300 hover:bg-black/5 text-zinc-650"}`}
                >
                  📍 {tw.geoPrompt}
                </button>
              )}
            </div>
          </div>
        ) : loading ? (
          <div className="flex-1 min-h-[140px] flex flex-col items-center justify-center opacity-30 gap-3">
            <RefreshCw size={24} className="animate-spin text-indigo-500" />
            <p className="text-[10px] font-black uppercase tracking-widest">
              {tw.loading}
            </p>
          </div>
        ) : error ? (
          <div className="flex-1 min-h-[140px] flex flex-col items-center justify-center opacity-50 gap-2">
            <span className="text-xl">⚠️</span>
            <p className="text-[10px] font-black uppercase text-center">
              {error}
            </p>
            <button
              onClick={setupFallback}
              className="mt-2 text-[9px] px-2 py-1 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20 font-black uppercase"
            >
              Reset
            </button>
          </div>
        ) : (
          <div className="flex-1 flex flex-col justify-between">
            {/* Main Stats */}
            <div className="flex items-center justify-between my-2">
              <div>
                <div className="flex items-start">
                  <span className="text-4xl sm:text-5xl font-black italic tracking-tighter leading-none">
                    {convertTemp(weatherData.temp)}
                  </span>
                  <span className="text-md font-black italic uppercase leading-none text-indigo-500 -mt-1 ml-0.5">
                    °{unit}
                  </span>
                </div>
                <p className="text-[10px] font-bold opacity-50 mt-1">
                  {tw.feelsLike}: {convertTemp(weatherData.apparentTemp)}°{unit}
                </p>
              </div>

              <div className="relative">
                <motion.div
                  animate={{ y: [0, -4, 0] }}
                  transition={{
                    repeat: Infinity,
                    duration: 4,
                    ease: "easeInOut",
                  }}
                >
                  <CurrentIcon size={44} className={currentCondition?.color} />
                </motion.div>
                {/* Visual Glow */}
                <div className="absolute inset-0 bg-indigo-500/10 rounded-full blur-xl scale-125 -z-10" />
              </div>
            </div>

            {/* Weather Metrics */}
            <div className="grid grid-cols-3 gap-2 py-2 border-t border-b border-black/5 dark:border-white/5 my-2 text-center">
              <div>
                <p className="text-[8px] font-black uppercase tracking-widest opacity-40">
                  {tw.wind}
                </p>
                <p className="text-[11px] font-black mt-0.5 truncate">
                  {Math.round(weatherData.windSpeed)} km/h
                </p>
              </div>
              <div>
                <p className="text-[8px] font-black uppercase tracking-widest opacity-40">
                  {tw.humidity}
                </p>
                <p className="text-[11px] font-black mt-0.5">
                  {weatherData.humidity}%
                </p>
              </div>
              <div>
                <p className="text-[8px] font-black uppercase tracking-widest opacity-40">
                  {tw.precip}
                </p>
                <p className="text-[11px] font-black mt-0.5">
                  {weatherData.precipitation} mm
                </p>
              </div>
            </div>

            {/* 3 Day Forecast */}
            <div className="grid grid-cols-3 gap-2 mt-1">
              {weatherData.daily.time
                .slice(1, 4)
                .map((day: any, idx: number) => {
                  const dayCode = weatherData.daily.weatherCode[idx + 1];
                  const dayCond = weatherDescriptions[dayCode] || {
                    icon: Cloud,
                    color: "text-zinc-400",
                  };
                  const DayIcon = dayCond.icon;
                  return (
                    <div
                      key={day}
                      className="flex flex-col items-center bg-black/5 dark:bg-white/5 py-1.5 px-1 rounded-xl"
                    >
                      <span className="text-[9px] font-black uppercase tracking-wider opacity-50">
                        {getDayName(day)}
                      </span>
                      <DayIcon size={16} className={`${dayCond.color} my-1`} />
                      <span className="text-[10px] font-black tabular-nums">
                        {convertTemp(weatherData.daily.tempMax[idx + 1])}°
                      </span>
                    </div>
                  );
                })}
            </div>
          </div>
        )}
      </div>

      {/* Decorative gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/5 via-transparent to-rose-500/5 opacity-50 pointer-events-none" />
    </div>
  );
};

const UpcomingTripCountdown = ({
  trip,
  language,
  isDark,
}: {
  trip: Vacation;
  language: Language;
  isDark: boolean;
}) => {
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  } | null>(null);

  useEffect(() => {
    if (!trip || !trip.startDate) {
      setTimeLeft(null);
      return;
    }

    const targetDate = new Date(`${trip.startDate}T00:00:00`);

    const updateTimer = () => {
      const now = new Date();
      const diff = targetDate.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor(
        (diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60),
      );
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds });
    };

    updateTimer();
    const intervalId = setInterval(updateTimer, 1000);

    return () => clearInterval(intervalId);
  }, [trip.id, trip.startDate]);

  if (!timeLeft) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      className={`relative overflow-hidden p-6 sm:p-8 rounded-[2.5rem] border mb-8 transition-all ${
        isDark
          ? "bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-indigo-500/10 border-white/5 text-white"
          : "bg-gradient-to-r from-emerald-50 via-teal-50/30 to-blue-50 border-slate-100 text-slate-800"
      }`}
    >
      <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-[60px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[60px] translate-y-1/2 -translate-x-1/2 pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-500 flex items-center gap-2">
            <Sparkles
              size={12}
              className="animate-spin"
              style={{ animationDuration: "4s" }}
            />
            {language === "es"
              ? "Próxima Aventura Familiar"
              : "Next Family Adventure"}
          </span>
          <h3 className="text-2xl sm:text-3xl font-black uppercase tracking-tighter italic mt-2 flex items-center gap-3">
            <Plane className="text-emerald-500 animate-pulse" size={24} />
            <span>{trip.destination}</span>
          </h3>
          <p className="text-xs font-bold opacity-60 mt-1 flex items-center gap-1.5">
            <Calendar size={14} className="opacity-70" />
            <span>
              {language === "es" ? "Salida:" : "Departure:"} {trip.startDate}
            </span>
          </p>
        </div>

        <div className="flex gap-3 sm:gap-4 select-none">
          {[
            {
              label: language === "es" ? "DÍAS" : "DAYS",
              value: timeLeft.days,
            },
            {
              label: language === "es" ? "HORAS" : "HOURS",
              value: timeLeft.hours,
            },
            {
              label: language === "es" ? "MINS" : "MINUTOS",
              value: timeLeft.minutes,
            },
            {
              label: language === "es" ? "SEGS" : "SECONDS",
              value: timeLeft.seconds,
              animate: true,
            },
          ].map((item, idx) => (
            <div
              key={idx}
              className={`flex flex-col items-center justify-center min-w-[64px] sm:min-w-[72px] p-3 rounded-2xl border ${
                isDark
                  ? "bg-black/30 border-white/5 shadow-inner"
                  : "bg-white border-slate-100 shadow-sm"
              }`}
            >
              <span
                className={`text-xl sm:text-2xl font-black tracking-tight ${item.animate ? "text-emerald-500" : ""}`}
              >
                {String(item.value).padStart(2, "0")}
              </span>
              <span className="text-[8px] font-black tracking-wider opacity-40 mt-1">
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

const VacationPlanner = ({
  vacations,
  expenses,
  familyId,
  theme,
  language,
  userData,
  sendNotification,
  isFinanceRestricted,
}: {
  vacations: Vacation[];
  expenses: Expense[];
  familyId: string;
  theme: any;
  language: Language;
  userData: any;
  sendNotification: any;
  isFinanceRestricted?: boolean;
}) => {
  const [dest, setDest] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [budget, setBudget] = useState("");
  const t = translations[language];
  const isDark =
    theme.bg?.includes("0c0a21") ||
    theme.bg?.includes("020617") ||
    theme.card?.includes("18181B") ||
    theme.card?.includes("1e293b");

  const upcomingVacations = useMemo(() => {
    return vacations
      .filter((v) => {
        if (!v.startDate) return false;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const start = new Date(v.startDate);
        start.setHours(0, 0, 0, 0);
        return start >= today;
      })
      .sort(
        (a, b) =>
          new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
      );
  }, [vacations]);

  const nextVacation = upcomingVacations[0];

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dest || !start || !end) return;
    try {
      await addDoc(collection(db, "vacations"), {
        destination: dest,
        startDate: start,
        endDate: end,
        budget: budget ? parseFloat(budget) : null,
        attachments: [],
        familyId,
        status: "Planning",
        createdAt: serverTimestamp(),
      });
      sendNotification(
        t.newNotification,
        `${userData?.displayName || "Family member"}: ${dest} ✈️`,
        "system",
      );
      setDest("");
      setStart("");
      end && setEnd("");
      budget && setBudget("");
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, "vacations");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, "vacations", id));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, "vacations");
    }
  };

  const handleAddAttachment = async (v: Vacation) => {
    const url = prompt(t.enterImageUrl);
    if (!url) return;
    try {
      await updateDoc(doc(db, "vacations", v.id), {
        attachments: [...(v.attachments || []), url],
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, "vacations");
    }
  };

  const handleStatusChange = async (id: string, s: string) => {
    try {
      await updateDoc(doc(db, "vacations", id), { status: s });
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, "vacations");
    }
  };

  const handleRemoveAttachment = async (v: Vacation, url: string) => {
    try {
      await updateDoc(doc(db, "vacations", v.id), {
        attachments: arrayRemove(url),
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, "vacations");
    }
  };

  return (
    <div
      className={`space-y-6 ${theme.card} p-6 sm:p-10 rounded-[2rem] sm:rounded-[3rem] border shadow-sm`}
    >
      <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
        <h2 className="text-3xl font-black italic uppercase tracking-tighter flex items-center gap-4">
          <Palmtree size={32} className="text-emerald-500" />
          {t.planEscape}
        </h2>
        <span className="text-[10px] font-black uppercase tracking-[0.4em] opacity-20">
          {t.adventureLogistics}
        </span>
      </div>

      <form
        onSubmit={handleAdd}
        className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-5 sm:p-6 rounded-[2rem] sm:rounded-[2.5rem] mb-10 border ${isDark ? "bg-white/5 border-white/5" : "bg-slate-50 border-slate-100"}`}
      >
        <div className="flex flex-col gap-1.5 min-w-0">
          <label className="text-[9px] font-black uppercase tracking-widest opacity-40 ml-4">
            {t.destination}
          </label>
          <input
            placeholder={t.whereToGo}
            value={dest}
            onChange={(e) => setDest(e.target.value)}
            className={`px-4 py-3 sm:px-5 sm:py-3.5 rounded-2xl outline-none font-bold shadow-sm border text-xs sm:text-sm transition-all ${isDark ? "bg-zinc-900/60 text-white border-white/5 placeholder:text-white/20" : "bg-white text-zinc-800 border-slate-100 placeholder:text-black/20"}`}
          />
        </div>
        <div className="flex flex-col gap-1.5 min-w-0">
          <label className="text-[9px] font-black uppercase tracking-widest opacity-40 ml-4">
            {t.departure}
          </label>
          <input
            type="date"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className={`px-4 py-3 sm:px-5 sm:py-3.5 rounded-2xl outline-none font-bold shadow-sm border text-xs sm:text-sm transition-all ${isDark ? "bg-zinc-900/60 text-white border-white/5" : "bg-white text-zinc-800 border-slate-100"}`}
          />
        </div>
        <div className="flex flex-col gap-1.5 min-w-0">
          <label className="text-[9px] font-black uppercase tracking-widest opacity-40 ml-4">
            {t.return}
          </label>
          <input
            type="date"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            className={`px-4 py-3 sm:px-5 sm:py-3.5 rounded-2xl outline-none font-bold shadow-sm border text-xs sm:text-sm transition-all ${isDark ? "bg-zinc-900/60 text-white border-white/5" : "bg-white text-zinc-800 border-slate-100"}`}
          />
        </div>
        {!isFinanceRestricted && (
          <div className="flex flex-col gap-1.5 justify-end min-w-0">
            <div className="flex gap-2 w-full">
              <input
                placeholder={t.budget}
                type="number"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                className={`flex-1 min-w-0 px-4 py-3 sm:px-5 sm:py-3.5 rounded-2xl outline-none font-bold shadow-sm border text-xs sm:text-sm transition-all ${isDark ? "bg-zinc-900/60 text-white border-white/5 placeholder:text-white/20" : "bg-white text-zinc-800 border-slate-100 placeholder:text-black/20"}`}
              />
              <button
                className={`p-3.5 rounded-2xl text-white transition-all shadow-xl hover:scale-105 active:scale-95 flex items-center justify-center shrink-0 ${isDark ? "bg-emerald-600 hover:bg-emerald-500" : "bg-slate-900 hover:bg-black"}`}
              >
                <Plus size={20} />
              </button>
            </div>
          </div>
        )}
        {isFinanceRestricted && (
          <div className="flex flex-col gap-1.5 justify-end min-w-0">
            <button
              className={`w-full py-3.5 rounded-2xl text-white transition-all shadow-xl hover:scale-105 active:scale-95 flex items-center justify-center shrink-0 ${isDark ? "bg-emerald-600 hover:bg-emerald-500" : "bg-slate-900 hover:bg-black"}`}
            >
              <Plus size={20} className="mr-2" />
              <span className="font-black uppercase tracking-tight text-[10px]">
                {t.planEscape}
              </span>
            </button>
          </div>
        )}
      </form>

      {/* Featured next upcoming adventure dynamic timer */}
      <AnimatePresence mode="wait">
        {nextVacation && (
          <UpcomingTripCountdown
            trip={nextVacation}
            language={language}
            isDark={isDark}
          />
        )}
      </AnimatePresence>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {vacations.map((v) => (
          <VacationCard
            key={v.id}
            v={v}
            expenses={expenses}
            t={t}
            theme={theme}
            handleStatusChange={handleStatusChange}
            handleAddAttachment={handleAddAttachment}
            handleRemoveAttachment={handleRemoveAttachment}
            handleDelete={handleDelete}
            language={language}
            isFinanceRestricted={isFinanceRestricted}
          />
        ))}
      </div>
    </div>
  );
};

const CalendarView = ({
  tasks,
  theme,
  onStatusChange,
  holidays,
  language,
}: CalendarViewProps & { language: Language }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const t = translations[language];

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();

  const monthName = currentDate.toLocaleString(
    language === "es" ? "es-ES" : "en-US",
    { month: "long" },
  );

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const blanks = Array.from({ length: firstDayOfMonth }, (_, i) => i);

  const getTasksForDate = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return tasks.filter((t) => t.dueDate === dateStr);
  };

  const getHolidaysForDate = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return holidays.filter((h) => h.date === dateStr);
  };

  const isHero =
    theme.bg.includes("radial-gradient") || theme.bg.includes("0F172A");
  const isGlass = theme.bg.includes("indigo-950");

  return (
    <div
      className={`w-full max-w-6xl mx-auto ${theme.card} p-10 rounded-[4rem] border shadow-2xl transition-all duration-500 overflow-hidden relative`}
    >
      <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />

      <div className="flex flex-col md:flex-row justify-between items-center mb-12 gap-8 relative z-10">
        <div>
          <h2 className="text-4xl font-black italic uppercase tracking-tighter flex items-center gap-4 mb-2">
            <span
              className="w-4 h-12 rounded-full"
              style={{ backgroundColor: theme.accent }}
            ></span>
            {monthName}{" "}
            <span className="opacity-30 font-light not-italic">{year}</span>
          </h2>
          <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40 ml-8">
            {t.familyOperationalCalendar}
          </p>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex bg-black/5 p-1.5 rounded-2xl">
            <button
              onClick={prevMonth}
              className="p-3 hover:bg-white rounded-xl transition-all hover:shadow-sm"
              title={t.prevMonth}
            >
              <ArrowRight size={20} className="rotate-180 opacity-60" />
            </button>
            <div className="w-px h-6 bg-black/10 mx-1 self-center" />
            <button
              onClick={nextMonth}
              className="p-3 hover:bg-white rounded-xl transition-all hover:shadow-sm"
              title={t.nextMonth}
            >
              <ArrowRight size={20} className="opacity-60" />
            </button>
          </div>
          <button
            onClick={() => setCurrentDate(new Date())}
            className="px-6 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl"
          >
            {t.today}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-3 md:gap-6 relative z-10">
        {(language === "es"
          ? ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]
          : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
        ).map((day, i) => (
          <div
            key={day}
            className={`text-center text-[10px] font-black uppercase tracking-[0.3em] opacity-30 py-6 ${i === 0 || i === 6 ? "text-rose-500" : ""}`}
          >
            {day}
          </div>
        ))}

        {blanks.map((i) => (
          <div key={`blank-${i}`} className="aspect-square opacity-0"></div>
        ))}

        {days.map((day) => {
          const dayTasks = getTasksForDate(day);
          const dayHolidays = getHolidaysForDate(day);
          const dateObj = new Date(year, month, day);
          const isToday = new Date().toDateString() === dateObj.toDateString();
          const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;

          return (
            <motion.div
              whileHover={{ y: -4, scale: 1.02 }}
              key={day}
              className={`aspect-square p-3 rounded-[2rem] border min-h-[100px] flex flex-col gap-2 transition-all cursor-default relative group
                ${
                  isToday
                    ? "bg-indigo-500 text-white border-indigo-400 shadow-[0_20px_50px_rgba(79,70,229,0.3)] ring-4 ring-indigo-500/10"
                    : isHero
                      ? "bg-white/5 border-white/5 hover:bg-white/10"
                      : isGlass
                        ? "bg-white/10 border-white/10 hover:bg-white/20"
                        : isWeekend
                          ? "bg-slate-50/50 border-slate-100 hover:bg-slate-100"
                          : "bg-white border-slate-100 hover:border-slate-200 hover:shadow-xl hover:bg-slate-50/50"
                }
              `}
            >
              <div className="flex justify-between items-center mb-1">
                <span
                  className={`text-sm font-black italic ${isToday ? "opacity-100 text-2xl" : "opacity-40"}`}
                >
                  {day}
                </span>
                {(dayTasks.some((t) => t.status !== "Completed") ||
                  dayHolidays.length > 0) &&
                  !isToday && (
                    <div className="flex gap-1">
                      {dayHolidays.length > 0 && (
                        <span className="w-2 h-2 bg-rose-500 rounded-full shadow-[0_0_8px_rgba(244,63,94,0.6)]"></span>
                      )}
                      {dayTasks.some((t) => t.status !== "Completed") && (
                        <span className="w-2 h-2 bg-indigo-400 rounded-full shadow-[0_0_8px_rgba(129,140,248,0.6)]"></span>
                      )}
                    </div>
                  )}
              </div>

              <div className="flex-1 overflow-hidden space-y-1.5">
                {dayHolidays.map((h, i) => (
                  <div
                    key={`hol-${i}`}
                    className={`text-[8px] font-black p-1.5 rounded-lg truncate border backdrop-blur-sm
                      ${isToday ? "bg-white/20 border-white/20 text-white" : "bg-rose-50 border-rose-100 text-rose-500"}
                    `}
                  >
                    🎉 {h.name}
                  </div>
                ))}
                {dayTasks.map((task) => (
                  <div
                    key={task.id}
                    className={`text-[8px] font-bold p-1.5 rounded-lg truncate border shadow-sm transition-all
                      ${
                        isToday
                          ? "bg-white text-indigo-600 border-white"
                          : task.status === "Completed"
                            ? "bg-emerald-500/10 text-emerald-600/60 line-through border-emerald-500/5"
                            : isHero
                              ? "bg-white/10 text-white border-white/5"
                              : "bg-white text-slate-700 border-slate-100"
                      }
                    `}
                    title={task.title}
                  >
                    {task.title}
                  </div>
                ))}
              </div>

              {!isToday && isWeekend && (
                <div className="absolute inset-0 bg-slate-400/5 rounded-[2rem] pointer-events-none" />
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
