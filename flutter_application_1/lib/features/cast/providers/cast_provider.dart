import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/cast_service.dart';
import '../../../debug/debug_cast_service.dart';

enum CastConnectionStatus { idle, discovering, connecting, connected, error }

class CastState {
  final List<CastDevice> devices;
  final CastConnectionStatus status;
  final CastDevice? connectedDevice;
  final String? error;

  const CastState({
    this.devices = const [],
    this.status = CastConnectionStatus.idle,
    this.connectedDevice,
    this.error,
  });

  CastState copyWith({
    List<CastDevice>? devices,
    CastConnectionStatus? status,
    CastDevice? connectedDevice,
    String? error,
    bool clearError = false,
  }) =>
      CastState(
        devices: devices ?? this.devices,
        status: status ?? this.status,
        connectedDevice: connectedDevice ?? this.connectedDevice,
        error: clearError ? null : (error ?? this.error),
      );
}

class CastNotifier extends StateNotifier<CastState> {
  final CastService _service;

  CastNotifier(this._service) : super(const CastState());

  Future<void> discoverDevices() async {
    state = state.copyWith(
      status: CastConnectionStatus.discovering,
      clearError: true,
    );
    try {
      final devices = await _service.discoverDevices();
      state = state.copyWith(
        devices: devices,
        status: CastConnectionStatus.idle,
      );
    } catch (e) {
      state = state.copyWith(
        status: CastConnectionStatus.error,
        error: '기기 검색 실패: $e',
      );
    }
  }

  Future<bool> connect(CastDevice device, String sessionId) async {
    state = state.copyWith(
      status: CastConnectionStatus.connecting,
      clearError: true,
    );
    try {
      final success = await _service.connect(device, sessionId);
      state = state.copyWith(
        status: success
            ? CastConnectionStatus.connected
            : CastConnectionStatus.error,
        connectedDevice: success ? device.copyWith(isConnected: true) : null,
        error: success ? null : '연결에 실패했습니다.',
      );
      return success;
    } catch (e) {
      state = state.copyWith(
        status: CastConnectionStatus.error,
        error: '연결 오류: $e',
      );
      return false;
    }
  }

  Future<void> disconnect() async {
    await _service.disconnect();
    state = state.copyWith(
      status: CastConnectionStatus.idle,
      connectedDevice: null,
    );
  }
}

final castServiceProvider = Provider<CastService>(
  (ref) => ref.watch(debugCastServiceProvider),
);

final castProvider =
    StateNotifierProvider<CastNotifier, CastState>((ref) {
  return CastNotifier(ref.watch(castServiceProvider));
});
