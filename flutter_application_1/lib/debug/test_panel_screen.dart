import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../core/models/event_model.dart';
import '../core/network/websocket_service.dart';
import '../features/cast/providers/cast_provider.dart';
import '../features/control/providers/control_provider.dart';
import '../features/session/providers/session_provider.dart';
import 'debug_cast_service.dart';

class TestPanelScreen extends ConsumerStatefulWidget {
  const TestPanelScreen({super.key});

  @override
  ConsumerState<TestPanelScreen> createState() => _TestPanelScreenState();
}

class _TestPanelScreenState extends ConsumerState<TestPanelScreen> {
  final _videoUrlController = TextEditingController(
    text: 'https://example.com/proposal_video.mp4',
  );
  final _aiMessageController = TextEditingController(
    text: '안녕하세요! 오늘 특별한 날을 위해 준비했어요.',
  );

  final List<CastCommandLog> _logs = [];
  StreamSubscription<CastCommandLog>? _logSub;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      // 기존 로그 불러오기
      final existingLogs =
          List<CastCommandLog>.from(ref.read(debugCastServiceProvider).logs);
      if (existingLogs.isNotEmpty) {
        setState(() => _logs.insertAll(0, existingLogs.reversed));
      }
      // 새 로그 구독
      _logSub =
          ref.read(debugCastServiceProvider).commandLog.listen((log) {
        if (mounted) setState(() => _logs.insert(0, log));
      });
    });
  }

  @override
  void dispose() {
    _videoUrlController.dispose();
    _aiMessageController.dispose();
    _logSub?.cancel();
    super.dispose();
  }

  String? get _sessionId => ref.read(sessionProvider).session?.id;

  void _injectEvent(EventType type, Map<String, dynamic> data) {
    final sid = _sessionId;
    if (sid == null) {
      _snack('먼저 세션을 생성하세요 (Home → 새 프로포즈 시작하기)');
      return;
    }
    ref.read(webSocketServiceProvider).injectTestEvent(
          EventModel(
            type: type,
            sessionId: sid,
            data: data,
            timestamp: DateTime.now(),
          ),
        );
    _snack('주입 완료: ${type.displayName}');
  }

  void _connectWsForTesting() {
    final sid = _sessionId;
    if (sid == null) {
      _snack('세션이 없습니다. 먼저 세션을 생성하세요.');
      return;
    }
    ref.read(controlProvider.notifier).connectWebSocket(sid);
    _snack('WS 리스너 활성화 (백엔드 없이 이벤트 주입 가능)');
  }

  void _snack(String msg) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(msg),
        duration: const Duration(seconds: 2),
        backgroundColor: const Color(0xFF1A1A2E),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final castState = ref.watch(castProvider);
    final controlState = ref.watch(controlProvider);
    final sessionState = ref.watch(sessionProvider);

    return Scaffold(
      backgroundColor: const Color(0xFF0D0D1A),
      appBar: AppBar(
        backgroundColor: const Color(0xFF1A1A2E),
        elevation: 0,
        title: const Row(
          children: [
            Icon(Icons.bug_report, color: Color(0xFFFFD700), size: 18),
            SizedBox(width: 8),
            Text(
              'Chromecast 로컬 테스트',
              style: TextStyle(color: Colors.white, fontSize: 15),
            ),
          ],
        ),
        iconTheme: const IconThemeData(color: Colors.white),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ─── TV 시뮬레이터 ─────────────────────────
            _sectionLabel('TV 시뮬레이터'),
            const SizedBox(height: 8),
            _TvSimulator(castState: castState, controlState: controlState),
            const SizedBox(height: 20),

            // ─── 현재 상태 ─────────────────────────────
            _sectionLabel('현재 상태'),
            const SizedBox(height: 8),
            _StatusGrid(
              session: sessionState.session,
              castState: castState,
              controlState: controlState,
            ),
            const SizedBox(height: 20),

            // ─── WS 이벤트 주입기 ──────────────────────
            _sectionLabel('WebSocket 이벤트 주입기'),
            const SizedBox(height: 4),
            Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: Text(
                '제어 패널 화면을 한 번 열었다면 WS 리스너가 활성화됩니다.\n'
                '제어 패널 없이 테스트하려면 아래 "WS 리스너 활성화" 버튼을 누르세요.',
                style: TextStyle(color: Colors.grey[600], fontSize: 11),
              ),
            ),
            _WsInjector(
              videoUrlController: _videoUrlController,
              aiMessageController: _aiMessageController,
              onInject: _injectEvent,
              onConnectWs: _connectWsForTesting,
              isWsConnected: controlState.isConnectedToWs,
            ),
            const SizedBox(height: 20),

            // ─── Cast 명령 로그 ────────────────────────
            _sectionLabel('Cast 명령 로그 (앱 → TV)'),
            const SizedBox(height: 8),
            _CastLogView(logs: _logs),
            const SizedBox(height: 40),
          ],
        ),
      ),
    );
  }

  Widget _sectionLabel(String text) => Text(
        text,
        style: const TextStyle(
          color: Color(0xFFFFD700),
          fontSize: 11,
          fontWeight: FontWeight.w700,
          letterSpacing: 1.2,
        ),
      );
}

