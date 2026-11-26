import request from "supertest";
import { createHash } from "node:crypto";
import prisma from "../config/prisma.js";
import * as parentService from "../services/parent.service.js";
import * as schoolService from "../services/school.service.js";
import { hashPassword } from "../utils/password.js";
import app from "../server.js";

const PASSWORD = "password123";
const SCHOOL_SLUG = "parent-feature-test-school";

const EMAILS = {
  admin: "parent-test-admin@test.chiedza.local",
  teacher: "parent-test-teacher@test.chiedza.local",
  parent1: "parent-one@test.chiedza.local",
  parent2: "parent-two@test.chiedza.local",
  invitation1: "invited-parent-one@test.chiedza.local",
  invitation2: "invited-parent-two@test.chiedza.local",
  invitation3: "invited-parent-three@test.chiedza.local",
  inactiveParent: "inactive-parent@test.chiedza.local",
  inactiveSchool: "inactive-school-parent@test.chiedza.local",
};

let school;
let admin;
let teacher;
let class1;
let learners;
let adminToken;
let teacherToken;
let parent1;
let parent2;
let parent1Token;
let parent2Token;
let assessment;

const cleanup = async () => {
  const existingSchool = await prisma.school.findUnique({
    where: { slug: SCHOOL_SLUG },
  });

  if (existingSchool) {
    await prisma.parentCommunicationDraft.deleteMany({
      where: { schoolId: existingSchool.id },
    });

    await prisma.parentInvitation.deleteMany({
      where: { schoolId: existingSchool.id },
    });

    await prisma.earlyWarningAlert.deleteMany({
      where: { schoolId: existingSchool.id },
    });

    await prisma.attendance.deleteMany({
      where: { schoolId: existingSchool.id },
    });

    await prisma.assessmentResult.deleteMany({
      where: { schoolId: existingSchool.id },
    });

    await prisma.assessment.deleteMany({
      where: { schoolId: existingSchool.id },
    });

    await prisma.parentLearner.deleteMany({
      where: { learner: { schoolId: existingSchool.id } },
    });

    await prisma.classTeacher.deleteMany({
      where: { schoolId: existingSchool.id },
    });

    await prisma.schoolMembership.deleteMany({
      where: { schoolId: existingSchool.id },
    });

    await prisma.learner.deleteMany({
      where: { schoolId: existingSchool.id },
    });

    await prisma.schoolClass.deleteMany({
      where: { schoolId: existingSchool.id },
    });

    await prisma.school.delete({
      where: { id: existingSchool.id },
    });
  }

  await prisma.user.deleteMany({
    where: {
      email: { in: Object.values(EMAILS) },
    },
  });
};

const login = async (email, password = PASSWORD) => {
  const response = await request(app)
    .post("/api/auth/login")
    .send({ email, password });

  expect(response.status).toBe(200);
  return response.body.data.token;
};

const createParent = async (token, details) =>
  request(app)
    .post(`/api/schools/${school.id}/parents`)
    .set("Authorization", `Bearer ${token}`)
    .send(details);

