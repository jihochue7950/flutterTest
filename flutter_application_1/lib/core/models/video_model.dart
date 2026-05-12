import 'package:equatable/equatable.dart';

class VideoModel extends Equatable {
  final String id;
  final String sessionId;
  final String fileName;
  final String? url;
  final int? sizeBytes;
  final DateTime uploadedAt;

  const VideoModel({
    required this.id,
    required this.sessionId,
    required this.fileName,
    this.url,
    this.sizeBytes,
    required this.uploadedAt,
  });

  factory VideoModel.fromJson(Map<String, dynamic> json) => VideoModel(
        id: json['id'] as String,
        sessionId: json['sessionId'] as String,
        fileName: json['fileName'] as String,
        url: json['url'] as String?,
        sizeBytes: json['sizeBytes'] as int?,
        uploadedAt: DateTime.parse(json['uploadedAt'] as String),
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'sessionId': sessionId,
        'fileName': fileName,
        'url': url,
        'sizeBytes': sizeBytes,
        'uploadedAt': uploadedAt.toIso8601String(),
      };

  @override
  List<Object?> get props => [id, sessionId, fileName, url, sizeBytes, uploadedAt];
}
