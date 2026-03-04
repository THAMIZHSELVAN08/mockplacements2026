import { useState } from "react";
import {
  Search,
  Check,
  X,
  Users,
  Clock,
  AlertTriangle,
  FileText,
  Menu,
  LogOut,
  Loader2,
  WifiOff,
  UserPlus,
  Ban,
} from "lucide-react";

import {
  useVolunteerStudents,
  useVolunteerAddStudent,
  useVolunteerCancelAssignment,
  useVolunteerMarkNoShow,
  type StudentWithAssignment,
  type AddStudentPayload,
} from "../api/queries";

// ─── Types ────────────────────────────────────────────────────────────────────

type InterviewStatus =
  | "PENDING"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "NO_SHOW"
  | "CANCELLED";

interface StatusConfig {
  label: string;
  bg: string;
  text: string;
  dot: string;
}

type FilterKey = InterviewStatus | "ALL";

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<InterviewStatus, StatusConfig> = {
  PENDING: {
    label: "Pending",
    bg: "bg-amber-50",
    text: "text-amber-700",
    dot: "bg-amber-400",
  },
  IN_PROGRESS: {
    label: "In Progress",
    bg: "bg-blue-50",
    text: "text-blue-700",
    dot: "bg-blue-500",
  },
  COMPLETED: {
    label: "Completed",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    dot: "bg-emerald-500",
  },
  NO_SHOW: {
    label: "No Show",
    bg: "bg-red-50",
    text: "text-red-700",
    dot: "bg-red-400",
  },
  CANCELLED: {
    label: "Cancelled",
    bg: "bg-slate-100",
    text: "text-slate-500",
    dot: "bg-slate-400",
  },
};

const AVATAR_COLORS = [
  "bg-violet-100 text-violet-700",
  "bg-cyan-100 text-cyan-700",
  "bg-rose-100 text-rose-700",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
  "bg-indigo-100 text-indigo-700",
];

const DEPARTMENTS = [
  "CSE",
  "ECE",
  "IT",
  "MECH",
  "CIVIL",
  "EEE",
  "AIDS",
  "AIML",
  "CSD",
  "Other",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getAuthUser(): { name: string; role: string } {
  try {
    const raw = localStorage.getItem("user");
    if (raw) {
      const p = JSON.parse(raw);
      return {
        name: p.name ?? p.username ?? "Volunteer",
        role: p.role ?? "VOLUNTEER",
      };
    }
  } catch {
    /* ignore */
  }
  return { name: "Volunteer", role: "VOLUNTEER" };
}

function handleLogout() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  window.location.href = "/login";
}

// ─── Small Components ─────────────────────────────────────────────────────────

function Avatar({ name, size = "md" }: { name: string; size?: "md" | "lg" }) {
  const initials = name
    .split(" ")
    .map((w: string) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const color = AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
  const sz = size === "lg" ? "w-10 h-10 text-sm" : "w-8 h-8 text-xs";
  return (
    <div
      className={`${sz} ${color} rounded-full flex items-center justify-center font-semibold flex-shrink-0 select-none`}
    >
      {initials}
    </div>
  );
}

function Badge({ status }: { status: InterviewStatus }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.PENDING;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
      <div
        className="h-full bg-teal-600 rounded-full transition-all duration-500"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-3">
      <Loader2 className="w-8 h-8 text-teal-500 animate-spin" />
      <p className="text-sm text-slate-400">Loading candidates…</p>
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <WifiOff className="w-8 h-8 text-slate-300" />
      <div className="text-center">
        <p className="text-sm font-medium text-slate-700">
          Failed to load candidates
        </p>
        <p className="text-xs text-slate-400 mt-0.5">
          Check your connection and try again
        </p>
      </div>
      <button
        onClick={onRetry}
        className="px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-colors"
      >
        Retry
      </button>
    </div>
  );
}

