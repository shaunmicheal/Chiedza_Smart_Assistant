import * as schoolService from "../services/platformSchool.service.js";

export const listSchools = async (req, res, next) => {
  try {
    const query = req.validated.query;

    const data = await schoolService.listPlatformSchools({
      search: query.search,
      isActive:
        query.isActive === undefined
          ? undefined
          : query.isActive === "true",
      approvalStatus: query.approvalStatus,
    });

    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const getSchool = async (req, res, next) => {
  try {
    const data = await schoolService.getPlatformSchool(
      req.validated.params.schoolId,
    );

    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const updateSchoolStatus = async (req, res, next) => {
  try {
    const data = await schoolService.updatePlatformSchoolStatus(
      req.validated.params.schoolId,
      req.validated.body.isActive,
    );

    res.status(200).json({
      success: true,
      message: data.isActive
        ? "School activated successfully."
        : "School deactivated successfully.",
      data,
    });
  } catch (error) {
    next(error);
  }
};

export const getOverview = async (req, res, next) => {
  try {
    const data = await schoolService.getPlatformOverview();

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};
