import * as attendanceService from "../services/attendance.service.js";

export const recordAttendance = async (req, res, next) => {
  try {
    const data = await attendanceService.recordAttendance(
      req.schoolId,
      req.body,
      req.user.id
    );
    res.status(201).json({ success: true, data });
  } catch (error) { next(error); }
};

export const listAttendance = async (req, res, next) => {
  try {
    const data = await attendanceService.listAttendance(req.schoolId, {
      date: req.query.date,
      classId: req.query.classId,
      learnerId: req.query.learnerId,
    });
    res.status(200).json({ success: true, data });
  } catch (error) { next(error); }
};

export const getAttendanceByLearner = async (req, res, next) => {
  try {
    const data = await attendanceService.getAttendanceByLearner(
      req.schoolId,
      req.params.learnerId
    );
    res.status(200).json({ success: true, data });
  } catch (error) { next(error); }
};

export const getAttendanceById = async (req, res, next) => {
  try {
    const data = await attendanceService.getAttendanceById(
      req.schoolId,
      req.params.attendanceId
    );
    res.status(200).json({ success: true, data });
  } catch (error) { next(error); }
};

export const updateAttendance = async (req, res, next) => {
  try {
    const data = await attendanceService.updateAttendance(
      req.schoolId,
      req.params.attendanceId,
      req.body,
      req.user.id
    );
    res.status(200).json({ success: true, data });
  } catch (error) { next(error); }
};
