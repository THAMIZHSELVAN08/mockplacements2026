import { useState } from "react";
import {
  Search,
  Star,
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
} from "lucide-react";

import {
  useHrStudents,
  useHrEvaluateStudent,
  useHrMarkNoShow,
  useHrSubmitFeedback,
  type StudentWithAssignment,
  type EvaluateStudentPayload,
  type FeedbackPayload,
} from "../api/queries";

// ─── Types ────────────────────────────────────────────────────────────────────

type InterviewStatus =
  | "PENDING"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "NO_SHOW"
  | "CANCELLED";

// Matches backend EvaluationCriteriaSchema exactly — all fields rated 0–10
interface EvaluationRatings {
  appearanceAttitude: number;
  managerialAptitude: number;
  generalAwareness: number;
  technicalKnowledge: number;
  communicationSkills: number;
  ambition: number;
  selfConfidence: number;
}

// Matches backend SubmitFeedbackSchema exactly — rated 1–5
interface FeedbackFormState {
  technicalKnowledge: number;
  serviceAndCoordination: number;
  communicationSkills: number;
  futureParticipation: number;
  punctualityAndInterest: number;
  suggestions: string;
  issuesFaced: string;
  improvementSuggestions: string;
}

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Read the logged-in user from wherever your auth stores it. */
function getAuthUser(): { name: string; company: string } {
  try {
    const raw = localStorage.getItem("user");
    if (raw) {
      const parsed = JSON.parse(raw);
      // Adapt field names to match whatever your AuthResponse stores
      return {
        name: parsed.name ?? parsed.username ?? "HR",
        company: parsed.company ?? parsed.companyName ?? "",
      };
    }
  } catch {
    // ignore
  }
  return { name: "HR", company: "" };
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

function StarRating({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-slate-700 mb-1.5">
        {label}
      </label>
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(0)}
            className="focus:outline-none transition-transform hover:scale-110 p-0.5"
          >
            <Star
              className={`w-5 h-5 ${(hovered || value) >= star
                ? "text-amber-400 fill-amber-400"
                : "text-slate-200"
                }`}
              strokeWidth={1.5}
            />
          </button>
        ))}
        <span className="ml-2 text-sm text-slate-400 tabular-nums">
          {value > 0 ? `${value}/5` : "—"}
        </span>
      </div>
    </div>
  );
}

function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
      <div
        className="h-full bg-indigo-600 rounded-full transition-all duration-500"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

