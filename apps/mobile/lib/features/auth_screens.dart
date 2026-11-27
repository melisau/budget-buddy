import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../core/config.dart';
import '../core/i18n.dart';
import '../core/theme.dart';

/// True when the signed-in user has an authenticator app but this session has
/// not entered its code yet (aal1 while aal2 is possible). The API refuses
/// such sessions, so the app shows the code screen first.
bool needsSecondStep() {
  final level = Supabase.instance.client.auth.mfa
      .getAuthenticatorAssuranceLevel();
  return level.currentLevel == AuthenticatorAssuranceLevels.aal1 &&
      level.nextLevel == AuthenticatorAssuranceLevels.aal2;
}

bool isEmail(String value) =>
    RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$').hasMatch(value.trim());

/// Where links in auth e-mails lead; they open on the website.
String authRedirect(String next) =>
    '${AppConfig.apiUrl}/auth/callback?next=$next';

/// Shared frame: title, subtitle, the form, and a link back.
class _AuthFrame extends StatelessWidget {
  const _AuthFrame({
    required this.title,
    required this.subtitle,
    required this.children,
  });
  final String title;
  final String subtitle;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(),
    body: SafeArea(
      child: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(24, 0, 24, 24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                title,
                style: TextStyle(
                  fontSize: 28,
                  fontWeight: FontWeight.w900,
                  color: context.ink,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                subtitle,
                style: TextStyle(fontSize: 15, color: context.muted),
              ),
              const SizedBox(height: 26),
              ...children,
            ],
          ),
        ),
      ),
    ),
  );
}

Widget _message(BuildContext context, String text, {bool error = false}) =>
    Padding(
      padding: const EdgeInsets.only(top: 12),
      child: Text(
        text,
        style: TextStyle(
          color: error ? expense : income,
          fontWeight: FontWeight.w600,
        ),
      ),
    );

class SignUpScreen extends StatefulWidget {
  const SignUpScreen({super.key});

  @override
  State<SignUpScreen> createState() => _SignUpScreenState();
}

class _SignUpScreenState extends State<SignUpScreen> {
  final _form = GlobalKey<FormState>();
  final _name = TextEditingController();
  final _email = TextEditingController();
  final _password = TextEditingController();
  bool _busy = false;
  bool _hidden = true;
  String? _error;
  bool _sent = false;

