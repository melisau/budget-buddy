import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/theme.dart';
import '../core/widgets.dart';
import 'common.dart';
import 'data.dart';
import 'overview.dart';
import '../core/i18n.dart';

Map<String, String> get _accountTypes => {
  'cash': t('Nakit'),
  'checking': t('Vadesiz hesap'),
  'savings': t('Birikim'),
  'credit_card': t('Kredi kartı'),
  'digital_wallet': t('Dijital cüzdan'),
};
const _currencies = {'TRY': 'TRY', 'EUR': 'EUR', 'USD': 'USD', 'GBP': 'GBP'};
Map<String, String> get _frequencies => {
  'weekly': t('Haftalık'),
  'monthly': t('Aylık'),
  'yearly': t('Yıllık'),
};

Map<String, String> _named(List<Map<String, dynamic>> items) => {
  for (final i in items) '${i['id']}': categoryLabel('${i['name']}'),
};

class AccountsScreen extends StatelessWidget {
  const AccountsScreen({super.key});
  static const _path = 'accounts';

  @override
  Widget build(BuildContext context) => ApiPage(
    title: t('Hesaplar'),
    path: _path,
    addLabel: t('Hesap ekle'),
    onAdd: (context, ref, _) => showFormSheet(
      context,
      title: t('Hesap ekle'),
      fields: [
        FieldSpec('name', t('Hesap adı')),
        FieldSpec(
          'type',
          t('Tür'),
          kind: FieldKind.choice,
          options: (_) => _accountTypes,
          initial: 'checking',
        ),
        FieldSpec(
          'currency',
          t('Para birimi'),
          kind: FieldKind.choice,
          options: (_) => _currencies,
          initial: 'TRY',
        ),
        FieldSpec(
          'initialBalance',
          t('Başlangıç bakiyesi'),
          kind: FieldKind.amount,
          initial: 0,
        ),
      ],
      onSubmit: (v) async {
        await ref.read(apiProvider).post(_path, v);
        ref.invalidate(pageProvider(_path));
        ref.invalidate(dashboardProvider);
      },
    ),
    refreshAlso: const [_archivedPath],
    builder: (context, ref, d) {
      final items = rows(d['accounts']);
      final all = ref.watch(pageProvider(_archivedPath)).value;
      final archived = rows(all?['accounts'])
          .where((a) => a['archivedAt'] != null)
          .toList();
      return [
        if (items.length >= 2)
          Align(
            alignment: Alignment.centerRight,
            child: TextButton.icon(
              icon: const Icon(Icons.swap_horiz),
              label: Text(t('Hesaplar arası transfer')),
              onPressed: () => _transfer(context, ref, items),
            ),
          ),
        if (items.isEmpty) EmptyNote(t('Henüz hesap yok.')),
        for (final a in items) ...[
          Card(
            child: ListTile(
              leading: CircleAvatar(
                child: Icon(Icons.account_balance_outlined),
              ),
              title: Text(
                '${a['name']}',
                style: TextStyle(
                  fontWeight: FontWeight.w700,
                  color: context.ink,
                ),
              ),
              subtitle: Text(
                '${_accountTypes[a['type']] ?? a['type']} · ${money(a['balance'] as num, '${a['currency']}')}',
              ),
              trailing: PopupMenuButton<String>(
                tooltip: t('Hesap işlemleri'),
                onSelected: (v) => v == 'rename'
                    ? _rename(context, ref, a)
                    : _setArchived(context, ref, a, true),
                itemBuilder: (_) => [
                  PopupMenuItem(
                    value: 'rename',
                    child: Text(t('Adını değiştir')),
                  ),
                  PopupMenuItem(value: 'archive', child: Text(t('Arşivle'))),
                ],
              ),
            ),
          ),
          const Gap(),
        ],
        if (archived.isNotEmpty)
          ExpansionTile(
            title: Text(
              tx(
                'Arşivlenen hesaplar (${archived.length})',
                'Archived accounts (${archived.length})',
                'Archivierte Konten (${archived.length})',
              ),
              style: TextStyle(color: context.ink),
            ),
            children: [
              for (final a in archived)
                ListTile(
                  leading: Icon(
                    Icons.inventory_2_outlined,
                    color: context.muted,
                  ),
                  title: Text('${a['name']}'),
                  trailing: TextButton(
                    onPressed: () => _setArchived(context, ref, a, false),
                    child: Text(t('Geri al')),
                  ),
                ),
            ],
          ),
      ];
    },
  );

