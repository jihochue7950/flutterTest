'use strict';
const path    = require('path');
const fs      = require('fs');
const os      = require('os');
const ffmpeg  = require('fluent-ffmpeg');
const ffmpegP = require('ffmpeg-static');
if (ffmpegP) ffmpeg.setFfmpegPath(ffmpegP);

/**
 * 모든 영상 클립 + 음악 파일 → 최종 뮤직비디오
 * @param {string[]} videoPaths - 순서대로 정렬된 영상 클립 경로
 * @param {string}   musicPath  - 음악 파일 경로
 * @param {string}   outputPath - 최종 출력 경로
 * @param {function} onProgress
 */
function mergeVideoAndMusic(videoPaths, musicPath, outputPath, onProgress) {
  return new Promise((resolve, reject) => {
    const existing = videoPaths.filter(p => p && fs.existsSync(p));
    if (existing.length === 0) return reject(new Error('합칠 영상이 없습니다.'));

    const listFile = path.join(os.tmpdir(), `mv_concat_${Date.now()}.txt`);
    fs.writeFileSync(listFile, existing.map(p => `file '${p.replace(/'/g, "\\'")}'`).join('\n'));

    const cmd = ffmpeg()
      .input(listFile).inputOptions(['-f concat', '-safe 0'])
      .outputOptions([
        '-c:v libx264', '-preset fast', '-crf 22',
        '-pix_fmt yuv420p',
        '-vf scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2',
        '-r 24',
      ]);

    // 음악 추가 (있을 때)
    if (musicPath && fs.existsSync(musicPath)) {
      cmd.input(musicPath)
         .outputOptions(['-c:a aac', '-b:a 192k', '-shortest']);
    } else {
      cmd.outputOptions(['-an']);
    }

    cmd.output(outputPath)
       .on('progress', p => onProgress?.(Math.min(95, Math.round(p.percent || 0))))
       .on('end', () => { fs.unlink(listFile, () => {}); onProgress?.(100); resolve(outputPath); })
       .on('error', e => { fs.unlink(listFile, () => {}); reject(new Error(`합치기 실패: ${e.message}`)); })
       .run();
  });
}

module.exports = { mergeVideoAndMusic };
