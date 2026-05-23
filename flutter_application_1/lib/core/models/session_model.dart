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

/// productSlug로부터 파생되는 이벤트 타입
enum EventCategory {
  proposal,    // 프로포즈 계열 (감동형/영상편지/대화형/TV프리미엄)
  birthday,    // 생일 서프라이즈
  anniversary, // 기념일/가족 이벤트
}

extension EventCategoryX on EventCategory {
  String get serverValue => name; // 'proposal' | 'birthday' | 'anniversary'

  static EventCategory fromSlug(String? slug) {
    if (slug == null) return EventCategory.proposal;
    if (slug.contains('birthday')) return EventCategory.birthday;
    if (slug.contains('anniversary') || slug.contains('family')) return EventCategory.anniversary;
    return EventCategory.proposal;
  }

  static EventCategory fromString(String? value) {
    return EventCategory.values.firstWhere(
      (e) => e.name == value,
      orElse: () => EventCategory.proposal,
    );
  }

  /// 홈/버튼 등에 표시할 액션 라벨
  String get actionLabel => switch (this) {
    EventCategory.proposal    => '💍 프로포즈 시작하기',
    EventCategory.birthday    => '🎂 생일 이벤트 시작하기',
    EventCategory.anniversary => '🎉 기념일 이벤트 시작하기',
  };

  /// SMS 초대 수신자 라벨
  String get recipientLabel => switch (this) {
    EventCategory.proposal    => '상대방 전화번호',
    EventCategory.birthday    => '생일 주인공 전화번호',
    EventCategory.anniversary => '기념일 주인공 전화번호',
  };

  /// 흐름 안내 문구
  String get flowTitle => switch (this) {
    EventCategory.proposal    => '특별한 순간을 준비하세요 💍',
    EventCategory.birthday    => '잊지 못할 생일을 만들어 드려요 🎂',
    EventCategory.anniversary => '소중한 기념일을 함께 축하해요 🎉',
  };
}

class SessionModel extends Equatable {
  final String id;
  final SessionStatus status;
  final String? title;
  final String? userCode;
  final EventCategory eventType;
  final String? productSlug;
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
    this.eventType = EventCategory.proposal,
    this.productSlug,
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
    EventCategory? eventType,
    String? productSlug,
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
      eventType: eventType ?? this.eventType,
      productSlug: productSlug ?? this.productSlug,
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
      eventType: EventCategoryX.fromString(json['eventType'] as String?),
      productSlug: json['productSlug'] as String?,
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
        'eventType': eventType.serverValue,
        'productSlug': productSlug,
        'videoId': videoId,
        'userBPhone': userBPhone,
        'inviteToken': inviteToken,
        'tvConnected': tvConnected,
        'userBJoined': userBJoined,
        'createdAt': createdAt.toIso8601String(),
      };

  @override
  List<Object?> get props => [
        id, status, title, userCode, eventType, productSlug,
        videoId, userBPhone, inviteToken, tvConnected, userBJoined, createdAt,
      ];
}
