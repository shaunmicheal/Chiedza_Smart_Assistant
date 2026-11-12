
import request from "supertest";
import prisma from "../config/prisma.js";
import { hashPassword } from "../utils/password.js";
import app from "../server.js";

const PASSWORD = "password123";
const S1 = "stage2-school-a";
const S2 = "stage2-school-b";
const ADMIN1 = "s2-admin1@test.chiedza.local";
const ADMIN2 = "s2-admin2@test.chiedza.local";
const TEACHER1 = "s2-teacher1@test.chiedza.local";
const NEW_TEACHER = "newteacher@test.chiedza.local";

let school1, school2, admin1, admin2, teacher1;
let teacherMembership, class1, class2, learner1;
let newTeacherTempPassword, newTeacherMembershipId;

const cleanup = async () => {
  for (const slug of [S1, S2]) {
    const s = await prisma.school.findUnique({ where: { slug } });

    if (s) {
      await prisma.classTeacher.deleteMany({
        where: { schoolId: s.id },
      });

      await prisma.schoolMembership.deleteMany({
        where: { schoolId: s.id },
      });

      await prisma.learner.deleteMany({
        where: { schoolId: s.id },
      });

      await prisma.schoolClass.deleteMany({
        where: { schoolId: s.id },
      });

      await prisma.parentInvitation.deleteMany({
        where: { schoolId: s.id },
      });

      await prisma.school.delete({
        where: { id: s.id },
      });
    }
  }

  await prisma.user.deleteMany({
    where: {
      email: {
        in: [ADMIN1, ADMIN2, TEACHER1, NEW_TEACHER],
      },
    },
  });
};

beforeAll(async () => {
  await cleanup();

  const hash = await hashPassword(PASSWORD);

  school1 = await prisma.school.create({
    data: { name: "School A", slug: S1 },
  });

  school2 = await prisma.school.create({
    data: { name: "School B", slug: S2 },
  });

  admin1 = await prisma.user.create({
    data: {
      firstName: "Admin",
      lastName: "One",
      email: ADMIN1,
      passwordHash: hash,
    },
  });

  admin2 = await prisma.user.create({
    data: {
      firstName: "Admin",
      lastName: "Two",
      email: ADMIN2,
      passwordHash: hash,
    },
  });

  teacher1 = await prisma.user.create({
    data: {
      firstName: "Teacher",
      lastName: "One",
      email: TEACHER1,
      passwordHash: hash,
    },
  });

  await prisma.schoolMembership.create({
    data: {
      schoolId: school1.id,
      userId: admin1.id,
      role: "SCHOOL_ADMIN",
    },
  });

  await prisma.schoolMembership.create({
    data: {
      schoolId: school2.id,
      userId: admin2.id,
      role: "SCHOOL_ADMIN",
    },
  });

  teacherMembership = await prisma.schoolMembership.create({
    data: {
      schoolId: school1.id,
      userId: teacher1.id,
      role: "TEACHER",
    },
  });

  class1 = await prisma.schoolClass.create({
    data: {
      schoolId: school1.id,
      name: "Grade 1",
      academicYear: "2026",
    },
  });

  class2 = await prisma.schoolClass.create({
    data: {
      schoolId: school2.id,
      name: "Grade 1",
      academicYear: "2026",
    },
  });

  await prisma.classTeacher.create({
    data: {
      schoolId: school1.id,
      classId: class1.id,
      membershipId: teacherMembership.id,
    },
  });

  learner1 = await prisma.learner.create({
    data: {
      schoolId: school2.id,
      classId: class2.id,
      firstName: "Other",
      lastName: "Learner",
      admissionNumber: "B-001",
    },
  });
});

afterAll(async () => {
  await cleanup();
  await prisma.$disconnect();
});

const login = async (email, password = PASSWORD) => {
  const res = await request(app)
    .post("/api/auth/login")
    .send({ email, password });

  return res.body.data.token;
};

