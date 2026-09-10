-- Миграция с старой схемы users(username) на telegram + mc_nick
-- Выполнить на VPS: mysql -u genesis -p genesis < sql/migrate_auth_v2.sql

USE genesis;

-- Если таблица ещё старая — пересоздать users (ВНИМАНИЕ: удалит старых пользователей)
DROP TABLE IF EXISTS game_stats;
DROP TABLE IF EXISTS profiles;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  telegram VARCHAR(64) NOT NULL,
  mc_nick VARCHAR(16) NOT NULL,
  account_type ENUM('pirate', 'licensed') NOT NULL DEFAULT 'pirate',
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_telegram (telegram),
  UNIQUE KEY uq_users_mc_nick (mc_nick)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE profiles (
  user_id INT UNSIGNED NOT NULL,
  mc_nick VARCHAR(16) NULL,
  race_name VARCHAR(64) NULL,
  registered TINYINT(1) NOT NULL DEFAULT 0,
  form_json JSON NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id),
  CONSTRAINT fk_profiles_user
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE game_stats (
  user_id INT UNSIGNED NOT NULL,
  score INT NOT NULL DEFAULT 0,
  inventory_json JSON NULL,
  meta_json JSON NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id),
  CONSTRAINT fk_game_stats_user
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
