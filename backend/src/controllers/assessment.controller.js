import * as assessmentService from "../services/assessment.service.js";

export const createAssessment = async (req, res, next) => {
  try {
    const data = await assessmentService.createAssessment(
      req.schoolId,
      req.body,
      req.user.id
    );
    res.status(201).json({ success: true, data });
  } catch (error) { next(error); }
};

export const listAssessments = async (req, res, next) => {
  try {
    const membershipId = req.role === 'TEACHER' ? req.membership?.id : undefined;
    const data = await assessmentService.listAssessments(
      req.schoolId,
      { classId: req.query.classId },
      membershipId
    );
    res.status(200).json({ success: true, data });
  } catch (error) { next(error); }
};

export const getAssessmentById = async (req, res, next) => {
  try {
    const data = await assessmentService.getAssessmentById(
      req.schoolId,
      req.params.assessmentId
    );
    res.status(200).json({ success: true, data });
  } catch (error) { next(error); }
};

export const updateAssessment = async (req, res, next) => {
  try {
    const data = await assessmentService.updateAssessment(
      req.schoolId,
      req.params.assessmentId,
      req.body
    );
    res.status(200).json({ success: true, data });
  } catch (error) { next(error); }
};

export const recordAssessmentResult = async (req, res, next) => {
  try {
    const data = await assessmentService.recordAssessmentResult(
      req.schoolId,
      req.params.assessmentId,
      req.body,
      req.user.id
    );
    res.status(201).json({ success: true, data });
  } catch (error) { next(error); }
};

export const listAssessmentResults = async (req, res, next) => {
  try {
    const data = await assessmentService.listAssessmentResults(
      req.schoolId,
      req.params.assessmentId,
      { learnerId: req.query.learnerId }
    );
    res.status(200).json({ success: true, data });
  } catch (error) { next(error); }
};

export const getLearnerAssessments = async (req, res, next) => {
  try {
    const data = await assessmentService.getLearnerAssessments(
      req.schoolId,
      req.params.learnerId,
      { classId: req.query.classId }
    );
    res.status(200).json({ success: true, data });
  } catch (error) { next(error); }
};

export const updateAssessmentResult = async (req, res, next) => {
  try {
    const data = await assessmentService.updateAssessmentResult(
      req.schoolId,
      req.params.assessmentId,
      req.params.resultId,
      req.body,
      req.user.id
    );
    res.status(200).json({ success: true, data });
  } catch (error) { next(error); }
};
