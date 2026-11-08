// Parsing and server-side validation for the admin tour-category form. Mirrors tour-form.ts.
import { isCategorySlugTaken, type TourCategory, type TourCategoryInput } from './categories-db';
import { IMAGE_ERROR, isImageUrl, isPosition, slugify, str, type FormErrors } from './tour-form';

export interface CategoryFormValues {
  label: string;
  slug: string;
  heading: string;
  lede: string;
  description: string;
  hero_image: string;
  hero_position: string;
  cta_image: string;
  cta_text: string;
  related_lede: string;
  enquire_noun: string;
  sort_order: string;
}

export const emptyCategoryValues = (): CategoryFormValues => ({
  label: '',
  slug: '',
  heading: '',
  lede: '',
  description: '',
  hero_image: '',
  hero_position: 'center 40%',
  cta_image: '',
  cta_text: '',
  related_lede: '',
  enquire_noun: 'Tour',
  sort_order: '50',
});

export const valuesFromCategory = (c: TourCategory): CategoryFormValues => ({
  label: c.label,
  slug: c.slug,
  heading: c.heading,
  lede: c.lede,
  description: c.description,
  hero_image: c.hero_image,
  hero_position: c.hero_position,
  cta_image: c.cta_image,
  cta_text: c.cta_text,
  related_lede: c.related_lede,
  enquire_noun: c.enquire_noun,
  sort_order: String(c.sort_order),
});

/** Slugs that are already pages or folders on the site and so cannot be used. */
const RESERVED = new Set(['category', 'admin', 'new']);

export async function parseCategoryForm(
  form: FormData,
  categoryId?: number,
): Promise<{ values: CategoryFormValues; errors: FormErrors; input?: TourCategoryInput }> {
  const values: CategoryFormValues = {
    label: str(form, 'label'),
    slug: str(form, 'slug'),
    heading: str(form, 'heading'),
    lede: str(form, 'lede'),
    description: str(form, 'description'),
    hero_image: str(form, 'hero_image'),
    hero_position: str(form, 'hero_position'),
    cta_image: str(form, 'cta_image'),
    cta_text: str(form, 'cta_text'),
    related_lede: str(form, 'related_lede'),
    enquire_noun: str(form, 'enquire_noun'),
    sort_order: str(form, 'sort_order'),
  };
  const errors: FormErrors = {};
  const max = (key: keyof CategoryFormValues, n: number, what: string) => {
    if (values[key].length > n) errors[key] = `Keep ${what} to ${n} characters or fewer.`;
  };

  if (!values.label) errors.label = 'Enter a name, e.g. "Wellness Tours".';
  else max('label', 60, 'the name');

  const slug = values.slug || slugify(values.label);
  values.slug = slug;
  if (!slug) errors.slug = 'Enter a slug (letters, numbers and hyphens).';
  else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) errors.slug = 'Use lowercase letters, numbers and single hyphens only.';
  else if (slug.length > 60) errors.slug = 'Keep the slug to 60 characters or fewer.';
  else if (RESERVED.has(slug)) errors.slug = 'That slug is reserved. Choose another.';
  else if (await isCategorySlugTaken(slug, categoryId)) errors.slug = 'Another category already uses this slug.';

  if (!values.heading) values.heading = values.label ? `${values.label.replace(/ Tours?$/i, '')} Itineraries` : '';
  max('heading', 100, 'the heading');
  max('lede', 600, 'the introduction');
  max('description', 160, 'the meta description');
  max('cta_text', 300, 'the call-to-action text');
  max('related_lede', 200, 'the related-tours line');

  for (const key of ['hero_image', 'cta_image'] as const) {
    if (!values[key]) errors[key] = 'Choose an image.';
    else if (!isImageUrl(values[key])) errors[key] = IMAGE_ERROR;
  }
  if (!isPosition(values.hero_position)) errors.hero_position = 'Use something like "center 40%".';
  if (values.enquire_noun !== 'Tour' && values.enquire_noun !== 'Trek') errors.enquire_noun = 'Choose Tour or Trek.';

  const sort = Number(values.sort_order || '0');
  if (!Number.isInteger(sort) || sort < 0 || sort > 9999) errors.sort_order = 'Enter a whole number from 0 to 9999.';

  if (Object.keys(errors).length > 0) return { values, errors };
  return {
    values,
    errors,
    input: {
      slug,
      label: values.label,
      heading: values.heading,
      lede: values.lede,
      description: values.description,
      hero_image: values.hero_image,
      hero_position: values.hero_position || 'center',
      cta_image: values.cta_image,
      cta_text: values.cta_text,
      related_lede: values.related_lede,
      enquire_noun: values.enquire_noun,
      sort_order: sort,
    },
  };
}
