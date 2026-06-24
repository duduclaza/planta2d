ALTER TABLE users ADD COLUMN free_png_export INTEGER NOT NULL DEFAULT 0;

UPDATE users SET free_png_export = 1 WHERE email = 'du.claza@gmail.com';
