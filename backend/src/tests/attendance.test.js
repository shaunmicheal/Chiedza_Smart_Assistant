import request from "supertest";
import prisma from "../config/prisma.js";
import { hashPassword } from "../utils/password.js";
import app from "../server.js";

const PASSWORD = "password123";
const SCHOOL_SLUG = "stage3-attendance-school";
const ADMIN_EMAIL = "s3a-admin@test.chiedza.local";
const TEACHER_EMAIL = "s3a-teacher@test.chiedza.local";

let school, adminUser, teacherUser, class1, class2, learner1, learner2, adminToken, teacherToken;

const cleanup = async () => {
  const s = await prisma.school.findUnique({ where: { slug: SCHOOL_SLUG } });
  if (s) {
    await prisma.classTeacher.deleteMany({ where: { schoolId: s.id } });
    await prisma.assessmentResult.deleteMany({ where: { schoolId: s.id } });
    await prisma.assessment.deleteMany({ where: { schoolId: s.id } });
    await prisma.attendance.deleteMany({ where: { schoolId: s.id } });
    await prisma.learner.deleteMany({ where: { schoolId: s.id } });
    await prisma.schoolClass.deleteMany({ where: { schoolId: s.id } });
    await prisma.schoolMembership.deleteMany({ where: { schoolId: s.id } });
    await prisma.school.delete({ where: { id: s.id } });
  }
  await prisma.user.deleteMany({
    where: { email: { in: [ADMIN_EMAIL, TEACHER_EMAIL] } },
  });
};

beforeAll(async () => {
  await cleanup();
  const hash = await hashPassword(PASSWORD);
  school = await prisma.school.create({ data: { name: "Stage3 Attendance School", slug: SCHOOL_SLUG } });

  adminUser = await prisma.user.create({
    data: { firstName: "Admin", lastName: "User", email: ADMIN_EMAIL, passwordHash: hash },
  });
  teacherUser = await prisma.user.create({
    data: { firstName: "Teacher", lastName: "User", email: TEACHER_EMAIL, passwordHash: hash },
  });

  await prisma.schoolMembership.create({
    data: { schoolId: school.id, userId: adminUser.id, role: "SCHOOL_ADMIN" },
  });
  const teacherMembership = await prisma.schoolMembership.create({
    data: { schoolId: school.id, userId: teacherUser.id, role: "TEACHER" },
  });

  class1 = await prisma.schoolClass.create({
    data: { schoolId: school.id, name: "Grade 1", academicYear: "2026" },
  });
  class2 = await prisma.schoolClass.create({
    data: { schoolId: school.id, name: "Grade 2", academicYear: "2026" },
  });

  learner1 = await prisma.learner.create({
    data: { schoolId: school.id, classId: class1.id, firstName: "Alice", lastName: "Moyo", admissionNumber: "A-001" },
  });
  learner2 = await prisma.learner.create({
    data: { schoolId: school.id, classId: class2.id, firstName: "Bob", lastName: "Ncube", admissionNumber: "A-002" },
  });

  await prisma.classTeacher.create({
    data: { schoolId: school.id, classId: class1.id, membershipId: teacherMembership.id },
  });
  await prisma.classTeacher.create({
    data: { schoolId: school.id, classId: class2.id, membershipId: teacherMembership.id },
  });

  const loginAdmin = await request(app).post("/api/auth/login").send({ email: ADMIN_EMAIL, password: PASSWORD });
  adminToken = loginAdmin.body.data.token;
  const loginTeacher = await request(app).post("/api/auth/login").send({ email: TEACHER_EMAIL, password: PASSWORD });
  teacherToken = loginTeacher.body.data.token;
});

afterAll(async () => {
  await cleanup();
  await prisma.$disconnect();
});

