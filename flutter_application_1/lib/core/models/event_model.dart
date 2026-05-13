import 'package:equatable/equatable.dart';

enum EventType {
  sessionCreated,
  tvConnected,
  tvDisconnected,
  userBJoined,
  aiQuestionSent,
  userBAnswerReceived,
  videoPlayRequested,
  videoPlaying,
  sessionCompleted,
  // AI 아바타 대화 이벤트
  aiSpeech,        // AI 텍스트 응답 → TV TTS 재생 + User B 화면 표시
  userBSpeech,     // User B 음성 인식 결과 → 백엔드 LLM으로 전달
  aiListening,     // AI가 User B 응답 대기 중 → User B 마이크 버튼 활성화
  aiIntroStarted,  // AI 자기소개 시작 신호
  unknown,
}

extension EventTypeX on EventType {
  String get displayName {
    switch (this) {
      case EventType.sessionCreated:
        return '세션 생성됨';
      case EventType.tvConnected:
        return 'TV 연결됨';
      case EventType.tvDisconnected:
        return 'TV 연결 끊김';
      case EventType.userBJoined:
        return '상대방 접속';
      case EventType.aiQuestionSent:
        return 'AI 질문 전송';
      case EventType.userBAnswerReceived:
        return '상대방 답변 수신';
      case EventType.videoPlayRequested:
        return '영상 재생 요청';
      case EventType.videoPlaying:
        return '영상 재생 중';
      case EventType.sessionCompleted:
        return '세션 완료';
      case EventType.aiSpeech:
        return 'AI 음성 응답';
      case EventType.userBSpeech:
        return 'User B 발화';
      case EventType.aiListening:
        return 'AI 대기 중';
      case EventType.aiIntroStarted:
        return 'AI 자기소개 시작';
      case EventType.unknown:
        return '알 수 없는 이벤트';
    }
  }
}

EventType eventTypeFromString(String value) => EventType.values.firstWhere(
      (e) => e.name == value,
      orElse: () => EventType.unknown,
    );

class EventModel extends Equatable {
  final EventType type;
  final String sessionId;
  final Map<String, dynamic> data;
  final DateTime timestamp;

  const EventModel({
    required this.type,
    required this.sessionId,
    required this.data,
    required this.timestamp,
  });

  factory EventModel.fromJson(Map<String, dynamic> json) {
    // data 필드 안전 파싱: 타입이 Map이 아닌 경우 빈 Map으로 폴백
    Map<String, dynamic> data;
    try {
      final raw = json['data'];
      data = raw is Map
          ? Map<String, dynamic>.from(raw)
          : <String, dynamic>{};
    } catch (_) {
      data = <String, dynamic>{};
    }

    // 최상위 extra 필드(videoId, videoUrl, message 등)를 data로 병합
    for (final key in ['videoId', 'videoUrl', 'message', 'answer']) {
      if (json.containsKey(key) && json[key] != null) {
        data[key] = json[key];
      }
    }

    // timestamp 안전 파싱
    DateTime timestamp;
    try {
      final raw = json['timestamp'];
      timestamp = raw != null ? DateTime.parse(raw as String) : DateTime.now();
    } catch (_) {
      timestamp = DateTime.now();
    }

    return EventModel(
      type: eventTypeFromString(json['type'] as String? ?? ''),
      sessionId: json['sessionId'] as String? ?? '',
      data: data,
      timestamp: timestamp,
    );
  }

  Map<String, dynamic> toJson() => {
        'type': type.name,
        'sessionId': sessionId,
        'data': data,
        'timestamp': timestamp.toIso8601String(),
      };

  @override
  List<Object?> get props => [type, sessionId, data, timestamp];
}
