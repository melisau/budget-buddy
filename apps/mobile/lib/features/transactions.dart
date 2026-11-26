import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/api.dart';
import '../core/config.dart';
import '../core/receipt_parser.dart';
import '../core/theme.dart';
import '../core/widgets.dart';
import 'data.dart';
import 'receipt_scan.dart';
import '../core/i18n.dart' as i18n;

class TransactionsScreen extends ConsumerStatefulWidget {
  const TransactionsScreen({super.key});

  @override
  ConsumerState<TransactionsScreen> createState() => _TransactionsScreenState();
}

class _TransactionsScreenState extends ConsumerState<TransactionsScreen> {
  String _query = '';
  Timer? _debounce;
  int _generation = 0;
  bool _loadingMore = false;
  bool _searching = false;
  String? _pageError;

  /// Pages after the first, or every page of a search.
  final List<Map<String, dynamic>> _more = [];
  String? _cursor;
  bool _ownCursor = false;

  @override
  void dispose() {
    _debounce?.cancel();
    super.dispose();
  }

  void _reset() {
    _generation++;
    _more.clear();
    _cursor = null;
    _ownCursor = false;
    _loadingMore = false;
    _pageError = null;
  }

  void _onSearch(String value) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 350), () {
      final query = value.trim();
      if (query == _query) return;
      setState(() {
        _query = query;
        _reset();
      });
      if (query.isNotEmpty) _load(first: true);
    });
  }

  Future<void> _load({bool first = false}) async {
    if (_loadingMore) return;
    final generation = _generation;
    setState(() {
      _loadingMore = true;
      _searching = first;
      _pageError = null;
    });
    try {
      final page = await ref
          .read(apiProvider)
          .get(
            transactionPagePath(cursor: first ? null : _cursor, query: _query),
          );
      if (!mounted || generation != _generation) return;
      setState(() {
        _more.addAll(
          (page['transactions'] as List).cast<Map<String, dynamic>>(),
        );
        _cursor = page['nextCursor'] as String?;
        _ownCursor = true;
      });
    } catch (e) {
      if (mounted && generation == _generation) {
        setState(() => _pageError = '$e');
      }
    } finally {
      if (mounted && generation == _generation) {
        setState(() {
          _loadingMore = false;
          _searching = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    ref.listen(transactionsProvider, (_, next) {
      if (!next.isLoading) setState(_reset);
    });
    final data = ref.watch(transactionsProvider);
    return Scaffold(
      appBar: AppBar(title: Text(i18n.t('İşlemler'))),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 4, 16, 10),
            child: TextField(
              onChanged: _onSearch,
              decoration: InputDecoration(
                hintText: i18n.t('İşlemlerde ara'),
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
    final searching = _query.isNotEmpty;
    final items = [
      if (!searching)
        ...(data['transactions'] as List).cast<Map<String, dynamic>>(),
      ..._more,
    ];
    final cursor = searching || _ownCursor
        ? _cursor
        : data['nextCursor'] as String?;
    if (_searching) return const LoadingList();
    if (items.isEmpty) {
      return ListView(
        children: [
          const SizedBox(height: 120),
          Text(
            _pageError ?? i18n.t('İşlem bulunamadı.'),
            textAlign: TextAlign.center,
          ),
        ],
      );
    }
    final footer = cursor != null || _pageError != null;
    return NotificationListener<ScrollNotification>(
      onNotification: (n) {
        if (cursor != null &&
            !_loadingMore &&
            _pageError == null &&
            n.metrics.extentAfter < 400) {
          if (!_ownCursor) _cursor = cursor;
          _load();
        }
        return false;
      },
      child: ListView.separated(
        padding: const EdgeInsets.fromLTRB(16, 0, 16, 110),
        itemCount: items.length + (footer ? 1 : 0),
        separatorBuilder: (_, _) => const SizedBox(height: 8),
        itemBuilder: (_, i) {
          if (i == items.length) {
            return Padding(
              padding: const EdgeInsets.all(16),
              child: Center(
                child: _pageError != null
                    ? TextButton(
                        onPressed: () {
                          if (!_ownCursor) _cursor = cursor;
                          _load();
                        },
                        child: Text(
                          i18n.t('Daha fazla yüklenemedi. Tekrar dene'),
                        ),
                      )
                    : const CircularProgressIndicator(),
              ),
            );
          }
          final t = items[i];
          return Card(
            child: TransactionTile(
              title: '${t['title']}',
              subtitle:
                  '${categoryLabel('${t['category']}')} · ${shortDate('${t['transactionDate']}')}',
              amount: t['amount'] as num,
              isIncome: t['type'] == 'income',
              onTap: () => showEditTransaction(context, t),
            ),
          );
        },
      ),
    );
  }
}

Future<void> showAddTransaction(BuildContext context) =>
    _showSheet(context, null);

Future<void> showEditTransaction(
  BuildContext context,
  Map<String, dynamic> transaction,
) => _showSheet(context, transaction);

Future<void> _showSheet(BuildContext context, Map<String, dynamic>? existing) =>
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      useRootNavigator: true,
      useSafeArea: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(22)),
      ),
      builder: (_) => _AddSheet(existing),
    );

/// Plain editable text that [parseAmount] reads back to the same value.
String amountText(num amount) => amount == amount.truncate()
    ? amount.toInt().toString()
    : amount.toString().replaceAll('.', ',');

class _AddSheet extends ConsumerStatefulWidget {
  const _AddSheet(this.existing);

  final Map<String, dynamic>? existing;

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
  bool _scanning = false;
  bool _saveItems = false;
  ParsedReceipt? _scan;
  String? _scanId;

  bool get _editing => widget.existing != null;

  Future<void> _scanReceipt() async {
    setState(() {
      _scanning = true;
      _error = null;
    });
    try {
      final scan = await scanReceipt();
      if (scan == null || !mounted) return;
      if (scan.total == null && scan.date == null && scan.merchant == null) {
        setState(
          () => _error = i18n.t(
            'Fiş okunamadı. Daha aydınlık bir fotoğraf dene.',
          ),
        );
        return;
      }
      setState(() {
        _scan = scan;
        _scanId = newScanId();
        _saveItems = false;
        if (_type != 'expense') _category = null;
        _type = 'expense';
        if (scan.total != null) _amount.text = amountText(scan.total!);
        if ((scan.merchant ?? '').length >= 2) _title.text = scan.merchant!;
        final date = DateTime.tryParse(scan.date ?? '');
        if (date != null) _date = date;
      });
    } catch (_) {
      if (mounted) {
        setState(() => _error = i18n.t('Fiş taranamadı. Tekrar dene.'));
      }
    } finally {
      if (mounted) setState(() => _scanning = false);
    }
  }

  @override
  void initState() {
    super.initState();
    _container = ProviderScope.containerOf(context, listen: false);
    final t = widget.existing;
    if (t == null) return;
    _type = t['type'] == 'income' ? 'income' : 'expense';
    _amount.text = amountText(t['amount'] as num);
    _title.text = '${t['title']}';
    final category = '${t['categoryId'] ?? ''}';
    final account = '${t['accountId'] ?? ''}';
    _category = category.isEmpty ? null : category;
    _account = account.isEmpty ? null : account;
    _date = DateTime.tryParse('${t['transactionDate']}') ?? _date;
  }

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
    final body = <String, dynamic>{
      'type': _type,
      'amount': parseAmount(_amount.text),
      'title': _title.text.trim(),
      'category': _category,
      'account': _account ?? '',
      'date': date,
    };
    // The API clears an omitted note, and the form has no note field yet.
    final note = widget.existing?['note'];
    if (note is String && note.isNotEmpty) body['note'] = note;
    final api = ref.read(apiProvider);
    final scan = _scan;
    if (!_editing && scan != null && _type == 'expense') {
      await _write(
        () => api.post(
          'receipts',
          receiptRequest(
            scan: scan,
            scanId: _scanId!,
            title: _title.text.trim(),
            category: _category!,
            account: _account,
            total: parseAmount(_amount.text)!,
            date: date,
            includeItems: _saveItems,
          ),
        ),
        retrySafe: true,
      );
      return;
    }
    await _write(
      () => _editing
          ? api.patch('transactions/${widget.existing!['id']}', body)
          : api.post('transactions', body, requestId: _requestId),
      retrySafe: true,
    );
  }

  /// One ID per form, so pressing Kaydet again after a lost response is safe.
  final String _requestId = newScanId();

  Future<void> _delete() async {
    final hasReceipt = widget.existing!['hasReceipt'] == true;
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialog) => AlertDialog(
        title: Text(i18n.t('İşlem silinsin mi?')),
        content: Text(
          hasReceipt
              ? i18n.t('Bu işlem ve eklenmiş fişi kalıcı olarak silinecek.')
              : i18n.t('Bu işlem kalıcı olarak silinecek.'),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialog, false),
            child: Text(i18n.t('Vazgeç')),
          ),
          TextButton(
            onPressed: () => Navigator.pop(dialog, true),
            style: TextButton.styleFrom(foregroundColor: expense),
            child: Text(i18n.t('Sil')),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    final api = ref.read(apiProvider);
    await _write(() => api.delete('transactions/${widget.existing!['id']}'));
  }

  /// With [retrySafe] the server ignores a repeated request, so after a lost
  /// response the form stays open and the user can simply save again.
  Future<void> _write(
    Future<Object?> Function() action, {
    bool retrySafe = false,
  }) async {
    try {
      await action();
      HapticFeedback.mediumImpact();
      if (mounted) Navigator.pop(context);
      _refreshLists();
    } on ApiException catch (e) {
      if (e.outcomeUnknown && retrySafe) {
        if (mounted) {
          setState(() {
            _error = i18n.t(
              'Yanıt alınamadı. Kaydet\'e tekrar basabilirsin, işlem iki kez eklenmez.',
            );
            _busy = false;
          });
        }
      } else if (e.outcomeUnknown) {
        if (mounted) {
          final messenger = ScaffoldMessenger.of(context);
          Navigator.pop(context);
          messenger.showSnackBar(SnackBar(content: Text(e.message)));
        }
        _refreshLists();
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

  void _refreshLists() {
    _container.invalidate(transactionsProvider);
    _container.invalidate(dashboardProvider);
  }

  // Still valid after the sheet closes, unlike ref.
  late final ProviderContainer _container;

  Future<void> _pickDate() async {
    final now = DateTime.now();
    final earliest = DateTime(2015);
    final latest = now.add(const Duration(days: 365));
    final picked = await showDatePicker(
      context: context,
      initialDate: _date,
      firstDate: _date.isBefore(earliest) ? _date : earliest,
      lastDate: _date.isAfter(latest) ? _date : latest,
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
        error: (e, _) =>
            SizedBox(height: 240, child: Center(child: Text('$e'))),
        data: _formBody,
      ),
    );
  }

  List<Widget> _scanSummary(ParsedReceipt scan) => [
    const SizedBox(height: 8),
    Text(
      scan.tax == null
          ? i18n.t('Fişten dolduruldu. Kaydetmeden önce kontrol et.')
          : i18n.tx(
              'Fişten dolduruldu, KDV ${money(scan.tax!)}. Kaydetmeden önce kontrol et.',
              'Filled from the receipt, VAT ${money(scan.tax!)}. Check before saving.',
              'Aus dem Beleg ausgefüllt, MwSt. ${money(scan.tax!)}. Prüfe vor dem Speichern.',
            ),
      style: TextStyle(color: context.muted, fontSize: 13),
    ),
    if (scan.itemsMatchTotal)
      CheckboxListTile(
        contentPadding: EdgeInsets.zero,
        controlAffinity: ListTileControlAffinity.leading,
        value: _saveItems,
        onChanged: (v) => setState(() => _saveItems = v ?? false),
        title: Text(
          i18n.tx(
            '${scan.items.length} ürünü de kaydet',
            'Also save the ${scan.items.length} items',
            'Auch die ${scan.items.length} Artikel speichern',
          ),
        ),
        subtitle: Text(
          scan.items.take(4).map((e) => e.name).join(', '),
          maxLines: 2,
          overflow: TextOverflow.ellipsis,
        ),
      )
    else if (scan.items.isNotEmpty)
      Text(
        i18n.t('Ürün satırları toplamla uyuşmadığı için kaydedilmeyecek.'),
        style: TextStyle(color: context.muted, fontSize: 13),
      ),
  ];

  Widget _formBody(Map<String, dynamic> data) {
    final categories = (data['categories'] as List)
        .cast<Map<String, dynamic>>()
        .where((c) => c['type'] == _type)
        .toList();
    final accounts = [
      ...(data['accounts'] as List).cast<Map<String, dynamic>>(),
    ];
    // Archived accounts are not listed, but editing must not drop them.
    if (_account != null && !accounts.any((a) => '${a['id']}' == _account)) {
      accounts.add({
        'id': _account,
        'name': widget.existing?['accountName'] ?? i18n.t('Hesap'),
      });
    }
    // A category outside this list must be chosen again before saving.
    if (_category != null &&
        !categories.any((c) => '${c['id']}' == _category)) {
      _category = null;
    }
    return SingleChildScrollView(
      child: Form(
        key: _form,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              _editing ? i18n.t('İşlemi düzenle') : i18n.t('İşlem ekle'),
              style: TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.w800,
                color: context.ink,
              ),
            ),
            SizedBox(height: 14),
            SegmentedButton<String>(
              segments: [
                ButtonSegment(value: 'expense', label: Text(i18n.t('Gider'))),
                ButtonSegment(value: 'income', label: Text(i18n.t('Gelir'))),
              ],
              selected: {_type},
              onSelectionChanged: (v) => setState(() {
                _type = v.first;
                _category = null;
                // A receipt is always an expense.
                if (_type != 'expense') _scan = null;
              }),
            ),
            if (!_editing && AppConfig.receiptScanEnabled) ...[
              const SizedBox(height: 10),
              OutlinedButton.icon(
                onPressed: _busy || _scanning ? null : _scanReceipt,
                icon: const Icon(Icons.document_scanner_outlined),
                label: Text(
                  _scanning ? i18n.t('Fiş okunuyor…') : i18n.t('Fiş tara'),
                ),
              ),
            ],
            if (_scan != null) ..._scanSummary(_scan!),
            const SizedBox(height: 12),
            TextFormField(
              controller: _amount,
              autofocus: !_editing,
              keyboardType: const TextInputType.numberWithOptions(
                decimal: true,
              ),
              inputFormatters: [
                FilteringTextInputFormatter.allow(RegExp(r'[0-9.,]')),
              ],
              decoration: InputDecoration(
                labelText: i18n.t('Tutar'),
                prefixText: '₺ ',
              ),
              validator: (v) {
                final amount = parseAmount(v ?? '');
                return amount != null && amount > 0
                    ? null
                    : i18n.t('Geçerli bir tutar girin.');
              },
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _title,
              maxLength: 160,
              textCapitalization: TextCapitalization.sentences,
              decoration: InputDecoration(
                labelText: i18n.t('Açıklama'),
                counterText: '',
              ),
              validator: (v) => (v ?? '').trim().length >= 2
                  ? null
                  : i18n.t('Kısa bir açıklama girin.'),
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
                    decoration: InputDecoration(labelText: i18n.t('Kategori')),
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
                    validator: (v) => v == null ? i18n.t('Seçin') : null,
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: DropdownButtonFormField<String>(
                    isExpanded: true,
                    initialValue: _account,
                    decoration: InputDecoration(labelText: i18n.t('Hesap')),
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
            if (_error != null) Text(_error!, style: TextStyle(color: expense)),
            const SizedBox(height: 8),
            FilledButton(
              onPressed: _busy ? null : _save,
              child: Text(_busy ? i18n.t('Kaydediliyor…') : i18n.t('Kaydet')),
            ),
            if (_editing) ...[
              const SizedBox(height: 6),
              TextButton.icon(
                onPressed: _busy ? null : _delete,
                style: TextButton.styleFrom(
                  foregroundColor: expense,
                  minimumSize: const Size.fromHeight(48),
                ),
                icon: const Icon(Icons.delete_outline),
                label: Text(i18n.t('İşlemi sil')),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
