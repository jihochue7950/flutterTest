import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../cast/screens/cast_screen.dart';
import '../../control/screens/control_panel_screen.dart';
import '../../../debug/test_panel_screen.dart';

/// Cast / 제어 패널 / 테스트 패널을 탭 하나로 묶어 자유롭게 전환합니다.
/// IndexedStack을 사용해 각 화면의 상태(WS 연결, Cast 연결)가 유지됩니다.
class SessionShellScreen extends StatefulWidget {
  final String sessionId;
  final int initialTab; // 0=cast, 1=control, 2=debug

  const SessionShellScreen({
    super.key,
    required this.sessionId,
    this.initialTab = 0,
  });

  /// GoRouterState의 쿼리 파라미터에서 초기 탭 번호를 읽습니다.
  static int tabFromState(GoRouterState state) {
    final t = state.uri.queryParameters['tab'];
    return int.tryParse(t ?? '') ?? 0;
  }

  @override
  State<SessionShellScreen> createState() => _SessionShellScreenState();
}

class _SessionShellScreenState extends State<SessionShellScreen> {
  late int _tab;

  @override
  void initState() {
    super.initState();
    _tab = widget.initialTab;
  }

  void _goToControl() => setState(() => _tab = 1);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: IndexedStack(
        index: _tab,
        children: [
          // Tab 0 — TV 연결 (Cast)
          CastScreen(
            sessionId: widget.sessionId,
            onGoToControl: _goToControl,
          ),
          // Tab 1 — 제어 패널 (Control)
          ControlPanelScreen(sessionId: widget.sessionId),
          // Tab 2 — 로컬 테스트 패널
          const TestPanelScreen(),
        ],
      ),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _tab,
        onTap: (i) => setState(() => _tab = i),
        selectedItemColor: const Color(0xFFE91E8C),
        unselectedItemColor: Colors.grey,
        type: BottomNavigationBarType.fixed,
        items: const [
          BottomNavigationBarItem(
            icon: Icon(Icons.cast),
            label: 'TV 연결',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.dashboard_outlined),
            label: '제어 패널',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.bug_report_outlined),
            label: '테스트',
          ),
        ],
      ),
    );
  }
}
