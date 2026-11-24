import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../core/theme.dart';
import 'common.dart';
import 'data.dart';

/// Title, body and target screen for a stored notification. Mirrors
/// lib/notifications/messages.ts on the web so both say the same thing.
({String title, String body, String route}) describeNotification(
  String kind,
  Map<String, dynamic> data,
) {
  final currency = '${data['currency'] ?? 'TRY'}';
  String amount(Object? v) => money(num.tryParse('$v') ?? 0, currency);
  final category = categoryLabel('${data['categoryName'] ?? ''}');
  switch (kind) {
    case 'budget_warning':
      return (
        title: "$category bütçesinin %${data['usage']}'ini kullandın",
        body:
            '${amount(data['spent'])} / ${amount(data['limit'])} harcadın. Limite yaklaşıyorsun.',
        route: '/more/budgets',
      );
    case 'budget_exceeded':
      return (
        title: '$category bütçesini aştın',
        body:
            '${amount(data['spent'])} harcadın; limit ${amount(data['limit'])}.',
        route: '/more/budgets',
      );
    case 'goal_due':
      final days = int.tryParse('${data['daysLeft']}') ?? 0;
      final when = days == 0
          ? 'bugün'
          : days == 1
          ? 'yarın'
          : '$days gün sonra';
      return (
        title: "${data['goalName']} hedefinin tarihi $when",
        body:
            'Hedefe ${amount(data['remaining'])} kaldı (son tarih ${data['deadline'] ?? ''}).',
        route: '/more/goals',
      );
    case 'family_invite':
      return (
        title: '“${data['groupName']}” grubuna davet edildin',
        body: 'Daveti Aile sayfasından kabul edebilir veya reddedebilirsin.',
        route: '/more/family',
      );
    default:
      return (title: 'Bildirim', body: '', route: '/overview');
  }
}

class NotificationsScreen extends ConsumerStatefulWidget {
  const NotificationsScreen({super.key});

  @override
  ConsumerState<NotificationsScreen> createState() =>
      _NotificationsScreenState();
}

class _NotificationsScreenState extends ConsumerState<NotificationsScreen> {
  bool _marking = false;

  Future<void> _markRead([List<String>? ids]) async {
    setState(() => _marking = true);
    try {
      await ref.read(apiProvider).post('notifications', {'ids': ?ids});
      ref.invalidate(pageProvider('notifications'));
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text('$e')));
      }
    } finally {
      if (mounted) setState(() => _marking = false);
    }
  }

  @override
  Widget build(BuildContext context) => ApiPage(
    title: 'Bildirimler',
    path: 'notifications',
    builder: (context, ref, d) {
      final items = rows(d['notifications']);
      final unread = (d['unreadCount'] as num?)?.toInt() ?? 0;
      if (d['available'] == false) {
        return const [EmptyNote('Bildirimler şu anda kullanılamıyor.')];
      }
      if (items.isEmpty) {
        return const [
          EmptyNote(
            'Henüz bildirimin yok. Bütçe ve hedeflerinle ilgili uyarılar burada görünür.',
          ),
        ];
      }
      return [
        if (unread > 0)
          Align(
            alignment: Alignment.centerRight,
            child: TextButton.icon(
              onPressed: _marking ? null : () => _markRead(),
              icon: const Icon(Icons.done_all),
              label: Text('Tümünü okundu say ($unread)'),
            ),
          ),
        for (final n in items) _tile(context, n),
      ];
    },
  );

  Widget _tile(BuildContext context, Map<String, dynamic> n) {
    final text = describeNotification(
      '${n['kind']}',
      (n['data'] as Map?)?.cast<String, dynamic>() ?? const {},
    );
    final unread = n['readAt'] == null;
    return Card(
      child: ListTile(
        leading: Icon(
          unread ? Icons.notifications_active : Icons.notifications_none,
          color: unread ? brand : context.muted,
        ),
        title: Text(
          text.title,
          style: TextStyle(
            color: context.ink,
            fontWeight: unread ? FontWeight.w700 : FontWeight.w500,
          ),
        ),
        subtitle: Text(text.body),
        onTap: () {
          if (unread) _markRead(['${n['id']}']);
          context.go(text.route);
        },
      ),
    );
  }
}