// ── TV 시뮬레이터 ───────────────────────────────────────────────────────────

class _TvSimulator extends StatelessWidget {
  final CastState castState;
  final ControlState controlState;

  const _TvSimulator({required this.castState, required this.controlState});

  @override
  Widget build(BuildContext context) {
    final isConnected = castState.status == CastConnectionStatus.connected;
    final isPlaying = controlState.isVideoPlayRequested;
    final videoUrl = controlState.videoUrl;

    final borderColor =
        isConnected ? const Color(0xFFE91E8C) : const Color(0xFF333333);

    return Column(
      children: [
        Container(
          width: double.infinity,
          decoration: BoxDecoration(
            color: Colors.black,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(14)),
            border: Border.all(color: borderColor, width: 2),
          ),
          child: AspectRatio(
            aspectRatio: 16 / 9,
            child: ClipRRect(
              borderRadius:
                  const BorderRadius.vertical(top: Radius.circular(12)),
              child: _TvScreen(
                isConnected: isConnected,
                isPlaying: isPlaying,
                videoUrl: videoUrl,
                deviceName: castState.connectedDevice?.name,
                lastAiMessage: controlState.lastAiMessage,
              ),
            ),
          ),
        ),
        // TV 받침대
        Center(
          child: Container(width: 60, height: 10, color: const Color(0xFF2A2A2A)),
        ),
        Center(
          child: Container(
            width: 100,
            height: 6,
            decoration: BoxDecoration(
              color: const Color(0xFF333333),
              borderRadius: BorderRadius.circular(3),
            ),
          ),
        ),
        const SizedBox(height: 8),
        // 상태 배지
        Center(
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
            decoration: BoxDecoration(
              color: isConnected
                  ? const Color(0xFF0A200A)
                  : const Color(0xFF1A1A1A),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(
                color: isConnected
                    ? const Color(0xFF2ECC71)
                    : const Color(0xFF333333),
              ),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 6,
                  height: 6,
                  decoration: BoxDecoration(
                    color: isConnected
                        ? const Color(0xFF2ECC71)
                        : Colors.grey[700],
                    shape: BoxShape.circle,
                  ),
                ),
                const SizedBox(width: 6),
                Text(
                  isConnected
                      ? castState.connectedDevice?.name ?? 'Connected'
                      : 'STANDBY',
                  style: TextStyle(
                    color: isConnected
                        ? const Color(0xFF2ECC71)
                        : Colors.grey[600],
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    letterSpacing: 0.5,
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

class _TvScreen extends StatelessWidget {
  final bool isConnected;
  final bool isPlaying;
  final String? videoUrl;
  final String? deviceName;
  final String? lastAiMessage;

  const _TvScreen({
    required this.isConnected,
    required this.isPlaying,
    this.videoUrl,
    this.deviceName,
    this.lastAiMessage,
  });

  @override
  Widget build(BuildContext context) {
    if (!isConnected) {
      return Container(
        color: Colors.black,
        child: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.tv_off, color: Colors.grey[850], size: 48),
              const SizedBox(height: 12),
              Text(
                'STANDBY',
                style: TextStyle(
                  color: Colors.grey[800],
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 6,
                ),
              ),
            ],
          ),
        ),
      );
    }

    if (isPlaying && videoUrl != null) {
      return Container(
        decoration: const BoxDecoration(
          gradient: RadialGradient(
            center: Alignment.center,
            radius: 1.2,
            colors: [Color(0xFF4A0030), Color(0xFF0D0010)],
          ),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.play_circle_filled, color: Colors.white70, size: 52),
            const SizedBox(height: 12),
            const Text(
              '영상 재생 중',
              style: TextStyle(
                color: Colors.white,
                fontSize: 15,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24),
              child: Text(
                videoUrl!,
                style: const TextStyle(
                  color: Color(0x99FFFFFF),
                  fontSize: 9,
                  fontFamily: 'monospace',
                ),
                textAlign: TextAlign.center,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
        ),
      );
    }

    // Connected, not playing
    return Container(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFF1A000E), Color(0xFF0A0A14)],
        ),
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.cast_connected,
            color: const Color(0xFFE91E8C).withValues(alpha: 0.6),
            size: 38,
          ),
          const SizedBox(height: 10),
          Text(
            'TV 연결됨 — AI 대화 진행 중',
            style: TextStyle(color: Colors.grey[500], fontSize: 12),
          ),
          if (lastAiMessage != null) ...[
            const SizedBox(height: 12),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24),
              child: Text(
                '"$lastAiMessage"',
                style: const TextStyle(
                  color: Color(0x99FFFFFF),
                  fontSize: 11,
                  fontStyle: FontStyle.italic,
                ),
                textAlign: TextAlign.center,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
          const SizedBox(height: 14),
          SizedBox(
            width: 20,
            height: 20,
            child: CircularProgressIndicator(
              strokeWidth: 1.5,
              color: const Color(0xFFE91E8C).withValues(alpha: 0.5),
            ),
          ),
        ],
      ),
    );
  }
}