// ─── Loading / Error States ───────────────────────────────────────────────────

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-3">
      <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
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
        className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
      >
        Retry
      </button>
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
          {student.resumeUrl && student.resumeUrl !== "dummy" ? (
            // Real resume URL — render in an iframe
            <iframe
              src={student.resumeUrl}
              title="Resume"
              className="w-full h-[60vh] rounded-lg border border-slate-200"
            />
          ) : (
            // Fallback: generated dummy resume
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
              <div className="bg-indigo-600 text-white px-8 py-6 text-center">
                <h3 className="text-xl font-bold">{student.name}</h3>
                <p className="text-indigo-200 text-sm mt-1">
                  {student.department} Engineering · {student.registerNumber}
                </p>
                <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 mt-2 text-xs text-indigo-300">
                  <span>
                    📧 {student.registerNumber.toLowerCase()}@college.edu
                  </span>
                  <span>📞 +91 98765 43210</span>
                  <span>📍 Chennai, Tamil Nadu</span>
                </div>
              </div>
              <div className="p-6 space-y-5 text-sm">
                <section>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 border-b border-slate-100 pb-1">
                    Education
                  </h4>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-slate-800">
                        B.E. {student.department} Engineering
                      </p>
                      <p className="text-slate-500 text-xs">
                        XYZ Engineering College, Anna University
                      </p>
                    </div>
                    <div className="text-right text-xs text-slate-400">
                      <p>2021 – 2025</p>
                      <p className="font-medium text-slate-600">CGPA: 8.4</p>
                    </div>
                  </div>
                </section>
                <section>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 border-b border-slate-100 pb-1">
                    Technical Skills
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      "Java",
                      "Python",
                      "React",
                      "Node.js",
                      "MySQL",
                      "Spring Boot",
                      "Git",
                      "REST APIs",
                      "Docker",
                      "Linux",
                    ].map((s) => (
                      <span
                        key={s}
                        className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-xs font-medium"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </section>
                <section>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 border-b border-slate-100 pb-1">
                    Experience
                  </h4>
                  <div>
                    <div className="flex items-start justify-between">
                      <p className="font-semibold text-slate-800">
                        Software Engineering Intern
                      </p>
                      <p className="text-xs text-slate-400">Jun – Aug 2024</p>
                    </div>
                    <p className="text-xs text-slate-500 mb-1.5">
                      TechCorp India Pvt. Ltd., Bengaluru
                    </p>
                    <ul className="text-xs text-slate-600 space-y-1 list-disc list-inside">
                      <li>
                        Built RESTful APIs with Spring Boot serving 50k+ daily
                        requests
                      </li>
                      <li>
                        Optimized database queries reducing load time by 35%
                      </li>
                      <li>
                        Collaborated with a 5-member agile team to ship 3
                        features on schedule
                      </li>
                    </ul>
                  </div>
                </section>
                <section>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 border-b border-slate-100 pb-1">
                    Projects
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <p className="font-semibold text-slate-800">
                        Campus Placement Portal{" "}
                        <span className="text-xs font-normal text-slate-400">
                          · React, Node.js, PostgreSQL
                        </span>
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Full-stack app for managing campus recruitment with
                        role-based access control.
                      </p>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800">
                        Smart Inventory System{" "}
                        <span className="text-xs font-normal text-slate-400">
                          · Python, Raspberry Pi, MQTT
                        </span>
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        IoT-integrated real-time inventory tracker with
                        automated alerts.
                      </p>
                    </div>
                  </div>
                </section>
                <section>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 border-b border-slate-100 pb-1">
                    Achievements
                  </h4>
                  <ul className="text-xs text-slate-600 space-y-1 list-disc list-inside">
                    <li>
                      1st place — Intra-college Hackathon 2024 (team of 3)
                    </li>
                    <li>AWS Cloud Practitioner Certified (2024)</li>
                    <li>Department topper — Semester V &amp; VI</li>
                  </ul>
                </section>
              </div>
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

// ─── Evaluate Modal ───────────────────────────────────────────────────────────

function EvaluateModal({
  student,
  onClose,
  onSubmit,
  isPending,
}: {
  student: StudentWithAssignment;
  onClose: () => void;
  onSubmit: (data: EvaluateStudentPayload) => void;
  isPending: boolean;
}) {
  // All 7 criteria from backend EvaluationCriteriaSchema, rated 0–10
  const [ratings, setRatings] = useState<EvaluationRatings>({
    appearanceAttitude: 0,
    managerialAptitude: 0,
    generalAwareness: 0,
    technicalKnowledge: 0,
    communicationSkills: 0,
    ambition: 0,
    selfConfidence: 0,
  });
  const [strengths, setStrengths] = useState("");
  const [improvements, setImprovements] = useState("");
  const [comments, setComments] = useState("");

  const allRated = Object.values(ratings).every((v) => v > 0);
  const canSubmit = allRated && !isPending;

  // Average of 7 criteria (each 0–10), scaled to 0–99.99 to satisfy backend max
  const overallScore: number | null = allRated
    ? Math.min(
      99.99,
      parseFloat(
        (
          (Object.values(ratings).reduce((a, b) => a + b, 0) / 7 / 10) *
          99.99
        ).toFixed(2),
      ),
    )
    : null;

  const scoreLabel =
    overallScore !== null
      ? overallScore >= 70
        ? {
          text: "Highly Recommended",
          color: "text-emerald-600",
          bg: "bg-emerald-50",
        }
        : overallScore >= 50
          ? { text: "Recommended", color: "text-amber-600", bg: "bg-amber-50" }
          : { text: "Not Recommended", color: "text-red-500", bg: "bg-red-50" }
      : null;

  const handleSubmit = () => {
    if (overallScore === null) return;
    onSubmit({
      studentId: student.id,
      criteria: ratings,
      strengths,
      improvements,
      comments,
      overallScore,
    });
  };

  // StarRating for 0–10 scale: 5 stars each representing 2 points
  const toStarValue = (v: number) => Math.round(v / 2); // 0–10 → 0–5
  const fromStarValue = (s: number) => s * 2; // 0–5  → 0–10

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: "rgba(15,23,42,0.55)", backdropFilter: "blur(2px)" }}
    >
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg max-h-[94vh] flex flex-col">
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <Avatar name={student.name} size="lg" />
            <div>
              <h2 className="font-semibold text-slate-900 leading-tight">
                {student.name}
              </h2>
              <p className="text-xs text-slate-400">
                {student.department} · {student.registerNumber} · Sec{" "}
                {student.section}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-500 transition-colors flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-auto px-5 sm:px-6 py-5">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">
            Performance Ratings <span className="text-red-400">*</span>
          </p>
          <p className="text-xs text-slate-400 mb-4">
            Each criterion rated out of 10 (★ = 2 pts)
          </p>

          <StarRating
            label="Appearance & Attitude"
            value={toStarValue(ratings.appearanceAttitude)}
            onChange={(s) =>
              setRatings((p) => ({
                ...p,
                appearanceAttitude: fromStarValue(s),
              }))
            }
          />
          <StarRating
            label="Managerial Aptitude"
            value={toStarValue(ratings.managerialAptitude)}
            onChange={(s) =>
              setRatings((p) => ({
                ...p,
                managerialAptitude: fromStarValue(s),
              }))
            }
          />
          <StarRating
            label="General Awareness"
            value={toStarValue(ratings.generalAwareness)}
            onChange={(s) =>
              setRatings((p) => ({ ...p, generalAwareness: fromStarValue(s) }))
            }
          />
          <StarRating
            label="Technical Knowledge"
            value={toStarValue(ratings.technicalKnowledge)}
            onChange={(s) =>
              setRatings((p) => ({
                ...p,
                technicalKnowledge: fromStarValue(s),
              }))
            }
          />
          <StarRating
            label="Communication Skills"
            value={toStarValue(ratings.communicationSkills)}
            onChange={(s) =>
              setRatings((p) => ({
                ...p,
                communicationSkills: fromStarValue(s),
              }))
            }
          />
          <StarRating
            label="Ambition"
            value={toStarValue(ratings.ambition)}
            onChange={(s) =>
              setRatings((p) => ({ ...p, ambition: fromStarValue(s) }))
            }
          />
          <StarRating
            label="Self Confidence"
            value={toStarValue(ratings.selfConfidence)}
            onChange={(s) =>
              setRatings((p) => ({ ...p, selfConfidence: fromStarValue(s) }))
            }
          />

          {overallScore !== null && scoreLabel !== null && (
            <div
              className={`flex items-center gap-4 p-4 ${scoreLabel.bg} rounded-xl mb-5 border border-slate-100`}
            >
              <div className="text-center">
                <div className="text-3xl font-bold text-slate-900">
                  {overallScore.toFixed(2)}
                </div>
                <div className="text-xs text-slate-400">/ 99.99</div>
              </div>
              <div className="h-10 w-px bg-slate-200" />
              <div>
                <div className={`font-semibold text-sm ${scoreLabel.color}`}>
                  {scoreLabel.text}
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  Based on 7 criteria
                </div>
              </div>
              <div className="ml-auto flex-1 max-w-24">
                <ProgressBar value={overallScore} max={99.99} />
              </div>
            </div>
          )}

          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">
            Written Feedback
          </p>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Key Strengths
              </label>
              <textarea
                rows={2}
                value={strengths}
                onChange={(e) => setStrengths(e.target.value)}
                placeholder="What did the candidate demonstrate well?"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Areas for Improvement
              </label>
              <textarea
                rows={2}
                value={improvements}
                onChange={(e) => setImprovements(e.target.value)}
                placeholder="Where can the candidate grow?"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Additional Comments
              </label>
              <textarea
                rows={2}
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="Any other notes for the record..."
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
              />
            </div>
          </div>
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
            disabled={!canSubmit}
            className="flex-1 sm:flex-none px-6 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isPending ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…
              </>
            ) : (
              "Submit Evaluation"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── HR Feedback Modal ────────────────────────────────────────────────────────

function HrFeedbackModal({
  onClose,
  onSubmit,
  isPending,
}: {
  onClose: () => void;
  // Matches SubmitFeedbackSchema exactly — FeedbackPayload from queries may have
  // a stale `comments` field; we use our local FeedbackFormState here and cast on submit
  onSubmit: (data: FeedbackPayload) => void;
  isPending: boolean;
}) {
  const [form, setForm] = useState<FeedbackFormState>({
    technicalKnowledge: 0,
    serviceAndCoordination: 0,
    communicationSkills: 0,
    futureParticipation: 0,
    punctualityAndInterest: 0,
    suggestions: "",
    issuesFaced: "",
    improvementSuggestions: "",
  });

  const canSubmit =
    form.technicalKnowledge > 0 &&
    form.serviceAndCoordination > 0 &&
    form.communicationSkills > 0 &&
    form.futureParticipation > 0 &&
    form.punctualityAndInterest > 0 &&
    !isPending;

  const handleSubmit = () => {
    // Cast to FeedbackPayload — the backend accepts the extra text fields as optional
    onSubmit(form as unknown as FeedbackPayload);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: "rgba(15,23,42,0.55)", backdropFilter: "blur(2px)" }}
    >
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md max-h-[94vh] flex flex-col">
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <div>
            <h2 className="font-semibold text-slate-900">Event Feedback</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Rate your experience at this placement drive
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-500 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-auto px-5 sm:px-6 py-5">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">
            Ratings (1–5 stars)
          </p>
          <StarRating
            label="Student Technical Knowledge"
            value={form.technicalKnowledge}
            onChange={(v) => setForm((p) => ({ ...p, technicalKnowledge: v }))}
          />
          <StarRating
            label="Service & Coordination"
            value={form.serviceAndCoordination}
            onChange={(v) =>
              setForm((p) => ({ ...p, serviceAndCoordination: v }))
            }
          />
          <StarRating
            label="Communication Quality"
            value={form.communicationSkills}
            onChange={(v) => setForm((p) => ({ ...p, communicationSkills: v }))}
          />
          <StarRating
            label="Likelihood of Future Participation"
            value={form.futureParticipation}
            onChange={(v) => setForm((p) => ({ ...p, futureParticipation: v }))}
          />
          <StarRating
            label="Punctuality & Interest Level"
            value={form.punctualityAndInterest}
            onChange={(v) =>
              setForm((p) => ({ ...p, punctualityAndInterest: v }))
            }
          />

          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3 mt-1">
            Written Feedback
          </p>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Suggestions
              </label>
              <textarea
                rows={2}
                value={form.suggestions}
                onChange={(e) =>
                  setForm((p) => ({ ...p, suggestions: e.target.value }))
                }
                placeholder="Any suggestions for improvement?"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Issues Faced
              </label>
              <textarea
                rows={2}
                value={form.issuesFaced}
                onChange={(e) =>
                  setForm((p) => ({ ...p, issuesFaced: e.target.value }))
                }
                placeholder="Any problems or difficulties during the drive?"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Improvement Suggestions
              </label>
              <textarea
                rows={2}
                value={form.improvementSuggestions}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    improvementSuggestions: e.target.value,
                  }))
                }
                placeholder="How can future drives be improved?"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
              />
            </div>
          </div>
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
            disabled={!canSubmit}
            className="flex-1 sm:flex-none px-6 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isPending ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Submitting…
              </>
            ) : (
              "Submit Feedback"
            )}
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

