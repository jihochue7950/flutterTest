-- AI Proposal System Database Schema
CREATE DATABASE IF NOT EXISTS ai_proposal CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE ai_proposal;

-- ─────────────────────────────────────────
-- 관리자 계정
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admins (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ─────────────────────────────────────────
-- 기존: 세션 사용자 (Team B 연동용, 유지)
-- ─────────────────────────────────────────
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
  answer_type ENUM('open','closed') DEFAULT 'open',
  expected_answer TEXT NULL,
  sort_order INT DEFAULT 0,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_code) REFERENCES users(user_code) ON DELETE CASCADE ON UPDATE CASCADE
);

-- ─────────────────────────────────────────
-- 신규: 판매 상품 (홈페이지 쇼핑몰)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  category VARCHAR(50) DEFAULT 'proposal',
  tagline VARCHAR(300),
  description TEXT,
  features_json TEXT,          -- JSON 배열: ["기능1","기능2",...]
  mood_options_json TEXT,      -- JSON 배열: ["로맨틱","감동적",...]
  price INT NOT NULL DEFAULT 0,
  price_label VARCHAR(100),    -- 표시용: "99,000원"
  production_days INT DEFAULT 3,
  thumbnail_url VARCHAR(500),
  detail_images_json TEXT,     -- JSON 배열: [url, url, ...]
  sample_scenario TEXT,        -- 샘플 시나리오 텍스트
  target_audience TEXT,        -- 추천 대상 설명
  how_it_works TEXT,           -- 진행 방식 설명
  is_active TINYINT(1) DEFAULT 1,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ─────────────────────────────────────────
-- 신규: 주문
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_number VARCHAR(30) NOT NULL UNIQUE,   -- ORDER-20260522-0001
  product_id INT NOT NULL,
  buyer_name VARCHAR(100) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(150) NOT NULL,
  target_name VARCHAR(100),                   -- 프로포즈 대상 이름
  proposal_date DATE,                         -- 원하는 프로포즈 날짜
  mood VARCHAR(200),                          -- 원하는 분위기
  story TEXT,                                 -- 넣고 싶은 추억/스토리
  upload_required TINYINT(1) DEFAULT 0,       -- 영상/사진 업로드 여부
  request_memo TEXT,                          -- 추가 요청사항
  payment_status ENUM(
    '결제대기','결제완료','결제실패','환불요청','환불완료'
  ) DEFAULT '결제대기',
  order_status ENUM(
    '접수','결제완료','상담중','제작중','세션준비','진행가능','완료','취소'
  ) DEFAULT '접수',
  access_code CHAR(8),                        -- 앱 인증코드 (8자리 랜덤)
  app_access_enabled TINYINT(1) DEFAULT 0,    -- 앱 사용 허용 여부 (관리자 수동 허용)
  user_code VARCHAR(100),                     -- 세션 활성화 시 연결되는 userCode
  admin_memo TEXT,                            -- 관리자 내부 메모
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
);

-- ─────────────────────────────────────────
-- 기본 상품 데이터 (MVP 6종)
-- ─────────────────────────────────────────
INSERT INTO products (name, slug, category, tagline, description, features_json, mood_options_json, price, price_label, production_days, target_audience, how_it_works, sample_scenario, sort_order) VALUES

('감동형 AI 프로포즈',
 'emotional-proposal',
 'proposal',
 'AI 아바타가 당신의 마음을 대신 전합니다',
 '3D AI 아바타가 상대방과 실시간으로 대화하며 감동적인 프로포즈 순간을 연출합니다. 개인화된 영상 메시지와 맞춤형 AI 질문으로 잊지 못할 특별한 순간을 만들어드립니다.',
 '["3D AI 아바타 실시간 대화","개인화 영상 메시지","SMS 초대 링크 발송","맞춤 AI 질문 5개","당일 진행 가이드 제공"]',
 '["로맨틱","감동적","따뜻한","설레는"]',
 99000, '99,000원', 3,
 '결혼을 앞두고 특별한 프로포즈를 원하는 분',
 '1. 영상 메시지 및 스토리 제출\n2. AI 아바타 개인화 설정\n3. 상대방에게 SMS 링크 발송\n4. 상대방이 링크 접속 후 AI 아바타와 대화\n5. 클라이막스에서 영상 메시지 재생',
 'AI: "안녕하세요, 저는 지호씨가 보낸 특별한 메신저예요. 지호씨가 수진씨에게 꼭 전하고 싶은 말이 있다고 했어요. 지호씨와 처음 만났던 날 기억하세요?"',
 1),

