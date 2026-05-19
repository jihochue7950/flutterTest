import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uuid/uuid.dart';
import '../../../core/models/session_model.dart';
import '../../../core/network/api_client.dart';
import '../../../core/config/app_config.dart';
import '../../../core/services/sms_service.dart';

class SessionState {
  final SessionModel? session;
  final bool isLoading;
  final String? error;
  final bool smsSent;
  final bool smsSending;

  const SessionState({
    this.session,
    this.isLoading = false,
    this.error,
    this.smsSent = false,
    this.smsSending = false,
  });

  SessionState copyWith({
    SessionModel? session,
    bool? isLoading,
    String? error,
    bool clearError = false,
    bool? smsSent,
    bool? smsSending,
  }) {
    return SessionState(
      session: session ?? this.session,
      isLoading: isLoading ?? this.isLoading,
      error: clearError ? null : (error ?? this.error),
      smsSent: smsSent ?? this.smsSent,
      smsSending: smsSending ?? this.smsSending,
    );
  }
}

class SessionNotifier extends StateNotifier<SessionState> {
  final ApiClient _apiClient;
  final SmsService _smsService;

  SessionNotifier(this._apiClient, this._smsService)
      : super(const SessionState());

  /// 세션 생성
  /// [userCode] : MariaDB user_videos.user_code / ai_questions.user_code
  ///              서버가 이 값으로 영상 URL과 커스텀 질문을 조회합니다.
  Future<void> createSession({
    String? title,
    String? videoId,
    String? userCode,
  }) async {
    state = state.copyWith(isLoading: true, clearError: true);
    try {
      final response = await _apiClient.post('/sessions', {
        if (title != null)    'title':    title,
        if (videoId != null)  'videoId':  videoId,
        if (userCode != null) 'userCode': userCode,
      });
      state = state.copyWith(
        session: SessionModel.fromJson(response),
        isLoading: false,
      );
    } catch (_) {
      final session = SessionModel(
        id: const Uuid().v4(),
        status: SessionStatus.created,
        title: title,
        userCode: userCode,
        videoId: videoId,
        createdAt: DateTime.now(),
      );
      state = state.copyWith(session: session, isLoading: false);
    }
  }

  Future<void> updatePhone(String phone) async {
    final current = state.session;
    if (current == null) return;

    state = state.copyWith(isLoading: true, clearError: true);
    try {
      final response = await _apiClient.patch(
        '/sessions/${current.id}',
        {'userBPhone': phone},
      );
      state = state.copyWith(
        session: SessionModel.fromJson(response),
        isLoading: false,
      );
    } catch (_) {
      state = state.copyWith(
        session: current.copyWith(
          userBPhone: phone,
          status: SessionStatus.phoneEntered,
        ),
        isLoading: false,
      );
    }
  }

  /// TV 연결 완료 후 자동으로 호출됨.
  /// 서버가 응답하면 서버에서 Solapi SMS를 직접 발송하므로 클라이언트에서는 호출하지 않음.
  /// 서버 없는 로컬 개발 환경에서는 smsService devMode(콘솔 출력)로 폴백.
  Future<void> sendInvite() async {
    final current = state.session;
    if (current == null) return;
    final phone = current.userBPhone?.trim() ?? '';
    if (phone.isEmpty) return;
    if (state.smsSent || state.smsSending) return;

    state = state.copyWith(smsSending: true, clearError: true);

    // ── 1. 백엔드에서 invite 토큰 발급 (서버가 Solapi SMS도 함께 발송)
    try {
      final response = await _apiClient.post(
        '/sessions/${current.id}/invite',
        {'phone': current.userBPhone!},
      );
      final token = response['token'] as String? ?? const Uuid().v4();
      state = state.copyWith(
        session: current.copyWith(
          inviteToken: token,
          status: SessionStatus.inviteSent,
        ),
        smsSent: true,
        smsSending: false,
      );
      return;
    } catch (_) {
      // 서버 없음 → 로컬 토큰 생성 후 devMode SMS(콘솔 출력)로 폴백
    }

    // ── 2. 로컬 폴백: 토큰 생성 + devMode SMS ──────────────────────────
    final token = const Uuid().v4();
    final inviteUrl = '${AppConfig.inviteBaseUrl}/invite/$token';
    state = state.copyWith(
      session: current.copyWith(
        inviteToken: token,
        status: SessionStatus.inviteSent,
      ),
    );

    final result = await _smsService.sendInvite(
      toPhone: current.userBPhone!,
      sessionTitle: current.title ?? '',
      inviteUrl: inviteUrl,
    );

    state = state.copyWith(
      smsSent: result.isSuccess,
      smsSending: false,
      error: result.isSuccess ? null : 'SMS 발송 실패: ${result.error}',
    );
  }

  void markTvConnected() {
    final current = state.session;
    if (current == null) return;
    state = state.copyWith(
      session: current.copyWith(
        tvConnected: true,
        status: SessionStatus.tvConnected,
      ),
    );
  }

  void markUserBJoined() {
    final current = state.session;
    if (current == null) return;
    state = state.copyWith(
      session: current.copyWith(
        userBJoined: true,
        status: SessionStatus.userBJoined,
      ),
    );
  }
}

final sessionProvider =
    StateNotifierProvider<SessionNotifier, SessionState>((ref) {
  return SessionNotifier(
    ref.watch(apiClientProvider),
    ref.watch(smsServiceProvider),
  );
});
