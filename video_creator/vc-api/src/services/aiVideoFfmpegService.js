'use strict';

const path       = require('path');
const fs         = require('fs');
const os         = require('os');
const ffmpeg     = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');

if (ffmpegPath) ffmpeg.setFfmpegPath(ffmpegPath);

/**
 * 영상에서 마지막 프레임 추출 → PNG 저장
 * @param {string} videoPath  - 입력 영상 경로
 * @param {string} outputPath - 출력 PNG 경로 (없으면 자동 생성)
 * @returns {Promise<string>} 저장된 PNG 경로
 */
function extractLastFrame(videoPath, outputPath) {
  return new Promise((resolve, reject) => {
    if (!outputPath) {
      outputPath = videoPath.replace(/\.mp4$/i, '_last_frame.png');
    }

    // 영상 길이 먼저 조회
    ffmpeg.ffprobe(videoPath, (err, meta) => {
      if (err) return reject(new Error(`ffprobe 실패: ${err.message}`));
      const duration = meta.format.duration || 5;
      const seekTime = Math.max(0, duration - 0.1);

      ffmpeg(videoPath)
        .seekInput(seekTime)
        .frames(1)
        .output(outputPath)
        .on('end', () => resolve(outputPath))
        .on('error', (e) => reject(new Error(`마지막 프레임 추출 실패: ${e.message}`)))
        .run();
    });
  });
}

/**
 * 장면 영상들을 순서대로 concat → 최종 영상 생성
 * @param {string[]} videoPaths - 장면 영상 경로 배열 (순서대로)
 * @param {string}   outputPath - 출력 최종 영상 경로
 * @param {function} onProgress - 진행률 콜백 (0~100)
 * @returns {Promise<string>} 완성 영상 경로
 */
function concatScenes(videoPaths, outputPath, onProgress) {
  return new Promise((resolve, reject) => {
    const existing = videoPaths.filter(p => p && fs.existsSync(p));
    if (existing.length === 0) return reject(new Error('합칠 영상이 없습니다.'));

    // ffmpeg concat 필터 목록 파일 생성 (임시)
    const listFile = path.join(os.tmpdir(), `concat_list_${Date.now()}.txt`);
    const listContent = existing.map(p => `file '${p.replace(/'/g, "'\\''")}'`).join('\n');
    fs.writeFileSync(listFile, listContent);

    ffmpeg()
      .input(listFile)
      .inputOptions(['-f concat', '-safe 0'])
      .outputOptions([
        '-c:v libx264',
        '-preset fast',
        '-crf 23',
        '-pix_fmt yuv420p',
        '-vf scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2',
        '-r 24',
        '-an',             // 무음 처리 (오디오 없는 장면 대비)
        '-movflags +faststart',
      ])
      .output(outputPath)
      .on('progress', (p) => {
        const pct = Math.min(95, Math.round((p.percent || 0)));
        onProgress?.(pct);
      })
      .on('end', () => {
        fs.unlink(listFile, () => {});
        onProgress?.(100);
        resolve(outputPath);
      })
      .on('error', (e) => {
        fs.unlink(listFile, () => {});
        reject(new Error(`영상 합치기 실패: ${e.message}`));
      })
      .run();
  });
}

module.exports = { extractLastFrame, concatScenes };
