// src/api/queries.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "./axios";

// ─── Types ────────────────────────────────────────────────────────────────────

export type Role = "ADMIN" | "HR" | "VOLUNTEER" | "PIPELINE";
export type InterviewStatus =
  | "PENDING"
  | "COMPLETED"
  | "NO_SHOW"
  | "CANCELLED"
  | "IN_PROGRESS";
export type EvaluationStatus = "COMPLETED" | "INCOMPLETE";

export type User = {
  id: string;
  username: string;
  role: Role;
};

export type AuthResponse = {
  token: string;
  user: User;
};

export type Student = {
  id: string;
  name: string;
  registerNumber: string;
  department: string;
  section: string;
  resumeUrl?: string | null;
};

export type StudentWithAssignment = Student & {
  assignmentId: number;
  order: number;
  status: InterviewStatus;
  evaluation_status: EvaluationStatus;
};

export type StudentWithHr = Student & {
  hr_name: string | null;
  hr_company: string | null;
  status: InterviewStatus;
  evaluation_status: EvaluationStatus;
};

export type HrProfile = {
  id: string;
  name: string;
  companyName: string;
  username: string;
  volunteer_count: number;
  volunteers: string;
  total_students: number;
  completed_students: number;
};

export type VolunteerProfile = {
  id: string;
  name: string;
  username: string;
  hr_name: string | null;
  hr_company: string | null;
  assignedHrId: string | null;
};

export type AdminStats = {
  students: number;
  hrs: number;
  volunteers: number;
};

export type HrStats = {
  total: number;
  completed: number;
  pending: number;
};

/**
 * Matches backend EvaluationCriteriaSchema exactly.
 * All fields are integers in the range 0–10.
 */
export type EvaluationCriteria = {
  appearanceAttitude: number;
  managerialAptitude: number;
  generalAwareness: number;
  technicalKnowledge: number;
  communicationSkills: number;
  ambition: number;
  selfConfidence: number;
};

/**
 * Matches backend EvaluateStudentSchema exactly.
 * overallScore: float with max 2 decimal places, range 0–99.99
 * strengths / improvements / comments are optional strings (max 1000 / 1000 / 2000)
 */
export type EvaluateStudentPayload = {
  studentId: string;
  criteria: EvaluationCriteria;
  strengths?: string;
  improvements?: string;
  comments?: string;
  overallScore: number;
};

export type TransferStudentPayload = {
  studentIds: string[];
  targetHrId: string;
  reason: string;
};

export type RegisterHrPayload = {
  username: string;
  password: string;
  name: string;
  company_name: string;
};

export type RegisterVolunteerPayload = {
  username: string;
  password: string;
  name: string;
  hrId: string;
};

export type AddStudentPayload = {
  name: string;
  registerNumber: string;
  department: string;
  section: string;
  resumeUrl?: string;
};

/**
 * Matches backend SubmitFeedbackSchema exactly.
 * All numeric fields are integers 1–5.
 * Text fields are optional.
 */
export type FeedbackPayload = {
  technicalKnowledge: number;
  serviceAndCoordination: number;
  communicationSkills: number;
  futureParticipation: number;
  punctualityAndInterest: number;
  suggestions?: string;
  issuesFaced?: string;
  improvementSuggestions?: string;
};

export type FeedbackAnalytics = {
  technicalKnowledge: number | null;
  serviceAndCoordination: number | null;
  communicationSkills: number | null;
  futureParticipation: number | null;
  punctualityAndInterest: number | null;
};

export type Feedback = {
  id: string;
  hrId: string;
  submittedAt: string;
  technicalKnowledge: number;
  serviceAndCoordination: number;
  communicationSkills: number;
  futureParticipation: number;
  punctualityAndInterest: number;
  hr: {
    hrProfile: {
      name: string;
      companyName: string;
    } | null;
  };
};

export type ResetPasswordResponse = {
  message: string;
  temporaryPassword: string;
};

// ─── Query Keys ───────────────────────────────────────────────────────────────