beforeAll(async () => {
  await cleanup();

  const passwordHash = await hashPassword(PASSWORD);

  school = await prisma.school.create({
    data: {
      name: "Parent Feature Test School",
      slug: SCHOOL_SLUG,
    },
  });

  admin = await prisma.user.create({
    data: {
      firstName: "Test",
      lastName: "Admin",
      email: EMAILS.admin,
      passwordHash,
    },
  });

  teacher = await prisma.user.create({
    data: {
      firstName: "Test",
      lastName: "Teacher",
      email: EMAILS.teacher,
      passwordHash,
    },
  });

  await prisma.schoolMembership.create({
    data: {
      schoolId: school.id,
      userId: admin.id,
      role: "SCHOOL_ADMIN",
    },
  });

  await prisma.schoolMembership.create({
    data: {
      schoolId: school.id,
      userId: teacher.id,
      role: "TEACHER",
    },
  });

  class1 = await prisma.schoolClass.create({
    data: {
      schoolId: school.id,
      name: "ECD A",
      academicYear: "2026",
    },
  });

  learners = [];

  for (const [index, firstName] of ["Alice", "Brian", "Chipo"].entries()) {
    const learner = await prisma.learner.create({
      data: {
        schoolId: school.id,
        classId: class1.id,
        firstName,
        lastName: "Test",
        admissionNumber: `PARENT-${index + 1}`,
      },
    });

    learners.push(learner);
  }

  assessment = await prisma.assessment.create({
    data: {
      schoolId: school.id,
      classId: class1.id,
      title: "Numeracy Assessment",
      description: "Parent feature test",
      date: new Date("2026-10-15"),
      maxScore: 100,
    },
  });

  for (const [index, learner] of learners.entries()) {
    const date = new Date(`2026-10-${String(10 + index).padStart(2, "0")}T00:00:00.000Z`);

    await prisma.attendance.create({
      data: {
        schoolId: school.id,
        learnerId: learner.id,
        date,
        status: index === 1 ? "ABSENT" : "PRESENT",
        recordedById: admin.id,
      },
    });

    await prisma.assessmentResult.create({
      data: {
        schoolId: school.id,
        assessmentId: assessment.id,
        learnerId: learner.id,
        score: 70 + index * 5,
        recordedById: admin.id,
      },
    });

    const alert = await prisma.earlyWarningAlert.create({
      data: {
        schoolId: school.id,
        learnerId: learner.id,
        alertType: "REPEATED_ABSENCES",
        evidence: { source: "parent-test" },
      },
    });

    await prisma.parentCommunicationDraft.create({
      data: {
        schoolId: school.id,
        alertId: alert.id,
        userId: admin.id,
        language: "en",
        draftText: `Approved message for ${learner.firstName}`,
        evidenceSummary: "Test evidence",
        status: "APPROVED",
        approvedBy: admin.id,
        approvedAt: new Date(),
      },
    });
  }

  adminToken = await login(EMAILS.admin);
  teacherToken = await login(EMAILS.teacher);
});

afterAll(async () => {
  await cleanup();
  await prisma.$disconnect();
});

