import * as learnerService from "../services/learner.service.js";

export const listLearners = async (req, res, next) => {
  try {
    const membershipId = req.role === 'TEACHER' ? req.membership?.id : undefined;
    const data = await learnerService.listLearners(
      req.params.schoolId,
      { classId: req.query.classId },
      membershipId
    );
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
    let updateData = req.body;

    if (req.role === "TEACHER") {
      const teacherEditableFields = ["firstName", "lastName", "dateOfBirth"];
      const restrictedFields = Object.keys(req.body).filter(
        (field) => !teacherEditableFields.includes(field)
      );

      if (restrictedFields.length > 0) {
        return res.status(403).json({
          success: false,
          message:
            "Teachers can only update a learner's first name, last name and date of birth.",
        });
      }

      updateData = Object.fromEntries(
        Object.entries(req.body).filter(([field]) =>
          teacherEditableFields.includes(field)
        )
      );
    }

    const data = await learnerService.updateLearner(
      req.params.schoolId,
      req.params.learnerId,
      updateData
    );

    res.status(200).json({ success: true, data });
  } catch (error) { next(error); }
};

export const removeLearner = async (req, res, next) => {
  try {
    await learnerService.removeLearner(req.params.schoolId, req.params.learnerId);
    res.status(204).send();
  } catch (error) { next(error); }
};
