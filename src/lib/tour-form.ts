// Parsing and server-side validation for the admin tour form. The form posts repeated fields
// (itinerary_title[], fact_label[], ...); this turns them into typed input or per-field errors,
// and always returns the raw values so the form can be shown again without losing what was typed.
import { districtNames } from '../data/districts';
import { factIconKeys } from '../data/icons';
import { listCategories } from './categories-db';
import { isSlugTaken, type TourInput, type TourWithDetails } from './db';

export interface TourFormValues {
  title: string;
  slug: string;
  category: string;
  duration_days: string;
  sort_order: string;
  has_page: boolean;
  max_altitude: string;
  summary: string;
  cover_image_url: string;
  cover_image_alt: string;
  hero_position: string;
  card_position: string;
  facts: { icon: string; label: string; value: string }[];
  facts_note: string;
  overview_title: string;
  overview: string;
  highlights: string[];
  itinerary: { title: string; description: string; driving: string; elevation: string; attractions: string; overnight: string }[];
  pack_title: string;
  pack_text: string;
  districts: string[];
  inclusions: string[];
  exclusions: string[];
  extras_title: string;
  extras: string[];
  inclusions_note: string;
  faqs: { question: string; answer: string }[];
  cost_title: string;
  cost_text: string;
  seo_title: string;
  seo_description: string;
  status: string;
}

/** Field key -> message. Repeater rows use keys like `itinerary.2.title` or `inclusions.0`. */
export type FormErrors = Record<string, string>;

const blankDay = { title: '', description: '', driving: '', elevation: '', attractions: '', overnight: '' };

export const emptyValues = (category = ''): TourFormValues => ({
  title: '',
  slug: '',
  category,
  duration_days: '5',
  sort_order: '99',
  has_page: true,
  max_altitude: '',
  summary: '',
  cover_image_url: '',
  cover_image_alt: '',
  hero_position: 'center',
  card_position: '',
  facts: [{ icon: factIconKeys[0], label: '', value: '' }],
  facts_note: '',
  overview_title: '',
  overview: '',
  highlights: [''],
  itinerary: [blankDay],
  pack_title: '',
  pack_text: '',
  districts: [],
  inclusions: [''],
  exclusions: [''],
  extras_title: '',
  extras: [''],
  inclusions_note: '',
  faqs: [{ question: '', answer: '' }],
  cost_title: 'Package Cost',
  cost_text: '',
  seo_title: '',
  seo_description: '',
  status: 'draft',
});

const orBlank = <T,>(rows: T[], blank: T): T[] => (rows.length ? rows : [blank]);

export const valuesFromTour = (t: TourWithDetails): TourFormValues => ({
  title: t.title,
  slug: t.slug,
  category: t.category,
  duration_days: String(t.duration_days),
  sort_order: String(t.sort_order),
  has_page: t.has_page,
  max_altitude: t.max_altitude,
  summary: t.summary,
  cover_image_url: t.cover_image_url,
  cover_image_alt: t.cover_image_alt,
  hero_position: t.hero_position,
  card_position: t.card_position,
  facts: orBlank(t.facts, { icon: factIconKeys[0], label: '', value: '' }),
  facts_note: t.facts_note,
  overview_title: t.overview_title,
  overview: t.overview,
  highlights: orBlank(t.highlights, ''),
  itinerary: orBlank(
    t.itinerary.map((d) => ({
      title: d.title,
      description: d.description,
      driving: d.driving,
      elevation: d.elevation,
      attractions: d.attractions.join('\n'),
      overnight: d.overnight,
    })),
    blankDay,
  ),
  pack_title: t.pack_title,
  pack_text: t.pack_text,
  districts: t.districts,
  inclusions: orBlank(t.inclusions, ''),
  exclusions: orBlank(t.exclusions, ''),
  extras_title: t.extras_title,
  extras: orBlank(t.extras, ''),
  inclusions_note: t.inclusions_note,
  faqs: orBlank(t.faqs, { question: '', answer: '' }),
  cost_title: t.cost_title,
  cost_text: t.cost_text,
  seo_title: t.seo_title,
  seo_description: t.seo_description,
  status: t.status,
});

