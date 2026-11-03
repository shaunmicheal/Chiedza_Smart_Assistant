import * as schoolService from "../services/school.service.js";

export const listSchools = async (req, res, next) => {
  try {
    const data = await schoolService.listSchoolsForUser(req.user.id);
    res.status(200).json({ success: true, data });
  } catch (error) { next(error); }
};

export const getSchool = async (req, res, next) => {
  try {
    const data = await schoolService.getSchool(req.params.schoolId);
    res.status(200).json({ success: true, data });
  } catch (error) { next(error); }
};

export const updateSchool = async (req, res, next) => {
  try {
    const data = await schoolService.updateSchool(req.params.schoolId, req.body);
    res.status(200).json({ success: true, data });
  } catch (error) { next(error); }
};
