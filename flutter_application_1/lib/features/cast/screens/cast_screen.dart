import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../providers/cast_provider.dart';
import '../services/cast_service.dart';
import '../../session/providers/session_provider.dart';
import '../../../shared/widgets/loading_overlay.dart';

class CastScreen extends ConsumerStatefulWidget {
  final String sessionId;
  /// 탭 셸에서 사용 시 제공 — 제어 패널 탭으로 전환. null이면 go_router로 이동.
  final VoidCallback? onGoToControl;

  const CastScreen({super.key, required this.sessionId, this.onGoToControl});

  @override
  ConsumerState<CastScreen> createState() => _CastScreenState();
}

class _CastScreenState extends ConsumerState<CastScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(castProvider.notifier).discoverDevices();
    });
  }

  @override
  Widget build(BuildContext context) {
    final castState = ref.watch(castProvider);
    final isLoading = castState.status == CastConnectionStatus.discovering ||
        castState.status == CastConnectionStatus.connecting;

    return Scaffold(
      appBar: AppBar(
        title: const Text('TV 연결'),
        actions: [
          if (castState.status != CastConnectionStatus.connected)
            IconButton(
              icon: const Icon(Icons.refresh),
              onPressed: () =>
                  ref.read(castProvider.notifier).discoverDevices(),
            ),
        ],
      ),
      body: LoadingOverlay(
        isLoading: isLoading,
        loadingText: castState.status == CastConnectionStatus.discovering
            ? '기기 검색 중...'
            : 'TV에 연결 중...',
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: castState.status == CastConnectionStatus.connected
              ? _buildConnected(context, castState)
              : _buildDiscovery(context, castState),
        ),
      ),
    );
  }

  Widget _buildDiscovery(BuildContext context, CastState state) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Chromecast 기기 선택',
          style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                fontWeight: FontWeight.bold,
              ),
        ),
        Text(
          '같은 Wi-Fi 네트워크의 기기를 선택하세요',
          style: TextStyle(color: Colors.grey[500]),
        ),
        const SizedBox(height: 24),
        if (state.devices.isEmpty)
          _EmptyDevicesView(
            onRetry: () => ref.read(castProvider.notifier).discoverDevices(),
          )
        else
          Expanded(
            child: ListView.separated(
              itemCount: state.devices.length,
              separatorBuilder: (_, __) => const SizedBox(height: 12),
              itemBuilder: (_, i) =>
                  _DeviceTile(device: state.devices[i], onTap: () async {
                final success = await ref
                    .read(castProvider.notifier)
                    .connect(state.devices[i], widget.sessionId);
                if (success && mounted) {
                  ref.read(sessionProvider.notifier).markTvConnected();
                  // TV 연결 완료 → User B에게 SMS 자동 발송
                  ref.read(sessionProvider.notifier).sendInvite();
                }
              }),
            ),
          ),
        if (state.error != null) ...[
          const SizedBox(height: 12),
          Text(state.error!, style: const TextStyle(color: Colors.red)),
        ],
      ],
    );
  }

  Widget _buildConnected(BuildContext context, CastState castState) {
    final sessionState = ref.watch(sessionProvider);
    final smsSending = sessionState.smsSending;
    final smsSent = sessionState.smsSent;
    final phone = sessionState.session?.userBPhone ?? '';

    return Column(
      children: [
        // TV 연결 상태
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: const Color(0xFFFFF0F5),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(
              color: const Color(0xFFE91E8C).withValues(alpha: 0.3),
            ),
          ),
          child: Row(
            children: [
              const Icon(Icons.cast_connected,
                  color: Color(0xFFE91E8C), size: 32),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'TV 연결 완료!',
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 17,
                        color: Color(0xFFB5004E),
                      ),
                    ),
                    Text(
                      castState.connectedDevice?.name ?? '',
                      style: TextStyle(color: Colors.grey[600]),
                    ),
                  ],
                ),
              ),
              const Icon(Icons.check_circle, color: Colors.green, size: 24),
            ],
          ),
        ),
        const SizedBox(height: 16),

        // SMS 자동 발송 상태
        _SmsStatusCard(
          phone: phone,
          isSending: smsSending,
          isSent: smsSent,
          error: sessionState.error,
          onRetry: () =>
              ref.read(sessionProvider.notifier).sendInvite(),
        ),

        const Spacer(),
        SizedBox(
          width: double.infinity,
          height: 56,
          child: ElevatedButton(
            onPressed: () {
              if (widget.onGoToControl != null) {
                widget.onGoToControl!();
              } else {
                context.go('/session/${widget.sessionId}/control');
              }
            },
            child: const Text(
              '제어 패널 열기 →',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
            ),
          ),
        ),
      ],
    );
  }
}

class _SmsStatusCard extends StatelessWidget {
  final String phone;
  final bool isSending;
  final bool isSent;
  final String? error;
  final VoidCallback onRetry;

  const _SmsStatusCard({
    required this.phone,
    required this.isSending,
    required this.isSent,
    required this.onRetry,
    this.error,
  });

  @override
  Widget build(BuildContext context) {
    if (isSending) {
      return _card(
        color: Colors.blue,
        icon: const SizedBox(
          width: 18,
          height: 18,
          child: CircularProgressIndicator(strokeWidth: 2, color: Colors.blue),
        ),
        text: 'SMS 발송 중... ($phone)',
      );
    }
    if (isSent) {
      return _card(
        color: Colors.green,
        icon: const Icon(Icons.check_circle, color: Colors.green, size: 20),
        text: 'SMS 발송 완료 → $phone',
      );
    }
    if (error != null) {
      return Column(
        children: [
          _card(
            color: Colors.orange,
            icon: const Icon(Icons.warning_amber_rounded,
                color: Colors.orange, size: 20),
            text: error!,
          ),
          const SizedBox(height: 8),
          TextButton.icon(
            onPressed: onRetry,
            icon: const Icon(Icons.refresh, size: 16),
            label: const Text('SMS 재발송'),
          ),
        ],
      );
    }
    // 대기 중 (발송 전 초기 상태)
    return _card(
      color: Colors.grey,
      icon: const Icon(Icons.sms_outlined, color: Colors.grey, size: 20),
      text: 'SMS 발송 준비 중...',
    );
  }

  Widget _card({
    required MaterialColor color,
    required Widget icon,
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
          icon,
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

class _DeviceTile extends StatelessWidget {
  final CastDevice device;
  final VoidCallback onTap;

  const _DeviceTile({required this.device, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.05),
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: const Color(0xFFFFE0F0),
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Icon(Icons.cast, color: Color(0xFFE91E8C)),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(device.name,
                      style: const TextStyle(
                          fontWeight: FontWeight.w600, fontSize: 15)),
                  Text(device.model,
                      style: TextStyle(
                          color: Colors.grey[500], fontSize: 12)),
                ],
              ),
            ),
            const Icon(Icons.chevron_right, color: Colors.grey),
          ],
        ),
      ),
    );
  }
}

class _EmptyDevicesView extends StatelessWidget {
  final VoidCallback onRetry;

  const _EmptyDevicesView({required this.onRetry});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.cast, size: 64, color: Colors.grey[300]),
            const SizedBox(height: 16),
            Text('기기를 찾을 수 없습니다',
                style: TextStyle(color: Colors.grey[500], fontSize: 16)),
            const SizedBox(height: 8),
            TextButton.icon(
              onPressed: onRetry,
              icon: const Icon(Icons.refresh),
              label: const Text('다시 검색'),
            ),
          ],
        ),
      ),
    );
  }
}
