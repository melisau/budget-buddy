import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../core/theme.dart';
import 'common.dart';
import 'data.dart';
import '../core/i18n.dart';

/// Title, body and target screen for a stored notification. Mirrors
/// lib/notifications/messages.ts on the web so both say the same thing.
({String title, String body, String route}) describeNotification(
  String kind,
  Map<String, dynamic> data,
) {
  final currency = '${data['currency'] ?? 'TRY'}';
  String amount(Object? v) => money(num.tryParse('$v') ?? 0, currency);
  final total = data['scope'] == 'total';
  final category = categoryLabel('${data['categoryName'] ?? ''}');
  final spent = amount(data['spent']);
  final limit = amount(data['limit']);
  String whenText(int days) => days <= 0
      ? t('bugün')
      : days == 1
      ? t('yarın')
      : tx('$days gün sonra', 'in $days days', 'in $days Tagen');
  switch (kind) {
    case 'budget_warning':
      final usage = data['usage'];
      return (
        title: total
            ? tx(
                "Genel aylık bütçenin %$usage'ini kullandın",
                'You used $usage% of your overall monthly budget',
                'Du hast $usage % deines monatlichen Gesamtbudgets genutzt',
              )
            : tx(
                "$category bütçesinin %$usage'ini kullandın",
                'You used $usage% of your $category budget',
                'Du hast $usage % deines Budgets für $category genutzt',
              ),
        body: tx(
          '$spent / $limit harcadın. Limite yaklaşıyorsun.',
          'You spent $spent of $limit. You are close to the limit.',
          'Du hast $spent von $limit ausgegeben. Du näherst dich dem Limit.',
        ),
        route: '/more/budgets',
      );
    case 'budget_exceeded':
      return (
        title: total
            ? t('Genel aylık bütçeni aştın')
            : tx(
                '$category bütçesini aştın',
                'You went over your $category budget',
                'Du hast dein Budget für $category überschritten',
              ),
        body: tx(
          '$spent harcadın; limit $limit.',
          'You spent $spent; the limit is $limit.',
          'Du hast $spent ausgegeben; das Limit ist $limit.',
        ),
        route: '/more/budgets',
      );
    case 'goal_due':
      final when = whenText(int.tryParse('${data['daysLeft']}') ?? 0);
      final goal = data['goalName'];
      final left = amount(data['remaining']);
      final deadline = data['deadline'] ?? '';
      return (
        title: tx(
          '$goal hedefinin tarihi $when',
          'Your goal “$goal” is due $when',
          'Dein Ziel „$goal“ ist $when fällig',
        ),
        body: tx(
          'Hedefe $left kaldı (son tarih $deadline).',
          '$left left to reach it (deadline $deadline).',
          'Noch $left bis zum Ziel (Frist $deadline).',
        ),
        route: '/more/goals',
      );
    case 'recurring_due':
      final when = whenText(int.tryParse('${data['daysLeft']}') ?? 0);
      final name = data['title'];
      final income = data['type'] == 'income';
      final due = '${amount(data['amount'])} · ${data['dueDate'] ?? ''}';
      return (
        title: income
            ? tx(
                '$name geliri $when',
                '$name income is due $when',
                'Einnahme $name ist $when fällig',
              )
            : tx(
                '$name ödemesi $when',
                '$name payment is due $when',
                'Zahlung $name ist $when fällig',
              ),
        body: tx(
          "$due. Genel Bakış'taki hatırlatmadan “Ödedim” ya da “Bu sefer ödemedim” seç.",
          '$due. Mark it as paid or skipped in the reminder on Overview.',
          '$due. Markiere sie in der Erinnerung auf der Übersicht als bezahlt oder übersprungen.',
        ),
        route: '/overview',
      );
    case 'family_invite':
      final group = data['groupName'];
      return (
        title: tx(
          '“$group” grubuna davet edildin',
          'You were invited to “$group”',
          'Du wurdest zu „$group“ eingeladen',
        ),
        body: t('Daveti Aile sayfasından kabul edebilir veya reddedebilirsin.'),
        route: '/more/family',
      );
    default:
      return (title: t('Bildirim'), body: '', route: '/overview');
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
    title: t('Bildirimler'),
    path: 'notifications',
    builder: (context, ref, d) {
      final items = rows(d['notifications']);
      final unread = (d['unreadCount'] as num?)?.toInt() ?? 0;
      if (d['available'] == false) {
        return [EmptyNote(t('Bildirimler şu anda kullanılamıyor.'))];
      }
      if (items.isEmpty) {
        return [
          EmptyNote(
            t(
              'Henüz bildirimin yok. Bütçe ve hedeflerinle ilgili uyarılar burada görünür.',
            ),
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
              label: Text(
                tx(
                  'Tümünü okundu say ($unread)',
                  'Mark all as read ($unread)',
                  'Alle als gelesen markieren ($unread)',
                ),
              ),
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
