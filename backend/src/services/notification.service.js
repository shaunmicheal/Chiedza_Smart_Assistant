import prisma from "../config/prisma.js";

const createError = (message, status = 400) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

export const listEligibleTeachers = async (schoolId) => {
  return prisma.schoolMembership.findMany({
    where: {
      schoolId,
      role: "TEACHER",
      isActive: true,
      user: { isActive: true },
    },
    select: {
      id: true,
      user: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
    orderBy: {
      user: { firstName: "asc" },
    },
  });
};

export const createSchoolNotification = async ({
  schoolId,
  createdByMembershipId,
  title,
  message,
  priority,
  recipientType,
  recipientMembershipIds = [],
}) => {
  let recipients;

  if (recipientType === "ALL_TEACHERS") {
    recipients = await prisma.schoolMembership.findMany({
      where: {
        schoolId,
        role: "TEACHER",
        isActive: true,
        user: { isActive: true },
      },
      select: { id: true },
    });
  } else {
    recipients = await prisma.schoolMembership.findMany({
      where: {
        schoolId,
        id: { in: recipientMembershipIds },
        role: "TEACHER",
        isActive: true,
        user: { isActive: true },
      },
      select: { id: true },
    });

    if (recipients.length !== recipientMembershipIds.length) {
      throw createError(
        "One or more selected teachers are invalid or inactive in this school.",
        400
      );
    }
  }

  if (!recipients.length) {
    throw createError(
      "There are no active teachers available to receive this notification.",
      400
    );
  }

  return prisma.$transaction(async (tx) => {
    return tx.schoolNotification.create({
      data: {
        schoolId,
        createdByMembershipId,
        title,
        message,
        priority,
        recipients: {
          create: recipients.map((recipient) => ({
            membership: {
              connect: {
                schoolId_id: {
                  schoolId,
                  id: recipient.id,
                },
              },
            },
          })),
        },
      },
      include: {
        recipients: {
          select: {
            id: true,
            membershipId: true,
            readAt: true,
          },
        },
      },
    });
  }, {
    maxWait: 10000,
    timeout: 20000,
  });
};

export const listSchoolNotifications = async (schoolId) => {
  return prisma.schoolNotification.findMany({
    where: { schoolId },
    include: {
      createdBy: {
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      },
      recipients: {
        include: {
          membership: {
            include: {
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
};

export const listMyNotifications = async (schoolId, membershipId) => {
  return prisma.notificationRecipient.findMany({
    where: {
      schoolId,
      membershipId,
    },
    include: {
      notification: {
        select: {
          id: true,
          title: true,
          message: true,
          priority: true,
          createdAt: true,
          createdBy: {
            select: {
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
};

export const countMyUnreadNotifications = async (
  schoolId,
  membershipId
) => {
  return prisma.notificationRecipient.count({
    where: {
      schoolId,
      membershipId,
      readAt: null,
    },
  });
};

export const markMyNotificationAsRead = async ({
  schoolId,
  membershipId,
  notificationId,
}) => {
  const result = await prisma.notificationRecipient.updateMany({
    where: {
      schoolId,
      membershipId,
      notificationId,
      readAt: null,
    },
    data: {
      readAt: new Date(),
    },
  });

  if (result.count > 0) {
    return { read: true };
  }

  const existing = await prisma.notificationRecipient.findFirst({
    where: {
      schoolId,
      membershipId,
      notificationId,
    },
    select: {
      readAt: true,
    },
  });

  if (!existing) {
    throw createError("Notification not found.", 404);
  }

  return { read: true, alreadyRead: true };
};
