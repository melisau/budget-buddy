import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/api.dart';
import '../core/theme.dart';
import '../core/widgets.dart';
import 'data.dart';

class TransactionsScreen extends ConsumerStatefulWidget {
  const TransactionsScreen({super.key});

  @override
  ConsumerState<TransactionsScreen> createState() => _TransactionsScreenState();
}

class _TransactionsScreenState extends ConsumerState<TransactionsScreen> {
  String _query = '';

  @override
  Widget build(BuildContext context) {
    final data = ref.watch(transactionsProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('İşlemler')),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 4, 16, 10),
            child: TextField(
              onChanged: (v) => setState(() => _query = v.toLowerCase()),
              decoration: const InputDecoration(
                hintText: 'İşlemlerde ara',
                prefixIcon: Icon(Icons.search),
                isDense: true,
              ),
            ),
          ),
          Expanded(
            child: RefreshIndicator(
              onRefresh: () => ref.refresh(transactionsProvider.future),
              child: data.when(
                skipLoadingOnRefresh: true,
                loading: () => const LoadingList(),
                error: (e, _) => ErrorRetry(
                  message: '$e',
                  onRetry: () => ref.invalidate(transactionsProvider),
                ),
                data: _list,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _list(Map<String, dynamic> data) {
    final items = (data['transactions'] as List)
        .cast<Map<String, dynamic>>()
        .where(
          (t) => '${t['title']} ${t['category']}'.toLowerCase().contains(_query),
        )
        .toList();
    if (items.isEmpty) {
      return ListView(
        children: const [
          SizedBox(height: 120),
          Text('İşlem bulunamadı.', textAlign: TextAlign.center),
        ],
      );
    }
    return ListView.separated(
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 110),
      itemCount: items.length,
      separatorBuilder: (_, _) => const SizedBox(height: 8),
      itemBuilder: (_, i) {
        final t = items[i];
        return Card(
          child: TransactionTile(
            title: '${t['title']}',
            subtitle:
                '${categoryLabel('${t['category']}')} · ${shortDate('${t['transactionDate']}')}',
            amount: t['amount'] as num,
            isIncome: t['type'] == 'income',
          ),
        );
      },
    );
  }
}

Future<void> showAddTransaction(BuildContext context) => showModalBottomSheet(
  context: context,
  isScrollControlled: true,
  useSafeArea: true,
  shape: const RoundedRectangleBorder(
    borderRadius: BorderRadius.vertical(top: Radius.circular(22)),
  ),
  builder: (_) => const _AddSheet(),
);

class _AddSheet extends ConsumerStatefulWidget {
  const _AddSheet();

  @override
  ConsumerState<_AddSheet> createState() => _AddSheetState();
}

class _AddSheetState extends ConsumerState<_AddSheet> {
  final _form = GlobalKey<FormState>();
  final _amount = TextEditingController();
  final _title = TextEditingController();
  String _type = 'expense';
  String? _category;
  String? _account;
  String? _error;
  DateTime _date = DateTime.now();
  bool _busy = false;

  @override
  void dispose() {
    _amount.dispose();
    _title.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!_form.currentState!.validate()) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    final d = _date;
    final date =
        '${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';
    try {
      await ref.read(apiProvider).post('transactions', {
        'type': _type,
        'amount': parseAmount(_amount.text),
        'title': _title.text.trim(),
        'category': _category,
        'account': _account ?? '',
        'date': date,
      });
      HapticFeedback.mediumImpact();
      ref.invalidate(transactionsProvider);
      ref.invalidate(dashboardProvider);
      if (mounted) Navigator.pop(context);
    } on ApiException catch (e) {
      if (e.outcomeUnknown) {
        ref.invalidate(transactionsProvider);
        ref.invalidate(dashboardProvider);
        if (mounted) {
          final messenger = ScaffoldMessenger.of(context);
          Navigator.pop(context);
          messenger.showSnackBar(SnackBar(content: Text(e.message)));
        }
      } else if (mounted) {
        setState(() {
          _error = e.message;
          _busy = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = '$e';
          _busy = false;
        });
      }
    }
  }

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _date,
      firstDate: DateTime(2015),
      lastDate: DateTime.now().add(const Duration(days: 365)),
    );
    if (picked != null) setState(() => _date = picked);
  }

  @override
  Widget build(BuildContext context) {
    final options = ref.watch(transactionsProvider);
    return Padding(
      padding: EdgeInsets.fromLTRB(
        20,
        20,
        20,
        MediaQuery.viewInsetsOf(context).bottom + 20,
      ),
      child: options.when(
        loading: () => const SizedBox(
          height: 240,
          child: Center(child: CircularProgressIndicator()),
        ),
        error: (e, _) => SizedBox(height: 240, child: Center(child: Text('$e'))),
        data: _formBody,
      ),
    );
  }

  Widget _formBody(Map<String, dynamic> data) {
    final categories = (data['categories'] as List)
        .cast<Map<String, dynamic>>()
        .where((c) => c['type'] == _type)
        .toList();
    final accounts = (data['accounts'] as List).cast<Map<String, dynamic>>();
    return SingleChildScrollView(
      child: Form(
        key: _form,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text(
              'İşlem ekle',
              style: TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.w800,
                color: ink,
              ),
            ),
            const SizedBox(height: 14),
            SegmentedButton<String>(
              segments: const [
                ButtonSegment(value: 'expense', label: Text('Gider')),
                ButtonSegment(value: 'income', label: Text('Gelir')),
              ],
              selected: {_type},
              onSelectionChanged: (v) => setState(() {
                _type = v.first;
                _category = null;
              }),
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _amount,
              autofocus: true,
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              inputFormatters: [
                FilteringTextInputFormatter.allow(RegExp(r'[0-9.,]')),
              ],
              decoration: const InputDecoration(
                labelText: 'Tutar',
                prefixText: '₺ ',
              ),
              validator: (v) {
                final amount = parseAmount(v ?? '');
                return amount != null && amount > 0
                    ? null
                    : 'Geçerli bir tutar girin.';
              },
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _title,
              maxLength: 160,
              textCapitalization: TextCapitalization.sentences,
              decoration: const InputDecoration(
                labelText: 'Açıklama',
                counterText: '',
              ),
              validator: (v) => (v ?? '').trim().length >= 2
                  ? null
                  : 'Kısa bir açıklama girin.',
            ),
            const SizedBox(height: 12),
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: DropdownButtonFormField<String>(
                    key: ValueKey(_type),
                    isExpanded: true,
                    initialValue: _category,
                    decoration: const InputDecoration(labelText: 'Kategori'),
                    items: [
                      for (final c in categories)
                        DropdownMenuItem(
                          value: '${c['id']}',
                          child: Text(
                            categoryLabel('${c['name']}'),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                    ],
                    onChanged: (v) => _category = v,
                    validator: (v) => v == null ? 'Seçin' : null,
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: DropdownButtonFormField<String>(
                    isExpanded: true,
                    initialValue: _account,
                    decoration: const InputDecoration(labelText: 'Hesap'),
                    items: [
                      for (final a in accounts)
                        DropdownMenuItem(
                          value: '${a['id']}',
                          child: Text(
                            '${a['name']}',
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                    ],
                    onChanged: (v) => _account = v,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            TextButton.icon(
              onPressed: _pickDate,
              icon: const Icon(Icons.calendar_today, size: 18),
              label: Text(shortDate(_date.toIso8601String())),
            ),
            if (_error != null)
              Text(_error!, style: const TextStyle(color: expense)),
            const SizedBox(height: 8),
            FilledButton(
              onPressed: _busy ? null : _save,
              child: Text(_busy ? 'Kaydediliyor…' : 'Kaydet'),
            ),
          ],
        ),
      ),
    );
  }
}
