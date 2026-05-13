import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../features/home/screens/home_screen.dart';
import '../../features/session/screens/session_create_screen.dart';
import '../../features/session/screens/session_shell_screen.dart';
import '../../features/avatar/screens/ai_avatar_screen.dart';
import '../../features/invite/screens/invite_screen.dart';

final appRouterProvider = Provider<GoRouter>((ref) {
  return GoRouter(
    initialLocation: '/',
    debugLogDiagnostics: false,
    routes: [
      GoRoute(
        path: '/',
        builder: (context, state) => const HomeScreen(),
      ),
      GoRoute(
        path: '/session/create',
        builder: (context, state) => const SessionCreateScreen(),
      ),
      // Cast + 제어 패널 + 테스트 패널을 탭 하나로 묶은 셸 화면
      GoRoute(
        path: '/session/:sessionId',
        builder: (context, state) => SessionShellScreen(
          sessionId: state.pathParameters['sessionId']!,
          initialTab: SessionShellScreen.tabFromState(state),
        ),
      ),
      // 기존 경로 호환 — cast/control 직접 접근 시 셸로 리다이렉트
      GoRoute(
        path: '/session/:sessionId/cast',
        redirect: (context, state) =>
            '/session/${state.pathParameters['sessionId']}',
      ),
      GoRoute(
        path: '/session/:sessionId/control',
        redirect: (context, state) =>
            '/session/${state.pathParameters['sessionId']}?tab=1',
      ),
      // TV 전체화면 AI 아바타 (TV 기기에서 직접 접근)
      GoRoute(
        path: '/session/:sessionId/avatar',
        builder: (context, state) => AiAvatarScreen(
          sessionId: state.pathParameters['sessionId']!,
        ),
      ),
      // User B 초대 화면 (SMS 링크로 접속)
      GoRoute(
        path: '/invite/:token',
        builder: (context, state) => InviteScreen(
          token: state.pathParameters['token']!,
        ),
      ),
    ],
  );
});
