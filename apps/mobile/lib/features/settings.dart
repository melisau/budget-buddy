import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../core/theme.dart';
import 'common.dart';

class SettingsScreen extends ConsumerWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = Supabase.instance.client.auth;
    final account = ref.watch(pageProvider('account'));
    final notifications = ref.watch(pageProvider('notifications'));
    return Scaffold(
      appBar: AppBar(title: const Text('Ayarlar')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Card(
            child: ListTile(
              leading: const CircleAvatar(child: Icon(Icons.person)),
              title: const Text('Hesabım', style: TextStyle(fontWeight: FontWeight.w700, color: ink)),
              subtitle: Text(auth.currentUser?.email ?? ''),
            ),
          ),
          const Gap(),
          Card(
            child: ListTile(
              leading: const Icon(Icons.currency_exchange),
              title: const Text('Para birimi'),
              subtitle: const Text('Şimdilik web sitesinden değiştirilir'),
              trailing: account.maybeWhen(
                data: (d) => DropdownButton<String>(
                  value: '${d['currency']}',
                  underline: const SizedBox(),
                  items: [
                    for (final c in const ['TRY', 'EUR', 'USD', 'GBP'])
                      DropdownMenuItem(value: c, child: Text(c)),
                  ],
                  // The account API only accepts same-origin web requests for now.
                  onChanged: null,
                ),
                orElse: () => const SizedBox.square(dimension: 20, child: CircularProgressIndicator(strokeWidth: 2)),
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
                subtitle: const Text('Şimdilik web sitesinden değiştirilir'),
                onChanged: null,
              ),
              orElse: () => const ListTile(leading: Icon(Icons.mail_outline), title: Text('E-posta bildirimleri')),
            ),
          ),
          const Gap(),
          const Card(
            child: ListTile(
              leading: Icon(Icons.manage_accounts_outlined),
              title: Text('Hesabı silme'),
              subtitle: Text('budgetbuddy.melisauyar.com/account-deletion'),
            ),
          ),
          const Gap(),
          Card(
            child: ListTile(
              leading: const Icon(Icons.logout, color: expense),
              title: const Text('Çıkış yap', style: TextStyle(color: expense, fontWeight: FontWeight.w700)),
              onTap: () => auth.signOut(scope: SignOutScope.local),
            ),
          ),
        ],
      ),
    );
  }
}
