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
