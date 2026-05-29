-- Team D: AI 영상 제작 (fal.ai 기반) DB 스키마
-- 기존 ai_proposal DB에 추가
USE ai_proposal;

-- ─────────────────────────────────────────────────
-- AI 영상 제작 프로젝트
-- ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_video_projects (
  id                    INT AUTO_INCREMENT PRIMARY KEY,
  title                 VARCHAR(200) NOT NULL,
  description           TEXT,
  character_sheet_url   VARCHAR(500),
  character_sheet_path  VARCHAR(500),
  status                ENUM('draft','generating','done','failed') DEFAULT 'draft',
  total_scenes          INT DEFAULT 0,
  completed_scenes      INT DEFAULT 0,
  final_video_url       VARCHAR(500),
  final_video_path      VARCHAR(500),
  fal_model             VARCHAR(200) DEFAULT 'fal-ai/kling-video/v1/pro',
  created_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ─────────────────────────────────────────────────
-- AI 영상 장면
-- ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_video_scenes (
  id                    INT AUTO_INCREMENT PRIMARY KEY,
  project_id            INT NOT NULL,
  scene_order           INT NOT NULL,
  scenario              TEXT NOT NULL,
  duration_seconds      INT DEFAULT 5,
  clothing              VARCHAR(500),
  background            VARCHAR(500),
  direction             TEXT,

  -- 상속 처리 후 실제 사용된 값
  resolved_clothing     VARCHAR(500),
  resolved_background   VARCHAR(500),

  -- fal.ai에 전달한 최종 prompt
  prompt                TEXT,

  status                ENUM('pending','generating','done','failed') DEFAULT 'pending',
  video_url             VARCHAR(500),
  video_path            VARCHAR(500),
  last_frame_url        VARCHAR(500),
  last_frame_path       VARCHAR(500),
  fal_request_id        VARCHAR(200),
  error_message         TEXT,

  created_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (project_id) REFERENCES ai_video_projects(id) ON DELETE CASCADE,
  UNIQUE KEY uq_project_order (project_id, scene_order)
);