  @override
  void dispose() {
    _name.dispose();
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_form.currentState!.validate()) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final result = await Supabase.instance.client.auth.signUp(
        email: _email.text.trim(),
        password: _password.text,
        emailRedirectTo: authRedirect('/dashboard'),
        // E-mail templates read the language; full_name is the profile name.
        data: {'full_name': _name.text.trim(), 'language': I18n.language.value},
      );
      // With e-mail confirmation on there is no session yet: ask to check the inbox.
      if (result.session == null && mounted) setState(() => _sent = true);
    } on AuthException catch (e) {
      if (mounted) {
        setState(
          () => _error = e.message.toLowerCase().contains('registered')
              ? tx(
                  'Bu e-postayla zaten bir hesap var. Giriş yap ya da şifreni sıfırla.',
                  'An account with this e-mail already exists. Sign in or reset your password.',
                  'Mit dieser E-Mail gibt es bereits ein Konto. Melde dich an oder setze dein Passwort zurück.',
                )
              : tx(
                  'Hesap oluşturulamadı. Bilgileri kontrol edip tekrar dene.',
                  'The account could not be created. Check the details and try again.',
                  'Das Konto konnte nicht erstellt werden. Prüfe die Angaben und versuche es erneut.',
                ),
        );
      }
    } catch (_) {
      if (mounted) {
        setState(
          () => _error = t('Bağlantı kurulamadı. Lütfen tekrar deneyin.'),
        );
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => _AuthFrame(
    title: tx('Hesap oluştur', 'Create account', 'Konto erstellen'),
    subtitle: tx(
      'Birkaç adımda hesabını oluştur, finansal geleceğini planla.',
      'Create your account in a few steps and plan your financial future.',
      'Erstelle dein Konto in wenigen Schritten und plane deine finanzielle Zukunft.',
    ),
    children: _sent
        ? [
            Icon(Icons.mark_email_read_outlined, size: 56, color: brand),
            const SizedBox(height: 14),
            Text(
              tx(
                '${_email.text.trim()} adresine bir doğrulama e-postası gönderdik. Bağlantıya tıkla, sonra buradan giriş yap.',
                'We sent a confirmation e-mail to ${_email.text.trim()}. Open the link, then sign in here.',
                'Wir haben eine Bestätigungs-E-Mail an ${_email.text.trim()} gesendet. Öffne den Link und melde dich dann hier an.',
              ),
              textAlign: TextAlign.center,
              style: TextStyle(color: context.ink, fontSize: 15),
            ),
            const SizedBox(height: 20),
            FilledButton(
              onPressed: () => context.go('/sign-in'),
              child: Text(t('Giriş yap')),
            ),
          ]
        : [
            Form(
              key: _form,
              child: AutofillGroup(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    TextFormField(
                      controller: _name,
                      textInputAction: TextInputAction.next,
                      autofillHints: const [AutofillHints.name],
                      decoration: InputDecoration(
                        labelText: tx(
                          'Ad soyad',
                          'Full name',
                          'Vor- und Nachname',
                        ),
                        prefixIcon: const Icon(Icons.person_outline),
                      ),
                      validator: (v) => (v ?? '').trim().length < 2
                          ? t('En az 2 karakter girin.')
                          : null,
                    ),
                    const SizedBox(height: 14),
                    TextFormField(
                      controller: _email,
                      keyboardType: TextInputType.emailAddress,
                      textInputAction: TextInputAction.next,
                      autofillHints: const [AutofillHints.email],
                      decoration: InputDecoration(
                        labelText: tx('E-posta', 'E-mail', 'E-Mail'),
                        prefixIcon: const Icon(Icons.mail_outline),
                      ),
                      validator: (v) => isEmail(v ?? '')
                          ? null
                          : t('Geçerli bir e-posta girin.'),
                    ),
                    const SizedBox(height: 14),
                    TextFormField(
                      controller: _password,
                      obscureText: _hidden,
                      autofillHints: const [AutofillHints.newPassword],
                      onFieldSubmitted: (_) => _submit(),
                      decoration: InputDecoration(
                        labelText: t('Şifre'),
                        helperText: tx(
                          'En az 8 karakter',
                          'At least 8 characters',
                          'Mindestens 8 Zeichen',
                        ),
                        prefixIcon: const Icon(Icons.lock_outline),
                        suffixIcon: IconButton(
                          tooltip: _hidden
                              ? t('Şifreyi göster')
                              : t('Şifreyi gizle'),
                          onPressed: () => setState(() => _hidden = !_hidden),
                          icon: Icon(
                            _hidden
                                ? Icons.visibility_outlined
                                : Icons.visibility_off_outlined,
                          ),
                        ),
                      ),
                      validator: (v) =>
                          (v ?? '').length < 8 || (v ?? '').length > 128
                          ? tx(
                              'Şifre en az 8 karakter olmalı.',
                              'The password needs at least 8 characters.',
                              'Das Passwort braucht mindestens 8 Zeichen.',
                            )
                          : null,
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 14),
            Text(
              tx(
                'Hesap oluşturarak Kullanım Koşulları\'nı kabul etmiş ve kişisel verilerinin Gizlilik Politikası\'nda açıklandığı şekilde işleneceğini öğrenmiş olursun.',
                'By creating an account you accept the Terms of Use and acknowledge that your personal data is processed as described in the Privacy Policy.',
                'Mit dem Erstellen eines Kontos akzeptierst du die Nutzungsbedingungen und nimmst zur Kenntnis, dass deine Daten wie in der Datenschutzerklärung beschrieben verarbeitet werden.',
              ),
              style: TextStyle(fontSize: 12, color: context.muted),
            ),
            if (_error != null) _message(context, _error!, error: true),
            const SizedBox(height: 18),
            FilledButton(
              onPressed: _busy ? null : _submit,
              child: _busy
                  ? const SizedBox.square(
                      dimension: 22,
                      child: CircularProgressIndicator(strokeWidth: 2.5),
                    )
                  : Text(
                      tx(
                        'Ücretsiz hesap oluştur',
                        'Create a free account',
                        'Kostenloses Konto erstellen',
                      ),
                    ),
            ),
            TextButton(
              onPressed: () => context.go('/sign-in'),
              child: Text(
                tx(
                  'Zaten bir hesabın var mı? Giriş yap',
                  'Already have an account? Sign in',
                  'Schon ein Konto? Anmelden',
                ),
              ),
            ),
          ],
  );
}

class ForgotPasswordScreen extends StatefulWidget {
  const ForgotPasswordScreen({super.key});

  @override
  State<ForgotPasswordScreen> createState() => _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends State<ForgotPasswordScreen> {
  final _email = TextEditingController();
  bool _busy = false;
  bool _sent = false;
  String? _error;

  @override
  void dispose() {
    _email.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!isEmail(_email.text)) {
      setState(() => _error = t('Geçerli bir e-posta girin.'));
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      // The new password is set on the website, where the e-mail link opens.
      await Supabase.instance.client.auth.resetPasswordForEmail(
        _email.text.trim(),
        redirectTo: authRedirect('/update-password'),
      );
      if (mounted) setState(() => _sent = true);
    } on AuthException {
      // Same answer whether or not the address has an account.
      if (mounted) setState(() => _sent = true);
    } catch (_) {
      if (mounted) {
        setState(
          () => _error = t('Bağlantı kurulamadı. Lütfen tekrar deneyin.'),
        );
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => _AuthFrame(
    title: tx(
      'Şifreni sıfırlayalım',
      'Reset your password',
      'Passwort zurücksetzen',
    ),
    subtitle: tx(
      'E-posta adresini yaz; sana bir sıfırlama bağlantısı gönderelim. Yeni şifreni açılan sayfada belirlersin.',
      'Enter your e-mail address and we will send you a reset link. You set the new password on the page it opens.',
      'Gib deine E-Mail-Adresse ein; wir senden dir einen Link zum Zurücksetzen. Das neue Passwort legst du auf der geöffneten Seite fest.',
    ),
    children: [
      if (_sent) ...[
        Icon(Icons.mark_email_read_outlined, size: 56, color: brand),
        const SizedBox(height: 14),
        Text(
          tx(
            'Bu e-posta için bir hesap varsa sıfırlama bağlantısı gönderildi.',
            'If an account exists for this e-mail, a reset link has been sent.',
            'Falls es ein Konto mit dieser E-Mail gibt, wurde ein Link zum Zurücksetzen gesendet.',
          ),
          textAlign: TextAlign.center,
          style: TextStyle(color: context.ink, fontSize: 15),
        ),
        const SizedBox(height: 20),
        FilledButton(
          onPressed: () => context.go('/sign-in'),
          child: Text(t('Giriş yap')),
        ),
      ] else ...[
        TextField(
          controller: _email,
          keyboardType: TextInputType.emailAddress,
          autofillHints: const [AutofillHints.email],
          onSubmitted: (_) => _submit(),
          decoration: InputDecoration(
            labelText: tx('E-posta', 'E-mail', 'E-Mail'),
            prefixIcon: const Icon(Icons.mail_outline),
          ),
        ),
        if (_error != null) _message(context, _error!, error: true),
        const SizedBox(height: 18),
        FilledButton(
          onPressed: _busy ? null : _submit,
          child: _busy
              ? const SizedBox.square(
                  dimension: 22,
                  child: CircularProgressIndicator(strokeWidth: 2.5),
                )
              : Text(
                  tx(
                    'Sıfırlama bağlantısı gönder',
                    'Send reset link',
                    'Link zum Zurücksetzen senden',
                  ),
                ),
        ),
        TextButton(
          onPressed: () => context.go('/sign-in'),
          child: Text(
            tx(
              '← Giriş ekranına dön',
              '← Back to sign in',
              '← Zurück zur Anmeldung',
            ),
          ),
        ),
      ],
    ],
  );
}

/// Asks for the 6-digit code from the authenticator app after a password sign-in.
class TwoStepScreen extends StatefulWidget {
  const TwoStepScreen({super.key});

  @override
  State<TwoStepScreen> createState() => _TwoStepScreenState();
}

class _TwoStepScreenState extends State<TwoStepScreen> {
  final _code = TextEditingController();
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _code.dispose();
    super.dispose();
  }

  Future<void> _verify() async {
    final code = _code.text.replaceAll(RegExp(r'\s'), '');
    if (!RegExp(r'^\d{6}$').hasMatch(code)) {
      setState(
        () => _error = tx(
          '6 haneli kodu gir.',
          'Enter the 6-digit code.',
          'Gib den 6-stelligen Code ein.',
        ),
      );
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final mfa = Supabase.instance.client.auth.mfa;
      final factors = await mfa.listFactors();
      if (factors.totp.isEmpty) throw const AuthException('no factor');
      // Success upgrades the session to aal2; the router then opens the app.
      await mfa.challengeAndVerify(factorId: factors.totp.first.id, code: code);
    } on AuthException {
      if (mounted) {
        setState(
          () => _error = tx(
            'Kod yanlış ya da süresi dolmuş. Uygulamandaki güncel kodu gir.',
            'The code is wrong or expired. Enter the current code from your app.',
            'Der Code ist falsch oder abgelaufen. Gib den aktuellen Code aus deiner App ein.',
          ),
        );
      }
    } catch (_) {
      if (mounted) {
        setState(
          () => _error = t('Bağlantı kurulamadı. Lütfen tekrar deneyin.'),
        );
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => _AuthFrame(
    title: tx(
      'İki adımlı doğrulama',
      'Two-step verification',
      'Zwei-Faktor-Authentifizierung',
    ),
    subtitle: tx(
      'Doğrulama uygulamandaki 6 haneli BudgetBuddy kodunu gir.',
      'Enter the 6-digit BudgetBuddy code from your authenticator app.',
      'Gib den 6-stelligen BudgetBuddy-Code aus deiner Authenticator-App ein.',
    ),
    children: [
      TextField(
        controller: _code,
        autofocus: true,
        keyboardType: TextInputType.number,
        autofillHints: const [AutofillHints.oneTimeCode],
        maxLength: 6,
        textAlign: TextAlign.center,
        style: const TextStyle(
          fontSize: 26,
          letterSpacing: 8,
          fontWeight: FontWeight.w700,
        ),
        onSubmitted: (_) => _verify(),
        decoration: InputDecoration(
          labelText: tx(
            'Doğrulama kodu',
            'Verification code',
            'Bestätigungscode',
          ),
          counterText: '',
        ),
      ),
      if (_error != null) _message(context, _error!, error: true),
      const SizedBox(height: 18),
      FilledButton(
        onPressed: _busy ? null : _verify,
        child: _busy
            ? const SizedBox.square(
                dimension: 22,
                child: CircularProgressIndicator(strokeWidth: 2.5),
              )
            : Text(tx('Doğrula', 'Verify', 'Bestätigen')),
      ),
      TextButton(
        onPressed: () =>
            Supabase.instance.client.auth.signOut(scope: SignOutScope.local),
        child: Text(
          tx(
            '← Başka bir hesapla giriş yap',
            '← Sign in with a different account',
            '← Mit einem anderen Konto anmelden',
          ),
        ),
      ),
    ],
  );
}
