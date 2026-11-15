import request from "supertest";
import prisma from "../config/prisma.js";
import { hashPassword } from "../utils/password.js";
import app from "../server.js";
import {
  assignTeacherToClass,
  createTeacher,
  removeTeacher,
} from "../services/teacher.service.js";

const SCHOOL_SLUG = "teacher-test-school";
const ADMIN_EMAIL = "teacher-admin@test.chiedza.local";
const TEACHER_EMAIL = "teacher-test@test.chiedza.local";
const TEACHER2_EMAIL = "teacher2@test.chiedza.local";
const TEMP_TEACHER_EMAIL = "temp-teacher@test.chiedza.local";
const NON_ADMIN_EMAIL = "non-admin-teacher@test.chiedza.local";
const PASSWORD = "password123";

let school;
let adminUser;
let teacherUser;
let tempTeacherUser;
let nonAdminTeacherUser;
let teacherMembership;

const cleanup = async () => {
  const s = await prisma.school.findUnique({ where: { slug: SCHOOL_SLUG } });
  if (s) {
    await prisma.classTeacher.deleteMany({ where: { schoolId: s.id } });
    await prisma.schoolMembership.deleteMany({ where: { schoolId: s.id } });
    await prisma.schoolClass.deleteMany({ where: { schoolId: s.id } });
    await prisma.learner.deleteMany({ where: { schoolId: s.id } });
    await prisma.parentInvitation.deleteMany({ where: { schoolId: s.id } });
    await prisma.school.delete({ where: { id: s.id } });
  }
  await prisma.user.deleteMany({
    where: {
      email: {
        in: [ADMIN_EMAIL, TEACHER_EMAIL, TEACHER2_EMAIL, TEMP_TEACHER_EMAIL, NON_ADMIN_EMAIL],
      },
    },
  });
};

beforeAll(async () => {
  await cleanup();
  const passwordHash = await hashPassword(PASSWORD);

  school = await prisma.school.create({
    data: { name: "Teacher Test School", slug: SCHOOL_SLUG },
  });

  adminUser = await prisma.user.create({
    data: {
      firstName: "Admin",
      lastName: "User",
      email: ADMIN_EMAIL,
      passwordHash,
    },
  });

  teacherUser = await prisma.user.create({
    data: {
      firstName: "Teacher",
      lastName: "User",
      email: TEACHER_EMAIL,
      passwordHash,
    },
  });

  teacherMembership = await prisma.schoolMembership.create({
    data: { schoolId: school.id, userId: teacherUser.id, role: "TEACHER" },
  });

  await prisma.schoolMembership.create({
    data: { schoolId: school.id, userId: adminUser.id, role: "SCHOOL_ADMIN" },
  });

  nonAdminTeacherUser = await prisma.user.create({
    data: {
      firstName: "Non Admin",
      lastName: "Teacher",
      email: NON_ADMIN_EMAIL,
      passwordHash,
      mustChangePassword: false,
    },
  });

  await prisma.schoolMembership.create({
    data: {
      schoolId: school.id,
      userId: nonAdminTeacherUser.id,
      role: "TEACHER",
    },
  });

  tempTeacherUser = await prisma.user.create({
    data: {
      firstName: "Temp",
      lastName: "Teacher",
      email: TEMP_TEACHER_EMAIL,
      passwordHash,
      mustChangePassword: true,
    },
  });

  await prisma.schoolMembership.create({
    data: {
      schoolId: school.id,
      userId: tempTeacherUser.id,
      role: "TEACHER",
    },
  });
});

afterAll(async () => {
  await cleanup();
  await prisma.$disconnect();
});

const login = async (email, password) => {
  const res = await request(app).post("/api/auth/login").send({ email, password });
  return res;
};

const getTeacherMembershipId = () => teacherMembership.id;

