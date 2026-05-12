import 'package:equatable/equatable.dart';

class CastDevice extends Equatable {
  final String id;
  final String name;
  final String model;
  final bool isConnected;

  const CastDevice({
    required this.id,
    required this.name,
    required this.model,
    this.isConnected = false,
  });

  CastDevice copyWith({
    String? id,
    String? name,
    String? model,
    bool? isConnected,
  }) =>
      CastDevice(
        id: id ?? this.id,
        name: name ?? this.name,
        model: model ?? this.model,
        isConnected: isConnected ?? this.isConnected,
      );

  @override
  List<Object?> get props => [id, name, model, isConnected];
}

abstract class CastService {
  Future<List<CastDevice>> discoverDevices();
  Future<bool> connect(CastDevice device, String sessionId);
  Future<void> sendMessage(Map<String, dynamic> message);
  Future<void> playVideo(String videoUrl);
  Future<void> disconnect();
  bool get isConnected;
  CastDevice? get connectedDevice;
}

/// MVP용 Mock 구현. 실제 배포 시 플랫폼 채널로 Google Cast SDK 연동 필요.
class MockCastService implements CastService {
  bool _isConnected = false;
  CastDevice? _connectedDevice;

  @override
  bool get isConnected => _isConnected;

  @override
  CastDevice? get connectedDevice => _connectedDevice;

  @override
  Future<List<CastDevice>> discoverDevices() async {
    await Future.delayed(const Duration(seconds: 2));
    return const [
      CastDevice(
        id: 'cast-device-001',
        name: '거실 TV',
        model: 'Chromecast with Google TV (4K)',
      ),
      CastDevice(
        id: 'cast-device-002',
        name: '침실 TV',
        model: 'Chromecast HD',
      ),
    ];
  }

  @override
  Future<bool> connect(CastDevice device, String sessionId) async {
    await Future.delayed(const Duration(milliseconds: 1200));
    _isConnected = true;
    _connectedDevice = device.copyWith(isConnected: true);
    return true;
  }

  @override
  Future<void> sendMessage(Map<String, dynamic> message) async {
    // 실제 구현: Cast Custom Channel로 메시지 전송
    await Future.delayed(const Duration(milliseconds: 50));
  }

  @override
  Future<void> playVideo(String videoUrl) async {
    // 실제 구현: Cast MediaInfo 로드 후 play()
    await Future.delayed(const Duration(milliseconds: 100));
  }

  @override
  Future<void> disconnect() async {
    _isConnected = false;
    _connectedDevice = null;
  }
}
