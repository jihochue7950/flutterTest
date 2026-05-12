class AppConfig {
  const AppConfig._();

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
}
