import * as classService from "../services/class.service.js";

export const listClasses = async (req, res, next) => {
  try {
    const data = await classService.listClasses(req.params.schoolId);
    res.status(200).json({ success: true, data });
  } catch (error) { next(error); }
};

export const createClass = async (req, res, next) => {
  try {
    const data = await classService.createClass(req.params.schoolId, req.body);
    res.status(201).json({ success: true, data });
  } catch (error) { next(error); }
};

export const getClass = async (req, res, next) => {
  try {
    const data = await classService.getClass(req.params.schoolId, req.params.classId);
    res.status(200).json({ success: true, data });
  } catch (error) { next(error); }
};

export const updateClass = async (req, res, next) => {
  try {
    const data = await classService.updateClass(req.params.schoolId, req.params.classId, req.body);
    res.status(200).json({ success: true, data });
  } catch (error) { next(error); }
};

export const removeClass = async (req, res, next) => {
  try {
    await classService.removeClass(req.params.schoolId, req.params.classId);
    res.status(204).send();
  } catch (error) { next(error); }
};
