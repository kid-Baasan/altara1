// Parsing and server-side validation for the admin journal-post form. Mirrors tour-form.ts.
import { isPostSlugTaken, type Post, type PostInput } from './db';
import { IMAGE_ERROR, isImageUrl, isPosition, slugify, str, type FormErrors } from './tour-form';

export interface PostFormValues {
  title: string;
  slug: string;
  published_on: string;
  author: string;
  cover_image_url: string;
  cover_image_alt: string;
  hero_position: string;
  body_html: string;
  seo_description: string;
  status: string;
}

export const emptyPostValues = (): PostFormValues => ({
  title: '',
  slug: '',
  published_on: new Date().toISOString().slice(0, 10),
  author: '',
  cover_image_url: '',
  cover_image_alt: '',
  hero_position: 'center',
  body_html: '',
  seo_description: '',
  status: 'draft',
});

export const valuesFromPost = (p: Post): PostFormValues => ({
  title: p.title,
  slug: p.slug,
  published_on: p.published_on,
  author: p.author,
  cover_image_url: p.cover_image_url,
  cover_image_alt: p.cover_image_alt,
  hero_position: p.hero_position,
  body_html: p.body_html,
  seo_description: p.seo_description,
  status: p.status,
});

const validDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(`${value}T00:00:00Z`).getTime());

export async function parsePostForm(
  form: FormData,
  postId?: number,
): Promise<{ values: PostFormValues; errors: FormErrors; input?: PostInput }> {
  const values: PostFormValues = {
    title: str(form, 'title'),
    slug: str(form, 'slug'),
    published_on: str(form, 'published_on'),
    author: str(form, 'author'),
    cover_image_url: str(form, 'cover_image_url'),
    cover_image_alt: str(form, 'cover_image_alt'),
    hero_position: str(form, 'hero_position'),
    body_html: typeof form.get('body_html') === 'string' ? (form.get('body_html') as string).trim() : '',
    seo_description: str(form, 'seo_description'),
    status: str(form, 'status'),
  };

  const errors: FormErrors = {};

  if (!values.title) errors.title = 'Enter a title.';
  else if (values.title.length > 200) errors.title = 'Keep the title to 200 characters or fewer.';

  const slug = values.slug || slugify(values.title);
  values.slug = slug;
  if (!slug) errors.slug = 'Enter a slug (letters, numbers and hyphens).';
  else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) errors.slug = 'Use lowercase letters, numbers and single hyphens only.';
  else if (slug.length > 120) errors.slug = 'Keep the slug to 120 characters or fewer.';
  else if (await isPostSlugTaken(slug, postId)) errors.slug = 'Another post already uses this slug.';

  if (!validDate(values.published_on)) errors.published_on = 'Enter a valid date.';
  if (values.author.length > 100) errors.author = 'Keep the author to 100 characters or fewer.';

  if (!values.cover_image_url) errors.cover_image_url = 'Choose a cover image.';
  else if (!isImageUrl(values.cover_image_url)) errors.cover_image_url = IMAGE_ERROR;
  if (values.cover_image_alt.length > 200) errors.cover_image_alt = 'Keep the alt text to 200 characters or fewer.';
  if (!isPosition(values.hero_position)) errors.hero_position = 'Use something like "center" or "center 40%".';

  if (values.body_html.length > 100_000) errors.body_html = 'Keep the article to 100,000 characters or fewer.';
  if (values.seo_description.length > 160) errors.seo_description = 'Keep the meta description to 160 characters or fewer.';

  if (values.status !== 'draft' && values.status !== 'published') errors.status = 'Choose Draft or Published.';

  if (Object.keys(errors).length > 0) return { values, errors };

  return {
    values,
    errors,
    input: {
      title: values.title,
      slug,
      published_on: values.published_on,
      author: values.author,
      cover_image_url: values.cover_image_url,
      cover_image_alt: values.cover_image_alt,
      hero_position: values.hero_position || 'center',
      body_html: values.body_html,
      status: values.status as 'draft' | 'published',
      seo_description: values.seo_description,
    },
  };
}
