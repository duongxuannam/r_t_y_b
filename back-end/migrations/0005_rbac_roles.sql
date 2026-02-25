ALTER TABLE users
ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user';

ALTER TABLE users
ADD CONSTRAINT users_role_check CHECK (role IN ('user', 'admin'));
