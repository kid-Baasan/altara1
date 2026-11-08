-- Points image paths in existing database rows at the converted .webp / .svg files.
-- Idempotent. Skips admin uploads (/media/uploads/...), which keep their own file type.
UPDATE tours SET cover_image_url = REPLACE(REPLACE(REPLACE(REPLACE(cover_image_url,'.jpeg','.webp'),'.jpg','.webp'),'.JPG','.webp'),'.png','.webp') WHERE cover_image_url LIKE '%assets/images/%';
UPDATE posts SET cover_image_url = REPLACE(REPLACE(REPLACE(REPLACE(cover_image_url,'.jpeg','.webp'),'.jpg','.webp'),'.JPG','.webp'),'.png','.webp') WHERE cover_image_url LIKE '%assets/images/%';
UPDATE posts SET body_html = REPLACE(REPLACE(REPLACE(REPLACE(body_html,'.jpeg','.webp'),'.jpg','.webp'),'.JPG','.webp'),'.png','.webp') WHERE body_html LIKE '%assets/images/%' AND body_html NOT LIKE '%/media/uploads/%';
UPDATE tour_categories SET hero_image = REPLACE(REPLACE(REPLACE(REPLACE(hero_image,'.jpeg','.webp'),'.jpg','.webp'),'.JPG','.webp'),'.png','.webp') WHERE hero_image LIKE '%assets/images/%';
UPDATE tour_categories SET cta_image = REPLACE(REPLACE(REPLACE(REPLACE(cta_image,'.jpeg','.webp'),'.jpg','.webp'),'.JPG','.webp'),'.png','.webp') WHERE cta_image LIKE '%assets/images/%';
UPDATE gallery_images SET image_url = REPLACE(REPLACE(REPLACE(REPLACE(image_url,'.jpeg','.webp'),'.jpg','.webp'),'.JPG','.webp'),'.png','.webp') WHERE image_url LIKE '%assets/images/%';
