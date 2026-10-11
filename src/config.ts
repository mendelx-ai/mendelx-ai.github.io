/**
 * Site-wide settings.
 * Leave a value as '' (empty) until you have it — the site hides anything that is empty.
 */

/** Public address of the site. Change to 'https://mendelx.ai' when the domain is connected
 *  (and update `site` in astro.config.mjs to match). */
export const SITE_URL = 'https://mendelx-ai.github.io';

/** Formspree form URL, e.g. 'https://formspree.io/f/xxxxxxx'.
 *  While empty, the pilot form is shown disabled with "Applications open soon". */
export const FORM_ENDPOINT = '';

/** Public contact email, e.g. 'hello@mendelx.ai'. */
export const CONTACT_EMAIL = '';

/** Company LinkedIn page. */
export const LINKEDIN_URL = '';

/** e.g. 'Athens, Greece'. */
export const LOCATION = '';

/** Registered company name and VAT number (company not yet registered). */
export const LEGAL_ENTITY = '';
export const VAT_NUMBER = '';

/** Cloudflare Web Analytics token (cookie-free). Beacon is only added when this is set. */
export const CLOUDFLARE_ANALYTICS_TOKEN = '';
