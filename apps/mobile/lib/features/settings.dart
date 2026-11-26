import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../core/theme.dart';
import '../core/theme_mode.dart';
import 'avatar.dart';
import 'common.dart';
import 'csv.dart';
import 'data.dart';
import '../core/i18n.dart';

class SettingsScreen extends ConsumerWidget {
  const SettingsScreen({super.key});

  Future<void> _deleteAccount(BuildContext context, WidgetRef ref) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (_) => const _DeleteAccountDialog(),
    );
    if (confirmed != true || !context.mounted) return;
    final messenger = ScaffoldMessenger.of(context);
    final navigator = Navigator.of(context, rootNavigator: true);
    showDialog<void>(
      context: context,
      barrierDismissible: false,
      useRootNavigator: true,
      builder: (_) => const PopScope(
        canPop: false,
        child: Center(child: CircularProgressIndicator()),
      ),
    );
    try {
      await ref.read(apiProvider).delete('account');
      navigator.pop();
      messenger.showSnackBar(SnackBar(content: Text(t('Hesabın silindi.'))));
      try {
        await Supabase.instance.client.auth.signOut(scope: SignOutScope.local);
      } catch (_) {
        // The identity is gone; the local session may already be invalid.
      }
    } catch (e) {
      navigator.pop();
      messenger.showSnackBar(SnackBar(content: Text('$e')));
    }
  }

  Future<void> _save(
    BuildContext context,
    WidgetRef ref,
    String path,
    String method,
    Map<String, dynamic> body,
    String? done,
  ) async {
    final messenger = ScaffoldMessenger.of(context);
    try {
      await ref.read(apiProvider).patch(path, body);
      ref.invalidate(pageProvider(path));
      if (done != null) messenger.showSnackBar(SnackBar(content: Text(done)));
    } catch (e) {
      messenger.showSnackBar(SnackBar(content: Text('$e')));
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = Supabase.instance.client.auth;
    final fullName = auth.currentUser?.userMetadata?['full_name'];
    final displayName = fullName is String && fullName.trim().isNotEmpty
        ? fullName.trim()
        : auth.currentUser?.email?.split('@').first ?? t('Hesabım');
    final account = ref.watch(pageProvider('account'));
    final notifications = ref.watch(pageProvider('notifications'));
    return Scaffold(
      appBar: AppBar(title: Text(t('Ayarlar'))),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Card(
            child: ListTile(
              leading: ProfileAvatar(name: displayName),
              trailing: const Icon(Icons.photo_camera_outlined),
              onTap: () => showAvatarPicker(context, ref, displayName),
              title: Text(
                displayName,
                style: TextStyle(
                  fontWeight: FontWeight.w700,
                  color: context.ink,
                ),
              ),
              subtitle: Text(auth.currentUser?.email ?? ''),
            ),
          ),
          const Gap(),
          Card(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    t('Dil'),
                    style: TextStyle(
                      fontWeight: FontWeight.w700,
                      color: context.ink,
                    ),
                  ),
                  const SizedBox(height: 10),
                  SegmentedButton<String>(
                    segments: [
                      for (final entry in I18n.names.entries)
                        ButtonSegment(
                          value: entry.key,
                          label: Text(entry.value),
                        ),
                    ],
                    selected: {I18n.language.value},
                    onSelectionChanged: (value) async {
                      await I18n.set(value.first);
                      try {
                        // Also used for the website and e-mails.
                        await ref.read(apiProvider).patch('account', {
                          'language': value.first,
                        });
                      } catch (_) {}
                    },
                  ),
                ],
              ),
            ),
          ),
          const Gap(),
          Card(
            child: Padding(
              padding: EdgeInsets.fromLTRB(16, 12, 16, 14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    t('Görünüm'),
                    style: TextStyle(
                      fontWeight: FontWeight.w700,
                      color: context.ink,
                    ),
                  ),
                  SizedBox(height: 10),
                  SegmentedButton<ThemeMode>(
                    segments: [
                      ButtonSegment(
                        value: ThemeMode.system,
                        label: Text(t('Sistem')),
                        icon: Icon(Icons.brightness_auto_outlined),
                      ),
                      ButtonSegment(
                        value: ThemeMode.light,
                        label: Text(t('Açık')),
                        icon: Icon(Icons.light_mode_outlined),
                      ),
                      ButtonSegment(
                        value: ThemeMode.dark,
                        label: Text(t('Koyu')),
                        icon: Icon(Icons.dark_mode_outlined),
                      ),
                    ],
                    selected: {ref.watch(themeModeProvider)},
                    onSelectionChanged: (v) =>
                        ref.read(themeModeProvider.notifier).set(v.first),
                  ),
                ],
              ),
            ),
          ),
          const Gap(),
          Card(
            child: ListTile(
              leading: const Icon(Icons.currency_exchange),
              title: Text(t('Para birimi')),
              trailing: account.maybeWhen(
                data: (d) => DropdownButton<String>(
                  value: '${d['currency']}',
                  underline: const SizedBox(),
                  items: [
                    for (final c in const ['TRY', 'EUR', 'USD', 'GBP'])
                      DropdownMenuItem(value: c, child: Text(c)),
                  ],
                  onChanged: (v) {
                    if (v != null && v != d['currency']) {
                      _save(context, ref, 'account', 'patch', {
                        'currency': v,
                      }, t('Para birimi güncellendi.'));
                    }
                  },
                ),
                orElse: () => const SizedBox.square(
                  dimension: 20,
                  child: CircularProgressIndicator(strokeWidth: 2),
                ),
              ),
            ),
          ),
          const Gap(),
          Card(
            child: notifications.maybeWhen(
              data: (d) => SwitchListTile(
                secondary: const Icon(Icons.mail_outline),
                title: const Text('E-posta bildirimleri'),
                value: d['emailEnabled'] == true,
                subtitle: Text(t('Bütçe ve hedef uyarılarının günlük özeti')),
                onChanged: (v) => _save(
                  context,
                  ref,
                  'notifications',
                  'patch',
                  {'emailEnabled': v},
                  null,
                ),
              ),
              orElse: () => const ListTile(
                leading: Icon(Icons.mail_outline),
                title: Text('E-posta bildirimleri'),
              ),
            ),
          ),
          const Gap(),
          const CsvCard(),
          const Gap(),
          Card(
            child: ListTile(
              leading: Icon(Icons.delete_forever_outlined, color: expense),
              title: Text(
                t('Hesabı sil'),
                style: TextStyle(color: expense, fontWeight: FontWeight.w700),
              ),
              subtitle: Text(
                t('Hesabın ve tüm verilerin kalıcı olarak silinir'),
              ),
              onTap: () => _deleteAccount(context, ref),
            ),
          ),
          const Gap(),
          Card(
            child: ListTile(
              leading: Icon(Icons.logout, color: expense),
              title: Text(
                t('Çıkış yap'),
                style: TextStyle(color: expense, fontWeight: FontWeight.w700),
              ),
              onTap: () => auth.signOut(scope: SignOutScope.local),
            ),
          ),
        ],
      ),
    );
  }
}

