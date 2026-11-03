import * as learnerService from "../services/learner.service.js";

export const listLearners = async (req, res, next) => {
  try {
    const data = await learnerService.listLearners(req.params.schoolId, {
      classId: req.query.classId,
    });
    res.status(200).json({ success: true, data });
  } catch (error) { next(error); }
};

export const createLearner = async (req, res, next) => {
  try {
    const data = await learnerService.createLearner(req.params.schoolId, req.body);
    res.status(201).json({ success: true, data });
  } catch (error) { next(error); }
};

export const getLearner = async (req, res, next) => {
  try {
    const data = await learnerService.getLearner(req.params.schoolId, req.params.learnerId);
    res.status(200).json({ success: true, data });
  } catch (error) { next(error); }
};

export const updateLearner = async (req, res, next) => {
  try {
    const data = await learnerService.updateLearner(req.params.schoolId, req.params.learnerId, req.body);
    res.status(200).json({ success: true, data });
  } catch (error) { next(error); }
};

export const removeLearner = async (req, res, next) => {
  try {
    await learnerService.removeLearner(req.params.schoolId, req.params.learnerId);
    res.status(204).send();
  } catch (error) { next(error); }
};