  static const _archivedPath = 'accounts?archived=true';

  static Future<void> _setArchived(
    BuildContext context,
    WidgetRef ref,
    Map<String, dynamic> a,
    bool archived,
  ) async {
    if (archived) {
      final ok = await showDialog<bool>(
        context: context,
        builder: (c) => AlertDialog(
          title: Text('“${a['name']}” arşivlensin mi?'),
          content: Text(
            t(
              'İşlemleri silinmez. Hesap listelerde ve formlarda görünmez; istediğin zaman geri alabilirsin.',
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(c, false),
              child: Text(t('Vazgeç')),
            ),
            TextButton(
              onPressed: () => Navigator.pop(c, true),
              child: Text(t('Arşivle')),
            ),
          ],
        ),
      );
      if (ok != true || !context.mounted) return;
    }
    await runAction(
      context,
      ref,
      _path,
      (api) => api.patch('accounts/${a['id']}', {'archived': archived}),
    );
    ref.invalidate(pageProvider(_archivedPath));
  }

  static Future<void> _rename(
    BuildContext context,
    WidgetRef ref,
    Map<String, dynamic> a,
  ) => showFormSheet(
    context,
    title: t('Hesabın adını değiştir'),
    fields: [FieldSpec('name', t('Hesap adı'), initial: '${a['name']}')],
    onSubmit: (v) async {
      await ref.read(apiProvider).patch('accounts/${a['id']}', {
        'name': '${v['name']}'.trim(),
      });
      ref.invalidate(pageProvider(_path));
      ref.invalidate(dashboardProvider);
    },
  );

  static Future<void> _transfer(
    BuildContext context,
    WidgetRef ref,
    List<Map<String, dynamic>> accounts,
  ) {
    final names = {
      for (final a in accounts) '${a['id']}': '${a['name']} (${a['currency']})',
    };
    return showFormSheet(
      context,
      title: t('Hesaplar arası transfer'),
      fields: [
        FieldSpec(
          'fromAccountId',
          t('Gönderen hesap'),
          kind: FieldKind.choice,
          options: (_) => names,
          resets: 'toAccountId',
        ),
        FieldSpec(
          'toAccountId',
          t('Alan hesap'),
          kind: FieldKind.choice,
          options: (v) => {...names}..remove(v['fromAccountId']),
        ),
        FieldSpec('amount', t('Tutar'), kind: FieldKind.amount),
        FieldSpec(
          'date',
          t('Tarih'),
          kind: FieldKind.date,
          initial: isoDate(DateTime.now()),
        ),
      ],
      onSubmit: (v) async {
        await ref.read(apiProvider).post('accounts/transfer', v);
        ref.invalidate(pageProvider(_path));
        ref.invalidate(dashboardProvider);
        ref.invalidate(transactionsProvider);
      },
    );
  }
}

class BudgetsScreen extends StatelessWidget {
  const BudgetsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final month = currentMonth();
    final path = 'budgets?month=$month';
    return ApiPage(
      title: t('Bütçeler'),
      path: path,
      addLabel: t('Bütçe ekle'),
      onAdd: (context, ref, d) => showFormSheet(
        context,
        title: t('Bütçe ekle'),
        fields: [
          FieldSpec(
            'categoryId',
            t('Kategori'),
            kind: FieldKind.choice,
            options: (_) => _named(rows(d['categories'])),
          ),
          FieldSpec('amountLimit', t('Aylık limit'), kind: FieldKind.amount),
        ],
        onSubmit: (v) async {
          await ref.read(apiProvider).post('budgets', {...v, 'month': month});
          ref.invalidate(pageProvider(path));
        },
      ),
      builder: (context, ref, d) {
        final items = rows(d['budgets']);
        final currency = '${d['currency']}';
        if (items.isEmpty) return [EmptyNote(t('Bu ay için bütçe yok.'))];
        return [
          for (final b in items) ...[
            ProgressCard(
              title: categoryLabel('${b['categoryName']}'),
              value: (b['spent'] as num) / (b['limit'] as num),
              detail:
                  '${money(b['spent'] as num, currency)} / ${money(b['limit'] as num, currency)}',
              actions: [
                IconButton(
                  tooltip: t('Bütçeyi sil'),
                  icon: Icon(Icons.delete_outline, color: context.muted),
                  onPressed: () async {
                    if (await confirmDelete(
                          context,
                          categoryLabel('${b['categoryName']}'),
                        ) &&
                        context.mounted) {
                      await runAction(
                        context,
                        ref,
                        path,
                        (api) => api.delete('budgets/${b['id']}'),
                      );
                    }
                  },
                ),
              ],
            ),
            const Gap(),
          ],
        ];
      },
    );
  }
}

