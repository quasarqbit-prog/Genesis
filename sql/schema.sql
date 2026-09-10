-- Genesis MariaDB schema (auth v2)
CREATE DATABASE IF NOT EXISTS genesis
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE genesis;

CREATE TABLE IF NOT EXISTS users (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  telegram VARCHAR(64) NOT NULL,
  mc_nick VARCHAR(16) NOT NULL,
  account_type ENUM('pirate', 'licensed') NOT NULL DEFAULT 'pirate',
  role ENUM('user', 'admin') NOT NULL DEFAULT 'user',
  telegram_id BIGINT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_telegram (telegram),
  UNIQUE KEY uq_users_mc_nick (mc_nick),
  UNIQUE KEY uq_users_telegram_id (telegram_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS profiles (
  user_id INT UNSIGNED NOT NULL,
  mc_nick VARCHAR(16) NULL,
  race_name VARCHAR(64) NULL,
  registered TINYINT(1) NOT NULL DEFAULT 0,
  form_json JSON NULL,
  avatar_path VARCHAR(512) NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id),
  CONSTRAINT fk_profiles_user
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS game_stats (
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
