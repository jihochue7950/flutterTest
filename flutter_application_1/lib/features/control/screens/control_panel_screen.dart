import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/control_provider.dart';
import '../../session/providers/session_provider.dart';
import '../../cast/screens/local_video_player_screen.dart';
import '../../../core/models/event_model.dart';
import '../../../core/models/session_model.dart';

class ControlPanelScreen extends ConsumerStatefulWidget {
  final String sessionId;

  const ControlPanelScreen({super.key, required this.sessionId});

  @override
  ConsumerState<ControlPanelScreen> createState() =>
      _ControlPanelScreenState();
}

class _ControlPanelScreenState extends ConsumerState<ControlPanelScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(controlProvider.notifier).connectWebSocket(widget.sessionId);

      // AI 트리거 감지 → 영상 자동 재생
      ref.listen<ControlState>(controlProvider, (prev, next) {
        if (prev?.isVideoPlayRequested == false &&
            next.isVideoPlayRequested == true &&
            mounted) {
          final url = next.videoUrl ?? 'assets/video/proposal.mp4';
          Navigator.of(context).push(
            MaterialPageRoute(
              builder: (_) => LocalVideoPlayerScreen(videoUrl: url),
              fullscreenDialog: true,
            ),
          );
        }
      });
    });
  }

  @override
  Widget build(BuildContext context) {
    final control = ref.watch(controlProvider);
    final sessionState = ref.watch(sessionProvider);
    final session = sessionState.session;

    return Scaffold(
      backgroundColor: const Color(0xFFF2F3F7),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0.5,
        title: const Text('제어 패널'),
        actions: [_WsIndicator(isConnected: control.isConnectedToWs)],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            _SessionCard(session: session),
            const SizedBox(height: 12),
            _StatusRow(session: session, control: control),
            const SizedBox(height: 12),
            _SmsSection(
              session: session,
              sessionState: sessionState,
              onRetry: () =>
                  ref.read(sessionProvider.notifier).sendInvite(),
            ),
            const SizedBox(height: 12),
            _AiStatusCard(control: control),
            const SizedBox(height: 12),
            _EventFeed(events: control.events),
          ],
        ),
      ),
    );
  }
}

// ─── Sub-widgets ─────────────────────────────────────────────────────────────

class _WsIndicator extends StatelessWidget {
  final bool isConnected;
  const _WsIndicator({required this.isConnected});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(right: 16),
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: isConnected ? Colors.green[50] : Colors.grey[200],
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 7,
            height: 7,
            decoration: BoxDecoration(
              color: isConnected ? Colors.green : Colors.grey,
              shape: BoxShape.circle,
            ),
          ),
          const SizedBox(width: 5),
          Text(
            isConnected ? 'Live' : 'Offline',
            style: TextStyle(
              fontSize: 12,
              color: isConnected ? Colors.green[700] : Colors.grey,
            ),
          ),
        ],
      ),
    );
  }
}

class _SessionCard extends StatelessWidget {
  final SessionModel? session;
  const _SessionCard({this.session});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  session?.title ?? '세션',
                  style: const TextStyle(
                      fontWeight: FontWeight.bold, fontSize: 17),
                ),
                const SizedBox(height: 4),
                Row(
                  children: [
                    Text(
                      'ID: ${session?.id.substring(0, 8) ?? '-'}...',
                      style: TextStyle(
                        color: Colors.grey[400],
                        fontSize: 11,
                        fontFamily: 'monospace',
                      ),
                    ),
                    const SizedBox(width: 6),
                    GestureDetector(
                      onTap: () {
                        if (session != null) {
                          Clipboard.setData(ClipboardData(text: session!.id));
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                              content: Text('세션 ID 복사됨'),
                              duration: Duration(seconds: 1),
                            ),
                          );
                        }
                      },
                      child: Icon(Icons.copy, size: 13, color: Colors.grey[400]),
                    ),
                  ],
                ),
                if (session?.videoId != null) ...[
                  const SizedBox(height: 2),
                  Text(
                    '영상: ${session!.videoId}',
                    style: TextStyle(
                      color: Colors.grey[400],
                      fontSize: 11,
                      fontFamily: 'monospace',
                    ),
                  ),
                ],
              ],
            ),
          ),
          _StatusBadge(status: session?.status),
        ],
      ),
    );
  }
}

