import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import { requirePasswordChangeComplete } from "../middleware/requirePasswordChangeComplete.js";
import { requireRole, requireSchoolMembership } from "../middleware/authorize.js";
import { requireClassAccess } from "../middleware/requireClassAccess.js";
import { validate } from "../middleware/validate.js";
import * as schoolCtrl from "../controllers/school.controller.js";
import * as teacherCtrl from "../controllers/teacher.controller.js";
import * as parentCtrl from "../controllers/parent.controller.js";
import * as classCtrl from "../controllers/class.controller.js";
import * as learnerCtrl from "../controllers/learner.controller.js";
import {
  schoolIdParamSchema,
  updateSchoolSchema,
  createTeacherSchema,
  assignTeacherToClassSchema,
  removeTeacherFromClassSchema,
  createParentSchema,
  updateTeacherSchema,
  createClassSchema,
  updateClassSchema,
  createLearnerSchema,
  updateLearnerSchema,
  listLearnersQuerySchema,
  schoolAndIdParamSchema,
} from "../validators/school.validators.js";

const router = Router();
router.use(authenticate, requirePasswordChangeComplete);

router.get("/", schoolCtrl.listSchools);

router.get("/:schoolId", validate(schoolIdParamSchema), requireSchoolMembership, schoolCtrl.getSchool);
router.patch("/:schoolId", validate(updateSchoolSchema), requireSchoolMembership, requireRole("SCHOOL_ADMIN"), schoolCtrl.updateSchool);

router.get("/:schoolId/parents", validate(schoolIdParamSchema), requireSchoolMembership, requireRole("SCHOOL_ADMIN"), parentCtrl.listParents);
router.post("/:schoolId/parents", validate(createParentSchema), requireSchoolMembership, requireRole("SCHOOL_ADMIN"), parentCtrl.createParent);

router.get("/:schoolId/teachers", validate(schoolIdParamSchema), requireSchoolMembership, teacherCtrl.listTeachers);
router.post("/:schoolId/teachers", validate(createTeacherSchema), requireSchoolMembership, requireRole("SCHOOL_ADMIN"), teacherCtrl.createTeacher);
router.get("/:schoolId/teachers/:membershipId", validate(schoolAndIdParamSchema("membershipId")), requireSchoolMembership, teacherCtrl.getTeacher);
router.patch("/:schoolId/teachers/:membershipId", validate(updateTeacherSchema), requireSchoolMembership, requireRole("SCHOOL_ADMIN"), teacherCtrl.updateTeacher);
router.delete("/:schoolId/teachers/:membershipId", validate(schoolAndIdParamSchema("membershipId")), requireSchoolMembership, requireRole("SCHOOL_ADMIN"), teacherCtrl.removeTeacher);

router.get("/:schoolId/classes", validate(schoolIdParamSchema), requireSchoolMembership, requireClassAccess, classCtrl.listClasses);
router.post("/:schoolId/classes", validate(createClassSchema), requireSchoolMembership, requireRole("SCHOOL_ADMIN"), classCtrl.createClass);
router.get("/:schoolId/classes/:classId", validate(schoolAndIdParamSchema("classId")), requireSchoolMembership, requireClassAccess, classCtrl.getClass);
router.patch("/:schoolId/classes/:classId", validate(updateClassSchema), requireSchoolMembership, requireRole("SCHOOL_ADMIN"), classCtrl.updateClass);
router.delete("/:schoolId/classes/:classId", validate(schoolAndIdParamSchema("classId")), requireSchoolMembership, requireRole("SCHOOL_ADMIN"), classCtrl.removeClass);

router.post(
  "/:schoolId/classes/:classId/teachers",
  validate(assignTeacherToClassSchema),
  requireSchoolMembership,
  requireRole("SCHOOL_ADMIN"),
  teacherCtrl.assignTeacherToClass
);
router.delete(
  "/:schoolId/classes/:classId/teachers/:membershipId",
  validate(removeTeacherFromClassSchema),
  requireSchoolMembership,
  requireRole("SCHOOL_ADMIN"),
  teacherCtrl.removeTeacherFromClass
);

router.get("/:schoolId/learners", validate(listLearnersQuerySchema), requireSchoolMembership, requireClassAccess, learnerCtrl.listLearners);
router.post("/:schoolId/learners", validate(createLearnerSchema), requireSchoolMembership, requireRole("SCHOOL_ADMIN"), learnerCtrl.createLearner);
router.get("/:schoolId/learners/:learnerId", validate(schoolAndIdParamSchema("learnerId")), requireSchoolMembership, requireClassAccess, learnerCtrl.getLearner);
router.patch("/:schoolId/learners/:learnerId", validate(updateLearnerSchema), requireSchoolMembership, requireRole("SCHOOL_ADMIN"), learnerCtrl.updateLearner);
router.delete("/:schoolId/learners/:learnerId", validate(schoolAndIdParamSchema("learnerId")), requireSchoolMembership, requireRole("SCHOOL_ADMIN"), learnerCtrl.removeLearner);

export default router;
