import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import { requireRole, requireSchoolMembership } from "../middleware/authorize.js";
import { validate } from "../middleware/validate.js";
import * as schoolCtrl from "../controllers/school.controller.js";
import * as teacherCtrl from "../controllers/teacher.controller.js";
import * as classCtrl from "../controllers/class.controller.js";
import * as learnerCtrl from "../controllers/learner.controller.js";
import {
  schoolIdParamSchema,
  updateSchoolSchema,
  createTeacherSchema,
  updateTeacherSchema,
  createClassSchema,
  updateClassSchema,
  createLearnerSchema,
  updateLearnerSchema,
  listLearnersQuerySchema,
  schoolAndIdParamSchema,
} from "../validators/school.validators.js";

const router = Router();
router.use(authenticate);

router.get("/", schoolCtrl.listSchools);

router.get("/:schoolId", validate(schoolIdParamSchema), requireSchoolMembership, schoolCtrl.getSchool);
router.patch("/:schoolId", validate(updateSchoolSchema), requireSchoolMembership, requireRole("SCHOOL_ADMIN"), schoolCtrl.updateSchool);

router.get("/:schoolId/teachers", validate(schoolIdParamSchema), requireSchoolMembership, teacherCtrl.listTeachers);
router.post("/:schoolId/teachers", validate(createTeacherSchema), requireSchoolMembership, requireRole("SCHOOL_ADMIN"), teacherCtrl.createTeacher);
router.get("/:schoolId/teachers/:membershipId", validate(schoolAndIdParamSchema("membershipId")), requireSchoolMembership, teacherCtrl.getTeacher);
router.patch("/:schoolId/teachers/:membershipId", validate(updateTeacherSchema), requireSchoolMembership, requireRole("SCHOOL_ADMIN"), teacherCtrl.updateTeacher);
router.delete("/:schoolId/teachers/:membershipId", validate(schoolAndIdParamSchema("membershipId")), requireSchoolMembership, requireRole("SCHOOL_ADMIN"), teacherCtrl.removeTeacher);

router.get("/:schoolId/classes", validate(schoolIdParamSchema), requireSchoolMembership, classCtrl.listClasses);
router.post("/:schoolId/classes", validate(createClassSchema), requireSchoolMembership, requireRole("SCHOOL_ADMIN"), classCtrl.createClass);
router.get("/:schoolId/classes/:classId", validate(schoolAndIdParamSchema("classId")), requireSchoolMembership, classCtrl.getClass);
router.patch("/:schoolId/classes/:classId", validate(updateClassSchema), requireSchoolMembership, requireRole("SCHOOL_ADMIN"), classCtrl.updateClass);
router.delete("/:schoolId/classes/:classId", validate(schoolAndIdParamSchema("classId")), requireSchoolMembership, requireRole("SCHOOL_ADMIN"), classCtrl.removeClass);

router.get("/:schoolId/learners", validate(listLearnersQuerySchema), requireSchoolMembership, learnerCtrl.listLearners);
router.post("/:schoolId/learners", validate(createLearnerSchema), requireSchoolMembership, requireRole("SCHOOL_ADMIN"), learnerCtrl.createLearner);
router.get("/:schoolId/learners/:learnerId", validate(schoolAndIdParamSchema("learnerId")), requireSchoolMembership, learnerCtrl.getLearner);
router.patch("/:schoolId/learners/:learnerId", validate(updateLearnerSchema), requireSchoolMembership, requireRole("SCHOOL_ADMIN"), learnerCtrl.updateLearner);
router.delete("/:schoolId/learners/:learnerId", validate(schoolAndIdParamSchema("learnerId")), requireSchoolMembership, requireRole("SCHOOL_ADMIN"), learnerCtrl.removeLearner);

export default router;