describe("Schools", () => {
  it("unauthenticated list returns 401", async () => {
    const res = await request(app).get("/api/schools");

    expect(res.status).toBe(401);
  });

  it("lists only the user's schools", async () => {
    const token = await login(ADMIN1);

    const res = await request(app)
      .get("/api/schools")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].school.slug).toBe(S1);
  });

  it("cross-school: admin1 cannot view school2", async () => {
    const token = await login(ADMIN1);

    const res = await request(app)
      .get(`/api/schools/${school2.id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(403);
  });

  it("admin can update own school", async () => {
    const token = await login(ADMIN1);

    const res = await request(app)
      .patch(`/api/schools/${school1.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ phone: "+263700000000" });

    expect(res.status).toBe(200);
    expect(res.body.data.phone).toBe("+263700000000");
  });
});

describe("Teachers", () => {
  it("teacher cannot create teacher (403)", async () => {
    const token = await login(TEACHER1);

    const res = await request(app)
      .post(`/api/schools/${school1.id}/teachers`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        firstName: "New",
        lastName: "Teacher",
        email: NEW_TEACHER,
      });

    expect(res.status).toBe(403);
  });

  it("admin creates teacher", async () => {
    const token = await login(ADMIN1);

    const res = await request(app)
      .post(`/api/schools/${school1.id}/teachers`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        firstName: "New",
        lastName: "Teacher",
        email: NEW_TEACHER,
      });

    expect(res.status).toBe(201);
    expect(res.body.data.membership.role).toBe("TEACHER");
    expect(res.body.data.user.mustChangePassword).toBe(true);
    expect(res.body.data.tempPassword).toBeTruthy();
    expect(res.body.data.membership.user.passwordHash).toBeUndefined();
    expect(res.body.data.user.passwordHash).toBeUndefined();

    newTeacherTempPassword = res.body.data.tempPassword;
    newTeacherMembershipId = res.body.data.membership.id;
  });

  it("admin lists teachers without exposing password hashes", async () => {
    const token = await login(ADMIN1);

    const res = await request(app)
      .get(`/api/schools/${school1.id}/teachers`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(
      res.body.data.every((teacher) => !("passwordHash" in teacher.user))
    ).toBe(true);
  });

  it("admin assigns a teacher to a class", async () => {
    const token = await login(ADMIN1);

    const res = await request(app)
      .post(`/api/schools/${school1.id}/classes/${class1.id}/teachers`)
      .set("Authorization", `Bearer ${token}`)
      .send({ membershipId: newTeacherMembershipId });

    expect(res.status).toBe(201);
    expect(res.body.data.membershipId).toBe(newTeacherMembershipId);
    expect(res.body.data.classId).toBe(class1.id);
  });

  it("admin removes a teacher from a class", async () => {
    const token = await login(ADMIN1);

    const res = await request(app)
      .delete(
        `/api/schools/${school1.id}/classes/${class1.id}/teachers/${newTeacherMembershipId}`
      )
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(204);
  });

  it("teacher cannot assign another teacher to a class", async () => {
    const token = await login(TEACHER1);

    const res = await request(app)
      .post(`/api/schools/${school1.id}/classes/${class1.id}/teachers`)
      .set("Authorization", `Bearer ${token}`)
      .send({ membershipId: newTeacherMembershipId });

    expect(res.status).toBe(403);
  });
});

describe("Classes", () => {
  it("admin creates class", async () => {
    const token = await login(ADMIN1);

    const res = await request(app)
      .post(`/api/schools/${school1.id}/classes`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Grade 2",
        academicYear: "2026",
      });

    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe("Grade 2");
  });

  it("teacher cannot create class (403)", async () => {
    const token = await login(TEACHER1);

    const res = await request(app)
      .post(`/api/schools/${school1.id}/classes`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Grade 3",
        academicYear: "2026",
      });

    expect(res.status).toBe(403);
  });

  it("admin can list all classes in their school", async () => {
    const token = await login(ADMIN1);

    const res = await request(app)
      .get(`/api/schools/${school1.id}/classes`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.data.map((item) => item.id)).toContain(class1.id);
  });

  it("teacher can only list assigned classes", async () => {
    const token = await login(TEACHER1);

    const res = await request(app)
      .get(`/api/schools/${school1.id}/classes`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].id).toBe(class1.id);
  });

  it("unassigned teacher receives an empty class list after changing temporary password", async () => {
    const token = await login(NEW_TEACHER, newTeacherTempPassword);

    const passwordChange = await request(app)
      .post("/api/auth/password-change")
      .set("Authorization", `Bearer ${token}`)
      .send({
        currentPassword: newTeacherTempPassword,
        newPassword: "newpassword123",
        confirmPassword: "newpassword123",
      });

    expect(passwordChange.status).toBe(200);
    expect(passwordChange.body.data.mustChangePassword).toBe(false);

    const res = await request(app)
      .get(`/api/schools/${school1.id}/classes`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  it("duplicate class returns 409", async () => {
    const token = await login(ADMIN1);

    const res = await request(app)
      .post(`/api/schools/${school1.id}/classes`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Grade 1",
        academicYear: "2026",
      });

    expect(res.status).toBe(409);
  });
});

