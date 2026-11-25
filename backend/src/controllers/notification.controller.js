import {
  listEligibleTeachers,
  createSchoolNotification,
  listSchoolNotifications,
  listMyNotifications,
  countMyUnreadNotifications,
  markMyNotificationAsRead,
} from "../services/notification.service.js";

export const getEligibleTeachers = async (req, res, next) => {
  try {
    const teachers = await listEligibleTeachers(req.schoolId);

    res.status(200).json({
      success: true,
      data: teachers,
    });
  } catch (error) {
    next(error);
  }
};

export const sendNotification = async (req, res, next) => {
  try {
    const notification = await createSchoolNotification({
      schoolId: req.schoolId,
      createdByMembershipId: req.membership.id,
      ...req.body,
    });

    res.status(201).json({
      success: true,
      message: "Notification sent successfully.",
      data: notification,
    });
  } catch (error) {
    next(error);
  }
};

export const getSchoolNotifications = async (req, res, next) => {
  try {
    const notifications = await listSchoolNotifications(req.schoolId);

    res.status(200).json({
      success: true,
      data: notifications,
    });
  } catch (error) {
    next(error);
  }
};

export const getMyNotifications = async (req, res, next) => {
  try {
    const notifications = await listMyNotifications(
      req.schoolId,
      req.membership.id
    );

    res.status(200).json({
      success: true,
      data: notifications,
    });
  } catch (error) {
    next(error);
  }
};

export const getUnreadCount = async (req, res, next) => {
  try {
    const count = await countMyUnreadNotifications(
      req.schoolId,
      req.membership.id
    );

    res.status(200).json({
      success: true,
      data: { count },
    });
  } catch (error) {
    next(error);
  }
};

export const markNotificationAsRead = async (req, res, next) => {
  try {
    const result = await markMyNotificationAsRead({
      schoolId: req.schoolId,
      membershipId: req.membership.id,
      notificationId: req.params.notificationId,
    });

    res.status(200).json({
      success: true,
      message: "Notification marked as read.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
