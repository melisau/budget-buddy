import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../core/theme.dart';
import 'common.dart';
import 'data.dart';
import '../core/i18n.dart';

const remindersPath = 'recurring/reminders';

/// When the payment is due, in words.
String dueText(String date, DateTime today) {
  final due = DateTime.parse(date);
  final days = DateTime(
    due.year,
    due.month,
    due.day,
  ).difference(DateTime(today.year, today.month, today.day)).inDays;
  if (days < 0) {
    return tx(
      '${-days} gün gecikti',
      '${-days} days overdue',
      '${-days} Tage überfällig',
    );
  }
  if (days == 0) return t('bugün');
  if (days == 1) return t('yarın');
  return tx('$days gün sonra', 'in $days days', 'in $days Tagen');
}

/// Recurring payments waiting for "paid" or "not this time", like the web's
/// reminder window. Each answer needs a second, summarized confirmation.
class DueReminders extends ConsumerWidget {
  const DueReminders({super.key});

  Future<void> _settle(
    BuildContext context,
    WidgetRef ref,
    Map<String, dynamic> item,
    bool paid,
  ) async {
    final income = item['type'] == 'income';
    final amount = money(
      num.tryParse('${item['amount']}') ?? 0,
      '${item['currency'] ?? 'TRY'}',
    );
    final date = DateFormat(
      'd MMMM',
      I18n.locale,
    ).format(DateTime.parse('${item['nextDate']}'));
    final ok = await showDialog<bool>(
      context: context,
      builder: (dialog) => AlertDialog(
        title: Text(
          paid
              ? t('Ödendi olarak kaydedilsin mi?')
              : t('Bu dönem atlansın mı?'),
        ),
        content: Text(
          paid
              ? tx(
                  '“${item['title']}” · $amount · $date. ${income ? 'Gelir' : 'Gider'} olarak işlemlerine eklenecek.',
                  '“${item['title']}” · $amount · $date. It will be added to your transactions as ${income ? 'income' : 'an expense'}.',
                  '„${item['title']}“ · $amount · $date. Sie wird als ${income ? 'Einnahme' : 'Ausgabe'} zu deinen Transaktionen hinzugefügt.',
                )
              : tx(
                  '“${item['title']}” · $amount · $date. Bu dönem için işlem eklenmeyecek; sonraki ödeme yine hatırlatılacak.',
                  '“${item['title']}” · $amount · $date. No transaction is added this time; the next payment is reminded as usual.',
                  '„${item['title']}“ · $amount · $date. Diesmal wird keine Transaktion hinzugefügt; an die nächste Zahlung wird wie gewohnt erinnert.',
                ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialog, false),
            child: Text(t('Geri dön')),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(dialog, true),
            child: Text(paid ? t('Evet, kaydet') : t('Evet, atla')),
          ),
        ],
      ),
    );
    if (ok != true || !context.mounted) return;
    final messenger = ScaffoldMessenger.of(context);
    try {
      await ref.read(apiProvider).post('recurring/${item['id']}/settle', {
        'date': item['nextDate'],
        'paid': paid,
      });
      messenger.showSnackBar(
        SnackBar(
          content: Text(
            paid
                ? tx(
                    '${item['title']} kaydedildi.',
                    '${item['title']} recorded.',
                    '${item['title']} erfasst.',
                  )
                : tx(
                    '${item['title']} bu dönem için atlandı.',
                    '${item['title']} skipped this time.',
                    '${item['title']} diesmal übersprungen.',
                  ),
          ),
        ),
      );
    } catch (e) {
      // 409: already handled elsewhere (for example on the web); just refresh.
      messenger.showSnackBar(SnackBar(content: Text('$e')));
    }
    ref.invalidate(pageProvider(remindersPath));
    ref.invalidate(dashboardProvider);
    ref.invalidate(transactionsProvider);
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final items = rows(
      ref.watch(pageProvider(remindersPath)).value?['reminders'],
    );
    if (items.isEmpty) return const SizedBox.shrink();
    final today = DateTime.now();
    return Column(
      children: [
        for (final item in items)
          Card(
            margin: const EdgeInsets.only(bottom: 12),
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 14, 16, 10),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(Icons.notifications_active, color: brand),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          item['type'] == 'income'
                              ? tx(
                                  '${item['title']} geliri ${dueText('${item['nextDate']}', today)}',
                                  '${item['title']} income ${dueText('${item['nextDate']}', today)}',
                                  'Einnahme ${item['title']} ${dueText('${item['nextDate']}', today)}',
                                )
                              : tx(
                                  '${item['title']} ödemesi ${dueText('${item['nextDate']}', today)}',
                                  '${item['title']} payment ${dueText('${item['nextDate']}', today)}',
                                  'Zahlung ${item['title']} ${dueText('${item['nextDate']}', today)}',
                                ),
                          style: TextStyle(
                            fontWeight: FontWeight.w700,
                            color: context.ink,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    money(
                      num.tryParse('${item['amount']}') ?? 0,
                      '${item['currency'] ?? 'TRY'}',
                    ),
                    style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.w800,
                      color: context.ink,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.end,
                    children: [
                      TextButton(
                        onPressed: () => _settle(context, ref, item, false),
                        child: Text(
                          item['type'] == 'income'
                              ? t('Bu sefer gelmedi')
                              : t('Bu sefer ödemedim'),
                        ),
                      ),
                      const SizedBox(width: 8),
                      FilledButton(
                        onPressed: () => _settle(context, ref, item, true),
                        child: Text(
                          item['type'] == 'income' ? t('Geldi') : t('Ödedim'),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
      ],
    );
  }
}