describe("Parent account management", () => {
  it("rejects unauthenticated parent creation", async () => {
    const response = await request(app)
      .post(`/api/schools/${school.id}/parents`)
      .send({
        firstName: "Alice",
        lastName: "Guardian",
        email: EMAILS.parent1,
        learnerId: learners[0].id,
        relationship: "Mother",
      });

    expect(response.status).toBe(401);
  });

  it("prevents a teacher from creating parent accounts", async () => {
    const response = await createParent(teacherToken, {
      firstName: "Alice",
      lastName: "Guardian",
      email: EMAILS.parent1,
      learnerId: learners[0].id,
      relationship: "Mother",
    });

    expect(response.status).toBe(403);
  });

  it("links an existing parent account to a learner", async () => {
    const passwordHash = await hashPassword(PASSWORD);
    const user = await prisma.user.create({
      data: {
        firstName: "Alice",
        lastName: "Guardian",
        email: EMAILS.parent1,
        passwordHash,
        mustChangePassword: false,
      },
    });

    await prisma.schoolMembership.create({
      data: { schoolId: school.id, userId: user.id, role: "PARENT" },
    });

    const response = await createParent(adminToken, {
      email: EMAILS.parent1,
      learnerId: learners[0].id,
      relationship: "Mother",
    });

    expect(response.status).toBe(201);
    expect(response.body.data.accountCreated).toBe(false);
    expect(response.body.data.tempPassword).toBeNull();
    expect(response.body.data.parent.email).toBe(EMAILS.parent1);
    expect(response.body.data.parent.passwordHash).toBeUndefined();

    parent1 = response.body.data;
    parent1Token = await login(EMAILS.parent1);
  });

  it("does not link an inactive existing parent account", async () => {
    const passwordHash = await hashPassword(PASSWORD);

    const inactiveParent = await prisma.user.create({
      data: {
        firstName: "Inactive",
        lastName: "Parent",
        email: EMAILS.inactiveParent,
        passwordHash,
        isActive: false,
      },
    });

    await prisma.schoolMembership.create({
      data: {
        schoolId: school.id,
        userId: inactiveParent.id,
        role: "PARENT",
      },
    });

    const response = await createParent(adminToken, {
      email: EMAILS.inactiveParent,
      learnerId: learners[1].id,
      relationship: "Guardian",
    });

    expect(response.status).toBe(403);
    expect(response.body.message).toContain("account is inactive");

    const link = await prisma.parentLearner.findFirst({
      where: {
        guardianUserId: inactiveParent.id,
        learnerId: learners[1].id,
      },
    });

    expect(link).toBeNull();
  });

  it("rejects linking a parent email that has no existing account", async () => {
    const response = await createParent(adminToken, {
      email: "new-parent@test.chiedza.local",
      learnerId: learners[0].id,
      relationship: "Mother",
    });

    expect(response.status).toBe(404);
    expect(response.body.message).toContain("Invite Parent");
  });

  it("links an additional child to an existing parent without issuing another password", async () => {
    const response = await createParent(adminToken, {
      email: EMAILS.parent1,
      learnerId: learners[2].id,
      relationship: "Mother",
    });

    expect(response.status).toBe(201);
    expect(response.body.data.accountCreated).toBe(false);
    expect(response.body.data.tempPassword).toBeNull();
    expect(response.body.data.parent.id).toBe(parent1.parent.id);
  });

  it("rejects a duplicate parent-child link", async () => {
    const response = await createParent(adminToken, {
      email: EMAILS.parent1,
      learnerId: learners[0].id,
      relationship: "Mother",
    });

    expect(response.status).toBe(409);
  });

  it("rejects a learner from another school", async () => {
    const otherSchool = await prisma.school.create({
      data: {
        name: "Other Parent Test School",
        slug: "parent-feature-other-school",
      },
    });

    const otherClass = await prisma.schoolClass.create({
      data: {
        schoolId: otherSchool.id,
        name: "Grade 1",
        academicYear: "2026",
      },
    });

    const otherLearner = await prisma.learner.create({
      data: {
        schoolId: otherSchool.id,
        classId: otherClass.id,
        firstName: "Outside",
        lastName: "Learner",
        admissionNumber: "OUTSIDE-001",
      },
    });

    const response = await createParent(adminToken, {
      email: "outside-parent@test.chiedza.local",
      learnerId: otherLearner.id,
      relationship: "Guardian",
    });

    expect(response.status).toBe(404);

    await prisma.learner.delete({ where: { id: otherLearner.id } });
    await prisma.schoolClass.delete({ where: { id: otherClass.id } });
    await prisma.school.delete({ where: { id: otherSchool.id } });
  });

  it("allows the admin to list parents and their linked children", async () => {
    const response = await request(app)
      .get(`/api/schools/${school.id}/parents`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].children).toHaveLength(2);
  });
});

