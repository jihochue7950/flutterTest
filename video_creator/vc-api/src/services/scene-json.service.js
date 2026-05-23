'use strict';

const path = require('path');

/**
 * 사진 목록 + 시나리오 → Scene JSON 생성
 * AI 분류 결과(scene_label)가 있으면 활용, 없으면 균등 배분
 */
async function generateSceneJson({ project, photos, ai_scenario }) {
  const SEC_PER_PHOTO = 5;         // 사진 1장 기본 표시 시간
  const TRANSITION_SEC = 1;        // 전환 효과 시간
  const BASE_DURATION  = 30;       // 장면 최소 길이(초)

  // 사진을 장면별로 그룹핑
  const scenes = _groupPhotosIntoScenes(photos, project.event_type);

  // Scene JSON 구성
  const sceneJson = {
    eventType:     project.event_type,
    style:         project.style,
    title:         project.title || '특별한 영상',
    totalDuration: scenes.reduce((acc, s) => acc + s.duration, 0),
    musicUrl:      null, // render.service에서 주입
    scenes:        scenes,
    createdAt:     new Date().toISOString(),
  };

  return sceneJson;
}

function _groupPhotosIntoScenes(photos, eventType) {
  const SCENE_LABELS = _getSceneLabels(eventType);
  const photosPerScene = Math.max(1, Math.floor(photos.length / SCENE_LABELS.length));

  return SCENE_LABELS.map((label, idx) => {
    const start    = idx * photosPerScene;
    const end      = idx === SCENE_LABELS.length - 1 ? photos.length : start + photosPerScene;
    const chunk    = photos.slice(start, end);
    const duration = Math.max(10, chunk.length * 5);

    return {
      sceneId:    idx + 1,
      title:      label.title,
      subtitle:   label.subtitle,
      duration,
      emotion:    label.emotion,
      transition: idx === 0 ? 'fade_in' : 'crossfade',
      effect:     _getEffect(idx, SCENE_LABELS.length),
      photos:     chunk.map(p => ({
        id:            p.id,
        filename:      p.stored_filename,
        file_url:      p.file_url,
        scene_label:   p.scene_label || label.title,
        emotion_tag:   p.emotion_tag || label.emotion,
      })),
    };
  }).filter(s => s.photos.length > 0);
}

function _getEffect(idx, total) {
  const effects = ['slow_zoom', 'slow_zoom_out', 'pan_left', 'pan_right', 'fade'];
  // 마지막 장면은 항상 fade
  if (idx === total - 1) return 'fade';
  return effects[idx % (effects.length - 1)];
}

function _getSceneLabels(eventType) {
  const labels = {
    proposal: [
      { title: '처음 만난 날',   subtitle: '그날의 설렘이 아직도 생생해.',       emotion: 'nostalgic' },
      { title: '우리의 추억',    subtitle: '함께했던 모든 순간이 소중해.',         emotion: 'warm' },
      { title: '행복했던 날들', subtitle: '네 옆에 있는 것만으로도 행복했어.',   emotion: 'happy' },
      { title: '고마운 너',      subtitle: '언제나 내 편이 되어줘서 고마워.',       emotion: 'grateful' },
      { title: '영원히 함께',    subtitle: '앞으로도 함께해줄 수 있어?',           emotion: 'romantic' },
    ],
    birthday: [
      { title: '특별한 하루',    subtitle: '오늘은 당신의 빛나는 날!',              emotion: 'cheerful' },
      { title: '소중한 추억',    subtitle: '함께한 시간들이 모두 선물이었어.',       emotion: 'warm' },
      { title: '감사한 마음',    subtitle: '당신이 있어 우리가 더 행복해.',          emotion: 'grateful' },
      { title: '행복한 생일',    subtitle: '오늘 하루도 빛나게 빛나길!',            emotion: 'happy' },
    ],
    anniversary: [
      { title: '처음 그날',      subtitle: '시작은 그 순간으로 거슬러 올라가.',    emotion: 'nostalgic' },
      { title: '함께한 시간',    subtitle: '매 순간이 소중한 기억이야.',            emotion: 'warm' },
      { title: '감사와 사랑',    subtitle: '곁에 있어줘서 진심으로 고마워.',        emotion: 'grateful' },
      { title: '앞으로도',       subtitle: '앞으로도 함께하는 우리이길.',           emotion: 'hopeful' },
    ],
    parents: [
      { title: '그때 그 시절',   subtitle: '부모님 덕분에 이렇게 자랐습니다.',    emotion: 'nostalgic' },
      { title: '항상 곁에',      subtitle: '언제나 든든한 버팀목이 되어주셨죠.',  emotion: 'grateful' },
      { title: '사랑합니다',     subtitle: '말로 다 못했던 감사함을 전합니다.',  emotion: 'warm' },
      { title: '건강하세요',     subtitle: '앞으로도 건강하고 행복하게 지내세요.', emotion: 'hopeful' },
    ],
    teacher: [
      { title: '선생님과의 인연', subtitle: '가르침이 제 인생을 바꿨습니다.',     emotion: 'grateful' },
      { title: '소중한 기억',    subtitle: '선생님과 함께한 시간들.',             emotion: 'nostalgic' },
      { title: '감사드립니다',   subtitle: '선생님의 사랑에 감사드립니다.',       emotion: 'warm' },
    ],
    other: [
      { title: '특별한 순간',    subtitle: '이 순간을 영원히 기억할게.',           emotion: 'warm' },
      { title: '소중한 사람',    subtitle: '당신이 있어 더 빛나는 하루.',          emotion: 'happy' },
      { title: '고마운 마음',    subtitle: '마음을 담아 전합니다.',               emotion: 'grateful' },
    ],
  };
  return labels[eventType] || labels.other;
}

module.exports = { generateSceneJson };