// ── 상태 그리드 ─────────────────────────────────────────────────────────────

class _StatusGrid extends StatelessWidget {
  final dynamic session;
  final CastState castState;
  final ControlState controlState;

  const _StatusGrid({
    this.session,
    required this.castState,
    required this.controlState,
  });

  @override
  Widget build(BuildContext context) {
    final isConnected = castState.status == CastConnectionStatus.connected;
    return Column(
      children: [
        Row(
          children: [
            Expanded(
              child: _StatusChip(
                label: '세션',
                value: session != null
                    ? (session.id as String).substring(0, 8)
                    : '없음',
                active: session != null,
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: _StatusChip(
                label: 'TV 연결',
                value: isConnected
                    ? (castState.connectedDevice?.name ?? '연결됨')
                    : '미연결',
                active: isConnected,
              ),
            ),
          ],
        ),
        const SizedBox(height: 8),
        Row(
          children: [
            Expanded(
              child: _StatusChip(
                label: 'WS 리스너',
                value: controlState.isConnectedToWs ? '활성화' : '비활성',
                active: controlState.isConnectedToWs,
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: _StatusChip(
                label: '영상 재생',
                value: controlState.isVideoPlayRequested ? '재생 중' : '대기',
                active: controlState.isVideoPlayRequested,
              ),
            ),
          ],
        ),
      ],
    );
  }
}

class _StatusChip extends StatelessWidget {
  final String label;
  final String value;
  final bool active;

  const _StatusChip({
    required this.label,
    required this.value,
    required this.active,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: active ? const Color(0xFF0A1A0A) : const Color(0xFF111111),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(
          color: active
              ? const Color(0xFF2ECC71).withValues(alpha: 0.4)
              : const Color(0xFF222222),
        ),
      ),
      child: Row(
        children: [
          Container(
            width: 7,
            height: 7,
            decoration: BoxDecoration(
              color: active ? const Color(0xFF2ECC71) : Colors.grey[800],
              shape: BoxShape.circle,
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: TextStyle(color: Colors.grey[600], fontSize: 10),
                ),
                Text(
                  value,
                  style: TextStyle(
                    color: active ? const Color(0xFF2ECC71) : Colors.grey[500],
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                  ),
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// ── WS 이벤트 주입기 ────────────────────────────────────────────────────────

class _WsInjector extends StatelessWidget {
  final TextEditingController videoUrlController;
  final TextEditingController aiMessageController;
  final void Function(EventType, Map<String, dynamic>) onInject;
  final VoidCallback onConnectWs;
  final bool isWsConnected;

  const _WsInjector({
    required this.videoUrlController,
    required this.aiMessageController,
    required this.onInject,
    required this.onConnectWs,
    required this.isWsConnected,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFF111120),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFF252540)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // WS 리스너 활성화 버튼
          SizedBox(
            width: double.infinity,
            child: OutlinedButton.icon(
              onPressed: isWsConnected ? null : onConnectWs,
              icon: Icon(
                isWsConnected ? Icons.check_circle : Icons.power_settings_new,
                size: 16,
              ),
              label: Text(
                isWsConnected ? 'WS 리스너 활성화됨' : 'WS 리스너 활성화 (테스트 시작)',
                style: const TextStyle(fontSize: 13),
              ),
              style: OutlinedButton.styleFrom(
                foregroundColor: isWsConnected
                    ? const Color(0xFF2ECC71)
                    : const Color(0xFFFFD700),
                side: BorderSide(
                  color: isWsConnected
                      ? const Color(0xFF2ECC71).withValues(alpha: 0.4)
                      : const Color(0xFFFFD700).withValues(alpha: 0.4),
                ),
              ),
            ),
          ),
          const SizedBox(height: 16),
          const Divider(color: Color(0xFF252540), height: 1),
          const SizedBox(height: 16),

          // 1. userBJoined
          _InjectButton(
            step: '1',
            label: 'User B 접속 시뮬레이션',
            sublabel: 'userBJoined 이벤트 주입 → 상대방 접속 상태로 전환',
            icon: Icons.person_add_outlined,
            color: const Color(0xFF2196F3),
            onTap: () => onInject(EventType.userBJoined, {}),
          ),
          const SizedBox(height: 12),

          // 2. aiQuestionSent
          _inputField(aiMessageController, 'AI 메시지 내용'),
          const SizedBox(height: 6),
          _InjectButton(
            step: '2',
            label: 'AI 질문 전송 시뮬레이션',
            sublabel: 'aiQuestionSent 이벤트 주입 → AI 마지막 메시지 업데이트',
            icon: Icons.smart_toy_outlined,
            color: const Color(0xFF9C27B0),
            onTap: () => onInject(
              EventType.aiQuestionSent,
              {'message': aiMessageController.text.trim()},
            ),
          ),
          const SizedBox(height: 12),

          // 3. videoPlayRequested
          _inputField(videoUrlController, '영상 URL'),
          const SizedBox(height: 6),
          _InjectButton(
            step: '3',
            label: '영상 재생 트리거 (AI 자동 재생 시뮬레이션)',
            sublabel: 'videoPlayRequested 이벤트 → TV 시뮬레이터에 영상 재생 표시',
            icon: Icons.play_circle_outline,
            color: const Color(0xFF4CAF50),
            onTap: () => onInject(
              EventType.videoPlayRequested,
              {'videoUrl': videoUrlController.text.trim()},
            ),
          ),
        ],
      ),
    );
  }

  Widget _inputField(TextEditingController ctrl, String label) {
    return TextField(
      controller: ctrl,
      style: const TextStyle(
          color: Colors.white, fontSize: 12, fontFamily: 'monospace'),
      decoration: InputDecoration(
        labelText: label,
        labelStyle: TextStyle(color: Colors.grey[600], fontSize: 11),
        filled: true,
        fillColor: const Color(0xFF0D0D1A),
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: const BorderSide(color: Color(0xFF252540)),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: const BorderSide(color: Color(0xFF252540)),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: const BorderSide(color: Color(0xFFE91E8C)),
        ),
      ),
    );
  }
}

class _InjectButton extends StatelessWidget {
  final String step;
  final String label;
  final String sublabel;
  final IconData icon;
  final Color color;
  final VoidCallback onTap;

  const _InjectButton({
    required this.step,
    required this.label,
    required this.sublabel,
    required this.icon,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      child: ElevatedButton(
        onPressed: onTap,
        style: ElevatedButton.styleFrom(
          backgroundColor: color.withValues(alpha: 0.12),
          foregroundColor: color,
          side: BorderSide(color: color.withValues(alpha: 0.3)),
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
          alignment: Alignment.centerLeft,
          shape:
              RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          elevation: 0,
        ),
        child: Row(
          children: [
            Container(
              width: 22,
              height: 22,
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.2),
                shape: BoxShape.circle,
              ),
              child: Center(
                child: Text(
                  step,
                  style: TextStyle(
                    color: color,
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    label,
                    style: const TextStyle(
                        fontSize: 13, fontWeight: FontWeight.w600),
                  ),
                  Text(
                    sublabel,
                    style:
                        TextStyle(fontSize: 10, color: color.withValues(alpha: 0.7)),
                  ),
                ],
              ),
            ),
            Icon(Icons.send, size: 14, color: color.withValues(alpha: 0.7)),
          ],
        ),
      ),
    );
  }
}

// ── Cast 명령 로그 ──────────────────────────────────────────────────────────

class _CastLogView extends StatelessWidget {
  final List<CastCommandLog> logs;

