export type Language = 'en' | 'vi';

export const parseAcceptLanguage = (headerValue?: string | null): Language => {
  if (!headerValue) {
    return 'en';
  }
  const [first] = headerValue.split(',');
  if (first?.trim().toLowerCase().startsWith('vi')) {
    return 'vi';
  }
  return 'en';
};

export const localizedMessage = (language: Language, en: string, vi: string) =>
  language === 'vi' ? vi : en;