export const slugify = (text: string) =>
  text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);

export const str = (form: FormData, key: string) => {
  const v = form.get(key);
  return typeof v === 'string' ? v.trim() : '';
};
export const strs = (form: FormData, key: string) => form.getAll(key).map((v) => (typeof v === 'string' ? v.trim() : ''));

/**
 * A photo from the site's own /assets folder, one uploaded from the admin (/media/uploads/), or a full http(s) URL.
 * Quotes, brackets and backslashes are refused because the URL ends up inside a CSS url('...').
 */
export function isImageUrl(value: string) {
  if (value.length > 2000 || /['"()\\<>]/.test(value)) return false;
  if (/^\/assets\/images\/[^?#]+\.(jpe?g|png|webp|avif|gif)$/i.test(value)) return !value.includes('..');
  if (/^\/media\/uploads\/[a-f0-9-]+\.(jpg|png|webp|avif)$/.test(value)) return true;
  try {
    const u = new URL(value);
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
}

/** A CSS background-position such as "center 40%". */
export const isPosition = (value: string) => /^[a-z0-9%. -]{1,40}$/i.test(value);

export const IMAGE_ERROR = 'Enter an image path like /assets/images/image/photo.webp, a full https:// URL, or upload a file.';

/** Read the posted form, then validate it. `input` is only set when there are no errors. */
export async function parseTourForm(
  form: FormData,
  tourId?: number,
): Promise<{ values: TourFormValues; errors: FormErrors; input?: TourInput }> {
  const itTitles = strs(form, 'itinerary_title');
  const itDescs = strs(form, 'itinerary_description');
  const itDriving = strs(form, 'itinerary_driving');
  const itElevation = strs(form, 'itinerary_elevation');
  const itAttractions = strs(form, 'itinerary_attractions');
  const itOvernight = strs(form, 'itinerary_overnight');
  const factIcons = strs(form, 'fact_icon');
  const factLabels = strs(form, 'fact_label');
  const factValues = strs(form, 'fact_value');
  const faqQs = strs(form, 'faq_question');
  const faqAs = strs(form, 'faq_answer');

  const values: TourFormValues = {
    title: str(form, 'title'),
    slug: str(form, 'slug'),
    category: str(form, 'category'),
    duration_days: str(form, 'duration_days'),
    sort_order: str(form, 'sort_order'),
    has_page: form.get('has_page') === 'on',
    max_altitude: str(form, 'max_altitude'),
    summary: str(form, 'summary'),
    cover_image_url: str(form, 'cover_image_url'),
    cover_image_alt: str(form, 'cover_image_alt'),
    hero_position: str(form, 'hero_position'),
    card_position: str(form, 'card_position'),
    facts: factLabels.map((label, i) => ({ icon: factIcons[i] ?? '', label, value: factValues[i] ?? '' })),
    facts_note: str(form, 'facts_note'),
    overview_title: str(form, 'overview_title'),
    overview: str(form, 'overview'),
    highlights: strs(form, 'highlights'),
    itinerary: itTitles.map((title, i) => ({
      title,
      description: itDescs[i] ?? '',
      driving: itDriving[i] ?? '',
      elevation: itElevation[i] ?? '',
      attractions: itAttractions[i] ?? '',
      overnight: itOvernight[i] ?? '',
    })),
    pack_title: str(form, 'pack_title'),
    pack_text: str(form, 'pack_text'),
    districts: strs(form, 'district').filter(Boolean),
    inclusions: strs(form, 'inclusions'),
    exclusions: strs(form, 'exclusions'),
    extras_title: str(form, 'extras_title'),
    extras: strs(form, 'extras'),
    inclusions_note: str(form, 'inclusions_note'),
    faqs: faqQs.map((question, i) => ({ question, answer: faqAs[i] ?? '' })),
    cost_title: str(form, 'cost_title'),
    cost_text: str(form, 'cost_text'),
    seo_title: str(form, 'seo_title'),
    seo_description: str(form, 'seo_description'),
    status: str(form, 'status'),
  };

  const errors: FormErrors = {};
  const tooLong = (key: string, value: string, max: number, label: string) => {
    if (value.length > max) errors[key] = `Keep ${label} to ${max.toLocaleString('en-US')} characters or fewer.`;
  };

  // Basic info
  if (!values.title) errors.title = 'Enter a title.';
  else tooLong('title', values.title, 150, 'the title');

  const slug = values.slug || slugify(values.title);
  values.slug = slug;
  if (!slug) errors.slug = 'Enter a slug (letters, numbers and hyphens).';
  else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) errors.slug = 'Use lowercase letters, numbers and single hyphens only.';
  else if (slug.length > 120) errors.slug = 'Keep the slug to 120 characters or fewer.';
  else if (await isSlugTaken(slug, tourId)) errors.slug = 'Another tour already uses this slug.';

  if (!(await listCategories()).some((c) => c.slug === values.category)) errors.category = 'Choose a category.';

  const days = Number(values.duration_days);
  if (!values.duration_days || !Number.isInteger(days) || days < 1 || days > 365) errors.duration_days = 'Enter a whole number of days from 1 to 365.';

  const sortOrder = Number(values.sort_order || '0');
  if (!Number.isInteger(sortOrder) || sortOrder < 0 || sortOrder > 9999) errors.sort_order = 'Enter a whole number from 0 to 9999.';

  tooLong('max_altitude', values.max_altitude, 20, 'the altitude');
  tooLong('summary', values.summary, 400, 'the summary');

  // Media
  if (!values.cover_image_url) {
    if (values.status === 'published') errors.cover_image_url = 'A published tour needs a cover image.';
  } else if (!isImageUrl(values.cover_image_url)) errors.cover_image_url = IMAGE_ERROR;
  tooLong('cover_image_alt', values.cover_image_alt, 200, 'the alt text');
  if (values.status === 'published' && !values.cover_image_alt && !errors.cover_image_alt) errors.cover_image_alt = 'Describe the cover image for screen readers.';
  if (!isPosition(values.hero_position)) errors.hero_position = 'Use something like "center" or "center 40%".';
  if (values.card_position && !isPosition(values.card_position)) errors.card_position = 'Use something like "center 35%", or leave empty.';

  // Trip facts
  const facts = values.facts.filter((f) => f.label || f.value);
  if (facts.length > 12) errors.facts = 'Up to 12 trip facts are allowed.';
  values.facts.forEach((f, i) => {
    if (!f.label && !f.value) return;
    if (!f.label) errors[`facts.${i}.label`] = 'Give this fact a label.';
    else tooLong(`facts.${i}.label`, f.label, 40, 'the label');
    if (!f.value) errors[`facts.${i}.value`] = 'Give this fact a value.';
    else tooLong(`facts.${i}.value`, f.value, 150, 'the value');
    if (!factIconKeys.includes(f.icon)) errors[`facts.${i}.icon`] = 'Choose an icon.';
  });
  tooLong('facts_note', values.facts_note, 400, 'the note');

  // Overview, highlights
  tooLong('overview_title', values.overview_title, 120, 'the heading');
  tooLong('overview', values.overview, 10_000, 'the overview');
  values.highlights.forEach((item, i) => tooLong(`highlights.${i}`, item, 250, 'each highlight'));
  if (values.highlights.filter(Boolean).length > 30) errors.highlights = 'Up to 30 highlights are allowed.';

  // Itinerary: rows that are completely empty are dropped.
  const isFilled = (d: TourFormValues['itinerary'][number]) =>
    Boolean(d.title || d.description || d.driving || d.elevation || d.attractions || d.overnight);
  const attractionLines = (text: string) => text.split(/\r?\n/).map((l) => l.replace(/^[-•*]\s*/, '').trim()).filter(Boolean);
  const itinerary = values.itinerary.filter(isFilled).map((d) => ({
    title: d.title,
    description: d.description,
    driving: d.driving,
    elevation: d.elevation,
    attractions: attractionLines(d.attractions),
    overnight: d.overnight,
  }));
  if (itinerary.length > 60) errors.itinerary = 'An itinerary can have up to 60 days.';
  values.itinerary.forEach((d, i) => {
    if (!isFilled(d)) return;
    if (!d.title) errors[`itinerary.${i}.title`] = 'Give this day a title.';
    else tooLong(`itinerary.${i}.title`, d.title, 150, 'the title');
    tooLong(`itinerary.${i}.description`, d.description, 2000, 'the description');
    tooLong(`itinerary.${i}.driving`, d.driving, 100, 'the driving duration');
    tooLong(`itinerary.${i}.elevation`, d.elevation, 100, 'the elevation');
    tooLong(`itinerary.${i}.overnight`, d.overnight, 150, 'the overnight stay');
    const lines = attractionLines(d.attractions);
    if (lines.length > 20) errors[`itinerary.${i}.attractions`] = 'Up to 20 attractions per day.';
    else if (lines.some((l) => l.length > 120)) errors[`itinerary.${i}.attractions`] = 'Each attraction must be 120 characters or fewer.';
  });

  tooLong('pack_title', values.pack_title, 150, 'the heading');
  tooLong('pack_text', values.pack_text, 5000, 'the text');

  // Districts
  const known = new Set(districtNames);
  if (values.districts.some((d) => !known.has(d))) errors.districts = 'Choose districts from the list.';

  // Inclusions / exclusions
  tooLong('extras_title', values.extras_title, 100, 'the heading');
  for (const key of ['inclusions', 'exclusions', 'extras'] as const) {
    values[key].forEach((item, i) => tooLong(`${key}.${i}`, item, 250, 'each item'));
    if (values[key].filter(Boolean).length > 50) errors[key] = 'Up to 50 items are allowed.';
  }
  tooLong('inclusions_note', values.inclusions_note, 400, 'the note');

  // FAQs
  const faqs = values.faqs.filter((f) => f.question || f.answer);
  if (faqs.length > 30) errors.faqs = 'Up to 30 questions are allowed.';
  values.faqs.forEach((f, i) => {
    if (!f.question && !f.answer) return;
    if (!f.question) errors[`faqs.${i}.question`] = 'Enter the question.';
    else tooLong(`faqs.${i}.question`, f.question, 250, 'the question');
    if (!f.answer) errors[`faqs.${i}.answer`] = 'Enter the answer.';
    else tooLong(`faqs.${i}.answer`, f.answer, 2000, 'the answer');
  });

  tooLong('cost_title', values.cost_title, 100, 'the heading');
  tooLong('cost_text', values.cost_text, 3000, 'the text');

  // SEO
  tooLong('seo_title', values.seo_title, 60, 'the SEO title');
  tooLong('seo_description', values.seo_description, 160, 'the meta description');

  // Publishing
  if (values.status !== 'draft' && values.status !== 'published') errors.status = 'Choose Draft or Published.';

  if (Object.keys(errors).length > 0) return { values, errors };

  return {
    values,
    errors,
    input: {
      title: values.title,
      slug,
      category: values.category,
      duration_days: days,
      summary: values.summary,
      cover_image_url: values.cover_image_url,
      cover_image_alt: values.cover_image_alt,
      hero_position: values.hero_position || 'center',
      card_position: values.card_position,
      max_altitude: values.max_altitude,
      has_page: values.has_page,
      overview_title: values.overview_title,
      overview: values.overview,
      highlights: values.highlights.filter(Boolean),
      facts,
      facts_note: values.facts_note,
      pack_title: values.pack_title,
      pack_text: values.pack_text,
      inclusions: values.inclusions.filter(Boolean),
      exclusions: values.exclusions.filter(Boolean),
      extras_title: values.extras_title,
      extras: values.extras.filter(Boolean),
      inclusions_note: values.inclusions_note,
      faqs: faqs.map((f) => ({ question: f.question, answer: f.answer })),
      districts: districtNames.filter((d) => values.districts.includes(d)),
      cost_title: values.cost_title || 'Package Cost',
      cost_text: values.cost_text,
      status: values.status as 'draft' | 'published',
      sort_order: sortOrder,
      seo_title: values.seo_title,
      seo_description: values.seo_description,
      itinerary,
    },
  };
}