class _DeleteAccountDialog extends StatefulWidget {
  const _DeleteAccountDialog();

  @override
  State<_DeleteAccountDialog> createState() => _DeleteAccountDialogState();
}

class _DeleteAccountDialogState extends State<_DeleteAccountDialog> {
  static Set<String> get _accepted => {'SİL', 'SIL', t('Sil'), 'sil'};
  final _input = TextEditingController();

  @override
  void dispose() {
    _input.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final ready = _accepted.contains(_input.text.trim());
    return AlertDialog(
      title: Text(t('Hesabın silinsin mi?')),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            t(
              'Hesabın, işlemlerin, bütçelerin, hedeflerin ve fişlerin kalıcı olarak silinir. Bu işlem geri alınamaz.',
            ),
          ),
          const SizedBox(height: 14),
          TextField(
            controller: _input,
            autocorrect: false,
            decoration: InputDecoration(labelText: t('Onaylamak için SİL yaz')),
            onChanged: (_) => setState(() {}),
          ),
        ],
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context, false),
          child: Text(t('Vazgeç')),
        ),
        TextButton(
          onPressed: ready ? () => Navigator.pop(context, true) : null,
          child: Text(
            t('Kalıcı olarak sil'),
            style: TextStyle(color: ready ? expense : context.muted),
          ),
        ),
      ],
    );
  }
}
