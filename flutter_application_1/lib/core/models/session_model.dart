import 'package:equatable/equatable.dart';

enum SessionStatus {
  created,
  videoUploaded,
  phoneEntered,
  inviteSent,
  tvConnected,
  userBJoined,
  aiConversationActive,
  videoPlaying,
  completed,
}

class SessionModel extends Equatable {
  final String id;
  final SessionStatus status;
  final String? title;

  /// MariaDB user_videos.user_code / ai_questions.user_code
  /// 서버가 이 값으로 영상 URL과 커스텀 질문을 조회합니다.
  final String? userCode;

  final String? videoId;
  final String? userBPhone;
  final String? inviteToken;
  final bool tvConnected;
  final bool userBJoined;
  final DateTime createdAt;

  const SessionModel({
    required this.id,
    required this.status,
    this.title,
    this.userCode,
    this.videoId,
    this.userBPhone,
    this.inviteToken,
    this.tvConnected = false,
    this.userBJoined = false,
    required this.createdAt,
  });

  SessionModel copyWith({
    String? id,
    SessionStatus? status,
    String? title,
    String? userCode,
    String? videoId,
    String? userBPhone,
    String? inviteToken,
    bool? tvConnected,
    bool? userBJoined,
    DateTime? createdAt,
  }) {
    return SessionModel(
      id: id ?? this.id,
      status: status ?? this.status,
      title: title ?? this.title,
      userCode: userCode ?? this.userCode,
      videoId: videoId ?? this.videoId,
      userBPhone: userBPhone ?? this.userBPhone,
      inviteToken: inviteToken ?? this.inviteToken,
      tvConnected: tvConnected ?? this.tvConnected,
      userBJoined: userBJoined ?? this.userBJoined,
      createdAt: createdAt ?? this.createdAt,
    );
  }

  factory SessionModel.fromJson(Map<String, dynamic> json) {
    return SessionModel(
      id: json['id'] as String,
      status: SessionStatus.values.firstWhere(
        (s) => s.name == json['status'],
        orElse: () => SessionStatus.created,
      ),
      title: json['title'] as String?,
      userCode: json['userCode'] as String?,
      videoId: json['videoId'] as String?,
      userBPhone: json['userBPhone'] as String?,
      inviteToken: json['inviteToken'] as String?,
      tvConnected: json['tvConnected'] as bool? ?? false,
      userBJoined: json['userBJoined'] as bool? ?? false,
      createdAt: DateTime.parse(json['createdAt'] as String),
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'status': status.name,
        'title': title,
        'userCode': userCode,
        'videoId': videoId,
        'userBPhone': userBPhone,
        'inviteToken': inviteToken,
        'tvConnected': tvConnected,
        'userBJoined': userBJoined,
        'createdAt': createdAt.toIso8601String(),
      };

  @override
  List<Object?> get props => [
        id, status, title, userCode, videoId, userBPhone,
        inviteToken, tvConnected, userBJoined, createdAt,
      ];
}
