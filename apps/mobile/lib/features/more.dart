import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../core/theme.dart';

class MoreScreen extends StatelessWidget {
  const MoreScreen({super.key});

  static const _items = [
    ('notifications', 'Bildirimler', Icons.notifications_outlined),
    ('family', 'Aile Grubu', Icons.groups_outlined),
    ('wishlists', 'Dilek Listeleri', Icons.card_giftcard_outlined),
    ('recurring', 'Otomatik Talimatlar', Icons.repeat),
    ('budgets', 'Bütçeler', Icons.savings_outlined),
    ('allowance', 'Gelir Planı', Icons.wallet_outlined),
    ('category-rules', 'Kategori Kuralları', Icons.rule),
    ('accounts', 'Hesaplar', Icons.account_balance_outlined),
    ('goals', 'Hedefler', Icons.track_changes),
    ('analytics', 'Analiz', Icons.insights),
    ('settings', 'Ayarlar', Icons.settings_outlined),
  ];

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Diğer')),
    body: ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: _items.length,
      separatorBuilder: (_, _) => const SizedBox(height: 8),
      itemBuilder: (_, i) {
        final (route, label, icon) = _items[i];
        return Card(
          child: ListTile(
            leading: Icon(icon, color: brand),
            title: Text(
              label,
              style: TextStyle(fontWeight: FontWeight.w700, color: context.ink),
            ),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => context.go('/more/$route'),
          ),
        );
      },
    ),
  );
}
