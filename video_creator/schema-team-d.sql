-- Team D: AI 자동 영상 제작 시스템 DB 스키마
-- 기존 ai_proposal DB에 테이블 추가
USE ai_proposal;

-- ─────────────────────────────────────────────────
-- 영상 제작 프로젝트 (핵심 테이블)
-- ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS video_projects (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  order_id         INT NULL,
  user_code        VARCHAR(100) NULL,
  event_type       ENUM('proposal','birthday','anniversary','parents','teacher','other') NOT NULL DEFAULT 'proposal',
  style            ENUM('emotional','luxury','cinematic','bright','parents','proposal') NOT NULL DEFAULT 'emotional',
  title            VARCHAR(200),
  user_scenario    TEXT,
  ai_scenario      TEXT,
  scene_json       JSON,
  status           ENUM('draft','ai_generating','ai_done','render_queued','rendering','done','failed')
                   NOT NULL DEFAULT 'draft',
  total_duration   INT DEFAULT 0,
  output_video_url VARCHAR(500),
  preview_url      VARCHAR(500),
  render_price     INT DEFAULT 0,
  admin_memo       TEXT,
  created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL
);

-- ─────────────────────────────────────────────────
-- 프로젝트에 업로드된 사진
-- ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS project_photos (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  project_id        INT NOT NULL,
  original_filename VARCHAR(255),
  stored_filename   VARCHAR(255),
  file_url          VARCHAR(500),
  file_size         BIGINT DEFAULT 0,
  sort_order        INT DEFAULT 0,
  ai_sort_order     INT DEFAULT 0,
  scene_label       VARCHAR(100),
  emotion_tag       VARCHAR(50) DEFAULT 'warm',
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES video_projects(id) ON DELETE CASCADE
);

-- ─────────────────────────────────────────────────
-- 기본 제공 음악 라이브러리
-- ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS music_library (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  title        VARCHAR(200) NOT NULL,
  artist       VARCHAR(100) DEFAULT '제공',
  mood         ENUM('romantic','upbeat','emotional','classical','cheerful','cinematic') DEFAULT 'emotional',
  duration_sec INT DEFAULT 0,
  file_url     VARCHAR(500),
  is_active    TINYINT(1) DEFAULT 1,
  sort_order   INT DEFAULT 0,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ─────────────────────────────────────────────────
-- 프로젝트 음악 (선택 또는 직접 업로드)
-- ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS project_music (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  project_id       INT NOT NULL,
  music_library_id INT NULL,
  custom_filename  VARCHAR(255),
  custom_url       VARCHAR(500),
  FOREIGN KEY (project_id) REFERENCES video_projects(id) ON DELETE CASCADE,
  FOREIGN KEY (music_library_id) REFERENCES music_library(id) ON DELETE SET NULL
);

-- ─────────────────────────────────────────────────
-- 렌더링 작업 큐 및 상태
-- ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS render_jobs (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  project_id     INT NOT NULL,
  status         ENUM('queued','processing','done','failed') DEFAULT 'queued',
  progress       INT DEFAULT 0,
  started_at     TIMESTAMP NULL,
  completed_at   TIMESTAMP NULL,
  error_message  TEXT,
  output_path    VARCHAR(500),
  triggered_by   VARCHAR(50) DEFAULT 'admin',
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES video_projects(id) ON DELETE CASCADE
);

-- 기본 음악 샘플 데이터 (URL은 실제 파일 경로로 교체 필요)
INSERT INTO music_library (title, artist, mood, duration_sec, file_url, sort_order) VALUES
('감동적인 피아노', '기본 제공', 'emotional', 180, '/music-library/emotional_piano.mp3', 1),
('로맨틱 어쿠스틱', '기본 제공', 'romantic', 200, '/music-library/romantic_acoustic.mp3', 2),
('따뜻한 봄날', '기본 제공', 'cheerful', 160, '/music-library/warm_spring.mp3', 3),
('영화 같은 오케스트라', '기본 제공', 'cinematic', 240, '/music-library/cinematic_orchestra.mp3', 4),
('클래식 왈츠', '기본 제공', 'classical', 190, '/music-library/classic_waltz.mp3', 5),
('밝고 경쾌한 BGM', '기본 제공', 'upbeat', 150, '/music-library/bright_bgm.mp3', 6)
ON DUPLICATE KEY UPDATE title = title;
