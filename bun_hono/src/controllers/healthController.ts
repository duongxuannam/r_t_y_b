import type { Context } from 'hono';
import { localizedMessage, parseAcceptLanguage } from '../models/locale';

export const healthCheck = (c: Context) => {
  const language = parseAcceptLanguage(c.req.header('accept-language'));
  return c.json({ message: localizedMessage(language, 'success', 'thành công') });
};
