class AppConfig {
  const AppConfig._();

  // Team B: AI 대화 서버
  static const String baseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://localhost:3000',
  );

  static const String wsUrl = String.fromEnvironment(
    'WS_URL',
    defaultValue: 'ws://localhost:3000',
  );

  static const String inviteBaseUrl = String.fromEnvironment(
    'INVITE_BASE_URL',
    defaultValue: 'http://localhost:4000',
  );

  // Team C: 관리자/상품/주문 서버 (구매 인증 API)
  static const String adminServerUrl = String.fromEnvironment(
    'ADMIN_SERVER_URL',
    defaultValue: 'http://localhost:8080',
  );
}