('영상 편지형 프로포즈',
 'video-letter-proposal',
 'proposal',
 '직접 찍은 영상과 AI가 함께 만드는 감동',
 '직접 촬영한 영상 편지를 AI 아바타가 감동적으로 전달합니다. 추억의 장면들과 진심 어린 메시지가 담긴 영상을 AI가 인터랙티브하게 연출합니다.',
 '["영상 편지 전문 편집","3D AI 아바타 영상 소개","개인화 추억 스토리 구성","SMS 초대 링크 발송","맞춤 AI 질문 3개","영상 인터랙티브 재생"]',
 '["감성적","추억가득","로맨틱","따뜻한"]',
 129000, '129,000원', 5,
 '함께한 추억을 영상으로 담아 전하고 싶은 분',
 '1. 추억 사진/영상 소재 제출\n2. 전문 편집팀의 영상 편지 제작\n3. AI 아바타 개인화 설정\n4. 상대방에게 SMS 링크 발송\n5. AI 아바타가 영상을 감동적으로 소개하며 재생',
 'AI: "수진씨, 지호씨가 두 분이 함께했던 소중한 순간들을 담아 보내주셨어요. 영상을 보시기 전에, 지호씨가 제게 꼭 전해달라고 한 말이 있어요..."',
 2),

('대화형 AI 프로포즈',
 'interactive-proposal',
 'proposal',
 'AI와 나누는 대화 속에서 펼쳐지는 프로포즈',
 'AI 아바타와의 자연스러운 대화 속에서 점점 깊어지는 이야기가 클라이막스에서 특별한 프로포즈로 이어집니다. 상대방이 직접 AI와 대화에 참여하는 몰입형 경험입니다.',
 '["3D AI 아바타 심층 대화","개인화 스토리 시나리오","감동 클라이막스 연출","SMS 초대 링크 발송","맞춤 AI 질문 10개","실시간 진행 모니터링"]',
 '["설레는","몰입형","로맨틱","스릴있는"]',
 149000, '149,000원', 5,
 '상대방이 직접 참여하는 인터랙티브한 경험을 원하는 분',
 '1. 상대방과의 추억 스토리 제출\n2. 대화 시나리오 10단계 맞춤 제작\n3. AI 아바타 대화 최적화 설정\n4. 상대방에게 SMS 링크 발송\n5. 10~15분간 AI와 대화 후 프로포즈 클라이막스',
 'AI: "지호씨가 수진씨에게 처음으로 커피를 사줬던 날, 기억하세요? 그날 지호씨는 사실... 많이 떨렸다고 했어요. 수진씨도 그날 설레셨나요?"',
 3),

('TV 프리미엄 프로포즈',
 'tv-premium-proposal',
 'proposal',
 'TV 대화면으로 펼치는 완벽한 시네마틱 프로포즈',
 'Chromecast TV 캐스팅으로 거실 대형 화면에 AI 아바타를 띄워 영화 같은 프로포즈를 연출합니다. 전문 연출가가 직접 스크립트를 작성하고 당일 원격으로 지원합니다.',
 '["3D AI 아바타 TV 대화면 캐스팅","전문 연출가 스크립트 작성","개인화 영상 메시지","SMS 초대 링크 발송","맞춤 AI 질문 10개","당일 원격 실시간 지원","Chromecast 설정 안내"]',
 '["시네마틱","웅장한","로맨틱","극적인"]',
 199000, '199,000원', 7,
 'TV 대화면으로 영화 같은 프로포즈를 원하는 분',
 '1. 상세 스토리 및 영상 소재 제출\n2. 전문 연출가 상담 및 스크립트 작성\n3. TV 캐스팅 설정 안내\n4. 리허설 진행\n5. 당일 원격 지원하에 TV 대화면 프로포즈',
 '거실 TV 화면 가득 AI 아바타가 등장하며: "수진씨, 오늘 특별한 분이 특별한 이야기를 전해달라고 저를 보내셨어요. 지금 이 순간이 얼마나 소중한지 아세요?"',
 4),