function Toast({
  message,
  type = "success",
  onDone,
}: {
  message: string;
  type?: "success" | "error";
  onDone: () => void;
}) {
  const [visible, setVisible] = useState(true);
  useState(() => {
    const t = setTimeout(() => {
      setVisible(false);
      setTimeout(onDone, 300);
    }, 2700);
    return () => clearTimeout(t);
  });
  return (
    <div
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] ${type === "error" ? "bg-red-600" : "bg-teal-700"} text-white text-sm font-medium px-5 py-3 rounded-full shadow-xl flex items-center gap-2 transition-opacity duration-300 whitespace-nowrap ${visible ? "opacity-100" : "opacity-0"}`}
    >
      <span
        className={`text-base ${type === "error" ? "text-red-200" : "text-emerald-300"}`}
      >
        {type === "error" ? "✕" : "✓"}
      </span>
      {message}
    </div>
  );
}

// ─── Resume Modal ─────────────────────────────────────────────────────────────

function ResumeModal({
  student,
  onClose,
}: {
  student: StudentWithAssignment;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: "rgba(15,23,42,0.55)", backdropFilter: "blur(2px)" }}
    >
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-2xl max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <div>
            <h2 className="font-semibold text-slate-900">Resume Preview</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {student.name} · {student.registerNumber} · {student.department}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-500 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-auto p-5 sm:p-6">
          {student.resumeUrl ? (
            <iframe
              src={student.resumeUrl}
              title="Resume"
              className="w-full h-[60vh] rounded-lg border border-slate-200"
            />
          ) : (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
              <FileText className="w-10 h-10 text-slate-200" />
              <p className="text-sm">No resume uploaded for this student</p>
            </div>
          )}
        </div>
        <div className="px-5 sm:px-6 py-4 border-t border-slate-100 flex justify-end flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── No Show Confirm ──────────────────────────────────────────────────────────

function NoShowConfirm({
  student,
  onClose,
  onConfirm,
  isPending,
}: {
  student: StudentWithAssignment;
  onClose: () => void;
  onConfirm: (assignmentId: number) => void;
  isPending: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(15,23,42,0.55)", backdropFilter: "blur(2px)" }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-6 h-6 text-red-500" />
        </div>
        <h3 className="text-center font-semibold text-slate-900 text-base mb-1">
          Mark as No Show?
        </h3>
        <p className="text-center text-sm text-slate-500 mb-6 leading-relaxed">
          <span className="font-medium text-slate-700">{student.name}</span>{" "}
          will be recorded as absent for this interview slot.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isPending}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(student.assignmentId)}
            disabled={isPending}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isPending ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…
              </>
            ) : (
              "Confirm"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Cancel Confirm ───────────────────────────────────────────────────────────

function CancelConfirm({
  student,
  onClose,
  onConfirm,
  isPending,
}: {
  student: StudentWithAssignment;
  onClose: () => void;
  onConfirm: (assignmentId: number) => void;
  isPending: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(15,23,42,0.55)", backdropFilter: "blur(2px)" }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Ban className="w-6 h-6 text-slate-500" />
        </div>
        <h3 className="text-center font-semibold text-slate-900 text-base mb-1">
          Cancel Assignment?
        </h3>
        <p className="text-center text-sm text-slate-500 mb-6 leading-relaxed">
          <span className="font-medium text-slate-700">{student.name}</span>'s
          slot will be cancelled and removed from the queue.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isPending}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-50"
          >
            Back
          </button>
          <button
            onClick={() => onConfirm(student.assignmentId)}
            disabled={isPending}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-slate-700 rounded-lg hover:bg-slate-900 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isPending ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…
              </>
            ) : (
              "Cancel Slot"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Add Student Modal ────────────────────────────────────────────────────────

function AddStudentModal({
  onClose,
  onSubmit,
  isPending,
}: {
  onClose: () => void;
  onSubmit: (data: AddStudentPayload) => void;
  isPending: boolean;
}) {
  const [form, setForm] = useState<AddStudentPayload>({
    name: "",
    registerNumber: "",
    department: "",
    section: "",
  });
  const [errors, setErrors] = useState<
    Partial<Record<keyof AddStudentPayload, string>>
  >({});

  const validate = (): boolean => {
    const e: typeof errors = {};
    if (!form.name.trim()) e.name = "Name is required";
    if (!form.registerNumber.trim())
      e.registerNumber = "Register number is required";
    else if (!/^[A-Za-z0-9]+$/.test(form.registerNumber))
      e.registerNumber = "Alphanumeric only";
    if (!form.department) e.department = "Department is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (!validate() || isPending) return;
    onSubmit(form);
  };

  const field = (
    label: string,
    key: keyof AddStudentPayload,
    placeholder: string,
    opts?: { uppercase?: boolean },
  ) => (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">
        {label} {key !== "section" && <span className="text-red-400">*</span>}
      </label>
      <input
        value={form[key] ?? ""}
        onChange={(e) =>
          setForm((p) => ({
            ...p,
            [key]: opts?.uppercase
              ? e.target.value.toUpperCase()
              : e.target.value,
          }))
        }
        placeholder={placeholder}
        className={`w-full border rounded-lg px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-colors ${errors[key] ? "border-red-300 bg-red-50" : "border-slate-200"
          }`}
      />
      {errors[key] && (
        <p className="text-xs text-red-500 mt-1">{errors[key]}</p>
      )}
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: "rgba(15,23,42,0.55)", backdropFilter: "blur(2px)" }}
    >
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md flex flex-col">
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <div>
            <h2 className="font-semibold text-slate-900">Add Student</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Register a new candidate to this HR's queue
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-500 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 sm:px-6 py-5 space-y-4">
          {field("Full Name", "name", "e.g. Arun Kumar")}
          {field("Register Number", "registerNumber", "e.g. 21CS001", {
            uppercase: true,
          })}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Department <span className="text-red-400">*</span>
            </label>
            <select
              value={form.department}
              onChange={(e) =>
                setForm((p) => ({ ...p, department: e.target.value }))
              }
              className={`w-full border rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-colors ${errors.department
                ? "border-red-300 bg-red-50"
                : "border-slate-200"
                }`}
            >
              <option value="">Select department…</option>
              {DEPARTMENTS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
            {errors.department && (
              <p className="text-xs text-red-500 mt-1">{errors.department}</p>
            )}
          </div>

          {field("Section", "section", "e.g. A", { uppercase: true })}
        </div>

        <div className="px-5 sm:px-6 py-4 border-t border-slate-100 flex gap-3 flex-shrink-0">
          <button
            onClick={onClose}
            disabled={isPending}
            className="flex-1 sm:flex-none px-4 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isPending}
            className="flex-1 sm:flex-none px-6 py-2.5 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isPending ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Adding…
              </>
            ) : (
              "Add Student"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Mobile Student Card ──────────────────────────────────────────────────────

function StudentCard({
  student,
  onNoShow,
  onCancel,
  onResume,
}: {
  student: StudentWithAssignment;
  onNoShow: (s: StudentWithAssignment) => void;
  onCancel: (s: StudentWithAssignment) => void;
  onResume: (s: StudentWithAssignment) => void;
}) {
  const actionable = !["COMPLETED", "NO_SHOW", "CANCELLED"].includes(
    student.status,
  );
  return (
    <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <Avatar name={student.name} size="lg" />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div>
              <p className="font-semibold text-slate-900 text-sm leading-tight">
                {student.name}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                {student.registerNumber} · {student.department}
                {student.section ? ` · Sec ${student.section}` : ""}
              </p>
            </div>
            <Badge status={student.status} />
          </div>
          <div className="flex flex-wrap gap-2">
            {student.resumeUrl && (
              <button
                onClick={() => onResume(student)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <FileText className="w-3.5 h-3.5" /> Resume
              </button>
            )}
            {actionable && (
              <>
                <button
                  onClick={() => onNoShow(student)}
                  className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 border border-red-100 rounded-lg hover:bg-red-100 transition-colors"
                >
                  ✗ No Show
                </button>
                <button
                  onClick={() => onCancel(student)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  Cancel Slot
                </button>
              </>
            )}
            {student.status === "COMPLETED" && (
              <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium py-1.5">
                <Check className="w-3.5 h-3.5" /> Evaluated
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Volunteer Dashboard ─────────────────────────────────────────────────

export default function VolunteerDashboard() {
  const volunteer = getAuthUser();

  // ── API hooks ──
  const {
    data: students = [],
    isLoading,
    isError,
    refetch,
  } = useVolunteerStudents();
  const addMutation = useVolunteerAddStudent();
  const cancelMutation = useVolunteerCancelAssignment();
  const noShowMutation = useVolunteerMarkNoShow();

  // ── UI state ──
  const [filter, setFilter] = useState<FilterKey>("ALL");
  const [search, setSearch] = useState("");
  const [resumeStudent, setResumeStudent] =
    useState<StudentWithAssignment | null>(null);
  const [noShowStudent, setNoShowStudent] =
    useState<StudentWithAssignment | null>(null);
  const [cancelStudent, setCancelStudent] =
    useState<StudentWithAssignment | null>(null);
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);
  const [mobileMenu, setMobileMenu] = useState(false);

  // ── Derived stats ──
  const stats = {
    total: students.length,
    completed: students.filter((s) => s.status === "COMPLETED").length,
    pending: students.filter((s) =>
      ["PENDING", "IN_PROGRESS"].includes(s.status),
    ).length,
    noShow: students.filter((s) => s.status === "NO_SHOW").length,
  };

  const FILTER_TABS: { key: FilterKey; label: string; count: number }[] = [
    { key: "ALL", label: "All", count: students.length },
    {
      key: "PENDING",
      label: "Pending",
      count: students.filter((s) => s.status === "PENDING").length,
    },
    {
      key: "IN_PROGRESS",
      label: "In Progress",
      count: students.filter((s) => s.status === "IN_PROGRESS").length,
    },
    {
      key: "COMPLETED",
      label: "Completed",
      count: students.filter((s) => s.status === "COMPLETED").length,
    },
    {
      key: "NO_SHOW",
      label: "No Show",
      count: students.filter((s) => s.status === "NO_SHOW").length,
    },
    {
      key: "CANCELLED",
      label: "Cancelled",
      count: students.filter((s) => s.status === "CANCELLED").length,
    },
  ];

  const filtered = students.filter((s) => {
    const matchFilter = filter === "ALL" || s.status === filter;
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      s.name.toLowerCase().includes(q) ||
      s.registerNumber.toLowerCase().includes(q) ||
      s.department.toLowerCase().includes(q);
    return matchFilter && matchSearch;
  });

  // ── Handlers ──
  const handleAddStudent = (data: AddStudentPayload) => {
    addMutation.mutate(data, {
      onSuccess: () => {
        setShowAddStudent(false);
        setToast({
          message: "Student added to queue successfully",
          type: "success",
        });
      },
      onError: () => {
        setToast({
          message: "Failed to add student. Check details and try again.",
          type: "error",
        });
      },
    });
  };

  const handleNoShow = (assignmentId: number) => {
    const s = students.find((s) => s.assignmentId === assignmentId);
    noShowMutation.mutate(assignmentId, {
      onSuccess: () => {
        setNoShowStudent(null);
        setToast({
          message: `${s?.name ?? "Candidate"} marked as no show`,
          type: "success",
        });
      },
      onError: () => {
        setToast({
          message: "Failed to mark no show. Please try again.",
          type: "error",
        });
      },
    });
  };

  const handleCancel = (assignmentId: number) => {
    const s = students.find((s) => s.assignmentId === assignmentId);
    cancelMutation.mutate(assignmentId, {
      onSuccess: () => {
        setCancelStudent(null);
        setToast({
          message: `${s?.name ?? "Candidate"}'s slot has been cancelled`,
          type: "success",
        });
      },
      onError: () => {
        setToast({
          message: "Failed to cancel slot. Please try again.",
          type: "error",
        });
      },
    });
  };

  const completionPct =
    stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* ── Sidebar ── */}
      <aside className="w-64 bg-[#0B0F19] text-slate-300 flex-col justify-between hidden sm:flex flex-shrink-0 z-50">
        {/* top section */}
        <div className="p-6 relative z-10 w-full h-full flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-8">
              <div className="w-8 h-8 rounded-xl bg-teal-600 flex items-center justify-center font-bold text-white shadow-lg shadow-teal-500/30">N</div>
              <span className="text-xl font-bold text-white tracking-wide">Nexus</span>
            </div>

            <nav className="space-y-2">
              <div className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Dashboard</div>
              <div className="flex items-center gap-3 px-3 py-2.5 bg-teal-600/10 text-teal-400 rounded-xl transition-colors relative cursor-default">
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-teal-500 rounded-r-full" />
                <Users className="w-5 h-5" />
                <span className="font-medium text-white">Volunteer Panel</span>
              </div>
            </nav>
          </div>

          {/* bottom section */}
          <div className="p-4 bg-slate-800/40 rounded-2xl flex items-center justify-between border border-slate-700/50">
            <div className="flex items-center gap-3 overflow-hidden">
              <Avatar name={volunteer.name} />
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate text-white">
                  {volunteer.name}
                </p>
                <p className="text-xs text-slate-400 truncate">Volunteer</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 hover:bg-slate-700/50 rounded-xl transition-colors text-slate-400 hover:text-red-400"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        {/* Mobile menu button & Title */}
        <div className="sm:hidden flex items-center justify-between p-4 bg-white border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-teal-600 flex items-center justify-center font-bold text-white text-xs">N</div>
            <span className="font-bold text-slate-900">Nexus</span>
          </div>
          <button
            className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-600 border border-slate-200"
            onClick={() => setMobileMenu((p) => !p)}
          >
            {mobileMenu ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {mobileMenu && (
          <div className="sm:hidden border-b border-slate-100 bg-white px-4 py-3 space-y-1 flex-shrink-0">
            <div className="flex items-center gap-3 py-2 mb-1">
              <Avatar name={volunteer.name} size="lg" />
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {volunteer.name}
                </p>
                <p className="text-xs text-teal-600 font-medium">Volunteer</p>
              </div>
            </div>
            <button
              onClick={() => {
                setShowAddStudent(true);
                setMobileMenu(false);
              }}
              className="w-full text-left px-3 py-2.5 text-sm font-medium text-teal-700 hover:bg-teal-50 rounded-lg transition-colors flex items-center gap-2"
            >
              <UserPlus className="w-3.5 h-3.5" /> Add Student
            </button>
            <button
              onClick={handleLogout}
              className="w-full text-left px-3 py-2.5 text-sm font-medium text-red-500 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-2"
            >
              <LogOut className="w-3.5 h-3.5" /> Logout
            </button>
          </div>
        )}

        <div className="flex-1 overflow-auto">
          <div className="max-w-6xl mx-auto px-4 sm:px-8 py-6 sm:py-8 space-y-6">
            {/* Header Actions */}
            <div className="flex justify-end mb-2 sm:mb-0 sm:absolute sm:top-8 sm:right-8 z-10 px-4 sm:px-0 mt-4 sm:mt-0">
              <button
                onClick={() => setShowAddStudent(true)}
                className="hidden sm:inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 shadow-sm transition-colors"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Add Student</span>
              </button>
            </div>

            {/* Page title */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
                  Volunteer Dashboard
                </h1>
                <p className="text-sm text-slate-400 mt-0.5">
                  Online Mocks ·{" "}
                  {new Date().toLocaleDateString("en-IN", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>
              {!isLoading && !isError && (
                <div className="sm:text-right">
                  <p className="text-xs text-slate-400 mb-1">Overall Progress</p>
                  <div className="flex items-center gap-2">
                    <div className="w-32 sm:w-40">
                      <ProgressBar value={stats.completed} max={stats.total} />
                    </div>
                    <span className="text-sm font-semibold text-slate-900">
                      {completionPct}%
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Role notice */}
            <div className="flex items-start gap-3 bg-teal-50 border border-teal-100 rounded-xl px-4 py-3">
              <span className="text-teal-500 mt-0.5 flex-shrink-0">ℹ</span>
              <p className="text-xs text-teal-700 leading-relaxed">
                As a volunteer, you can <strong>add students</strong>,{" "}
                <strong>mark no-shows</strong>, and <strong>cancel slots</strong>{" "}
                for the HR you're assigned to. Evaluation is handled exclusively by
                the HR.
              </p>
            </div>

            {/* Stats */}
            {!isLoading && !isError && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {(
                  [
                    {
                      label: "Total in Queue",
                      value: stats.total,
                      color: "text-slate-900",
                      bg: "bg-white",
                      icon: <Users className="w-4 h-4 text-slate-600" />,
                    },
                    {
                      label: "Evaluated",
                      value: stats.completed,
                      color: "text-emerald-700",
                      bg: "bg-emerald-50",
                      icon: <Check className="w-4 h-4 text-emerald-600" />,
                    },
                    {
                      label: "Pending / Active",
                      value: stats.pending,
                      color: "text-amber-700",
                      bg: "bg-amber-50",
                      icon: <Clock className="w-4 h-4 text-amber-600" />,
                    },
                    {
                      label: "No Show",
                      value: stats.noShow,
                      color: "text-red-600",
                      bg: "bg-red-50",
                      icon: <X className="w-4 h-4 text-red-600" />,
                    },
                  ] as const
                ).map((stat) => (
                  <div
                    key={stat.label}
                    className={`${stat.bg} rounded-xl p-4 border border-slate-100`}
                  >
                    <div className="mb-1">{stat.icon}</div>
                    <div
                      className={`text-2xl sm:text-3xl font-bold ${stat.color} leading-none`}
                    >
                      {stat.value}
                    </div>
                    <div className="text-xs text-slate-500 font-medium mt-1">
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Search + Filter */}
            <div className="space-y-3">
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-teal-400">
                  <Search className="w-4 h-4" strokeWidth={2} />
                </span>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name, register number, or department..."
                  className="w-full pl-9 pr-10 py-2.5 text-sm text-slate-800 bg-white border border-teal-100 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 placeholder-slate-400 transition-all"
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-teal-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <div
                className="flex gap-2 overflow-x-auto pb-0.5"
                style={{ scrollbarWidth: "none" }}
              >
                {FILTER_TABS.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setFilter(tab.key)}
                    className={`flex-shrink-0 inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-full border transition-colors ${filter === tab.key
                      ? "bg-teal-600 text-white border-teal-600"
                      : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                  >
                    {tab.label}
                    <span
                      className={`text-xs ${filter === tab.key ? "text-teal-200" : "text-slate-300"}`}
                    >
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Content */}
            {isLoading ? (
              <LoadingState />
            ) : isError ? (
              <ErrorState onRetry={refetch} />
            ) : (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
                    {filtered.length} candidate{filtered.length !== 1 ? "s" : ""}
                    {filter !== "ALL"
                      ? ` · ${filter.replace("_", " ").toLowerCase()}`
                      : ""}
                  </p>
                  {/* Quick-add button inline for desktop */}
                  <button
                    onClick={() => setShowAddStudent(true)}
                    className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-teal-700 bg-teal-50 border border-teal-200 rounded-lg hover:bg-teal-100 transition-colors"
                  >
                    <UserPlus className="w-3.5 h-3.5" /> Add Student
                  </button>
                </div>

                {/* Desktop table */}
                <div className="hidden sm:block bg-white rounded-2xl border border-teal-100 shadow-md overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-teal-100 bg-teal-50">
                        <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider w-12">
                          #
                        </th>
                        <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                          Candidate
                        </th>
                        <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                          Dept
                        </th>
                        <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="text-right px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {filtered.length === 0 ? (
                        <tr>
                          <td
                            colSpan={5}
                            className="text-center py-16 text-slate-400 text-sm"
                          >
                            <div className="text-3xl mb-2">🔍</div>
                            No candidates match your current filters
                          </td>
                        </tr>
                      ) : (
                        filtered.map((student) => {
                          const actionable = ![
                            "COMPLETED",
                            "NO_SHOW",
                            "CANCELLED",
                          ].includes(student.status);
                          return (
                            <tr
                              key={student.id}
                              className="hover:bg-teal-50/40 transition-colors group"
                            >
                              <td className="px-5 py-4 text-sm text-slate-400 font-mono">
                                {student.order}
                              </td>
                              <td className="px-5 py-4">
                                <div className="flex items-center gap-3">
                                  <Avatar name={student.name} />
                                  <div>
                                    <p className="text-sm font-semibold text-slate-900">
                                      {student.name}
                                    </p>
                                    <p className="text-xs text-slate-400">
                                      {student.registerNumber}
                                      {student.section
                                        ? ` · Sec ${student.section}`
                                        : ""}
                                    </p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-5 py-4 text-sm text-slate-600">
                                {student.department}
                              </td>
                              <td className="px-5 py-4">
                                <Badge status={student.status} />
                              </td>
                              <td className="px-5 py-4">
                                <div className="flex items-center justify-end gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                                  {student.resumeUrl && (
                                    <button
                                      onClick={() => setResumeStudent(student)}
                                      className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
                                    >
                                      Resume
                                    </button>
                                  )}
                                  {actionable ? (
                                    <>
                                      <button
                                        onClick={() => setNoShowStudent(student)}
                                        className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 border border-red-100 rounded-lg hover:bg-red-100 transition-colors"
                                      >
                                        No Show
                                      </button>
                                      <button
                                        onClick={() => setCancelStudent(student)}
                                        className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
                                      >
                                        Cancel Slot
                                      </button>
                                    </>
                                  ) : student.status === "COMPLETED" ? (
                                    <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                                      <Check className="w-3.5 h-3.5" /> Evaluated
                                    </span>
                                  ) : (
                                    <span className="text-xs text-slate-300">
                                      —
                                    </span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Mobile cards */}
                <div className="sm:hidden space-y-2.5">
                  {filtered.length === 0 ? (
                    <div className="text-center py-16 text-slate-400 text-sm bg-white rounded-2xl border border-slate-100">
                      <div className="text-3xl mb-2">🔍</div>
                      No candidates match your filters
                    </div>
                  ) : (
                    filtered.map((student) => (
                      <StudentCard
                        key={student.id}
                        student={student}
                        onNoShow={setNoShowStudent}
                        onCancel={setCancelStudent}
                        onResume={setResumeStudent}
                      />
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="pt-2 pb-4 flex items-center justify-between border-t border-slate-100">
              <p className="text-xs text-slate-400">
                MockPlacement Software · {volunteer.name}
              </p>
              <button
                onClick={() => setShowAddStudent(true)}
                className="text-xs font-medium text-teal-600 hover:text-teal-800 transition-colors flex items-center gap-1.5"
              >
                <UserPlus className="w-3.5 h-3.5" /> Add another student
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Modals */}
      {resumeStudent && (
        <ResumeModal
          student={resumeStudent}
          onClose={() => setResumeStudent(null)}
        />
      )}
      {noShowStudent && (
        <NoShowConfirm
          student={noShowStudent}
          onClose={() => setNoShowStudent(null)}
          onConfirm={handleNoShow}
          isPending={noShowMutation.isPending}
        />
      )}
      {cancelStudent && (
        <CancelConfirm
          student={cancelStudent}
          onClose={() => setCancelStudent(null)}
          onConfirm={handleCancel}
          isPending={cancelMutation.isPending}
        />
      )}
      {showAddStudent && (
        <AddStudentModal
          onClose={() => setShowAddStudent(false)}
          onSubmit={handleAddStudent}
          isPending={addMutation.isPending}
        />
      )}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onDone={() => setToast(null)}
        />
      )}
    </div>
  );
}
