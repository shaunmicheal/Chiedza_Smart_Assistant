import * as invitationService from "../services/schoolAdminInvitation.service.js";

export const activateInvitation = async (req, res, next) => {
  try {
    const data = await invitationService.activateSchoolAdminInvitation(
      req.validated.body,
    );

    res.status(201).json({
      success: true,
      message: "Your school administrator account is ready. You can now sign in.",
      data,
    });
  } catch (error) {
    next(error);
  }
};
