import prisma from "../config/prisma.js";

export const listSchoolsForUser = async (userId) => {
  const memberships = await prisma.schoolMembership.findMany({
    where: { userId },
    include: {
      school: true,
    },
    orderBy: { createdAt: "asc" },
  });
  return memberships.map((m) => ({
    membershipId: m.id,
    role: m.role,
    school: m.school,
  }));
};

export const getSchool = async (schoolId) => {
  const school = await prisma.school.findUnique({ where: { id: schoolId } });
  if (!school) {
    const error = new Error("School not found.");
    error.status = 404;
    throw error;
  }
  return school;
};

export const updateSchool = async (schoolId, data) => {
  const school = await prisma.school.findUnique({ where: { id: schoolId } });
  if (!school) {
    const error = new Error("School not found.");
    error.status = 404;
    throw error;
  }

  const updated = await prisma.school.update({
    where: { id: schoolId },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.email !== undefined && { email: data.email === "" ? null : data.email }),
      ...(data.phone !== undefined && { phone: data.phone }),
      ...(data.address !== undefined && { address: data.address }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
    },
  });
  return updated;
};