export const queryKeys = {
  // Auth
  auth: ["auth"] as const,

  // Admin
  adminStats: ["admin", "stats"] as const,
  adminStudentsAll: ["admin", "students", "all"] as const,
  adminStudentsSearch: (query: string) =>
    ["admin", "students", "search", query] as const,
  adminHrs: ["admin", "hrs"] as const,
  adminHrStudents: (hrId: string) =>
    ["admin", "hrs", hrId, "students"] as const,
  adminVolunteers: ["admin", "volunteers"] as const,
  adminFeedback: (hrId: string) => ["admin", "feedback", hrId] as const,
  adminFeedbackAnalytics: ["admin", "feedback", "analytics"] as const,

  // HR
  hrStudents: ["hr", "students"] as const,
  hrStudent: (id: string) => ["hr", "student", id] as const,

  // Volunteer
  volunteerStudents: ["volunteer", "students"] as const,

  // Pipeline
  pipelineStudents: ["pipeline", "students"] as const,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// AUTH
// ─────────────────────────────────────────────────────────────────────────────

export const useLogin = () => {
  return useMutation({
    mutationFn: (payload: { username: string; password: string }) =>
      api.post<AuthResponse>("/auth/login", payload).then((r) => r.data),
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN — Stats
// ─────────────────────────────────────────────────────────────────────────────

export const useAdminStats = () =>
  useQuery({
    queryKey: queryKeys.adminStats,
    queryFn: () => api.get<AdminStats>("/admin/stats").then((r) => r.data),
  });

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN — Students
// ─────────────────────────────────────────────────────────────────────────────

export const useAdminAllStudents = () =>
  useQuery({
    queryKey: queryKeys.adminStudentsAll,
    queryFn: () =>
      api.get<StudentWithHr[]>("/admin/students/all").then((r) => r.data),
  });

export const useAdminSearchStudents = (query: string) =>
  useQuery({
    queryKey: queryKeys.adminStudentsSearch(query),
    queryFn: () =>
      api
        .get<StudentWithHr[]>("/admin/students", { params: { query } })
        .then((r) => r.data),
    enabled: query.trim().length > 0,
  });

export const useAdminTransferStudents = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: TransferStudentPayload) =>
      api.post("/admin/students/transfer", payload).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.adminStudentsAll });
      qc.invalidateQueries({ queryKey: queryKeys.adminHrs });
    },
  });
};

export const useAdminBulkUploadStudents = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => {
      const form = new FormData();
      form.append("file", file);
      return api.post("/admin/students/bulk", form).then((r) => r.data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.adminStudentsAll });
    },
  });
};

export const useAdminBulkUploadResumes = () =>
  useMutation({
    mutationFn: (files: File[]) => {
      const form = new FormData();
      files.forEach((f) => form.append("files", f));
      return api.post("/admin/resumes/bulk", form).then((r) => r.data);
    },
  });

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN — HRs
// ─────────────────────────────────────────────────────────────────────────────

export const useAdminHrs = () =>
  useQuery({
    queryKey: queryKeys.adminHrs,
    queryFn: () => api.get<HrProfile[]>("/admin/hrs").then((r) => r.data),
  });

export const useAdminHrStudents = (hrId: string) =>
  useQuery({
    queryKey: queryKeys.adminHrStudents(hrId),
    queryFn: () =>
      api
        .get<
          (Student & { status: InterviewStatus })[]
        >(`/admin/hrs/${hrId}/students`)
        .then((r) => r.data),
    enabled: !!hrId,
  });

export const useAdminRegisterHr = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: RegisterHrPayload) =>
      api.post("/admin/register/hr", payload).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.adminHrs });
    },
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN — Volunteers
// ─────────────────────────────────────────────────────────────────────────────

export const useAdminVolunteers = () =>
  useQuery({
    queryKey: queryKeys.adminVolunteers,
    queryFn: () =>
      api.get<VolunteerProfile[]>("/admin/volunteers").then((r) => r.data),
  });

export const useAdminRegisterVolunteer = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: RegisterVolunteerPayload) =>
      api.post("/admin/register/volunteer", payload).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.adminVolunteers });
    },
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN — Password Reset
// ─────────────────────────────────────────────────────────────────────────────

