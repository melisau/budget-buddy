/// Public build settings, passed with --dart-define. No server secrets belong here.
class AppConfig {
  static const apiUrl = String.fromEnvironment('API_URL');
  static const supabaseUrl = String.fromEnvironment('SUPABASE_URL');
  static const supabaseKey = String.fromEnvironment('SUPABASE_PUBLISHABLE_KEY');

  static bool get isValid =>
      apiUrl.isNotEmpty && supabaseUrl.isNotEmpty && supabaseKey.isNotEmpty;
}
