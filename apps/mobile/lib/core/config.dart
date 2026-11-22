/// Public build settings, passed with --dart-define. No server secrets belong here.
class AppConfig {
  static const apiUrl = String.fromEnvironment('API_URL');
  static const supabaseUrl = String.fromEnvironment('SUPABASE_URL');
  static const supabaseKey = String.fromEnvironment('SUPABASE_PUBLISHABLE_KEY');
  static const googleWebClientId = String.fromEnvironment(
    'GOOGLE_WEB_CLIENT_ID',
  );

  static bool get googleEnabled => googleWebClientId.isNotEmpty;

  static bool get isValid =>
      apiUrl.isNotEmpty && supabaseUrl.isNotEmpty && supabaseKey.isNotEmpty;
}
