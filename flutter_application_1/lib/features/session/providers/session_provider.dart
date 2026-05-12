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

  Future<void> createSession({String? title, String? videoId}) async {
    state = state.copyWith(isLoading: true, clearError: true);
    try {
      final response = await _apiClient.post('/sessions', {
        if (title != null) 'title': title,
        if (videoId != null) 'videoId': videoId,
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
  /// 1) 백엔드에 invite 요청 (토큰 생성)
  /// 2) Solapi로 User B에게 SMS 자동 발송
  Future<void> sendInvite() async {
    final current = state.session;
    if (current == null) return;
    final phone = current.userBPhone?.trim() ?? '';
    if (phone.isEmpty) return; // 전화번호 없으면 발송 불가
    if (state.smsSent || state.smsSending) return; // 중복 발송 방지

    state = state.copyWith(smsSending: true, clearError: true);

    String token;

    // ── 1. 백엔드에서 invite 토큰 발급 시도 ──────────────────────────────
    try {
      final response = await _apiClient.post(
        '/sessions/${current.id}/invite',
        {'phone': current.userBPhone!},
      );
      token = response['token'] as String? ?? const Uuid().v4();
      state = state.copyWith(
        session: current.copyWith(
          inviteToken: token,
          status: SessionStatus.inviteSent,
        ),
      );
    } catch (_) {
      // 백엔드 없을 때 로컬 토큰 생성
      token = const Uuid().v4();
      state = state.copyWith(
        session: current.copyWith(
          inviteToken: token,
          status: SessionStatus.inviteSent,
        ),
      );
    }

    // ── 2. Solapi SMS 발송 ────────────────────────────────────────────────
    final inviteUrl = '${AppConfig.inviteBaseUrl}/invite/$token';
    final result = await _smsService.sendInvite(
      toPhone: current.userBPhone!,
      sessionTitle: current.title ?? '',
      inviteUrl: inviteUrl,
    );

    if (result.isSuccess) {
      state = state.copyWith(smsSent: true, smsSending: false);
    } else {
      state = state.copyWith(
        smsSending: false,
        error: 'SMS 발송 실패: ${result.error}',
      );
    }
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