class GoalsScreen extends StatelessWidget {
  const GoalsScreen({super.key});
  static const _path = 'goals';

  @override
  Widget build(BuildContext context) => ApiPage(
    title: t('Hedefler'),
    path: _path,
    addLabel: t('Hedef ekle'),
    onAdd: (context, ref, _) => showFormSheet(
      context,
      title: t('Hedef ekle'),
      fields: [
        FieldSpec('name', t('Hedef adı')),
        FieldSpec('targetAmount', t('Hedef tutar'), kind: FieldKind.amount),
        FieldSpec(
          'deadline',
          t('Hedef tarihi'),
          kind: FieldKind.date,
          required: false,
        ),
      ],
      onSubmit: (v) async {
        await ref.read(apiProvider).post(_path, v);
        ref.invalidate(pageProvider(_path));
      },
    ),
    builder: (context, ref, d) {
      final items = rows(d['goals']);
      final currency = '${d['currency']}';
      if (items.isEmpty) return [EmptyNote(t('Henüz hedef yok.'))];
      return [
        for (final g in items) ...[
          ProgressCard(
            title: '${g['name']}',
            value: (g['current_amount'] as num) / (g['target_amount'] as num),
            detail:
                '${money(g['current_amount'] as num, currency)} / ${money(g['target_amount'] as num, currency)}',
            actions: [
              IconButton(
                tooltip: t('Para ekle'),
                icon: Icon(Icons.add_circle_outline, color: brand),
                onPressed: () => showFormSheet(
                  context,
                  title: tx(
                    '${g['name']} için ekle',
                    'Add to ${g['name']}',
                    'Zu ${g['name']} hinzufügen',
                  ),
                  fields: [
                    FieldSpec('addAmount', t('Tutar'), kind: FieldKind.amount),
                  ],
                  onSubmit: (v) async {
                    await ref.read(apiProvider).patch('goals/${g['id']}', v);
                    ref.invalidate(pageProvider(_path));
                  },
                ),
              ),
              IconButton(
                tooltip: t('Hedefi sil'),
                icon: Icon(Icons.delete_outline, color: context.muted),
                onPressed: () async {
                  if (await confirmDelete(context, '${g['name']}') &&
                      context.mounted) {
                    await runAction(
                      context,
                      ref,
                      _path,
                      (api) => api.delete('goals/${g['id']}'),
                    );
                  }
                },
              ),
            ],
          ),
          const Gap(),
        ],
      ];
    },
  );
}

class RecurringScreen extends StatelessWidget {
  const RecurringScreen({super.key});
  static const _path = 'recurring';

