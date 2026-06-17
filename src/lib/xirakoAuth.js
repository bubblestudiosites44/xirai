export const XIRAKO_APP_NAME = "XirAI";
export const XIRAKO_RETURN_TO = "https://ai.xirako.com/auth/xirako";
export const XIRAKO_LOGIN_URL = `https://xirako.com/login?app=${encodeURIComponent(
  XIRAKO_APP_NAME
)}&return_to=${encodeURIComponent(XIRAKO_RETURN_TO)}`;