  const _CastLogView({required this.logs});

  @override
  Widget build(BuildContext context) {
    if (logs.isEmpty) {
      return Container(
        width: double.infinity,
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: const Color(0xFF111111),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: const Color(0xFF1E1E1E)),
        ),
        child: Center(
          child: Text(
            'Cast 명령 없음 — 앱을 통해 TV에 연결하면 로그가 쌓입니다',
            style: TextStyle(color: Colors.grey[800], fontSize: 12),
            textAlign: TextAlign.center,
          ),
        ),
      );
    }

    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFF080810),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFF1E1E1E)),
      ),
      child: ListView.separated(
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        itemCount: logs.length,
        separatorBuilder: (_, __) =>
            const Divider(height: 1, color: Color(0xFF111111)),
        itemBuilder: (_, i) => _LogTile(log: logs[i]),
      ),
    );
  }
}

class _LogTile extends StatelessWidget {
  final CastCommandLog log;

  const _LogTile({required this.log});

  Color get _color {
    switch (log.type) {
      case CastCommandType.connect:
        return const Color(0xFF2ECC71);
      case CastCommandType.disconnect:
        return const Color(0xFFE74C3C);
      case CastCommandType.playVideo:
        return const Color(0xFFFFD700);
      case CastCommandType.sendMessage:
        return const Color(0xFF3498DB);
      case CastCommandType.discover:
        return Colors.grey;
    }
  }

  IconData get _icon {
    switch (log.type) {
      case CastCommandType.connect:
        return Icons.cast_connected;
      case CastCommandType.disconnect:
        return Icons.cast;
      case CastCommandType.playVideo:
        return Icons.play_circle;
      case CastCommandType.sendMessage:
        return Icons.message_outlined;
      case CastCommandType.discover:
        return Icons.search;
    }
  }

  @override
  Widget build(BuildContext context) {
    final time =
        '${log.timestamp.hour.toString().padLeft(2, '0')}:'
        '${log.timestamp.minute.toString().padLeft(2, '0')}:'
        '${log.timestamp.second.toString().padLeft(2, '0')}';

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      child: Row(
        children: [
          Icon(_icon, color: _color, size: 15),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              log.label,
              style: TextStyle(
                  color: Colors.grey[400],
                  fontSize: 11,
                  fontFamily: 'monospace'),
            ),
          ),
          Text(
            time,
            style: TextStyle(color: Colors.grey[700], fontSize: 10),
          ),
        ],
      ),
    );
  }
}
