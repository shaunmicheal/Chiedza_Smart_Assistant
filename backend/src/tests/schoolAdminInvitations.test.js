import request from "supertest";
import { createHash } from "node:crypto";
import { beforeAll, beforeEach, afterAll, describe, it, expect } from "vitest";
import prisma from "../config/prisma.js";
import { hashPassword, verifyPassword } from "../utils/password.js";
import app from "../server.js";

const SCHOOL_SLUG = "school-admin-invitation-test";
const SUPER_ADMIN_EMAIL = "admin-invitation-platform@test.chiedza.local";
const SCHOOL_ADMIN_EMAIL = "admin-invitation-school@test.chiedza.local";
const EXISTING_USER_EMAIL = "admin-invitation-existing@test.chiedza.local";

const PASSWORD = "InvitationTestPassword123!";
const EXISTING_PASSWORD = "ExistingAccountPassword123!";

const INVITED_EMAILS = [
  "admin-invitation-new1@test.chiedza.local",
  "admin-invitation-new2@test.chiedza.local",
  "admin-invitation-new3@test.chiedza.local",
  "admin-invitation-new4@test.chiedza.local",
  "admin-invitation-new5@test.chiedza.local",
  "admin-invitation-new6@test.chiedza.local",
  "admin-invitation-new7@test.chiedza.local",
];

let school;
let superAdminToken;
let schoolAdminToken;
let schoolAdminUser;
let existingUser;

