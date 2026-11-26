export const requireRole = (...allowedRoles) => (req, res, next) => {
  const role = req.membership?.role ?? req.role;
  const hasRole = role
    ? allowedRoles.includes(role)
    : (req.memberships || []).some((membership) =>
        allowedRoles.includes(membership.role),
      );

  if (!hasRole) {
    return res.status(403).json({
      success: false,
      message: "You do not have permission to perform this action.",
    });
  }

  next();
};

export const requirePlatformRole = (...allowedRoles) => (req, res, next) => {
  const platformRole = req.user?.platformRole;

  if (!platformRole || !allowedRoles.includes(platformRole)) {
    return res.status(403).json({
      success: false,
      message: "You do not have permission to access this platform resource.",
    });
  }

  next();
};

export const requireSchoolMembership = (req, res, next) => {
  const schoolId =
    req.params?.schoolId || req.body?.schoolId || req.query?.schoolId;

  if (!schoolId) {
    return res.status(400).json({
      success: false,
      message: "schoolId is required.",
    });
  }

  const membership = (req.memberships || []).find(
    (item) => item.schoolId === schoolId && item.isActive !== false,
  );

  if (!membership) {
    return res.status(403).json({
      success: false,
      message: "You are not a member of this school.",
    });
  }

  req.schoolId = schoolId;
  req.membership = membership;
  req.role = membership.role;
  next();
};
