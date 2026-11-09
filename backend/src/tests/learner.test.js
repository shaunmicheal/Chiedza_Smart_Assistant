import request from "supertest";
import prisma from "../config/prisma.js";
import { hashPassword } from "../utils/password.js";
import app from "../server.js";

const PASSWORD = "password123";
const SCHOOL_SLUG = "stage3-learner-access-school";
const ADMIN_EMAIL = "s3c-admin@test.chiedza.local";
const TEACHER_EMAIL = "s3c-teacher@test.chiedza.local";
const ZERO_TEACHER_EMAIL = "s3c-zero-teacher@test.chiedza.local";

let school, class1, class2, learner1, learner2;
let adminToken, teacherToken, teacherZeroToken;

const cleanup = async () => {
  const existingSchool = await prisma.school.findUnique({
    where: { slug: SCHOOL_SLUG },
  });

  if (existingSchool) {
    await prisma.classTeacher.deleteMany({
      where: { schoolId: existingSchool.id },
    });
    await prisma.assessmentResult.deleteMany({
      where: { schoolId: existingSchool.id },
    });
    await prisma.assessment.deleteMany({
      where: { schoolId: existingSchool.id },
    });
    await prisma.attendance.deleteMany({
      where: { schoolId: existingSchool.id },
    });
    await prisma.learner.deleteMany({
      where: { schoolId: existingSchool.id },
    });
    await prisma.schoolClass.deleteMany({
      where: { schoolId: existingSchool.id },
    });
    await prisma.schoolMembership.deleteMany({
      where: { schoolId: existingSchool.id },
    });
    await prisma.school.delete({ where: { id: existingSchool.id } });
  }

  await prisma.user.deleteMany({
    where: {
      email: {
        in: [ADMIN_EMAIL, TEACHER_EMAIL, ZERO_TEACHER_EMAIL],
      },
    },
  });
};

beforeAll(async () => {
  await cleanup();

  const passwordHash = await hashPassword(PASSWORD);

  school = await prisma.school.create({
    data: {
      name: "Stage3 Learner Access School",
      slug: SCHOOL_SLUG,
    },
  });

  const adminUser = await prisma.user.create({
    data: {
      firstName: "Admin",
      lastName: "User",
      email: ADMIN_EMAIL,
      passwordHash,
    },
  });

  const teacherUser = await prisma.user.create({
    data: {
      firstName: "Assigned",
      lastName: "Teacher",
      email: TEACHER_EMAIL,
      passwordHash,
    },
  });

  const zeroTeacherUser = await prisma.user.create({
    data: {
      firstName: "Unassigned",
      lastName: "Teacher",
      email: ZERO_TEACHER_EMAIL,
      passwordHash,
    },
  });

  await prisma.schoolMembership.create({
    data: {
      schoolId: school.id,
      userId: adminUser.id,
      role: "SCHOOL_ADMIN",
    },
  });

  const teacherMembership = await prisma.schoolMembership.create({
    data: {
      schoolId: school.id,
      userId: teacherUser.id,
      role: "TEACHER",
    },
  });

  await prisma.schoolMembership.create({
    data: {
      schoolId: school.id,
      userId: zeroTeacherUser.id,
      role: "TEACHER",
    },
  });

  class1 = await prisma.schoolClass.create({
    data: {
      schoolId: school.id,
      name: "Grade 1",
      academicYear: "2026",
    },
  });

  class2 = await prisma.schoolClass.create({
    data: {
      schoolId: school.id,
      name: "Grade 2",
      academicYear: "2026",
    },
  });

  learner1 = await prisma.learner.create({
    data: {
      schoolId: school.id,
      classId: class1.id,
      firstName: "Alice",
      lastName: "Moyo",
      admissionNumber: "L-001",
    },
  });

  learner2 = await prisma.learner.create({
    data: {
      schoolId: school.id,
      classId: class2.id,
      firstName: "Bob",
      lastName: "Ncube",
      admissionNumber: "L-002",
    },
  });

  await prisma.classTeacher.create({
    data: {
      schoolId: school.id,
      classId: class2.id,
      membershipId: teacherMembership.id,
    },
  });

  const [adminLogin, teacherLogin, zeroTeacherLogin] = await Promise.all([
    request(app)
      .post("/api/auth/login")
      .send({ email: ADMIN_EMAIL, password: PASSWORD }),
    request(app)
      .post("/api/auth/login")
      .send({ email: TEACHER_EMAIL, password: PASSWORD }),
    request(app)
      .post("/api/auth/login")
      .send({ email: ZERO_TEACHER_EMAIL, password: PASSWORD }),
  ]);

  adminToken = adminLogin.body.data.token;
  teacherToken = teacherLogin.body.data.token;
  teacherZeroToken = zeroTeacherLogin.body.data.token;
});

afterAll(async () => {
  await cleanup();
  await prisma.$disconnect();
});

describe("Learner class access", () => {
  it("allows a school admin to see learners from all classes", async () => {
    const res = await request(app)
      .get(`/api/schools/${school.id}/learners`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
  });

  it("allows a teacher to see learners in assigned classes only", async () => {
    const res = await request(app)
      .get(`/api/schools/${school.id}/learners`)
      .set("Authorization", `Bearer ${teacherToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].id).toBe(learner2.id);
  });

  it("returns an empty list for a teacher with no assigned classes", async () => {
    const res = await request(app)
      .get(`/api/schools/${school.id}/learners`)
      .set("Authorization", `Bearer ${teacherZeroToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  it("blocks a teacher from explicitly requesting another class", async () => {
    const res = await request(app)
      .get(`/api/schools/${school.id}/learners`)
      .query({ classId: class1.id })
      .set("Authorization", `Bearer ${teacherToken}`);

    expect(res.status).toBe(403);
  });

  it("blocks an unassigned teacher from explicitly requesting a class", async () => {
    const res = await request(app)
      .get(`/api/schools/${school.id}/learners`)
      .query({ classId: class1.id })
      .set("Authorization", `Bearer ${teacherZeroToken}`);

    expect(res.status).toBe(403);
  });

  it("allows a teacher to request an individual learner in their assigned class", async () => {
    const res = await request(app)
      .get(`/api/schools/${school.id}/learners/${learner2.id}`)
      .set("Authorization", `Bearer ${teacherToken}`);

    expect(res.status).toBe(200);
  });

  it("blocks a teacher from requesting an individual learner outside their class", async () => {
    const res = await request(app)
      .get(`/api/schools/${school.id}/learners/${learner1.id}`)
      .set("Authorization", `Bearer ${teacherToken}`);

    expect(res.status).toBe(403);
  });
});
