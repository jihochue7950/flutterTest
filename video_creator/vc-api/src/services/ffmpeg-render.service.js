'use strict';

const path       = require('path');
const fs         = require('fs');
const ffmpeg     = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');

// ffmpeg-static 바이너리 경로 지정
if (ffmpegPath) ffmpeg.setFfmpegPath(ffmpegPath);
else if (process.env.FFMPEG_PATH) ffmpeg.setFfmpegPath(process.env.FFMPEG_PATH);

const RENDERED_DIR = () => {
  const dir = path.join(process.env.UPLOAD_BASE_PATH || path.join(__dirname, '../../uploads'), 'rendered');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
};

/**
 * Scene JSON + 사진 + 음악 → MP4 렌더링 (ffmpeg 기반)
 *
 * @param {{ projectId, sceneJson, photos, music, onProgress }} params
 * @returns {Promise<string>} 출력 파일 경로
 */
async function render({ projectId, sceneJson, photos, music, onProgress }) {
  const outputFilename = `project_${projectId}_${Date.now()}.mp4`;
  const outputPath     = path.join(RENDERED_DIR(), outputFilename);

  const allPhotos = photos.sort((a, b) => a.sort_order - b.sort_order);
  if (allPhotos.length === 0) throw new Error('렌더링할 사진이 없습니다.');

  // 음악 URL → 로컬 경로 변환
  const musicLocalPath = music ? _resolveLocalPath(music.custom_url || music.library_url) : null;
  const totalDuration  = sceneJson.totalDuration || allPhotos.length * 5;

  await onProgress?.(5);

  return new Promise((resolve, reject) => {
    const cmd = ffmpeg();

    // 입력 1: 사진 슬라이드 (각 사진 duration 계산)
    const secondsPerPhoto = Math.max(3, Math.floor(totalDuration / allPhotos.length));

    allPhotos.forEach((photo) => {
      const localPath = _resolveLocalPath(photo.file_url);
      if (fs.existsSync(localPath)) {
        cmd.input(localPath)
           .inputOptions([`-loop 1`, `-t ${secondsPerPhoto}`]);
      }
    });

    // 입력 2: 음악 (있을 때만)
    if (musicLocalPath && fs.existsSync(musicLocalPath)) {
      cmd.input(musicLocalPath);
    }

    // 필터 그래프 구성
    const filterParts  = [];
    const concatInputs = [];

    allPhotos.forEach((photo, i) => {
      const localPath = _resolveLocalPath(photo.file_url);
      if (!fs.existsSync(localPath)) return;

      // 사진 → 1920×1080 스케일 + 패딩 + slow_zoom 효과
      const sceneInfo = sceneJson.scenes?.find(s => s.photos?.some(p => p.id === photo.id));
      const effect    = sceneInfo?.effect || 'slow_zoom';
      const zoompan   = _buildZoompanFilter(effect, secondsPerPhoto);

      filterParts.push(
        `[${i}:v]scale=1920:1080:force_original_aspect_ratio=decrease,` +
        `pad=1920:1080:(ow-iw)/2:(oh-ih)/2:black,` +
        `${zoompan}` +
        `setsar=1[v${i}]`
      );
      concatInputs.push(`[v${i}]`);
    });

    // 이미지들 concat
    const validCount = concatInputs.length;
    if (validCount === 0) return reject(new Error('유효한 사진이 없습니다.'));

    filterParts.push(
      `${concatInputs.join('')}concat=n=${validCount}:v=1:a=0[vout]`
    );

    const hasMusicInput = musicLocalPath && fs.existsSync(musicLocalPath);
    const inputCount    = validCount + (hasMusicInput ? 1 : 0);

    cmd.complexFilter(filterParts.join('; '));

    // 비디오 출력 매핑
    cmd.outputOptions([
      '-map [vout]',
      hasMusicInput ? `-map ${validCount}:a?` : '',
      '-c:v libx264',
      '-preset fast',
      '-crf 23',
      '-pix_fmt yuv420p',
      hasMusicInput ? '-c:a aac -b:a 128k' : '-an',
      `-t ${totalDuration}`,
      '-movflags +faststart',
    ].filter(Boolean));

    cmd
      .output(outputPath)
      .on('start', () => {
        console.log('[ffmpeg] 렌더링 시작');
        onProgress?.(10);
      })
      .on('progress', (p) => {
        const pct = Math.min(90, Math.round(10 + (p.percent || 0) * 0.8));
        onProgress?.(pct);
      })
      .on('end', () => {
        console.log('[ffmpeg] 렌더링 완료:', outputPath);
        onProgress?.(100);
        resolve(outputPath);
      })
      .on('error', (e) => {
        console.error('[ffmpeg] 오류:', e.message);
        reject(new Error(`ffmpeg 렌더링 실패: ${e.message}`));
      })
      .run();
  });
}

function _buildZoompanFilter(effect, durationSec) {
  const fps    = 24;
  const frames = durationSec * fps;
  const maxZoom = 1.15;

  switch (effect) {
    case 'slow_zoom':
      return `zoompan=z='min(zoom+0.0015,${maxZoom})':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:fps=${fps},`;
    case 'slow_zoom_out':
      return `zoompan=z='if(lte(zoom,1.0),${maxZoom},max(1.001,zoom-0.0015))':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:fps=${fps},`;
    case 'pan_left':
      return `zoompan=z='${maxZoom}':x='iw/2-(iw/zoom/2)+t*${Math.round(1920 * 0.15 / durationSec)}':y='ih/2-(ih/zoom/2)':d=${frames}:fps=${fps},`;
    case 'pan_right':
      return `zoompan=z='${maxZoom}':x='iw/2-(iw/zoom/2)-t*${Math.round(1920 * 0.15 / durationSec)}':y='ih/2-(ih/zoom/2)':d=${frames}:fps=${fps},`;
    default:
      return `zoompan=z='1.0':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:fps=${fps},`;
  }
}

// file_url (http://...) → 로컬 절대 경로 변환
function _resolveLocalPath(url) {
  if (!url) return '';
  if (url.startsWith('/')) return url;
  const base    = process.env.SERVER_BASE_URL || 'http://localhost:5000';
  const relPath = url.replace(base, '');
  const uploadBase = process.env.UPLOAD_BASE_PATH || path.join(__dirname, '../../uploads');
  return path.join(uploadBase, relPath.replace(/^\/(uploads\/)?/, ''));
}

module.exports = { render };