('생일 서프라이즈',
 'birthday-surprise',
 'birthday',
 'AI가 전하는 세상에서 하나뿐인 생일 축하',
 '소중한 사람의 생일을 AI 아바타와 함께 특별하게 만들어보세요. 개인화된 추억 이야기와 생일 영상으로 평생 잊지 못할 생일 이벤트를 진행합니다.',
 '["3D AI 아바타 실시간 대화","생일 맞춤 영상 메시지","SMS 초대 링크 발송","맞춤 AI 질문 5개","생일 테마 연출"]',
 '["따뜻한","감동적","유쾌한","설레는"]',
 79000, '79,000원', 2,
 '소중한 사람의 생일을 특별하게 만들고 싶은 분',
 '1. 생일 주인공과의 추억 스토리 제출\n2. AI 아바타 생일 테마 설정\n3. 생일 당일 SMS 링크 발송\n4. AI 아바타와 생일 대화 및 영상 재생',
 'AI: "생일 축하해요, 수진씨! 오늘 정말 특별한 분이 수진씨 생일을 축하하기 위해 저를 보내셨어요. 작년 생일에 무슨 일이 있었는지 기억하세요?"',
 5),

('기념일/가족 이벤트',
 'anniversary-family',
 'anniversary',
 '사랑하는 사람에게 전하는 AI 감사 이벤트',
 '연애/결혼 기념일, 부모님께 감사 인사, 친구 서프라이즈 등 다양한 특별한 날을 AI 아바타로 연출합니다.',
 '["3D AI 아바타 실시간 대화","맞춤 영상 메시지","SMS 초대 링크 발송","맞춤 AI 질문 5개","이벤트 테마 선택"]',
 '["따뜻한","감동적","감사한","사랑스러운"]',
 69000, '69,000원', 2,
 '기념일·감사 이벤트를 특별하게 연출하고 싶은 분',
 '1. 이벤트 종류 선택 (기념일/효도/친구 서프라이즈)\n2. 맞춤 스토리 및 영상 소재 제출\n3. AI 아바타 테마 설정\n4. 당일 SMS 링크 발송 및 이벤트 진행',
 'AI: "어머니, 오늘 민준씨가 특별히 저를 보내주셨어요. 평소에 말로 하기 어려웠던 이야기를 오늘 꼭 전하고 싶으셨대요..."',
 6)

ON DUPLICATE KEY UPDATE slug = slug;

-- ─────────────────────────────────────────
-- Migration: 기존 DB (ALTER은 무시됨)
-- ─────────────────────────────────────────
-- ALTER TABLE ai_questions ADD COLUMN answer_type ENUM('open','closed') DEFAULT 'open' AFTER question_text;
-- ALTER TABLE ai_questions ADD COLUMN expected_answer TEXT NULL AFTER answer_type;

-- ─────────────────────────────────────────
-- 기본 관리자 계정
-- node -e "const bcrypt=require('bcrypt'); bcrypt.hash('admin1234',10).then(h=>console.log(h))"
-- ─────────────────────────────────────────
INSERT INTO admins (username, password, name)
VALUES ('admin', '$2b$10$PLACEHOLDER_REPLACE_WITH_REAL_HASH', '관리자')
ON DUPLICATE KEY UPDATE username = username;
