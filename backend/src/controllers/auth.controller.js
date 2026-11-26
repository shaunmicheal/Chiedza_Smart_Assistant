import {
  login,
  getMe,
  changePassword,
  updateProfile,
} from "../services/auth.service.js";

export const loginController = async (req, res, next) => {
  try {
    const result = await login(req.body);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

export const meController = async (req, res, next) => {
  try {
    const user = await getMe(req.user.id);
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

export const logoutController = (req, res) => {
  res.status(200).json({ success: true, message: "Logged out." });
};

export const passwordChangeController = async (req, res, next) => {
  try {
    const result = await changePassword(req.user.id, req.body);
    res.status(200).json({
      success: true,
      message: "Password changed successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const profileUpdateController = async (req, res, next) => {
  try {
    const user = await updateProfile(req.user.id, req.body);

    res.status(200).json({
      success: true,
      message: "Profile updated successfully.",
      data: user,
    });
  } catch (error) {
    next(error);
  }
};
