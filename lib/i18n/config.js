// lib/i18n/config.js

/**
 * Internationalization Configuration
 * 
 * @property {string} defaultLocale - Default locale used when none is specified
 * @property {string[]} locales - Supported locales
 */
export const i18n = {
  defaultLocale: 'en', // English as default
  locales: ['en', 'ar'] // English and Arabic
}

/**
 * Extract locale from pathname
 * @param {string} pathname - URL pathname (e.g., '/en/products')
 * @returns {string} Locale code or default locale
 */
export function getLocaleFromPathname(pathname) {
  const segments = pathname.split('/')
  const locale = segments[1]
  return i18n.locales.includes(locale) ? locale : i18n.defaultLocale
}