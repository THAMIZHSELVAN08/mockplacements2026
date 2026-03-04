// src/routes/volunteer.ts
import express from "express";
import bcrypt from "bcryptjs";
import { AssignmentIdParamSchema } from "../schemas";
import { registry } from "../openapi";
import { auth, checkRole } from "../middleware/auth";
import { validate } from "../middleware/validate";
import {
  AddStudentSchema,
  VolunteerStudentResponseSchema,
  CancelAssignmentParamSchema,
  CancelAssignmentResponseSchema,
  CancelAssignmentParam,
} from "../schemas";
import { InterviewStatus } from "@prisma/client";
import prisma from "../lib/prisma";
const router = express.Router();
import z from "zod";
// ── GET /students ────────────────────────────────────────────────────────────

router.get("/students", auth, checkRole(["VOLUNTEER"]), async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const volunteer = await prisma.volunteerProfile.findUnique({
      where: { id: req.user.id },
      select: { assignedHrId: true },
    });

    if (!volunteer?.assignedHrId) {
      return res
        .status(403)
        .json({ message: "No HR assigned to this volunteer" });
    }

    const assignments = await prisma.hrAssignment.findMany({
      where: { hrId: volunteer.assignedHrId },
      include: {
        student: {
          include: {
            evaluations: {
              where: { hrId: volunteer.assignedHrId },
              select: { id: true },
            },
          },
        },
      },
      orderBy: { order: "asc" },
    });

    const result = assignments.map((a) => ({
      assignmentId: a.id,
      order: a.order,
      status: a.status,
      ...a.student,
      evaluation_status:
        a.student.evaluations.length > 0 ? "COMPLETED" : "INCOMPLETE",
    }));

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});
// ── POST /student ─────────────────────────────────────────────────────────────

router.post(
  "/student",
  auth,
  checkRole(["VOLUNTEER"]),
  validate(AddStudentSchema),
  async (req, res) => {
    const { name, registerNumber, department, section, resumeUrl } = req.body;

    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const volunteer = await prisma.volunteerProfile.findUnique({
        where: { id: req.user.id },
        select: { assignedHrId: true },
      });

      if (!volunteer?.assignedHrId) {
        return res
          .status(403)
          .json({ message: "No HR assigned to this volunteer" });
      }

      // 1️⃣ Find or create student
      let student = await prisma.student.findUnique({
        where: { registerNumber },
      });

      if (!student) {
        student = await prisma.student.create({
          data: {
            name,
            registerNumber,
            department,
            section,
            resumeUrl,
          },
        });
      }

      // 2️⃣ Check existing assignment anywhere
      const existingAssignment = await prisma.hrAssignment.findFirst({
        where: { studentId: student.id },
      });

      if (existingAssignment) {
        // If already assigned to same HR
        if (existingAssignment.hrId === volunteer.assignedHrId) {
          return res.status(400).json({
            message: "Student already assigned to your HR",
          });
        }

        // If status NOT cancelled → block transfer
        if (existingAssignment.status !== "CANCELLED") {
          return res.status(400).json({
            message:
              "Student is currently active under another HR. They must be cancelled before reallocation.",
          });
        }

        // If cancelled → transfer
        const lastAssignment = await prisma.hrAssignment.findFirst({
          where: { hrId: volunteer.assignedHrId },
          orderBy: { order: "desc" },
        });

        const nextOrder = lastAssignment ? lastAssignment.order + 1 : 1;

        await prisma.hrAssignment.update({
          where: { id: existingAssignment.id },
          data: {
            hrId: volunteer.assignedHrId,
            order: nextOrder,
            status: "PENDING",
          },
        });

        return res.json({ message: "Student transferred successfully" });
      }

      // 3️⃣ No assignment exists → normal assignment
      const lastAssignment = await prisma.hrAssignment.findFirst({
        where: { hrId: volunteer.assignedHrId },
        orderBy: { order: "desc" },
      });

      const nextOrder = lastAssignment ? lastAssignment.order + 1 : 1;

      await prisma.hrAssignment.create({
        data: {
          hrId: volunteer.assignedHrId,
          studentId: student.id,
          order: nextOrder,
        },
      });

      res.json({ message: "Student assigned successfully" });
    } catch (err) {
      console.error(err);
      res.status(500).send("Server Error");
    }
  },
);

router.patch(
  "/cancel/:assignmentId",
  auth,
  checkRole(["VOLUNTEER"]),
  validate(CancelAssignmentParamSchema, "params"),
  async (req, res) => {
    const parsed = CancelAssignmentParamSchema.parse(req.params);
    const { assignmentId } = parsed;
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const volunteer = await prisma.volunteerProfile.findUnique({
        where: { id: req.user.id },
        select: { assignedHrId: true },
      });

      if (!volunteer?.assignedHrId) {
        return res.status(403).json({
          message: "No HR assigned to this volunteer",
        });
      }

      const assignment = await prisma.hrAssignment.findUnique({
        where: { id: assignmentId },
      });

      if (!assignment) {
        return res.status(404).json({
          message: "Assignment not found",
        });
      }

      if (assignment.hrId !== volunteer.assignedHrId) {
        return res.status(403).json({
          message: "Not authorized to cancel this assignment",
        });
      }

      await prisma.hrAssignment.update({
        where: { id: assignmentId },
        data: { status: "CANCELLED" },
      });

      res.json({ message: "Student deallocated successfully" });
    } catch (err) {
      console.error(err);
      res.status(500).send("Server Error");
    }
  },
);