// ─── Toast ────────────────────────────────────────────────────────────────────

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
  const bg = type === "error" ? "bg-red-600" : "bg-indigo-600";
  const icon = type === "error" ? "✕" : "✓";
  const iconColor = type === "error" ? "text-red-200" : "text-emerald-300";
  return (
    <div
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] ${bg} text-white text-sm font-medium px-5 py-3 rounded-full shadow-xl flex items-center gap-2 transition-opacity duration-300 whitespace-nowrap ${visible ? "opacity-100" : "opacity-0"}`}
    >
      <span className={`${iconColor} text-base`}>{icon}</span>
      {message}
    </div>
  );
}

// ─── Mobile Student Card ──────────────────────────────────────────────────────

function StudentCard({
  student,
  onEvaluate,
  onNoShow,
  onResume,
}: {
  student: StudentWithAssignment;
  onEvaluate: (s: StudentWithAssignment) => void;
  onNoShow: (s: StudentWithAssignment) => void;
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
                {student.registerNumber} · {student.department} · Sec{" "}
                {student.section}
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
            {actionable ? (
              <>
                <button
                  onClick={() => onEvaluate(student)}
                  className="px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  ✦ Evaluate
                </button>
                <button
                  onClick={() => onNoShow(student)}
                  className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 border border-red-100 rounded-lg hover:bg-red-100 transition-colors"
                >
                  ✗ No Show
                </button>
              </>
            ) : student.status === "COMPLETED" ? (
              <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium py-1.5">
                <Check className="w-3.5 h-3.5" /> Evaluated
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function HRDashboard() {
  const hrUser = getAuthUser();

  // ── API hooks ──
  const { data: students = [], isLoading, isError, refetch } = useHrStudents();

  const evaluateMutation = useHrEvaluateStudent();
  const noShowMutation = useHrMarkNoShow();
  const feedbackMutation = useHrSubmitFeedback();

  // ── Logout ──
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/login";
  };

  // ── UI state ──
  const [filter, setFilter] = useState<FilterKey>("ALL");
  const [search, setSearch] = useState("");
  const [resumeStudent, setResumeStudent] =
    useState<StudentWithAssignment | null>(null);
  const [evaluateStudent, setEvaluateStudent] =
    useState<StudentWithAssignment | null>(null);
  const [noShowStudent, setNoShowStudent] =
    useState<StudentWithAssignment | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);
  const [mobileMenu, setMobileMenu] = useState(false);

  // ── Stats derived from live data ──
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
      key: "COMPLETED",
      label: "Completed",
      count: students.filter((s) => s.status === "COMPLETED").length,
    },
    {
      key: "NO_SHOW",
      label: "No Show",
      count: students.filter((s) => s.status === "NO_SHOW").length,
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
  const handleEvaluate = (data: EvaluateStudentPayload) => {
    evaluateMutation.mutate(data, {
      onSuccess: () => {
        setEvaluateStudent(null);
        setToast({
          message: `Evaluation submitted for ${evaluateStudent?.name ?? "candidate"}`,
          type: "success",
        });
      },
      onError: () => {
        setToast({
          message: "Failed to submit evaluation. Please try again.",
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

  const handleFeedback = (data: FeedbackPayload) => {
    feedbackMutation.mutate(data, {
      onSuccess: () => {
        setShowFeedback(false);
        setToast({
          message: "Event feedback submitted — thank you!",
          type: "success",
        });
      },
      onError: () => {
        setToast({
          message: "Failed to submit feedback. Please try again.",
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
              <div className="w-8 h-8 rounded-xl bg-indigo-500 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/30">N</div>
              <span className="text-xl font-bold text-white tracking-wide">Nexus</span>
            </div>

            <nav className="space-y-2">
              <div className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Dashboard</div>
              <div className="flex items-center gap-3 px-3 py-2.5 bg-indigo-600/10 text-indigo-400 rounded-xl transition-colors relative cursor-default">
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-indigo-500 rounded-r-full" />
                <Users className="w-5 h-5" />
                <span className="font-medium text-white">HR Panel</span>
              </div>
            </nav>
          </div>

          {/* bottom section */}
          <div className="p-4 bg-slate-800/40 rounded-2xl flex items-center justify-between border border-slate-700/50">
            <div className="flex items-center gap-3 overflow-hidden">
              <Avatar name={hrUser.name} />
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate text-white">
                  {hrUser.name}
                </p>
                <p className="text-xs text-slate-400 truncate">{hrUser.company}</p>
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
            <div className="w-7 h-7 rounded-lg bg-indigo-500 flex items-center justify-center font-bold text-white text-xs">N</div>
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
              <Avatar name={hrUser.name} size="lg" />
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {hrUser.name}
                </p>
                <p className="text-xs text-slate-400">{hrUser.company}</p>
              </div>
            </div>
            <button
              onClick={() => {
                setShowFeedback(true);
                setMobileMenu(false);
              }}
              className="w-full text-left px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-lg transition-colors flex items-center gap-2"
            >
              <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />{" "}
              Submit Event Feedback
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
            {/* Header Actions (Feedback) */}
            <div className="flex justify-end mb-2 sm:mb-0 sm:absolute sm:top-8 sm:right-8 z-10 px-4 sm:px-0">
              <button
                onClick={() => setShowFeedback(true)}
                className="hidden sm:inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shadow-sm transition-colors"
              >
                <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                <span>Feedback</span>
              </button>
            </div>

            {/* Page title */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
                  Interview Dashboard
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

            {/* Stats */}
            {!isLoading && !isError && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {(
                  [
                    {
                      label: "Total Assigned",
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
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-indigo-400">
                  <Search className="w-4 h-4" strokeWidth={2} />
                </span>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name, register number, or department..."
                  className="w-full pl-9 pr-10 py-2.5 text-sm text-slate-800 bg-white border border-indigo-100 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 placeholder-slate-400 transition-all"
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600"
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
                      ? "bg-indigo-600 text-white border-indigo-600"
                      : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                  >
                    {tab.label}
                    <span
                      className={`text-xs ${filter === tab.key ? "text-indigo-300" : "text-slate-300"}`}
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
                <p className="text-xs font-medium text-slate-400 mb-3 uppercase tracking-wide">
                  {filtered.length} candidate{filtered.length !== 1 ? "s" : ""}
                  {filter !== "ALL"
                    ? ` · ${filter.replace("_", " ").toLowerCase()}`
                    : ""}
                </p>

                {/* Desktop table */}
                <div className="hidden sm:block bg-white rounded-2xl border border-indigo-100 shadow-md overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-indigo-100 bg-indigo-50">
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
                              className="hover:bg-indigo-50/40 transition-colors group"
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
                                      {student.registerNumber} · Sec{" "}
                                      {student.section}
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
                                        onClick={() => setEvaluateStudent(student)}
                                        className="px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
                                      >
                                        Evaluate
                                      </button>
                                      <button
                                        onClick={() => setNoShowStudent(student)}
                                        className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 border border-red-100 rounded-lg hover:bg-red-100 transition-colors"
                                      >
                                        No Show
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
                        onEvaluate={setEvaluateStudent}
                        onNoShow={setNoShowStudent}
                        onResume={setResumeStudent}
                      />
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="pt-2 pb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-t border-slate-100">
              <p className="text-xs text-slate-400">
                MockPlacement Software · {hrUser.company} · {hrUser.name}
              </p>
              <button
                onClick={() => setShowFeedback(true)}
                className="text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors flex items-center gap-1.5"
              >
                <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />{" "}
                Submit event feedback
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
      {evaluateStudent && (
        <EvaluateModal
          student={evaluateStudent}
          onClose={() => setEvaluateStudent(null)}
          onSubmit={handleEvaluate}
          isPending={evaluateMutation.isPending}
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
      {showFeedback && (
        <HrFeedbackModal
          onClose={() => setShowFeedback(false)}
          onSubmit={handleFeedback}
          isPending={feedbackMutation.isPending}
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