class _StatusBadge extends StatelessWidget {
  final SessionStatus? status;
  const _StatusBadge({this.status});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: const Color(0xFFFFF0F5),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(
        _label(status),
        style: const TextStyle(
          color: Color(0xFFB5004E),
          fontSize: 12,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }

  String _label(SessionStatus? s) {
    switch (s) {
      case SessionStatus.created:
        return '생성됨';
      case SessionStatus.videoUploaded:
        return '영상 준비';
      case SessionStatus.phoneEntered:
        return '전화번호 입력';
      case SessionStatus.inviteSent:
        return '초대 발송됨';
      case SessionStatus.tvConnected:
        return 'TV 연결됨';
      case SessionStatus.userBJoined:
        return '상대방 접속';
      case SessionStatus.aiConversationActive:
        return 'AI 대화 중';
      case SessionStatus.videoPlaying:
        return '영상 재생 중';
      case SessionStatus.completed:
        return '완료';
      case null:
        return '대기 중';
    }
  }
}

class _StatusRow extends StatelessWidget {
  final SessionModel? session;
  final ControlState control;
  const _StatusRow({this.session, required this.control});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: _StatCard(
            icon: Icons.cast,
            label: 'TV',
            value: session?.tvConnected == true ? '연결됨' : '미연결',
            active: session?.tvConnected == true,
          ),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: _StatCard(
            icon: Icons.person_outline,
            label: '상대방',
            value: session?.userBJoined == true ? '접속 중' : '대기',
            active: session?.userBJoined == true,
          ),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: _StatCard(
            icon: Icons.auto_awesome,
            label: 'AI 영상',
            value: control.isVideoPlayRequested ? '재생 중' : '대기',
            active: control.isVideoPlayRequested,
          ),
        ),
      ],
    );
  }
}

class _StatCard extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final bool active;
  const _StatCard({
    required this.icon,
    required this.label,
    required this.value,
    required this.active,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 14),
      decoration: BoxDecoration(
        color: active ? const Color(0xFFFFF0F5) : Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: active
              ? const Color(0xFFE91E8C).withValues(alpha: 0.25)
              : Colors.transparent,
        ),
      ),
      child: Column(
        children: [
          Icon(
            icon,
            color: active ? const Color(0xFFE91E8C) : Colors.grey[400],
            size: 22,
          ),
          const SizedBox(height: 6),
          Text(
            label,
            style: TextStyle(
              color: Colors.grey[500],
              fontSize: 11,
              fontWeight: FontWeight.w500,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            value,
            style: TextStyle(
              color: active ? const Color(0xFFB5004E) : Colors.grey[600],
              fontSize: 12,
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
      ),
    );
  }
}

/// SMS 자동 발송 상태 섹션 (수동 버튼 없음 — TV 연결 시 자동 발송됨)
class _SmsSection extends StatelessWidget {
  final SessionModel? session;
  final SessionState sessionState;
  final VoidCallback onRetry;

  const _SmsSection({
    this.session,
    required this.sessionState,
    required this.onRetry,
  });

  @override
  Widget build(BuildContext context) {
    if (session == null) return const SizedBox.shrink();

    return Column(
      children: [
        _SmsBanner(
          phone: session!.userBPhone ?? '',
          isSending: sessionState.smsSending,
          isSent: sessionState.smsSent,
          error: sessionState.error,
          onRetry: onRetry,
        ),
        const SizedBox(height: 10),
        // User B 접속 대기
        if (sessionState.smsSent && session!.userBJoined == false)
          _banner(
            icon: Icons.schedule,
            text: '상대방 접속 대기 중...',
            color: Colors.blue,
          ),
        // User B 접속 완료 → AI 대화 중
        if (session!.userBJoined == true)
          _banner(
            icon: Icons.smart_toy_outlined,
            text: 'AI 대화 진행 중. 영상 재생은 AI가 자동으로 트리거합니다.',
            color: Colors.deepPurple,
          ),
      ],
    );
  }

  Widget _banner({
    required IconData icon,
    required String text,
    required MaterialColor color,
  }) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 16),
      decoration: BoxDecoration(
        color: color[50],
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: color[200]!),
      ),
      child: Row(
        children: [
          Icon(icon, color: color, size: 20),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              text,
              style: TextStyle(color: color[700], fontWeight: FontWeight.w500),
            ),
          ),
        ],
      ),
    );
  }
}

class _SmsBanner extends StatelessWidget {
  final String phone;
  final bool isSending;
  final bool isSent;
  final String? error;
  final VoidCallback onRetry;

  const _SmsBanner({
    required this.phone,
    required this.isSending,
    required this.isSent,
    required this.onRetry,
    this.error,
  });