const cleanup = async () => {
  const existingSchool = await prisma.school.findUnique({
    where: { slug: SCHOOL_SLUG },
    select: { id: true },
  });

  if (existingSchool) {
    await prisma.schoolAdminInvitation.deleteMany({
      where: { schoolId: existingSchool.id },
    });

    await prisma.schoolMembership.deleteMany({
      where: { schoolId: existingSchool.id },
    });

    await prisma.school.delete({
      where: { id: existingSchool.id },
    });
  }

  await prisma.user.deleteMany({
    where: {
      email: {
        in: [
          SUPER_ADMIN_EMAIL,
          SCHOOL_ADMIN_EMAIL,
          EXISTING_USER_EMAIL,
          ...INVITED_EMAILS,
        ],
      },
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

const createInvitation = (email) =>
  request(app)
    .post(`/api/platform/schools/${school.id}/administrators/invitations`)
    .set("Authorization", `Bearer ${superAdminToken}`)
    .send({
      firstName: "Invited",
      lastName: "Administrator",
      email,
    });

const extractActivationToken = (response) => {
  const activationUrl = new URL(response.body.data.activationUrl);

  expect(activationUrl.pathname).toBe("/admin-activate");
  expect(activationUrl.search).toBe("");

  const token = new URLSearchParams(
    activationUrl.hash.slice(1),
  ).get("token");

  expect(token).toBeTruthy();
  return token;
};

const activateInvitation = (token, extraData = {}) =>
  request(app)
    .post("/api/admin-invitations/activate")
    .send({ token, ...extraData });

beforeAll(async () => {
  await cleanup();

  const passwordHash = await hashPassword(PASSWORD);

  school = await prisma.school.create({
    data: {
      name: "School Administrator Invitation Test",
      slug: SCHOOL_SLUG,
      approvalStatus: "APPROVED",
      isActive: true,
    },
  });

  const superAdmin = await prisma.user.create({
    data: {
      firstName: "Platform",
      lastName: "Administrator",
      email: SUPER_ADMIN_EMAIL,
      passwordHash,
      platformRole: "SUPER_ADMIN",
    },
  });

  schoolAdminUser = await prisma.user.create({
    data: {
      firstName: "School",
      lastName: "Administrator",
      email: SCHOOL_ADMIN_EMAIL,
      passwordHash,
    },
  });

  existingUser = await prisma.user.create({
    data: {
      firstName: "Existing",
      lastName: "Account",
      email: EXISTING_USER_EMAIL,
      passwordHash: await hashPassword(EXISTING_PASSWORD),
    },
  });

  await prisma.schoolMembership.create({
    data: {
      schoolId: school.id,
      userId: schoolAdminUser.id,
      role: "SCHOOL_ADMIN",
    },
  });

  superAdminToken = await login(SUPER_ADMIN_EMAIL);
  schoolAdminToken = await login(SCHOOL_ADMIN_EMAIL);
});

beforeEach(async () => {
  // Each test starts with one active school administrator and no invitations.
  await prisma.schoolAdminInvitation.deleteMany({
    where: { schoolId: school.id },
  });

  await prisma.schoolMembership.deleteMany({
    where: { schoolId: school.id },
  });

  await prisma.schoolMembership.create({
    data: {
      schoolId: school.id,
      userId: schoolAdminUser.id,
      role: "SCHOOL_ADMIN",
    },
  });

  // Remove accounts created by earlier test cases, but preserve the seeded
  // existing account used by the existing-user activation tests.
  await prisma.user.deleteMany({
    where: { email: { in: INVITED_EMAILS } },
  });
});

afterAll(async () => {
  await cleanup();
  await prisma.$disconnect();
});

describe("School administrator invitations", () => {
  it("requires authentication to list administrators", async () => {
    const response = await request(app)
      .get(`/api/platform/schools/${school.id}/administrators`);

    expect(response.status).toBe(401);
  });

  it("prevents school administrators from issuing platform invitations", async () => {
    const response = await request(app)
      .post(`/api/platform/schools/${school.id}/administrators/invitations`)
      .set("Authorization", `Bearer ${schoolAdminToken}`)
      .send({
        firstName: "Another",
        lastName: "Administrator",
        email: INVITED_EMAILS[0],
      });

    expect(response.status).toBe(403);
  });

  it("creates a secure invitation and stores only the token hash", async () => {
    const response = await createInvitation(INVITED_EMAILS[0]);

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.invitation.invitedEmail).toBe(
      INVITED_EMAILS[0],
    );
    expect(response.body.data.invitation.status).toBe("PENDING");
    expect(response.body.data.invitation.tokenHash).toBeUndefined();

    const token = extractActivationToken(response);
    const invitationId = response.body.data.invitation.id;

    const stored = await prisma.schoolAdminInvitation.findUnique({
      where: { id: invitationId },
    });

    expect(stored.tokenHash).toBe(
      createHash("sha256").update(token).digest("hex"),
    );
    expect(stored.tokenHash).not.toBe(token);

    const validity = stored.expiresAt.getTime() - Date.now();

    expect(validity).toBeGreaterThan(47 * 60 * 60 * 1000);
    expect(validity).toBeLessThanOrEqual(48 * 60 * 60 * 1000);
  });

  it("rejects duplicate pending invitations for the same email", async () => {
    const first = await createInvitation(INVITED_EMAILS[0]);
    expect(first.status).toBe(201);

    const duplicate = await createInvitation(INVITED_EMAILS[0]);
    expect(duplicate.status).toBe(409);
  });

  it("lists administrators and pending invitations without token hashes", async () => {
    const created = await createInvitation(INVITED_EMAILS[0]);
    expect(created.status).toBe(201);

    const response = await request(app)
      .get(`/api/platform/schools/${school.id}/administrators`)
      .set("Authorization", `Bearer ${superAdminToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data.administrators).toHaveLength(1);
    expect(response.body.data.invitations).toHaveLength(1);
    expect(response.body.data.invitations[0].invitedEmail).toBe(
      INVITED_EMAILS[0],
    );
    expect(response.body.data.invitations[0].tokenHash).toBeUndefined();
    expect(response.body.data.limits.maximum).toBe(2);
    expect(response.body.data.limits.active).toBe(1);
    expect(response.body.data.limits.pending).toBe(1);
    expect(response.body.data.limits.available).toBe(0);
  });

  it("activates a new administrator account using the invited email", async () => {
    const created = await createInvitation(INVITED_EMAILS[0]);
    expect(created.status).toBe(201);

    const token = extractActivationToken(created);

    const response = await activateInvitation(token, {
      firstName: "New",
      lastName: "Administrator",
      password: "NewAdministratorPassword123!",
    });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.user.email).toBe(INVITED_EMAILS[0]);
    expect(response.body.data.user.firstName).toBe("New");
    expect(response.body.data.user.lastName).toBe("Administrator");
    expect(response.body.data.user.passwordHash).toBeUndefined();
    expect(response.body.data.schoolId).toBe(school.id);

    const membership = await prisma.schoolMembership.findFirst({
      where: {
        schoolId: school.id,
        userId: response.body.data.user.id,
        role: "SCHOOL_ADMIN",
        isActive: true,
      },
    });

    expect(membership).toBeTruthy();

    const storedInvitation = await prisma.schoolAdminInvitation.findUnique({
      where: { id: created.body.data.invitation.id },
    });

    expect(storedInvitation.status).toBe("ACCEPTED");
    expect(storedInvitation.acceptedAt).toBeTruthy();

    const tokenAfterActivation = await login(
      INVITED_EMAILS[0],
      "NewAdministratorPassword123!",
    );

    expect(tokenAfterActivation).toBeTruthy();
  });

  it("requires an existing account password before linking that account", async () => {
    const created = await createInvitation(EXISTING_USER_EMAIL);
    expect(created.status).toBe(201);

    const token = extractActivationToken(created);
    const response = await activateInvitation(token);

    expect(response.status).toBe(400);

    const stored = await prisma.schoolAdminInvitation.findUnique({
      where: { id: created.body.data.invitation.id },
    });

    expect(stored.status).toBe("PENDING");
  });

  it("rejects an incorrect existing account password without consuming the invitation", async () => {
    const created = await createInvitation(EXISTING_USER_EMAIL);
    expect(created.status).toBe(201);

    const token = extractActivationToken(created);
    const response = await activateInvitation(token, {
      existingPassword: "WrongPassword123!",
    });

    expect(response.status).toBe(401);

    const stored = await prisma.schoolAdminInvitation.findUnique({
      where: { id: created.body.data.invitation.id },
    });

    expect(stored.status).toBe("PENDING");
  });

  it("links an existing account after verifying its password without changing that password", async () => {
    const created = await createInvitation(EXISTING_USER_EMAIL);
    expect(created.status).toBe(201);

    const token = extractActivationToken(created);
    const response = await activateInvitation(token, {
      existingPassword: EXISTING_PASSWORD,
    });

    expect(response.status).toBe(201);
    expect(response.body.data.user.email).toBe(EXISTING_USER_EMAIL);
    expect(response.body.data.user.passwordHash).toBeUndefined();

    const membership = await prisma.schoolMembership.findFirst({
      where: {
        schoolId: school.id,
        userId: existingUser.id,
        role: "SCHOOL_ADMIN",
        isActive: true,
      },
    });

    expect(membership).toBeTruthy();

    const storedUser = await prisma.user.findUnique({
      where: { id: existingUser.id },
    });

    expect(
      await verifyPassword(EXISTING_PASSWORD, storedUser.passwordHash),
    ).toBe(true);
  });

  it("revokes a pending invitation and prevents its activation", async () => {
    const created = await createInvitation(INVITED_EMAILS[0]);
    expect(created.status).toBe(201);

    const token = extractActivationToken(created);
    const invitationId = created.body.data.invitation.id;

    const revoked = await request(app)
      .delete(
        `/api/platform/schools/${school.id}/administrators/invitations/${invitationId}`,
      )
      .set("Authorization", `Bearer ${superAdminToken}`);

    expect(revoked.status).toBe(200);
    expect(revoked.body.data.status).toBe("REVOKED");

    const activation = await activateInvitation(token);
    expect(activation.status).toBe(409);
  });

  it("marks expired invitations as expired and rejects activation", async () => {
    const created = await createInvitation(INVITED_EMAILS[0]);
    expect(created.status).toBe(201);

    const token = extractActivationToken(created);
    const invitationId = created.body.data.invitation.id;

    await prisma.schoolAdminInvitation.update({
      where: { id: invitationId },
      data: { expiresAt: new Date(Date.now() - 60 * 1000) },
    });

    const activation = await activateInvitation(token);
    expect(activation.status).toBe(410);

    const stored = await prisma.schoolAdminInvitation.findUnique({
      where: { id: invitationId },
    });

    expect(stored.status).toBe("EXPIRED");
  });

  it("rejects reuse of an accepted invitation", async () => {
    const created = await createInvitation(INVITED_EMAILS[0]);
    expect(created.status).toBe(201);

    const token = extractActivationToken(created);
    const activationData = {
      firstName: "New",
      lastName: "Administrator",
      password: "NewAdministratorPassword123!",
    };

    const firstActivation = await activateInvitation(token, activationData);
    expect(firstActivation.status).toBe(201);

    const secondActivation = await activateInvitation(token, activationData);
    expect(secondActivation.status).toBe(409);
  });

  it("enforces the two-administrator limit for both pending invitations and active accounts", async () => {
    const first = await createInvitation(INVITED_EMAILS[0]);
    expect(first.status).toBe(201);

    // One existing administrator plus one pending invitation fills both slots.
    const secondWhilePending = await createInvitation(INVITED_EMAILS[1]);
    expect(secondWhilePending.status).toBe(409);

    // Activate the invitation: the school now has two active administrators.
    const token = extractActivationToken(first);
    const activation = await activateInvitation(token, {
      firstName: "Second",
      lastName: "Administrator",
      password: "SecondAdministratorPassword123!",
    });

    expect(activation.status).toBe(201);

    const activeAdministrators = await prisma.schoolMembership.count({
      where: {
        schoolId: school.id,
        role: "SCHOOL_ADMIN",
        isActive: true,
      },
    });

    expect(activeAdministrators).toBe(2);

    // A third administrator must still be rejected after activation.
    const third = await createInvitation(INVITED_EMAILS[2]);
    expect(third.status).toBe(409);
  });

  it("allows invitations for approved inactive schools but blocks activation until the school is active", async () => {
    await prisma.school.update({
      where: { id: school.id },
      data: { isActive: false },
    });

    const inactiveResponse = await createInvitation(INVITED_EMAILS[0]);
    expect(inactiveResponse.status).toBe(201);

    const token = extractActivationToken(inactiveResponse);
    const invitationId = inactiveResponse.body.data.invitation.id;

    const blockedActivation = await activateInvitation(token, {
      firstName: "New",
      lastName: "Administrator",
      password: "NewAdministratorPassword123!",
    });

    expect(blockedActivation.status).toBe(409);

    const pendingInvitation = await prisma.schoolAdminInvitation.findUnique({
      where: { id: invitationId },
    });
    expect(pendingInvitation.status).toBe("PENDING");

    await prisma.school.update({
      where: { id: school.id },
      data: { isActive: true },
    });

    const successfulActivation = await activateInvitation(token, {
      firstName: "New",
      lastName: "Administrator",
      password: "NewAdministratorPassword123!",
    });
    expect(successfulActivation.status).toBe(201);

    await prisma.school.update({
      where: { id: school.id },
      data: { approvalStatus: "PENDING" },
    });

    try {
      const pendingResponse = await createInvitation(INVITED_EMAILS[1]);
      expect(pendingResponse.status).toBe(409);
    } finally {
      await prisma.school.update({
        where: { id: school.id },
        data: {
          approvalStatus: "APPROVED",
          isActive: true,
        },
      });
    }
  });

  it("does not count or list administrator memberships belonging to inactive user accounts", async () => {
    await prisma.user.update({
      where: { id: schoolAdminUser.id },
      data: { isActive: false },
    });

    const invitation = await createInvitation(INVITED_EMAILS[0]);
    expect(invitation.status).toBe(201);

    const response = await request(app)
      .get(`/api/platform/schools/${school.id}/administrators`)
      .set("Authorization", `Bearer ${superAdminToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data.administrators).toHaveLength(0);
    expect(response.body.data.limits.active).toBe(0);
    expect(response.body.data.limits.pending).toBe(1);
    expect(response.body.data.limits.available).toBe(1);
  });

});
