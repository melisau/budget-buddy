import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/theme.dart';
import 'common.dart';
import 'data.dart';

/// How a monthly allowance splits into savings and spending.
({num saved, num spendable}) splitAllowance(num monthly, num percent) {
  final saved = monthly * percent / 100;
  return (saved: saved, spendable: monthly - saved);
}

/// The private monthly allowance plan, same as the web.
class AllowanceScreen extends ConsumerWidget {
  const AllowanceScreen({super.key});
  static const _path = 'allowance';

  Future<void> _edit(
    BuildContext context,
    WidgetRef ref,
    Map<String, dynamic>? plan,
  ) => showFormSheet(
    context,
    title: plan == null ? 'Harçlık planı oluştur' : 'Harçlık planını düzenle',
    fields: [
      FieldSpec(
        'monthlyAmount',
        'Aylık harçlık',
        kind: FieldKind.amount,
        initial: plan?['monthly_amount'],
      ),
      FieldSpec(
        'savingsPercent',
        'Birikim yüzdesi (0–100)',
        kind: FieldKind.amount,
        initial: plan?['savings_percent'] ?? 20,
      ),
    ],
    onSubmit: (v) async {
      final percent = (num.tryParse('${v['savingsPercent']}') ?? 0)
          .round()
          .clamp(0, 100);
      await ref.read(apiProvider).put(_path, {
        'monthlyAmount': v['monthlyAmount'],
        'savingsPercent': percent,
      });
      ref.invalidate(pageProvider(_path));
    },
  );

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final currency =
        ref.watch(pageProvider('account')).value?['currency']?.toString() ??
        'TRY';
    return ApiPage(
      title: 'Harçlık Planı',
      path: _path,
      builder: (context, ref, d) {
        final plan = (d['plan'] as Map?)?.cast<String, dynamic>();
        if (plan == null) {
          return [
            const EmptyNote(
              'Henüz harçlık planın yok. Aylık harçlığını ve ne kadarını biriktirmek istediğini belirle.',
            ),
            const Gap(),
            FilledButton.icon(
              onPressed: () => _edit(context, ref, null),
              icon: const Icon(Icons.add),
              label: const Text('Plan oluştur'),
            ),
          ];
        }
        final monthly = num.tryParse('${plan['monthly_amount']}') ?? 0;
        final percent = num.tryParse('${plan['savings_percent']}') ?? 0;
        final split = splitAllowance(monthly, percent);
        return [
          Card(
            child: Padding(
              padding: const EdgeInsets.all(18),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Aylık harçlık', style: TextStyle(color: context.muted)),
                  Text(
                    money(monthly, currency),
                    style: TextStyle(
                      fontSize: 28,
                      fontWeight: FontWeight.w800,
                      color: context.ink,
                    ),
                  ),
                  const SizedBox(height: 14),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(8),
                    child: LinearProgressIndicator(
                      value: percent / 100,
                      minHeight: 10,
                      color: income,
                    ),
                  ),
                  const SizedBox(height: 14),
                  _row(
                    context,
                    'Biriktir (%$percent)',
                    money(split.saved, currency),
                    income,
                  ),
                  const SizedBox(height: 6),
                  _row(
                    context,
                    'Harcayabilirsin',
                    money(split.spendable, currency),
                    context.ink,
                  ),
                ],
              ),
            ),
          ),
          const Gap(),
          Text(
            'Bu plan yalnızca sana görünür.',
            style: TextStyle(color: context.muted),
          ),
          const Gap(),
          OutlinedButton.icon(
            onPressed: () => _edit(context, ref, plan),
            icon: const Icon(Icons.edit_outlined),
            label: const Text('Planı düzenle'),
          ),
        ];
      },
    );
  }

  Widget _row(BuildContext context, String label, String value, Color color) =>
      Row(
        children: [
          Expanded(
            child: Text(label, style: TextStyle(color: context.ink)),
          ),
          Text(
            value,
            style: TextStyle(fontWeight: FontWeight.w700, color: color),
          ),
        ],
      );
}
