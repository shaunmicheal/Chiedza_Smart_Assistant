import * as applicationService from "../services/schoolApplication.service.js";

export const submitApplication = async (req, res, next) => {
  try {
    const data = await applicationService.submitSchoolApplication(req.body);

    res.status(201).json({
      success: true,
      message: "School application submitted successfully.",
      data,
    });
  } catch (error) {
    next(error);
  }
};

export const listApplications = async (req, res, next) => {
  try {
    const data = await applicationService.listSchoolApplications(
      req.validated.query.status,
    );

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};

export const getApplication = async (req, res, next) => {
  try {
    const data = await applicationService.getSchoolApplication(
      req.params.applicationId,
    );

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};

export const approveApplication = async (req, res, next) => {
  try {
    const data = await applicationService.approveSchoolApplication(
      req.params.applicationId,
      req.user.id,
    );

    res.status(200).json({
      success: true,
      message: "School application approved and school created.",
      data,
    });
  } catch (error) {
    next(error);
  }
};

export const rejectApplication = async (req, res, next) => {
  try {
    const data = await applicationService.rejectSchoolApplication(
      req.params.applicationId,
      req.user.id,
      req.body.reason,
    );

    res.status(200).json({
      success: true,
      message: "School application rejected.",
      data,
    });
  } catch (error) {
    next(error);
  }
};
