import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../features/home/screens/home_screen.dart';
import '../../features/session/screens/session_create_screen.dart';
import '../../features/session/screens/session_shell_screen.dart';
import '../../features/avatar/screens/ai_avatar_screen.dart';
import '../../features/invite/screens/invite_screen.dart';
import '../../features/purchase_auth/screens/purchase_auth_screen.dart';
import '../../features/purchase_auth/screens/purchase_success_screen.dart';
import '../../features/purchase_auth/services/purchase_auth_service.dart';

final appRouterProvider = Provider<GoRouter>((ref) {
  return GoRouter(
    initialLocation: '/',
    debugLogDiagnostics: false,
    routes: [
      GoRoute(
        path: '/',
        builder: (context, state) => const HomeScreen(),
      ),

      // ── 구매 인증 ──
      GoRoute(
        path: '/purchase/auth',
        builder: (context, state) => const PurchaseAuthScreen(),
      ),
      GoRoute(
        path: '/purchase/success',
        builder: (context, state) {
          final result = state.extra as PurchaseAuthResult;
          return PurchaseSuccessScreen(result: result);
        },
      ),

      // ── 세션 ──
      GoRoute(
        path: '/session/create',
        builder: (context, state) => const SessionCreateScreen(),
      ),
      GoRoute(
        path: '/session/:sessionId',
        builder: (context, state) => SessionShellScreen(
          sessionId: state.pathParameters['sessionId']!,
          initialTab: SessionShellScreen.tabFromState(state),
        ),
      ),
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
      GoRoute(
        path: '/session/:sessionId/avatar',
        builder: (context, state) => AiAvatarScreen(
          sessionId: state.pathParameters['sessionId']!,
        ),
      ),

      // ── User B 초대 ──
      GoRoute(
        path: '/invite/:token',
        builder: (context, state) => InviteScreen(
          token: state.pathParameters['token']!,
        ),
      ),
    ],
  );
});
