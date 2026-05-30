-- 뮤직비디오 제작 시스템 (Music Video Creator)
USE ai_proposal;

-- ─────────────────────────────────────────
-- 뮤직비디오 프로젝트
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mv_projects (
  id                   INT AUTO_INCREMENT PRIMARY KEY,
  title                VARCHAR(200) NOT NULL,

  -- 음악 파일
  music_url            VARCHAR(500),
  music_path           VARCHAR(500),
  music_duration       FLOAT DEFAULT 0,       -- 초 단위

  -- 캐릭터 시트
  character_sheet_url  VARCHAR(500),
  character_sheet_path VARCHAR(500),

  -- 스타일 설정 (모든 장면 공통)
  global_style         TEXT,
  character_desc       VARCHAR(500),

  -- 가사 (Whisper 추출 → 관리자 수정)
  lyrics_raw           TEXT,                  -- Whisper 원본
  lyrics_edited        TEXT,                  -- 관리자 수정본

  -- AI 모델
  image_model          VARCHAR(200) DEFAULT 'fal-ai/flux-pro/kontext',
  video_model          VARCHAR(200) DEFAULT 'fal-ai/kling-video/v1.6/pro',

  -- 진행 단계
  step  ENUM(
    'upload',          -- 1단계: 파일 업로드
    'transcribing',    -- 가사 추출 중
    'lyrics_review',   -- 2단계: 가사 확인/수정
    'breaking_down',   -- 장면 분리 중
    'scene_review',    -- 3단계: 장면 확인/수정
    'generating_images',-- 이미지 생성 중
    'image_review',    -- 4단계: 이미지 검토
    'generating_videos',-- 영상 생성 중
    'merging',         -- 최종 합치기 중
    'done',            -- 5단계: 완료
    'failed'
  ) DEFAULT 'upload',

  final_video_url      VARCHAR(500),
  final_video_path     VARCHAR(500),

  created_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ─────────────────────────────────────────
-- 뮤직비디오 장면
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mv_scenes (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  project_id     INT NOT NULL,
  scene_order    INT NOT NULL,

  time_start     FLOAT NOT NULL,   -- 시작 시간 (초)
  time_end       FLOAT NOT NULL,   -- 끝 시간 (초)

  theme          VARCHAR(200),     -- 장면 테마 (예: 첫만남)
  emotion        VARCHAR(100),     -- 감정 (예: 설렘)
  lyrics_segment TEXT,             -- 해당 구간 가사

  status         ENUM('pending','generating','done','failed') DEFAULT 'pending',

  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (project_id) REFERENCES mv_projects(id) ON DELETE CASCADE,
  UNIQUE KEY uq_project_scene (project_id, scene_order)
);

-- ─────────────────────────────────────────
-- 뮤직비디오 이미지 (장면당 2~3장)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mv_images (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  project_id      INT NOT NULL,
  scene_id        INT NOT NULL,
  image_order     INT NOT NULL,   -- 장면 내 순서

  -- Claude가 생성한 이미지 프롬프트
  prompt          TEXT,

  -- 이미지 생성 결과
  image_url       VARCHAR(500),
  image_path      VARCHAR(500),
  image_status    ENUM('pending','generating','done','failed') DEFAULT 'pending',
  image_error     TEXT,

  -- 영상 변환 결과 (Kling)
  video_url       VARCHAR(500),
  video_path      VARCHAR(500),
  video_status    ENUM('pending','generating','done','failed') DEFAULT 'pending',
  video_error     TEXT,
  video_duration  FLOAT DEFAULT 5,

  fal_request_id  VARCHAR(200),

  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (project_id) REFERENCES mv_projects(id) ON DELETE CASCADE,
  FOREIGN KEY (scene_id)   REFERENCES mv_scenes(id)   ON DELETE CASCADE
);

-- ─────────────────────────────────────────
-- 캐릭터 시트 (다중 캐릭터 지원)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mv_character_sheets (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  project_id  INT NOT NULL,
  name        VARCHAR(100) NOT NULL DEFAULT '캐릭터',
  sheet_url   VARCHAR(500),
  sheet_path  VARCHAR(500),
  char_order  INT DEFAULT 0,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES mv_projects(id) ON DELETE CASCADE
);
