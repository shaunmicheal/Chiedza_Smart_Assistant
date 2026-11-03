import request from "supertest";
import prisma from "../config/prisma.js";
import { hashPassword } from "../utils/password.js";
import app from "../server.js";

const PASSWORD = "password123";
const SCHOOL_SLUG = "stage3-assessment-school";
const ADMIN_EMAIL = "s3b-admin@test.chiedza.local";
const TEACHER_EMAIL = "s3b-teacher@test.chiedza.local";

let school, adminUser, teacherUser, class1, learner1, learner2, assessment1, adminToken, teacherToken;

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
  school = await prisma.school.create({ data: { name: "Stage3 Assessment School", slug: SCHOOL_SLUG } });

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

  learner1 = await prisma.learner.create({
    data: { schoolId: school.id, classId: class1.id, firstName: "Alice", lastName: "Moyo", admissionNumber: "A-001" },
  });
  learner2 = await prisma.learner.create({
    data: { schoolId: school.id, classId: class1.id, firstName: "Bob", lastName: "Ncube", admissionNumber: "A-002" },
  });

  await prisma.classTeacher.create({
    data: { schoolId: school.id, classId: class1.id, membershipId: teacherMembership.id },
  });

  assessment1 = await prisma.assessment.create({
    data: {
      schoolId: school.id,
      classId: class1.id,
      title: "Mathematics Midterm",
      description: "End of term mathematics assessment",
      date: new Date("2026-01-15T00:00:00.000Z"),
      maxScore: 100,
    },
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

describe("Assessments", () => {
  it("unauthenticated request returns 401", async () => {
    const res = await request(app).post("/api/schools/" + school.id + "/assessments").send({
      classId: class1.id,
      title: "Science Quiz",
      date: "2026-02-01",
      maxScore: 50,
    });
    expect(res.status).toBe(401);
  });

  it("creates an assessment", async () => {
    const res = await request(app)
      .post("/api/schools/" + school.id + "/assessments")
      .set("Authorization", "Bearer " + adminToken)
      .send({
        classId: class1.id,
        title: "Science Quiz",
        description: "End of term science",
        date: "2026-02-01",
        maxScore: 50,
      });
    expect(res.status).toBe(201);
    expect(res.body.data.title).toBe("Science Quiz");
    expect(res.body.data.maxScore).toBe(50);
  });

  it("lists assessments by class", async () => {
    const res = await request(app)
      .get("/api/schools/" + school.id + "/assessments?classId=" + class1.id)
      .set("Authorization", "Bearer " + adminToken);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it("gets assessment with results", async () => {
    const res = await request(app)
      .get("/api/schools/" + school.id + "/assessments/" + assessment1.id)
      .set("Authorization", "Bearer " + adminToken);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(assessment1.id);
    expect(res.body.data.title).toBe("Mathematics Midterm");
  });

  it("records learner marks", async () => {
    const res = await request(app)
      .post("/api/schools/" + school.id + "/assessments/" + assessment1.id + "/results")
      .set("Authorization", "Bearer " + adminToken)
      .send({ learnerId: learner1.id, score: 85 });
    expect(res.status).toBe(201);
    expect(res.body.data.score).toBe(85);
    expect(res.body.data.learnerId).toBe(learner1.id);
  });
});

