import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:file_picker/file_picker.dart';
import 'package:go_router/go_router.dart';
import '../providers/video_provider.dart';
import '../../../shared/widgets/loading_overlay.dart';

class VideoUploadScreen extends ConsumerWidget {
  final String sessionId;

  const VideoUploadScreen({super.key, required this.sessionId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final videoState = ref.watch(videoProvider);
    final isUploading = videoState.status == UploadStatus.uploading;
    final isSuccess = videoState.status == UploadStatus.success;

    return Scaffold(
      appBar: AppBar(title: const Text('영상 업로드')),
      body: LoadingOverlay(
        isLoading: isUploading,
        loadingText: '영상 업로드 중...',
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'TV에서 재생될 영상을 선택하세요',
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
              ),
              Text(
                'MP4, MOV 형식 지원',
                style: TextStyle(color: Colors.grey[500], fontSize: 13),
              ),
              const SizedBox(height: 32),
              _UploadArea(
                filePath: videoState.localFilePath,
                fileName: videoState.localFileName,
                onTap: () => _pickFile(ref),
              ),
              const SizedBox(height: 20),
              if (isSuccess) _SuccessBanner(),
              const Spacer(),
              SizedBox(
                width: double.infinity,
                height: 56,
                child: ElevatedButton(
                  onPressed: videoState.localFilePath != null
                      ? () => _handleNext(context, ref, isSuccess)
                      : null,
                  style: ElevatedButton.styleFrom(
                    disabledBackgroundColor: Colors.grey[300],
                  ),
                  child: Text(
                    isSuccess ? 'Chromecast 연결하기 →' : '업로드하고 다음으로',
                    style: const TextStyle(
                        fontSize: 16, fontWeight: FontWeight.w700),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _pickFile(WidgetRef ref) async {
    final result = await FilePicker.platform.pickFiles(
      type: FileType.video,
      allowMultiple: false,
    );
    if (result != null && result.files.isNotEmpty) {
      final file = result.files.first;
      if (file.path != null) {
        ref.read(videoProvider.notifier).setLocalFile(file.path!, file.name);
      }
    }
  }

  Future<void> _handleNext(
    BuildContext context,
    WidgetRef ref,
    bool isSuccess,
  ) async {
    if (!isSuccess) {
      await ref.read(videoProvider.notifier).uploadVideo(sessionId);
    }
    if (context.mounted) {
      context.go('/session/$sessionId/cast');
    }
  }
}

class _UploadArea extends StatelessWidget {
  final String? filePath;
  final String? fileName;
  final VoidCallback onTap;

  const _UploadArea({this.filePath, this.fileName, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final hasFile = filePath != null;
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        width: double.infinity,
        height: 200,
        decoration: BoxDecoration(
          color: hasFile ? const Color(0xFFFFF0F5) : Colors.grey[100],
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: hasFile
                ? const Color(0xFFE91E8C)
                : Colors.grey[300]!,
            width: 2,
          ),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              hasFile ? Icons.videocam_rounded : Icons.cloud_upload_outlined,
              size: 52,
              color: hasFile ? const Color(0xFFE91E8C) : Colors.grey[400],
            ),
            const SizedBox(height: 12),
            Text(
              hasFile ? fileName! : '영상 파일 선택',
              style: TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w600,
                color: hasFile ? const Color(0xFFB5004E) : Colors.grey[600],
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
            if (!hasFile)
              Text(
                '탭하여 파일 선택',
                style: TextStyle(color: Colors.grey[400], fontSize: 12),
              ),
          ],
        ),
      ),
    );
  }
}

class _SuccessBanner extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: Colors.green[50],
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.green[200]!),
      ),
      child: const Row(
        children: [
          Icon(Icons.check_circle, color: Colors.green, size: 20),
          SizedBox(width: 8),
          Text(
            '영상이 성공적으로 업로드되었습니다',
            style: TextStyle(color: Colors.green, fontWeight: FontWeight.w500),
          ),
        ],
      ),
    );
  }
}
