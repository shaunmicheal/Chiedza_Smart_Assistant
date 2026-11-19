import * as parentService from "../services/parent.service.js";

export const listParents = async (req, res, next) => {
  try {
    const data = await parentService.listParents(req.params.schoolId);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const createParent = async (req, res, next) => {
  try {
    const data = await parentService.createParent(req.params.schoolId, req.body);
    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const listMyChildren = async (req, res, next) => {
  try {
    const data = await parentService.listMyChildren(req.user.id);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const listMyAttendance = async (req, res, next) => {
  try {
    const data = await parentService.listMyAttendance(req.user.id);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const listMyAssessments = async (req, res, next) => {
  try {
    const data = await parentService.listMyAssessments(req.user.id);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const listMyMessages = async (req, res, next) => {
  try {
    const data = await parentService.listMyMessages(req.user.id);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};


export const createInvitation = async (req, res, next) => {
  try {
    const data = await parentService.createParentInvitation(
      req.params.schoolId,
      req.membership.id,
      req.body
    );
    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const listInvitations = async (req, res, next) => {
  try {
    const data = await parentService.listParentInvitations(req.params.schoolId);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const revokeInvitation = async (req, res, next) => {
  try {
    const data = await parentService.revokeParentInvitation(
      req.params.schoolId,
      req.params.invitationId
    );
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const activateParentInvitation = async (req, res, next) => {
  try {
    const data = await parentService.activateParentInvitation(req.body);
    res.status(201).json({
      success: true,
      message: "Your parent account has been activated. You can now sign in.",
      data,
    });
  } catch (error) {
    next(error);
  }
};