// ── ADD THIS ROUTE to src/routes/volunteer.ts ────────────────────────────────
// Place it alongside the existing volunteer routes.
// Volunteers can mark a student as no-show for assignments belonging to their HR.

router.post(
  "/no-show/:assignmentId",
  auth,
  checkRole(["VOLUNTEER"]),
  validate(AssignmentIdParamSchema, "params"),
  async (req, res) => {
    const { assignmentId } = req.params;

    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // 1️⃣ Get volunteer's assigned HR
      const volunteer = await prisma.volunteerProfile.findUnique({
        where: { id: req.user.id },
        select: { assignedHrId: true },
      });

      if (!volunteer?.assignedHrId) {
        return res.status(403).json({
          message: "No HR assigned to this volunteer",
        });
      }

      // 2️⃣ Fetch assignment
      const assignment = await prisma.hrAssignment.findUnique({
        where: { id: Number(assignmentId) },
      });

      if (!assignment) {
        return res.status(404).json({
          message: "Assignment not found",
        });
      }

      // 3️⃣ Check ownership
      if (assignment.hrId !== volunteer.assignedHrId) {
        return res.status(403).json({
          message: "Not authorised to modify this assignment",
        });
      }

      // 4️⃣ Prevent overwrite of completed
      if (assignment.status === InterviewStatus.COMPLETED) {
        return res.status(409).json({
          message: "Cannot mark a completed interview as no-show",
        });
      }

      await prisma.hrAssignment.update({
        where: { id: assignment.id },
        data: { status: InterviewStatus.NO_SHOW },
      });

      res.json({ message: "Marked as no-show" });
    } catch (err) {
      console.error(err);
      res.status(500).send("Server Error");
    }
  },
);
// OpenAPI registration (add alongside your existing registry.registerPath calls)
registry.registerPath({
  method: "post",
  path: "/api/volunteer/no-show/{assignmentId}",
  tags: ["Volunteer"],
  security: [{ bearerAuth: [] }],
  description:
    "Mark a student as no-show. Volunteer must belong to the HR who owns the assignment. Cannot overwrite a COMPLETED status.",
  request: {
    params: AssignmentIdParamSchema,
  },
  responses: {
    200: { description: "Marked as no-show" },
    403: { description: "Not authorised to modify this assignment" },
    404: { description: "Assignment not found" },
    409: { description: "Interview already completed" },
  },
});
//Create a feature for changing order of students
export default router;

registry.registerPath({
  method: "get",
  path: "/api/volunteer/students",
  tags: ["Volunteer"],
  security: [{ bearerAuth: [] }],
  description:
    "Retrieve all students assigned to the volunteer's HR in interview order.",
  responses: {
    200: {
      description: "Students retrieved successfully",
      content: {
        "application/json": {
          schema: z.array(VolunteerStudentResponseSchema),
        },
      },
    },
    403: {
      description: "Volunteer has no HR assigned",
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/volunteer/student",
  tags: ["Volunteer"],
  security: [{ bearerAuth: [] }],
  description: `
Assign a student to the volunteer's HR.

Behavior:
- If student does not exist → create and assign.
- If assigned to same HR → error.
- If assigned to another HR and NOT cancelled → error.
- If cancelled under another HR → transfer to volunteer's HR.
`,
  request: {
    body: {
      content: {
        "application/json": {
          schema: AddStudentSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Students assigned successfully",
    },
    400: {
      description: "Student already assigned or active under another HR",
    },
    403: {
      description: "Volunteer has no HR assigned",
    },
  },
});

registry.registerPath({
  method: "patch",
  path: "/api/volunteer/cancel/{assignmentId}",
  tags: ["Volunteer"],
  security: [{ bearerAuth: [] }],
  description: `
Cancel (deallocate) a student from the volunteer's assigned HR.

Business Rules:
- Volunteer must belong to an HR.
- Volunteer can only cancel assignments under their HR.
- Assignment status will be set to CANCELLED.
- Assignment record is NOT deleted (audit-safe).
- Once cancelled, student becomes eligible for reassignment.
`,
  request: {
    params: CancelAssignmentParamSchema,
  },
  responses: {
    200: {
      description: "Student successfully deallocated",
      content: {
        "application/json": {
          schema: CancelAssignmentResponseSchema,
        },
      },
    },
    403: {
      description:
        "Volunteer not assigned to HR or unauthorized to cancel this assignment",
    },
    404: {
      description: "Assignment not found",
    },
  },
});

//PUT /api/volunteer/reorder
//{
//  assignmentId: number,
//  newOrder: number
//}
