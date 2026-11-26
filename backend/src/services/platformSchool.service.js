import prisma from "../config/prisma.js";

const createError = (message, status) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

const schoolSelect = {
  id: true,
  name: true,
  slug: true,
  email: true,
  phone: true,
  address: true,
  isActive: true,
  approvalStatus: true,
  createdAt: true,
  updatedAt: true,
};

export const listPlatformSchools = async ({
  search,
  isActive,
  approvalStatus,
}) => {
  const where = {
    ...(isActive !== undefined ? { isActive } : {}),
    ...(approvalStatus ? { approvalStatus } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { slug: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
            { address: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const schools = await prisma.school.findMany({
    where,
    select: {
      ...schoolSelect,
      _count: {
        select: {
          memberships: {
            where: {
              isActive: true,
              user: { is: { isActive: true } },
            },
          },
          learners: true,
          classes: true,
        },
      },
    },
    orderBy: [{ createdAt: "desc" }],
  });

  const schoolIds = schools.map((school) => school.id);

  const membershipGroups = schoolIds.length
    ? await prisma.schoolMembership.groupBy({
        by: ["schoolId", "role"],
        where: {
          schoolId: { in: schoolIds },
          isActive: true,
          user: { is: { isActive: true } },
        },
        _count: { _all: true },
      })
    : [];

  const countsBySchool = new Map();

  for (const group of membershipGroups) {
    const counts = countsBySchool.get(group.schoolId) || {
      administrators: 0,
      teachers: 0,
      parents: 0,
      other: 0,
    };

    if (group.role === "SCHOOL_ADMIN") {
      counts.administrators = group._count._all;
    } else if (group.role === "TEACHER") {
      counts.teachers = group._count._all;
    } else if (group.role === "PARENT") {
      counts.parents = group._count._all;
    } else {
      counts.other += group._count._all;
    }

    countsBySchool.set(group.schoolId, counts);
  }

  return schools.map((school) => ({
    ...school,
    counts: {
      administrators: countsBySchool.get(school.id)?.administrators || 0,
      teachers: countsBySchool.get(school.id)?.teachers || 0,
      parents: countsBySchool.get(school.id)?.parents || 0,
      otherStaff: countsBySchool.get(school.id)?.other || 0,
      activeMembers: school._count.memberships,
      learners: school._count.learners,
      classes: school._count.classes,
    },
    _count: undefined,
  }));
};

export const getPlatformSchool = async (schoolId) => {
  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: {
      ...schoolSelect,
      _count: {
        select: {
          memberships: {
            where: {
              isActive: true,
              user: { is: { isActive: true } },
            },
          },
          learners: true,
          classes: true,
        },
      },
      application: {
        select: {
          id: true,
          status: true,
          applicantFirstName: true,
          applicantLastName: true,
          applicantEmail: true,
          createdAt: true,
          reviewedAt: true,
        },
      },
    },
  });

  if (!school) {
    throw createError("School not found.", 404);
  }

  const memberships = await prisma.schoolMembership.groupBy({
    by: ["role"],
    where: {
      schoolId,
      isActive: true,
      user: { is: { isActive: true } },
    },
    _count: { _all: true },
  });

  const roleCounts = {
    administrators: 0,
    teachers: 0,
    parents: 0,
    otherStaff: 0,
  };

  for (const group of memberships) {
    if (group.role === "SCHOOL_ADMIN") {
      roleCounts.administrators = group._count._all;
    } else if (group.role === "TEACHER") {
      roleCounts.teachers = group._count._all;
    } else if (group.role === "PARENT") {
      roleCounts.parents = group._count._all;
    } else {
      roleCounts.otherStaff += group._count._all;
    }
  }

  const recentMemberships = await prisma.schoolMembership.findMany({
    where: { schoolId },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: {
      id: true,
      role: true,
      isActive: true,
      createdAt: true,
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          isActive: true,
        },
      },
    },
  });

  return {
    ...school,
    counts: {
      ...roleCounts,
      activeMembers: school._count.memberships,
      learners: school._count.learners,
      classes: school._count.classes,
    },
    recentMemberships,
    _count: undefined,
  };
};

export const updatePlatformSchoolStatus = async (schoolId, isActive) => {
  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: { id: true, approvalStatus: true, isActive: true },
  });

  if (!school) {
    throw createError("School not found.", 404);
  }

  if (school.approvalStatus !== "APPROVED") {
    throw createError(
      "Only approved schools can be activated or deactivated.",
      409,
    );
  }

  const updated = await prisma.school.update({
    where: { id: schoolId },
    data: { isActive },
    select: schoolSelect,
  });

  return updated;
};

export const getPlatformOverview = async () => {
  const [
    schools,
    activeSchools,
    pendingApplications,
    approvedApplications,
    rejectedApplications,
    learners,
    recentApplications,
  ] = await Promise.all([
    prisma.school.count(),
    prisma.school.count({
      where: { isActive: true, approvalStatus: "APPROVED" },
    }),
    prisma.schoolApplication.count({ where: { status: "PENDING" } }),
    prisma.schoolApplication.count({ where: { status: "APPROVED" } }),
    prisma.schoolApplication.count({ where: { status: "REJECTED" } }),
    prisma.learner.count(),
    prisma.schoolApplication.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        schoolName: true,
        applicantFirstName: true,
        applicantLastName: true,
        applicantEmail: true,
        status: true,
        createdAt: true,
      },
    }),
  ]);

  return {
    counts: {
      schools,
      activeSchools,
      pendingApplications,
      approvedApplications,
      rejectedApplications,
      learners,
    },
    recentApplications,
  };
};
