import * as teacherService from "../services/teacher.service.js";

export const listTeachers = async (req, res, next) => {
  try {
    const data = await teacherService.listTeachers(req.params.schoolId);
    res.status(200).json({ success: true, data });
  } catch (error) { next(error); }
};

export const createTeacher = async (req, res, next) => {
  try {
    const data = await teacherService.createTeacher(req.params.schoolId, req.body);
    res.status(201).json({ success: true, data });
  } catch (error) { next(error); }
};

export const getTeacher = async (req, res, next) => {
  try {
    const data = await teacherService.getTeacher(req.params.schoolId, req.params.membershipId);
    res.status(200).json({ success: true, data });
  } catch (error) { next(error); }
};

export const updateTeacher = async (req, res, next) => {
  try {
    const data = await teacherService.updateTeacher(req.params.schoolId, req.params.membershipId, req.body);
    res.status(200).json({ success: true, data });
  } catch (error) { next(error); }
};

export const removeTeacher = async (req, res, next) => {
  try {
    await teacherService.removeTeacher(req.params.schoolId, req.params.membershipId);
    res.status(204).send();
  } catch (error) { next(error); }
};