describe("Parent portal data access", () => {
  it("links a second existing parent account to another learner", async () => {
    const passwordHash = await hashPassword(PASSWORD);
    const user = await prisma.user.create({
      data: {
        firstName: "Brian",
        lastName: "Guardian",
        email: EMAILS.parent2,
        passwordHash,
        mustChangePassword: false,
      },
    });

    await prisma.schoolMembership.create({
      data: { schoolId: school.id, userId: user.id, role: "PARENT" },
    });

    const response = await createParent(adminToken, {
      email: EMAILS.parent2,
      learnerId: learners[1].id,
      relationship: "Father",
    });

    expect(response.status).toBe(201);
    expect(response.body.data.accountCreated).toBe(false);
    expect(response.body.data.tempPassword).toBeNull();
    expect(response.body.data.parent.email).toBe(EMAILS.parent2);

    parent2 = response.body.data;
    parent2Token = await login(EMAILS.parent2);
  });

  it("returns only the authenticated parent's linked children", async () => {
    const firstParentResponse = await request(app)
      .get("/api/parent/children")
      .set("Authorization", `Bearer ${parent1Token}`);

    expect(firstParentResponse.status).toBe(200);
    expect(firstParentResponse.body.data).toHaveLength(2);

    const firstParentLearnerIds = firstParentResponse.body.data.map(
      (link) => link.learnerId
    );

    expect(firstParentLearnerIds).toContain(learners[0].id);
    expect(firstParentLearnerIds).toContain(learners[2].id);
    expect(firstParentLearnerIds).not.toContain(learners[1].id);

    const secondParentResponse = await request(app)
      .get("/api/parent/children")
      .set("Authorization", `Bearer ${parent2Token}`);

    expect(secondParentResponse.status).toBe(200);
    expect(secondParentResponse.body.data).toHaveLength(1);
    expect(secondParentResponse.body.data[0].learnerId).toBe(learners[1].id);
  });

  it("hides an inactive learner from the parent portal and restores access after reactivation", async () => {
    const learnerId = learners[0].id;

    const originalLink = await prisma.parentLearner.findFirst({
      where: {
        guardianUserId: parent1.parent.id,
        learnerId,
        status: "VERIFIED",
      },
    });
    expect(originalLink).not.toBeNull();

    await prisma.learner.update({
      where: { id: learnerId },
      data: { isActive: false },
    });

    const hiddenChildren = await request(app)
      .get("/api/parent/children")
      .set("Authorization", `Bearer ${parent1Token}`);

    expect(hiddenChildren.status).toBe(200);
    expect(hiddenChildren.body.data.map((link) => link.learnerId))
      .not.toContain(learnerId);

    const retainedLink = await prisma.parentLearner.findUnique({
      where: { id: originalLink.id },
    });
    expect(retainedLink).not.toBeNull();
    expect(retainedLink.status).toBe("VERIFIED");

    await prisma.learner.update({
      where: { id: learnerId },
      data: { isActive: true },
    });

    const restoredChildren = await request(app)
      .get("/api/parent/children")
      .set("Authorization", `Bearer ${parent1Token}`);

    expect(restoredChildren.status).toBe(200);
    expect(restoredChildren.body.data.map((link) => link.learnerId))
      .toContain(learnerId);
  });

  it("returns only attendance belonging to the parent's children", async () => {
    const response = await request(app)
      .get("/api/parent/attendance")
      .set("Authorization", `Bearer ${parent1Token}`);

    expect(response.status).toBe(200);

    const learnerIds = response.body.data.map((record) => record.learnerId);

    expect(learnerIds).toContain(learners[0].id);
    expect(learnerIds).toContain(learners[2].id);
    expect(learnerIds).not.toContain(learners[1].id);
  });

  it("returns only assessment results belonging to the parent's children", async () => {
    const response = await request(app)
      .get("/api/parent/assessments")
      .set("Authorization", `Bearer ${parent1Token}`);

    expect(response.status).toBe(200);

    const learnerIds = response.body.data.map((record) => record.learnerId);

    expect(learnerIds).toContain(learners[0].id);
    expect(learnerIds).toContain(learners[2].id);
    expect(learnerIds).not.toContain(learners[1].id);
  });

  it("returns only approved messages for the parent's children", async () => {
    const response = await request(app)
      .get("/api/parent/messages")
      .set("Authorization", `Bearer ${parent1Token}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(2);

    const messageNames = response.body.data.map(
      (message) => message.alert.learner.firstName
    );

    expect(messageNames).toContain("Alice");
    expect(messageNames).toContain("Chipo");
    expect(messageNames).not.toContain("Brian");
    expect(response.body.data.every((message) => message.status === "APPROVED"))
      .toBe(true);
  });

  it("hides parent records and school directory entries when their school is inactive", async () => {
    await prisma.school.update({
      where: { id: school.id },
      data: { isActive: false },
    });

    try {
      expect(await parentService.listMyChildren(parent1.parent.id)).toHaveLength(0);
      expect(await parentService.listMyAttendance(parent1.parent.id)).toHaveLength(0);
      expect(await parentService.listMyAssessments(parent1.parent.id)).toHaveLength(0);
      expect(await parentService.listMyMessages(parent1.parent.id)).toHaveLength(0);

      const schools = await schoolService.listSchoolsForUser(admin.id);
      expect(schools.some((entry) => entry.school.id === school.id)).toBe(false);
    } finally {
      await prisma.school.update({
        where: { id: school.id },
        data: { isActive: true },
      });
    }
  });

  it("does not allow an admin or teacher to use parent portal endpoints", async () => {
    const adminResponse = await request(app)
      .get("/api/parent/children")
      .set("Authorization", `Bearer ${adminToken}`);

    const teacherResponse = await request(app)
      .get("/api/parent/children")
      .set("Authorization", `Bearer ${teacherToken}`);

    expect(adminResponse.status).toBe(403);
    expect(teacherResponse.status).toBe(403);
  });
});


describe("Parent invitation activation", () => {
  let invitationToken;
  let invitationId;

  const createInvitation = (token, email, learnerId = learners[0].id) =>
    request(app)
      .post(`/api/schools/${school.id}/parent-invitations`)
      .set("Authorization", `Bearer ${token}`)
      .send({ email, learnerId });

  const extractActivationToken = (response) => {
    const activationUrl = new URL(response.body.data.activationUrl);

    expect(activationUrl.pathname).toBe("/activate");
    expect(activationUrl.search).toBe("");

    const token = new URLSearchParams(
      activationUrl.hash.slice(1)
    ).get("token");

    expect(token).toBeTruthy();
    return token;
  };

  const activateInvitation = (token, extraData = {}) =>
    request(app)
      .post("/api/parent-invitations/activate")
      .send({
        firstName: "Invited",
        lastName: "Guardian",
        token,
        password: "SecureParentPass123!",
        ...extraData,
      });

  it("prevents teachers from issuing parent invitations", async () => {
    const response = await createInvitation(
      teacherToken,
      EMAILS.invitation1
    );

    expect(response.status).toBe(403);
  });

  it("allows an administrator to issue an activation link and stores only its hash", async () => {
    const response = await createInvitation(
      adminToken,
      EMAILS.invitation1
    );

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.invitation.invitedEmail).toBe(
      EMAILS.invitation1
    );
    expect(response.body.data.invitation.status).toBe("PENDING");

    invitationToken = extractActivationToken(response);
    invitationId = response.body.data.invitation.id;

    expect(response.body.data.activationUrl).toBeTruthy();
    expect(response.body.data.invitationCode).toBeUndefined();
    expect(response.body.data.invitation.tokenHash).toBeUndefined();

    const storedInvitation = await prisma.parentInvitation.findUnique({
      where: { id: invitationId },
    });

    expect(storedInvitation.tokenHash).toBe(
      createHash("sha256").update(invitationToken).digest("hex")
    );
    expect(storedInvitation.tokenHash).not.toBe(invitationToken);

    const validity = storedInvitation.expiresAt.getTime() - Date.now();
    expect(validity).toBeGreaterThan(47 * 60 * 60 * 1000);
    expect(validity).toBeLessThanOrEqual(48 * 60 * 60 * 1000);
  });

  it("lists invitations without exposing token hashes", async () => {
    const response = await request(app)
      .get(`/api/schools/${school.id}/parent-invitations`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(response.status).toBe(200);

    const listed = response.body.data.find(
      (item) => item.id === invitationId
    );

    expect(listed).toBeTruthy();
    expect(listed.invitedEmail).toBe(EMAILS.invitation1);
    expect(listed.tokenHash).toBeUndefined();
  });

  it("activates the invited parent using the invitation email, not a submitted email", async () => {
    const response = await activateInvitation(invitationToken, {
      email: "attacker@test.chiedza.local",
    });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.email).toBe(EMAILS.invitation1);
    expect(response.body.data.email).not.toBe(
      "attacker@test.chiedza.local"
    );
    expect(response.body.data.mustChangePassword).toBe(false);
    expect(response.body.data.passwordHash).toBeUndefined();

    const membership = await prisma.schoolMembership.findFirst({
      where: {
        schoolId: school.id,
        userId: response.body.data.id,
        role: "PARENT",
        isActive: true,
      },
    });

    expect(membership).toBeTruthy();

    const link = await prisma.parentLearner.findFirst({
      where: {
        learnerId: learners[0].id,
        guardianUserId: response.body.data.id,
      },
    });

    expect(link).toBeTruthy();
    expect(link.status).toBe("VERIFIED");
    expect(link.relationship).toBe("Parent");
    expect(link.verifiedAt).toBeTruthy();

    const storedInvitation = await prisma.parentInvitation.findUnique({
      where: { id: invitationId },
    });

    expect(storedInvitation.status).toBe("ACCEPTED");
    expect(storedInvitation.acceptedAt).toBeTruthy();

    const token = await login(
      EMAILS.invitation1,
      "SecureParentPass123!"
    );

    const children = await request(app)
      .get("/api/parent/children")
      .set("Authorization", `Bearer ${token}`);

    expect(children.status).toBe(200);
    expect(children.body.data).toHaveLength(1);
    expect(children.body.data[0].learnerId).toBe(learners[0].id);
  });

  it("rejects parent activation while the school is inactive", async () => {
    const created = await createInvitation(
      adminToken,
      EMAILS.inactiveSchool,
      learners[1].id
    );

    expect(created.status).toBe(201);

    const id = created.body.data.invitation.id;
    const token = extractActivationToken(created);

    await prisma.school.update({
      where: { id: school.id },
      data: { isActive: false },
    });

    try {
      const activation = await activateInvitation(token);

      expect(activation.status).toBe(409);

      const stored = await prisma.parentInvitation.findUnique({
        where: { id },
      });

      // Failed activation must roll back the invitation claim.
      expect(stored.status).toBe("PENDING");

      const account = await prisma.user.findUnique({
        where: { email: EMAILS.inactiveSchool },
      });

      expect(account).toBeNull();
    } finally {
      await prisma.school.update({
        where: { id: school.id },
        data: { isActive: true },
      });
    }
  });

  it("rejects reuse of an accepted invitation", async () => {
    const response = await activateInvitation(invitationToken);

    expect(response.status).toBe(409);
  });

  it("rejects an invalid activation token", async () => {
    const response = await activateInvitation(
      "invalid-invitation-token-that-is-long-enough"
    );

    expect(response.status).toBe(400);
  });

  it("allows an administrator to revoke a pending invitation", async () => {
    const created = await createInvitation(
      adminToken,
      EMAILS.invitation2,
      learners[1].id
    );

    expect(created.status).toBe(201);

    const id = created.body.data.invitation.id;
    const token = extractActivationToken(created);

    const revoked = await request(app)
      .delete(`/api/schools/${school.id}/parent-invitations/${id}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(revoked.status).toBe(200);
    expect(revoked.body.data.status).toBe("REVOKED");

    const activation = await activateInvitation(token);

    expect(activation.status).toBe(409);
  });

  it("revokes pending invitations when their learner is deactivated", async () => {
    const learnerId = learners[2].id;
    const created = await createInvitation(
      adminToken,
      EMAILS.invitation3,
      learnerId
    );

    expect(created.status).toBe(201);

    const id = created.body.data.invitation.id;
    const token = extractActivationToken(created);

    try {
      const deactivated = await request(app)
        .patch(`/api/schools/${school.id}/learners/${learnerId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ isActive: false });

      expect(deactivated.status).toBe(200);
      expect(deactivated.body.data.isActive).toBe(false);

      const storedInvitation = await prisma.parentInvitation.findUnique({
        where: { id },
      });

      expect(storedInvitation.status).toBe("REVOKED");

      const activation = await activateInvitation(token);

      expect(activation.status).toBe(409);
    } finally {
      await prisma.learner.update({
        where: { id: learnerId },
        data: { isActive: true },
      });
    }
  });

  it("marks an expired invitation as expired and rejects activation", async () => {
    const created = await createInvitation(
      adminToken,
      EMAILS.invitation3,
      learners[2].id
    );

    expect(created.status).toBe(201);

    const id = created.body.data.invitation.id;
    const token = extractActivationToken(created);

    await prisma.parentInvitation.update({
      where: { id },
      data: { expiresAt: new Date(Date.now() - 60 * 1000) },
    });

    const activation = await activateInvitation(token);

    expect(activation.status).toBe(410);

    const stored = await prisma.parentInvitation.findUnique({
      where: { id },
    });

    expect(stored.status).toBe("EXPIRED");
  });
});
