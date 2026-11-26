import * as invitationService from "../services/schoolAdminInvitation.service.js";

export const listAdministrators = async (req, res, next) => {
  try {
    const data = await invitationService.listSchoolAdministrators(
      req.validated.params.schoolId,
    );

    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const createInvitation = async (req, res, next) => {
  try {
    const data = await invitationService.createSchoolAdminInvitation(
      req.validated.params.schoolId,
      req.user.id,
      req.validated.body,
    );

    res.status(201).json({
      success: true,
      message: "Administrator invitation created. Share the activation link privately.",
      data,
    });
  } catch (error) {
    next(error);
  }
};

export const revokeInvitation = async (req, res, next) => {
  try {
    const data = await invitationService.revokeSchoolAdminInvitation(
      req.validated.params.schoolId,
      req.validated.params.invitationId,
    );

    res.status(200).json({
      success: true,
      message: "Administrator invitation revoked.",
      data,
    });
  } catch (error) {
    next(error);
  }
};