describe("Teacher Management - Reset Password", () => {
  it("admin can reset a teacher password", async () => {
    const loginRes = await login(ADMIN_EMAIL, PASSWORD);
    const token = loginRes.body.data.token;

    const res = await request(app)
      .post(`/api/schools/${school.id}/teachers/${getTeacherMembershipId()}/reset-password`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty("tempPassword");
    expect(typeof res.body.data.tempPassword).toBe("string");
  });

  it("reset password sets mustChangePassword=true", async () => {
    const loginRes = await login(ADMIN_EMAIL, PASSWORD);
    const token = loginRes.body.data.token;

    const resetRes = await request(app)
      .post(`/api/schools/${school.id}/teachers/${getTeacherMembershipId()}/reset-password`)
      .set("Authorization", `Bearer ${token}`);

    const tempPassword = resetRes.body.data.tempPassword;
    const tempLoginRes = await request(app)
      .post("/api/auth/login")
      .send({ email: TEACHER_EMAIL, password: tempPassword });

    expect(tempLoginRes.status).toBe(200);
    // Now check mustChangePassword is still true (since we just reset)
    const meRes = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${tempLoginRes.body.data.token}`);
    expect(meRes.body.data.mustChangePassword).toBe(true);
  });

  it("the new temporary password works for login", async () => {
    const loginRes = await login(ADMIN_EMAIL, PASSWORD);
    const token = loginRes.body.data.token;

    const resetRes = await request(app)
      .post(`/api/schools/${school.id}/teachers/${getTeacherMembershipId()}/reset-password`)
      .set("Authorization", `Bearer ${token}`);

    const tempPassword = resetRes.body.data.tempPassword;

    const tempLoginRes = await request(app)
      .post("/api/auth/login")
      .send({ email: TEACHER_EMAIL, password: tempPassword });

    expect(tempLoginRes.status).toBe(200);
  });

  it("the old password no longer works after reset", async () => {
    const loginRes = await login(ADMIN_EMAIL, PASSWORD);
    const token = loginRes.body.data.token;

    await request(app)
      .post(`/api/schools/${school.id}/teachers/${getTeacherMembershipId()}/reset-password`)
      .set("Authorization", `Bearer ${token}`);

    const oldPasswordRes = await request(app)
      .post("/api/auth/login")
      .send({ email: TEACHER_EMAIL, password: PASSWORD });

    expect(oldPasswordRes.status).toBe(401);
  });

  it("non-admin cannot reset a teacher password", async () => {
    const teacherLoginRes = await login(NON_ADMIN_EMAIL, PASSWORD);

    expect(teacherLoginRes.status).toBe(200);
    expect(teacherLoginRes.body.data.token).toBeTruthy();

    const res = await request(app)
      .post(`/api/schools/${school.id}/teachers/${getTeacherMembershipId()}/reset-password`)
      .set("Authorization", `Bearer ${teacherLoginRes.body.data.token}`);

    expect(res.status).toBe(403);
  });

  it("cannot reset a teacher from another school", async () => {
    const otherSchool = await prisma.school.create({
      data: { name: "Other School", slug: `other-school-${Date.now()}` },
    });

    try {
      const otherMembership = await prisma.schoolMembership.create({
        data: {
          schoolId: otherSchool.id,
          userId: teacherUser.id,
          role: "TEACHER",
        },
      });

      const loginRes = await login(ADMIN_EMAIL, PASSWORD);
      expect(loginRes.status).toBe(200);

      const res = await request(app)
        .post(`/api/schools/${otherSchool.id}/teachers/${otherMembership.id}/reset-password`)
        .set("Authorization", `Bearer ${loginRes.body.data.token}`);

      expect(res.status).toBe(403);
    } finally {
      await prisma.schoolMembership.deleteMany({
        where: { schoolId: otherSchool.id },
      });
      await prisma.school.delete({
        where: { id: otherSchool.id },
      });
    }
  });
});


describe("Teacher Membership Lifecycle", () => {
  it("deactivates, reactivates and enrols an existing teacher across schools without changing their password", async () => {
    const classRecord = await prisma.schoolClass.create({
      data: {
        schoolId: school.id,
        name: "Lifecycle Test Class",
        academicYear: "2026",
      },
    });

    const otherSchool = await prisma.school.create({
      data: {
        name: "Teacher Lifecycle Other School",
        slug: `teacher-lifecycle-${Date.now()}`,
      },
    });

    try {
      // Assign the teacher before removing them.
      await assignTeacherToClass(
        school.id,
        classRecord.id,
        teacherMembership.id
      );

      const passwordBeforeRemoval = await prisma.user.findUnique({
        where: { id: teacherUser.id },
        select: { passwordHash: true },
      });

      // Removing a teacher must deactivate, not delete, their membership.
      await removeTeacher(school.id, teacherMembership.id);

      const inactiveMembership = await prisma.schoolMembership.findUnique({
        where: { id: teacherMembership.id },
      });

      expect(inactiveMembership).not.toBeNull();
      expect(inactiveMembership.isActive).toBe(false);

      const preservedUser = await prisma.user.findUnique({
        where: { id: teacherUser.id },
      });

      expect(preservedUser).not.toBeNull();
      expect(preservedUser.passwordHash).toBe(
        passwordBeforeRemoval.passwordHash
      );

      const remainingAssignments = await prisma.classTeacher.count({
        where: {
          schoolId: school.id,
          membershipId: teacherMembership.id,
        },
      });

      expect(remainingAssignments).toBe(0);

      // Re-enrolling in the same school must reactivate the original membership.
      const reactivated = await createTeacher(school.id, {
        email: TEACHER_EMAIL,
        firstName: "Teacher",
        lastName: "User",
      });

      expect(reactivated.accountCreated).toBe(false);
      expect(reactivated.membership.id).toBe(teacherMembership.id);
      expect(reactivated.membership.isActive).toBe(true);
      expect(reactivated.tempPassword).toBeUndefined();

      // Enrolling in another school must create a separate membership.
      const enrolledElsewhere = await createTeacher(otherSchool.id, {
        email: TEACHER_EMAIL,
        firstName: "Teacher",
        lastName: "User",
      });

      expect(enrolledElsewhere.accountCreated).toBe(false);
      expect(enrolledElsewhere.membership.schoolId).toBe(otherSchool.id);
      expect(enrolledElsewhere.membership.userId).toBe(teacherUser.id);
      expect(enrolledElsewhere.membership.id).not.toBe(teacherMembership.id);
      expect(enrolledElsewhere.tempPassword).toBeUndefined();

      const memberships = await prisma.schoolMembership.findMany({
        where: {
          userId: teacherUser.id,
          role: "TEACHER",
        },
        orderBy: { schoolId: "asc" },
      });

      expect(memberships).toHaveLength(2);
      expect(memberships.every((membership) => membership.isActive)).toBe(true);

      const passwordAfterEnrolment = await prisma.user.findUnique({
        where: { id: teacherUser.id },
        select: { passwordHash: true },
      });

      expect(passwordAfterEnrolment.passwordHash).toBe(
        passwordBeforeRemoval.passwordHash
      );
    } finally {
      await prisma.classTeacher.deleteMany({
        where: { schoolId: school.id, classId: classRecord.id },
      });
      await prisma.schoolClass.delete({
        where: { id: classRecord.id },
      });
      await prisma.schoolMembership.deleteMany({
        where: { schoolId: otherSchool.id },
      });
      await prisma.school.delete({
        where: { id: otherSchool.id },
      });
    }
  }, 90000);
});
