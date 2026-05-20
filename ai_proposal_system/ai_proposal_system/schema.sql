-- AI Proposal System Database Schema
CREATE DATABASE IF NOT EXISTS ai_proposal CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE ai_proposal;

CREATE TABLE IF NOT EXISTS admins (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_code VARCHAR(100) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  email VARCHAR(150),
  memo TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- user_code를 FK로 사용 (user 삭제/변경 시 CASCADE 처리)
CREATE TABLE IF NOT EXISTS user_videos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_code VARCHAR(100) NOT NULL,
  original_filename VARCHAR(255) NOT NULL,
  stored_filename VARCHAR(255) NOT NULL,
  video_path VARCHAR(500) NOT NULL,
  video_url VARCHAR(500) NOT NULL,
  mime_type VARCHAR(100),
  file_size BIGINT,
  is_active TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_code) REFERENCES users(user_code) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS ai_questions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_code VARCHAR(100) NOT NULL,
  question_type ENUM('intro','needs','budget','concern','closing','custom') DEFAULT 'custom',
  question_text TEXT NOT NULL,
  sort_order INT DEFAULT 0,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_code) REFERENCES users(user_code) ON DELETE CASCADE ON UPDATE CASCADE
);

-- Default admin account (password: admin1234 → bcrypt hash 직접 생성 필요)
-- node -e "const bcrypt=require('bcrypt'); bcrypt.hash('admin1234',10).then(h=>console.log(h))"
INSERT INTO admins (username, password, name)
VALUES ('admin', '$2b$10$PLACEHOLDER_REPLACE_WITH_REAL_HASH', '관리자')
ON DUPLICATE KEY UPDATE username = username;
