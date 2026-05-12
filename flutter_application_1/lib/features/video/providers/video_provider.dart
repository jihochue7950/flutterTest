import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uuid/uuid.dart';
import '../../../core/models/video_model.dart';

enum UploadStatus { idle, uploading, success, error }

class VideoState {
  final VideoModel? video;
  final UploadStatus status;
  final double progress;
  final String? error;
  final String? localFilePath;
  final String? localFileName;

  const VideoState({
    this.video,
    this.status = UploadStatus.idle,
    this.progress = 0,
    this.error,
    this.localFilePath,
    this.localFileName,
  });

  VideoState copyWith({
    VideoModel? video,
    UploadStatus? status,
    double? progress,
    String? error,
    bool clearError = false,
    String? localFilePath,
    String? localFileName,
  }) {
    return VideoState(
      video: video ?? this.video,
      status: status ?? this.status,
      progress: progress ?? this.progress,
      error: clearError ? null : (error ?? this.error),
      localFilePath: localFilePath ?? this.localFilePath,
      localFileName: localFileName ?? this.localFileName,
    );
  }
}

class VideoNotifier extends StateNotifier<VideoState> {
  VideoNotifier() : super(const VideoState());

  void setLocalFile(String path, String name) {
    state = state.copyWith(
      localFilePath: path,
      localFileName: name,
      clearError: true,
    );
  }

  Future<VideoModel?> uploadVideo(String sessionId) async {
    final fileName = state.localFileName;
    if (fileName == null) return null;

    state = state.copyWith(
      status: UploadStatus.uploading,
      progress: 0,
      clearError: true,
    );

    // MVP 폴백: 로컬 참조로 진행 (실제 서버 업로드는 관리자가 처리)
    final video = VideoModel(
      id: const Uuid().v4(),
      sessionId: sessionId,
      fileName: fileName,
      uploadedAt: DateTime.now(),
    );
    state = state.copyWith(
      video: video,
      status: UploadStatus.success,
      progress: 1.0,
    );
    return video;
  }
}

final videoProvider =
    StateNotifierProvider<VideoNotifier, VideoState>((ref) {
  return VideoNotifier();
});