export const useAdminResetPassword = () =>
  useMutation({
    mutationFn: (userId: string) =>
      api
        .post<ResetPasswordResponse>(`/admin/reset-password/${userId}`)
        .then((r) => r.data),
  });

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN — Feedback
// ─────────────────────────────────────────────────────────────────────────────

export const useAdminFeedback = (hrId: string) =>
  useQuery({
    queryKey: queryKeys.adminFeedback(hrId),
    queryFn: () =>
      api.get<Feedback[]>(`/admin/feedback/${hrId}`).then((r) => r.data),
    enabled: !!hrId,
  });

export const useAdminFeedbackAnalytics = () =>
  useQuery({
    queryKey: queryKeys.adminFeedbackAnalytics,
    queryFn: () =>
      api
        .get<FeedbackAnalytics>("/admin/feedback/analytics")
        .then((r) => r.data),
  });

// ─────────────────────────────────────────────────────────────────────────────
// HR
// ─────────────────────────────────────────────────────────────────────────────

export const useHrStudents = () =>
  useQuery({
    queryKey: queryKeys.hrStudents,
    queryFn: () =>
      api.get<StudentWithAssignment[]>("/hr/students").then((r) => r.data),
  });

export const useHrStudent = (id: string) =>
  useQuery({
    queryKey: queryKeys.hrStudent(id),
    queryFn: () =>
      api
        .get<
          StudentWithAssignment & { current_date: string }
        >(`/hr/student/${id}`)
        .then((r) => r.data),
    enabled: !!id,
  });

export const useHrEvaluateStudent = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: EvaluateStudentPayload) =>
      api.post("/hr/evaluate", payload).then((r) => r.data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.hrStudents });
      qc.invalidateQueries({
        queryKey: queryKeys.hrStudent(variables.studentId),
      });
    },
  });
};

export const useHrMarkNoShow = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (assignmentId: number) =>
      api.post(`/hr/no-show/${assignmentId}`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.hrStudents });
    },
  });
};

export const useHrSubmitFeedback = () =>
  useMutation({
    mutationFn: (payload: FeedbackPayload) =>
      api.post("/hr/feedback", payload).then((r) => r.data),
  });

// ─────────────────────────────────────────────────────────────────────────────
// VOLUNTEER
// ─────────────────────────────────────────────────────────────────────────────

export const useVolunteerStudents = () =>
  useQuery({
    queryKey: queryKeys.volunteerStudents,
    queryFn: () =>
      api
        .get<StudentWithAssignment[]>("/volunteer/students")
        .then((r) => r.data),
  });

export const useVolunteerAddStudent = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: AddStudentPayload) =>
      api.post("/volunteer/student", payload).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.volunteerStudents });
    },
  });
};

export const useVolunteerCancelAssignment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (assignmentId: number) =>
      api.patch(`/volunteer/cancel/${assignmentId}`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.volunteerStudents });
    },
  });
};

export const useVolunteerMarkNoShow = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (assignmentId: number) =>
      api.post(`/volunteer/no-show/${assignmentId}`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.volunteerStudents });
    },
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// PIPELINE
// ─────────────────────────────────────────────────────────────────────────────

export const usePipelineStudents = () =>
  useQuery({
    queryKey: queryKeys.pipelineStudents,
    queryFn: () =>
      api
        .get<(Student & { assignments: unknown[] })[]>("/pipeline/students")
        .then((r) => r.data),
  });

export const usePipelineAddStudent = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: AddStudentPayload) =>
      api.post("/pipeline/student", payload).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.pipelineStudents });
    },
  });
};

export const usePipelineUploadResume = () =>
  useMutation({
    mutationFn: ({
      registerNumber,
      file,
    }: {
      registerNumber: string;
      file: File;
    }) => {
      const form = new FormData();
      form.append("file", file);
      return api
        .post(`/pipeline/resume/${registerNumber}`, form)
        .then((r) => r.data);
    },
  });

export const usePipelineTransferStudents = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: TransferStudentPayload) =>
      api.post("/pipeline/transfer", payload).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.pipelineStudents });
    },
  });
};