  @override
  Widget build(BuildContext context) => ApiPage(
    title: t('Otomatik Talimatlar'),
    path: _path,
    addLabel: t('Talimat ekle'),
    onAdd: (context, ref, d) => showFormSheet(
      context,
      title: t('Talimat ekle'),
      fields: [
        FieldSpec(
          'kind',
          t('Tür'),
          kind: FieldKind.choice,
          options: (_) => {
            'regular': t('Düzenli'),
            'subscription': t('Abonelik'),
          },
          initial: 'regular',
        ),
        FieldSpec(
          'type',
          t('Gelir / gider'),
          kind: FieldKind.choice,
          options: (_) => {'expense': t('Gider'), 'income': t('Gelir')},
          initial: 'expense',
          resets: 'category',
        ),
        const FieldSpec('title', 'Ad'),
        FieldSpec('amount', t('Tutar'), kind: FieldKind.amount),
        FieldSpec(
          'category',
          t('Kategori'),
          kind: FieldKind.choice,
          options: (v) => _named(
            rows(d['categories']).where((c) => c['type'] == v['type']).toList(),
          ),
        ),
        FieldSpec(
          'account',
          t('Hesap'),
          kind: FieldKind.choice,
          required: false,
          options: (_) => _named(rows(d['accounts'])),
        ),
        FieldSpec(
          'frequency',
          t('Sıklık'),
          kind: FieldKind.choice,
          options: (_) => _frequencies,
          initial: 'monthly',
        ),
        FieldSpec(
          'startDate',
          t('Başlangıç'),
          kind: FieldKind.date,
          initial: isoDate(DateTime.now()),
        ),
      ],
      onSubmit: (v) async {
        await ref.read(apiProvider).post(_path, {
          ...v,
          'account': v['account'] ?? '',
        });
        ref.invalidate(pageProvider(_path));
      },
    ),
    builder: (context, ref, d) {
      if (d['available'] == false) {
        return [EmptyNote(t('Bu özellik şu an kullanılamıyor.'))];
      }
      final items = rows(d['items']);
      final currency = '${d['currency']}';
      if (items.isEmpty) return [EmptyNote(t('Henüz tekrarlayan işlem yok.'))];
      return [
        for (final r in items) ...[
          Card(
            child: SwitchListTile(
              value: r['active'] == true,
              title: Text(
                '${r['title']}',
                style: TextStyle(
                  fontWeight: FontWeight.w700,
                  color: context.ink,
                ),
              ),
              subtitle: Text(
                '${money(r['amount'] as num, currency)} · ${_frequencies[r['frequency']] ?? r['frequency']}\n${t('Sonraki')}: ${shortDate('${r['nextDate']}')}',
              ),
              onChanged: (active) => runAction(
                context,
                ref,
                _path,
                (api) => api.patch('recurring/${r['id']}', {'active': active}),
              ),
            ),
          ),
          const Gap(),
        ],
      ];
    },
  );
}

class AnalyticsScreen extends StatelessWidget {
  const AnalyticsScreen({super.key});

  @override
  Widget build(BuildContext context) => ApiPage(
    title: t('Analiz'),
    path: 'analytics',
    builder: (context, ref, d) {
      final summary = d['summary'] as Map<String, dynamic>;
      final currency = '${(d['filters'] as Map)['currency']}';
      final largest = rows(d['largest']);
      return [
        Row(
          children: [
            Expanded(
              child: _Metric(
                t('Gelir'),
                money(summary['income'] as num, currency),
                income,
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: _Metric(
                t('Gider'),
                money(summary['expenses'] as num, currency),
                expense,
              ),
            ),
          ],
        ),
        const Gap(),
        _Metric(
          t('Tasarruf oranı'),
          '%${(summary['savingsRate'] as num).toStringAsFixed(1)}',
          brand,
        ),
        const Gap(),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: SizedBox(
              height: 200,
              child: CashFlowChart(rows(d['monthly'])),
            ),
          ),
        ),
        const SizedBox(height: 18),
        Text(
          t('En büyük giderler'),
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.w800,
            color: context.ink,
          ),
        ),
        const Gap(),
        if (largest.isEmpty)
          EmptyNote(t('Bu ay gider yok.'))
        else
          Card(
            clipBehavior: Clip.antiAlias,
            child: Column(
              children: [
                for (final t in largest)
                  TransactionTile(
                    title: '${t['title']}',
                    subtitle: categoryLabel('${t['category']}'),
                    amount: t['amount'] as num,
                    isIncome: false,
                    currency: currency,
                  ),
              ],
            ),
          ),
      ];
    },
  );
}

class _Metric extends StatelessWidget {
  const _Metric(this.label, this.value, this.color);

  final String label;
  final String value;
  final Color color;

  @override
  Widget build(BuildContext context) => Card(
    child: Padding(
      padding: const EdgeInsets.all(14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: TextStyle(color: context.muted)),
          const SizedBox(height: 4),
          FittedBox(
            child: Text(
              value,
              style: TextStyle(
                color: color,
                fontSize: 19,
                fontWeight: FontWeight.w800,
              ),
            ),
          ),
        ],
      ),
    ),
  );
}