describe("Learners", () => {
  it("admin creates learner assigned to class", async () => {
    const token = await login(ADMIN1);

    const res = await request(app)
      .post(`/api/schools/${school1.id}/learners`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        firstName: "Alice",
        lastName: "Moyo",
        admissionNumber: "A-001",
        classId: class1.id,
      });

    expect(res.status).toBe(201);
    expect(res.body.data.classId).toBe(class1.id);
  });

  it("teacher cannot create learner (403)", async () => {
    const token = await login(TEACHER1);

    const res = await request(app)
      .post(`/api/schools/${school1.id}/learners`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        firstName: "Bob",
        lastName: "Ncube",
        admissionNumber: "A-002",
        classId: class1.id,
      });

    expect(res.status).toBe(403);
  });

  it("teacher can list learners", async () => {
    const token = await login(TEACHER1);

    const res = await request(app)
      .get(`/api/schools/${school1.id}/learners`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].admissionNumber).toBe("A-001");
  });

  it("filter learners by classId", async () => {
    const token = await login(ADMIN1);

    const res = await request(app)
      .get(`/api/schools/${school1.id}/learners?classId=${class1.id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
  });

  it("cross-school: admin1 cannot view learner in school2", async () => {
    const token = await login(ADMIN1);

    const res = await request(app)
      .get(`/api/schools/${school1.id}/learners/${learner1.id}`)
      .set("Authorization", `Bearer ${token}`);

    expect([403, 404]).toContain(res.status);
  });

  it("cross-school membership: admin1 cannot access school2 learners endpoint", async () => {
    const token = await login(ADMIN1);

    const res = await request(app)
      .get(`/api/schools/${school2.id}/learners`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(403);
  });

  it("admin updates learner", async () => {
    const token = await login(ADMIN1);

    const list = await request(app)
      .get(`/api/schools/${school1.id}/learners`)
      .set("Authorization", `Bearer ${token}`);

    const learner = list.body.data.find(
      (item) => item.admissionNumber === "A-001"
    );

    const res = await request(app)
      .patch(`/api/schools/${school1.id}/learners/${learner.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ lastName: "Updated" });

    expect(res.status).toBe(200);
    expect(res.body.data.lastName).toBe("Updated");
  });

  it("cannot delete class with learners (409)", async () => {
    const token = await login(ADMIN1);

    const res = await request(app)
      .delete(`/api/schools/${school1.id}/classes/${class1.id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(409);
  });

  it("teacher cannot delete learner (403)", async () => {
    const adminToken = await login(ADMIN1);

    const create = await request(app)
      .post(`/api/schools/${school1.id}/learners`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        firstName: "Temp",
        lastName: "Learner",
        admissionNumber: "A-TEMP",
        classId: class1.id,
      });

    expect(create.status).toBe(201);

    const teacherToken = await login(TEACHER1);

    const res = await request(app)
      .delete(
        `/api/schools/${school1.id}/learners/${create.body.data.id}`
      )
      .set("Authorization", `Bearer ${teacherToken}`);

    expect(res.status).toBe(403);
  });

  it("admin deletes learners then class", async () => {
    const token = await login(ADMIN1);

    const list = await request(app)
      .get(`/api/schools/${school1.id}/learners`)
      .set("Authorization", `Bearer ${token}`);

    for (const learner of list.body.data) {
      await request(app)
        .delete(`/api/schools/${school1.id}/learners/${learner.id}`)
        .set("Authorization", `Bearer ${token}`);
    }

    const del = await request(app)
      .delete(`/api/schools/${school1.id}/classes/${class1.id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(del.status).toBe(204);
  });
});
