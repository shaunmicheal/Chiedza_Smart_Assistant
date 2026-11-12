import { login, getMe, changePassword } from "../services/auth.service.js";

export const loginController = async (req, res, next) => {
  try {
    const result = await login(req.body);
    setTokenCookie(res, result.token);
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
  res.clearCookie("chiedza_token", cookieOptions());
  res.status(200).json({ success: true, message: "Logged out." });
};

const cookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
});

const setTokenCookie = (res, token) => {
  res.cookie("chiedza_token", token, {
    ...cookieOptions(),
    maxAge: 60 * 60 * 1000,
  });
};

// re-export for routes
export { cookieOptions };


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