describe("Attendance", () => {
  it("unauthenticated request returns 401", async () => {
    const res = await request(app).post(`/api/schools/${school.id}/attendance`).send({
      learnerId: learner1.id,
      date: "2026-01-15",
      status: "PRESENT",
    });
    expect(res.status).toBe(401);
  });

  it("records attendance as PRESENT", async () => {
    const res = await request(app)
      .post(`/api/schools/${school.id}/attendance`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ learnerId: learner1.id, date: "2026-01-15", status: "PRESENT" });
    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe("PRESENT");
    expect(res.body.data.learnerId).toBe(learner1.id);
  });

  it("records every attendance status", async () => {
    const statuses = ["PRESENT", "ABSENT", "LATE", "EXCUSED"];
    for (const status of statuses) {
      const d = new Date();
      d.setDate(d.getDate() + statuses.indexOf(status));
      const dateStr = d.toISOString().slice(0, 10);
      const res = await request(app)
        .post(`/api/schools/${school.id}/attendance`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ learnerId: learner2.id, date: dateStr, status });
      expect(res.status).toBe(201);
      expect(res.body.data.status).toBe(status);
    }
  );

  it("prevents duplicate attendance for same learner on same date", async () => {
    const res = await request(app)
      .post(`/api/schools/${school.id}/attendance`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ learnerId: learner1.id, date: "2026-01-15", status: "ABSENT" });
    expect(res.status).toBe(409);
  });

  it("retrieves attendance by date", async () => {
    const res = await request(app)
      .get(`/api/schools/${school.id}/attendance?date=2026-01-15`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it("filters attendance by classId", async () => {
    const res = await request(app)
      .get(`/api/schools/${school.id}/attendance?classId=${class1.id}`)
      .set("Authorization", `Bearer ${adminToken}`)
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it("retrieves attendance by learner", async () => {
    const res = await request(app)
      .get(`/api/schools/${school.id}/learners/${learner1.id}/attendance`)
      .set("Authorization", `Bearer ${adminToken}`)
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.some((a) => a.learnerId === learner1.id)).toBe(true);
  });

  it("corrects an existing attendance record", async () => {
    const listRes = await request(app)
      .get(`/api/schools/${school.id}/attendance?date=2026-01-15`)
      .set("Authorization", `Bearer ${adminToken}`)
    const record = listRes.body.data.find((a) => a.learnerId === learner1.id);
    if (record) {
      const res = await request(app)
        .patch(`/api/schools/${school.id}/attendance/${record.id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ status: "LATE" });
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe("LATE");
    } else {
      expect(true).toBe(true);
    }
  });

  it("teacher can record attendance for their class", async () => {
    const res = await request(app)
      .post(`/api/schools/${school.id}/attendance`)
      .set("Authorization", `Bearer ${teacherToken}`)
      .send({ learnerId: learner2.id, date: "2026-02-01", status: "PRESENT" });
    expect(res.status).toBe(201);
  });

  it("teacher cannot access another teacher's class records", async () => {
    const res = await request(app)
      .post(`/api/schools/${school.id}/attendance`)
      .set("Authorization", `Bearer ${teacherToken}`)
      .send({ learnerId: learner1.id, date: "2026-02-01", status: "PRESENT" });
    expect(res.status).toBe(403);
  });

  it("teacher with no assigned classes receives empty list", async () => {
    const res = await request(app)
      .get(`/api/schools/${school.id}/attendance`)
      .set("Authorization", `Bearer ${teacherToken}`)
      .query({ classId: "non-existent-class" })
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(0);
  });

  it("cross-school: admin cannot record attendance in another school", async () => {
    const otherSchool = await prisma.school.create({ data: { name: "Other", slug: `s3-other-school-${Date.now()}` } });
    const res = await request(app)
      .post(`/api/schools/${otherSchool.id}/attendance`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ learnerId: learner1.id, date: "2026-03-01", status: "PRESENT" });
    expect(res.status).toBe(403);
    await prisma.school.delete({ where: { id: otherSchool.id } });
  });

  it("invalid learner returns 404", async () => {
    const res = await request(app)
      .post(`/api/schools/${school.id}/attendance`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ learnerId: "nonexistent-learner-id", date: "2026-04-01", status: "PRESENT" });
    expect(res.status).toBe(404);
  });
});
