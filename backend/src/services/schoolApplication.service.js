import prisma from "../config/prisma.js";

const createError = (message, status) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

const makeSchoolSlug = (schoolName, applicationId) => {
  const base = schoolName
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);

  return `${base || "school"}-${applicationId.slice(-8).toLowerCase()}`;
};

export const submitSchoolApplication = async (input) => {
  const application = await prisma.schoolApplication.create({
    data: {
      schoolName: input.schoolName,
      applicantFirstName: input.applicantFirstName,
      applicantLastName: input.applicantLastName,
      applicantEmail: input.applicantEmail.toLowerCase(),
      applicantPhone: input.applicantPhone || null,
      schoolEmail: input.schoolEmail
        ? input.schoolEmail.toLowerCase()
        : null,
      schoolPhone: input.schoolPhone || null,
      address: input.address,
    },
    select: {
      id: true,
      schoolName: true,
      applicantFirstName: true,
      applicantLastName: true,
      applicantEmail: true,
      status: true,
      createdAt: true,
    },
  });

  return application;
};

export const listSchoolApplications = async (status) => {
  return prisma.schoolApplication.findMany({
    where: status ? { status } : undefined,
    orderBy: [{ createdAt: "desc" }],
    include: {
      reviewedBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
      school: {
        select: {
          id: true,
          name: true,
          slug: true,
          approvalStatus: true,
          isActive: true,
        },
      },
    },
  });
};

export const getSchoolApplication = async (applicationId) => {
  const application = await prisma.schoolApplication.findUnique({
    where: { id: applicationId },
    include: {
      reviewedBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
      school: true,
    },
  });

  if (!application) {
    throw createError("School application not found.", 404);
  }

  return application;
};

export const approveSchoolApplication = async (
  applicationId,
  reviewerUserId,
) => {
  return prisma.$transaction(async (tx) => {
    const application = await tx.schoolApplication.findUnique({
      where: { id: applicationId },
    });

    if (!application) {
      throw createError("School application not found.", 404);
    }

    if (application.status !== "PENDING") {
      throw createError(
        "This application has already been reviewed.",
        409,
      );
    }

    // Claim the pending application before creating its school.
    // Concurrent approval attempts cannot both succeed.
    const claimed = await tx.schoolApplication.updateMany({
      where: {
        id: applicationId,
        status: "PENDING",
      },
      data: {
        status: "APPROVED",
        reviewedAt: new Date(),
        reviewedByUserId: reviewerUserId,
        rejectionReason: null,
      },
    });

    if (claimed.count !== 1) {
      throw createError(
        "This application has already been reviewed.",
        409,
      );
    }

    const school = await tx.school.create({
      data: {
        name: application.schoolName,
        slug: makeSchoolSlug(application.schoolName, application.id),
        email: application.schoolEmail || application.applicantEmail,
        phone: application.schoolPhone || application.applicantPhone,
        address: application.address,
        approvalStatus: "APPROVED",
        isActive: false,
      },
    });

    const updatedApplication = await tx.schoolApplication.update({
      where: { id: applicationId },
      data: { schoolId: school.id },
      include: {
        school: true,
        reviewedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return updatedApplication;
  }, {
    maxWait: 15000,
    timeout: 60000,
  });
};

export const rejectSchoolApplication = async (
  applicationId,
  reviewerUserId,
  reason,
) => {
  return prisma.$transaction(async (tx) => {
    const application = await tx.schoolApplication.findUnique({
      where: { id: applicationId },
      select: { id: true, status: true },
    });

    if (!application) {
      throw createError("School application not found.", 404);
    }

    if (application.status !== "PENDING") {
      throw createError(
        "This application has already been reviewed.",
        409,
      );
    }

    const claimed = await tx.schoolApplication.updateMany({
      where: {
        id: applicationId,
        status: "PENDING",
      },
      data: {
        status: "REJECTED",
        reviewedAt: new Date(),
        reviewedByUserId: reviewerUserId,
        rejectionReason: reason,
      },
    });

    if (claimed.count !== 1) {
      throw createError(
        "This application has already been reviewed.",
        409,
      );
    }

    return tx.schoolApplication.findUnique({
      where: { id: applicationId },
      include: {
        reviewedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });
  }, {
    maxWait: 15000,
    timeout: 60000,
  });
};