  @override
  Widget build(BuildContext context) {
    if (isSending) {
      return _tile(
        color: Colors.blue,
        leading: const SizedBox(
          width: 18,
          height: 18,
          child: CircularProgressIndicator(strokeWidth: 2, color: Colors.blue),
        ),
        text: 'SMS 발송 중... ($phone)',
      );
    }
    if (isSent) {
      return _tile(
        color: Colors.green,
        leading: const Icon(Icons.check_circle, color: Colors.green, size: 20),
        text: 'SMS 자동 발송 완료 → $phone',
      );
    }
    if (error != null) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _tile(
            color: Colors.orange,
            leading: const Icon(Icons.warning_amber_rounded,
                color: Colors.orange, size: 20),
            text: 'SMS 발송 실패',
          ),
          Align(
            alignment: Alignment.centerRight,
            child: TextButton.icon(
              onPressed: onRetry,
              icon: const Icon(Icons.refresh, size: 16),
              label: const Text('재발송'),
            ),
          ),
        ],
      );
    }
    return _tile(
      color: Colors.grey,
      leading: const Icon(Icons.sms_outlined, color: Colors.grey, size: 20),
      text: phone.isNotEmpty ? 'SMS 발송 대기 중 ($phone)' : 'SMS 발송 대기',
    );
  }

  Widget _tile({
    required MaterialColor color,
    required Widget leading,
    required String text,
  }) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: BoxDecoration(
        color: color[50],
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: color[200]!),
      ),
      child: Row(
        children: [
          leading,
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              text,
              style: TextStyle(
                color: color[700],
                fontWeight: FontWeight.w500,
                fontSize: 13,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// AI 대화 모니터 + 영상 자동 재생 상태
class _AiStatusCard extends StatelessWidget {
  final ControlState control;
  const _AiStatusCard({required this.control});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.smart_toy_outlined,
                  size: 18, color: Color(0xFFE91E8C)),
              const SizedBox(width: 8),
              const Text(
                'AI 상태 모니터',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
              ),
            ],
          ),
          const SizedBox(height: 12),
          if (control.lastAiMessage != null) ...[
            Text(
              'AI 최근 메시지',
              style: TextStyle(
                  fontSize: 11,
                  color: Colors.grey[500],
                  fontWeight: FontWeight.w500),
            ),
            const SizedBox(height: 6),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFFFFF0F5),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Text(
                '"${control.lastAiMessage!}"',
                style: const TextStyle(
                  fontStyle: FontStyle.italic,
                  fontSize: 13,
                  color: Color(0xFF333333),
                ),
              ),
            ),
            const SizedBox(height: 12),
          ],
          if (control.isVideoPlayRequested) ...[
            // 영상 재생 트리거됨 (Backend AI 이벤트)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: Colors.green[50],
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.green[200]!),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Row(
                    children: [
                      Icon(Icons.check_circle, color: Colors.green, size: 18),
                      SizedBox(width: 8),
                      Text(
                        'AI가 영상 재생을 자동 트리거했습니다 💍',
                        style: TextStyle(
                          color: Colors.green,
                          fontWeight: FontWeight.w700,
                          fontSize: 13,
                        ),
                      ),
                    ],
                  ),
                  if (control.videoUrl != null) ...[
                    const SizedBox(height: 6),
                    Text(
                      'URL: ${control.videoUrl}',
                      style: TextStyle(
                        color: Colors.green[700],
                        fontSize: 11,
                        fontFamily: 'monospace',
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ],
              ),
            ),
          ] else ...[
            Row(
              children: [
                SizedBox(
                  width: 14,
                  height: 14,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    color: Colors.grey[400],
                  ),
                ),
                const SizedBox(width: 10),
                Text(
                  'AI 흐름 진행 중... 조건 충족 시 자동 재생됩니다.',
                  style: TextStyle(color: Colors.grey[500], fontSize: 12),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}

class _EventFeed extends StatelessWidget {
  final List<EventModel> events;
  const _EventFeed({required this.events});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          '실시간 이벤트',
          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
        ),
        const SizedBox(height: 10),
        Container(
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
          ),
          child: events.isEmpty
              ? const Padding(
                  padding: EdgeInsets.all(24),
                  child: Center(
                    child: Text(
                      '이벤트 대기 중...',
                      style: TextStyle(color: Colors.grey),
                    ),
                  ),
                )
              : ListView.separated(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: events.length,
                  separatorBuilder: (_, __) =>
                      const Divider(height: 1, indent: 16, endIndent: 16),
                  itemBuilder: (_, i) => _EventTile(event: events[i]),
                ),
        ),
      ],
    );
  }
}

class _EventTile extends StatelessWidget {
  final EventModel event;
  const _EventTile({required this.event});

  @override
  Widget build(BuildContext context) {
    final isVideoEvent = event.type == EventType.videoPlayRequested ||
        event.type == EventType.videoPlaying;

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 11),
      child: Row(
        children: [
          Container(
            width: 8,
            height: 8,
            decoration: BoxDecoration(
              color: isVideoEvent
                  ? Colors.green
                  : const Color(0xFFE91E8C),
              shape: BoxShape.circle,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  event.type.displayName,
                  style: TextStyle(
                    fontWeight: FontWeight.w500,
                    fontSize: 13,
                    color: isVideoEvent ? Colors.green[700] : null,
                  ),
                ),
                // videoPlayRequested 이벤트에 videoUrl이 있으면 표시
                if (event.type == EventType.videoPlayRequested &&
                    event.data['videoUrl'] != null)
                  Text(
                    event.data['videoUrl'] as String,
                    style: TextStyle(
                        fontSize: 10,
                        color: Colors.grey[400],
                        fontFamily: 'monospace'),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
              ],
            ),
          ),
          Text(
            _hms(event.timestamp),
            style: TextStyle(color: Colors.grey[400], fontSize: 11),
          ),
        ],
      ),
    );
  }

  String _hms(DateTime dt) =>
      '${dt.hour.toString().padLeft(2, '0')}:'
      '${dt.minute.toString().padLeft(2, '0')}:'
      '${dt.second.toString().padLeft(2, '0')}';
}
