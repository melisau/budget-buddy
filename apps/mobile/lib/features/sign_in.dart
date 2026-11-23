import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../core/config.dart';
import '../core/google_auth.dart';
import '../core/theme.dart';

class SignInScreen extends StatefulWidget {
  const SignInScreen({super.key});

  @override
  State<SignInScreen> createState() => _SignInScreenState();
}

class _SignInScreenState extends State<SignInScreen> {
  final _form = GlobalKey<FormState>();
  final _email = TextEditingController();
  final _password = TextEditingController();
  bool _busy = false;
  bool _hidden = true;
  String? _error;

  @override
  void dispose() {
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
      await Supabase.instance.client.auth.signInWithPassword(
        email: _email.text.trim(),
        password: _password.text,
      );
    } on AuthException {
      if (mounted) setState(() => _error = 'E-posta veya şifre hatalı.');
    } catch (_) {
      if (mounted) {
        setState(() => _error = 'Bağlantı kurulamadı. Lütfen tekrar deneyin.');
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _google() async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await signInWithGoogle();
    } catch (e) {
      if (mounted) {
        setState(
          () => _error =
              'Google ile giriş yapılamadı. Kod: ${googleErrorCode(e)}',
        );
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    body: SafeArea(
      child: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Form(
            key: _form,
            child: AutofillGroup(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const Text.rich(
                    TextSpan(
                      children: [
                        TextSpan(
                          text: 'Budget',
                          style: TextStyle(color: ink),
                        ),
                        TextSpan(
                          text: 'Buddy',
                          style: TextStyle(color: brand),
                        ),
                      ],
                    ),
                    style: TextStyle(fontSize: 32, fontWeight: FontWeight.w900),
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'Finansal yolculuğuna devam et.',
                    style: TextStyle(fontSize: 16, color: muted),
                  ),
                  const SizedBox(height: 30),
                  TextFormField(
                    controller: _email,
                    keyboardType: TextInputType.emailAddress,
                    textInputAction: TextInputAction.next,
                    autofillHints: const [AutofillHints.email],
                    decoration: const InputDecoration(
                      labelText: 'E-posta',
                      prefixIcon: Icon(Icons.mail_outline),
                    ),
                    validator: (v) => (v ?? '').contains('@')
                        ? null
                        : 'Geçerli bir e-posta girin.',
                  ),
                  const SizedBox(height: 14),
                  TextFormField(
                    controller: _password,
                    obscureText: _hidden,
                    autofillHints: const [AutofillHints.password],
                    onFieldSubmitted: (_) => _submit(),
                    decoration: InputDecoration(
                      labelText: 'Şifre',
                      prefixIcon: const Icon(Icons.lock_outline),
                      suffixIcon: IconButton(
                        tooltip: _hidden ? 'Şifreyi göster' : 'Şifreyi gizle',
                        onPressed: () => setState(() => _hidden = !_hidden),
                        icon: Icon(
                          _hidden
                              ? Icons.visibility_outlined
                              : Icons.visibility_off_outlined,
                        ),
                      ),
                    ),
                    validator: (v) =>
                        (v ?? '').isEmpty ? 'Şifrenizi girin.' : null,
                  ),
                  if (_error != null)
                    Padding(
                      padding: const EdgeInsets.only(top: 12),
                      child: Text(
                        _error!,
                        style: const TextStyle(color: expense),
                      ),
                    ),
                  const SizedBox(height: 20),
                  FilledButton(
                    onPressed: _busy ? null : _submit,
                    child: _busy
                        ? const SizedBox.square(
                            dimension: 22,
                            child: CircularProgressIndicator(strokeWidth: 2.5),
                          )
                        : const Text('Giriş yap'),
                  ),
                  if (AppConfig.googleEnabled) ...[
                    const SizedBox(height: 12),
                    OutlinedButton.icon(
                      onPressed: _busy ? null : _google,
                      style: OutlinedButton.styleFrom(
                        minimumSize: const Size.fromHeight(52),
                      ),
                      icon: const Icon(Icons.account_circle_outlined),
                      label: const Text('Google ile giriş yap'),
                    ),
                  ],
                ],
              ),
            ),
          ),
        ),
      ),
    ),
  );
}
