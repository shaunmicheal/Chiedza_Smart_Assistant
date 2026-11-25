import request from "supertest";
import prisma from "../config/prisma.js";
import { hashPassword } from "../utils/password.js";
import app from "../server.js";

const PASSWORD = "password123";
const SCHOOL_SLUG = "notification-feature-test-school";

const EMAILS = {
  admin: "notification-admin@test.chiedza.local",
  teacher1: "notification-teacher-one@test.chiedza.local",
  teacher2: "notification-teacher-two@test.chiedza.local",
};

let school;
let adminToken;
let teacher1Token;
let teacher2Token;
let teacher1Membership;
let teacher2Membership;
let allTeachersNotificationId;
let selectedNotificationId;

const cleanup = async () => {
  const existingSchool = await prisma.school.findUnique({
    where: { slug: SCHOOL_SLUG },
  });

  if (existingSchool) {
    await prisma.schoolNotification.deleteMany({
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

const login = async (email) => {
  const response = await request(app)
    .post("/api/auth/login")
    .send({ email, password: PASSWORD });

  expect(response.status).toBe(200);
  return response.body.data.token;
};

const schoolNotificationsUrl = () =>
  `/api/schools/${school.id}/notifications`;

beforeAll(async () => {
  await cleanup();

  const passwordHash = await hashPassword(PASSWORD);

  school = await prisma.school.create({
    data: {
      name: "Notification Feature Test School",
      slug: SCHOOL_SLUG,
    },
  });

  const admin = await prisma.user.create({
    data: {
      firstName: "Test",
      lastName: "Admin",
      email: EMAILS.admin,
      passwordHash,
    },
  });

  const teacher1 = await prisma.user.create({
    data: {
      firstName: "Alice",
      lastName: "Teacher",
      email: EMAILS.teacher1,
      passwordHash,
    },
  });

  const teacher2 = await prisma.user.create({
    data: {
      firstName: "Brian",
      lastName: "Teacher",
      email: EMAILS.teacher2,
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

  teacher1Membership = await prisma.schoolMembership.create({
    data: {
      schoolId: school.id,
      userId: teacher1.id,
      role: "TEACHER",
    },
  });

  teacher2Membership = await prisma.schoolMembership.create({
    data: {
      schoolId: school.id,
      userId: teacher2.id,
      role: "TEACHER",
    },
  });

  adminToken = await login(EMAILS.admin);
  teacher1Token = await login(EMAILS.teacher1);
  teacher2Token = await login(EMAILS.teacher2);
});

afterAll(async () => {
  await cleanup();
  await prisma.$disconnect();
});

describe("School notifications", () => {
  it("rejects unauthenticated requests", async () => {
    const response = await request(app)
      .get(`${schoolNotificationsUrl()}/recipients`);

    expect(response.status).toBe(401);
  });

  it("allows an administrator to list active teachers in their school", async () => {
    const response = await request(app)
      .get(`${schoolNotificationsUrl()}/recipients`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(2);

    const membershipIds = response.body.data.map((teacher) => teacher.id);

    expect(membershipIds).toContain(teacher1Membership.id);
    expect(membershipIds).toContain(teacher2Membership.id);
  });

  it("prevents teachers from sending school notifications", async () => {
    const response = await request(app)
      .post(schoolNotificationsUrl())
      .set("Authorization", `Bearer ${teacher1Token}`)
      .send({
        title: "Staff meeting",
        message: "Please attend the staff meeting.",
        priority: "NORMAL",
        recipientType: "ALL_TEACHERS",
      });

    expect(response.status).toBe(403);
  });

  it("rejects selected-teacher notifications without recipients", async () => {
    const response = await request(app)
      .post(schoolNotificationsUrl())
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        title: "Important update",
        message: "Please read this update.",
        priority: "IMPORTANT",
        recipientType: "SELECTED_TEACHERS",
        recipientMembershipIds: [],
      });

    expect(response.status).toBe(400);
  });

  it("sends a normal-priority notification to all active teachers", async () => {
    const response = await request(app)
      .post(schoolNotificationsUrl())
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        title: "Staff meeting",
        message: "There will be a staff meeting tomorrow at 9 AM.",
        priority: "NORMAL",
        recipientType: "ALL_TEACHERS",
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.title).toBe("Staff meeting");
    expect(response.body.data.priority).toBe("NORMAL");
    expect(response.body.data.recipients).toHaveLength(2);

    const recipientIds = response.body.data.recipients.map(
      (recipient) => recipient.membershipId
    );

    expect(recipientIds).toContain(teacher1Membership.id);
    expect(recipientIds).toContain(teacher2Membership.id);

    allTeachersNotificationId = response.body.data.id;
  });

  it("sends an urgent notification only to selected teachers", async () => {
    const response = await request(app)
      .post(schoolNotificationsUrl())
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        title: "Urgent classroom update",
        message: "Please report to the administration office.",
        priority: "URGENT",
        recipientType: "SELECTED_TEACHERS",
        recipientMembershipIds: [teacher1Membership.id],
      });

    expect(response.status).toBe(201);
    expect(response.body.data.priority).toBe("URGENT");
    expect(response.body.data.recipients).toHaveLength(1);
    expect(response.body.data.recipients[0].membershipId).toBe(
      teacher1Membership.id
    );

    selectedNotificationId = response.body.data.id;
  });

  it("rejects a selected recipient who is not an active teacher in the school", async () => {
    const response = await request(app)
      .post(schoolNotificationsUrl())
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        title: "Invalid recipient test",
        message: "This notification should not be created.",
        priority: "IMPORTANT",
        recipientType: "SELECTED_TEACHERS",
        recipientMembershipIds: ["not-a-teacher-membership"],
      });

    expect(response.status).toBe(400);
  });

  it("returns only notifications assigned to each teacher", async () => {
    const teacher1Response = await request(app)
      .get(`${schoolNotificationsUrl()}/inbox`)
      .set("Authorization", `Bearer ${teacher1Token}`);

    const teacher2Response = await request(app)
      .get(`${schoolNotificationsUrl()}/inbox`)
      .set("Authorization", `Bearer ${teacher2Token}`);

    expect(teacher1Response.status).toBe(200);
    expect(teacher2Response.status).toBe(200);

    expect(teacher1Response.body.data).toHaveLength(2);
    expect(teacher2Response.body.data).toHaveLength(1);

    const teacher1Ids = teacher1Response.body.data.map(
      (item) => item.notification.id
    );

    const teacher2Ids = teacher2Response.body.data.map(
      (item) => item.notification.id
    );

    expect(teacher1Ids).toContain(allTeachersNotificationId);
    expect(teacher1Ids).toContain(selectedNotificationId);

    expect(teacher2Ids).toContain(allTeachersNotificationId);
    expect(teacher2Ids).not.toContain(selectedNotificationId);
  });

  it("returns the correct unread count for each teacher", async () => {
    const teacher1Response = await request(app)
      .get(`${schoolNotificationsUrl()}/unread-count`)
      .set("Authorization", `Bearer ${teacher1Token}`);

    const teacher2Response = await request(app)
      .get(`${schoolNotificationsUrl()}/unread-count`)
      .set("Authorization", `Bearer ${teacher2Token}`);

    expect(teacher1Response.status).toBe(200);
    expect(teacher1Response.body.data.count).toBe(2);

    expect(teacher2Response.status).toBe(200);
    expect(teacher2Response.body.data.count).toBe(1);
  });

  it("allows a teacher to mark their notification as read", async () => {
    const response = await request(app)
      .patch(`${schoolNotificationsUrl()}/${selectedNotificationId}/read`)
      .set("Authorization", `Bearer ${teacher1Token}`);

    expect(response.status).toBe(200);
    expect(response.body.data.read).toBe(true);

    const unreadResponse = await request(app)
      .get(`${schoolNotificationsUrl()}/unread-count`)
      .set("Authorization", `Bearer ${teacher1Token}`);

    expect(unreadResponse.body.data.count).toBe(1);
  });

  it("handles marking an already-read notification as read again", async () => {
    const response = await request(app)
      .patch(`${schoolNotificationsUrl()}/${selectedNotificationId}/read`)
      .set("Authorization", `Bearer ${teacher1Token}`);

    expect(response.status).toBe(200);
    expect(response.body.data.alreadyRead).toBe(true);
  });

  it("does not allow one teacher to mark another teacher's notification as read", async () => {
    const response = await request(app)
      .patch(`${schoolNotificationsUrl()}/${selectedNotificationId}/read`)
      .set("Authorization", `Bearer ${teacher2Token}`);

    expect(response.status).toBe(404);

    const unreadResponse = await request(app)
      .get(`${schoolNotificationsUrl()}/unread-count`)
      .set("Authorization", `Bearer ${teacher2Token}`);

    expect(unreadResponse.body.data.count).toBe(1);
  });

  it("allows administrators to view notification history for their school", async () => {
    const response = await request(app)
      .get(schoolNotificationsUrl())
      .set("Authorization", `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(2);

    const notificationIds = response.body.data.map(
      (notification) => notification.id
    );

    expect(notificationIds).toContain(allTeachersNotificationId);
    expect(notificationIds).toContain(selectedNotificationId);
  });

  it("prevents teachers from accessing administrator notification history", async () => {
    const response = await request(app)
      .get(schoolNotificationsUrl())
      .set("Authorization", `Bearer ${teacher1Token}`);

    expect(response.status).toBe(403);
  });

  it("prevents members of another school from accessing this school's notifications", async () => {
    const otherSchool = await prisma.school.create({
      data: {
        name: "Another Notification Test School",
        slug: "notification-feature-other-school",
      },
    });

    try {
      const response = await request(app)
        .get(`/api/schools/${otherSchool.id}/notifications/inbox`)
        .set("Authorization", `Bearer ${teacher1Token}`);

      expect(response.status).toBe(403);
    } finally {
      await prisma.school.delete({
        where: { id: otherSchool.id },
      });
    }
  });
});
