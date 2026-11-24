import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/api.dart';
import '../core/theme.dart';
import '../core/widgets.dart';
import 'data.dart';

final pageProvider = FutureProvider.autoDispose
    .family<Map<String, dynamic>, String>(
      (ref, path) => ref.watch(apiProvider).get(path),
    );

List<Map<String, dynamic>> rows(Object? value) =>
    ((value as List?) ?? const []).cast<Map<String, dynamic>>();

String isoDate(DateTime d) =>
    '${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';

/// Loading, error, empty-safe refresh around one GET endpoint.
class ApiPage extends ConsumerWidget {
  const ApiPage({
    super.key,
    required this.title,
    required this.path,
    required this.builder,
    this.onAdd,
    this.addLabel,
    this.refreshAlso = const [],
  });

  /// Other GET paths shown on this page, reloaded by pull to refresh.
  final List<String> refreshAlso;
  final String title;
  final String path;
  final List<Widget> Function(BuildContext, WidgetRef, Map<String, dynamic>)
  builder;
  final void Function(BuildContext, WidgetRef, Map<String, dynamic>)? onAdd;
  final String? addLabel;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final data = ref.watch(pageProvider(path));
    return Scaffold(
      appBar: AppBar(title: Text(title)),
      floatingActionButton: onAdd != null && data.hasValue
          ? FloatingActionButton.extended(
              backgroundColor: brand,
              foregroundColor: Colors.white,
              icon: const Icon(Icons.add),
              label: Text(addLabel ?? 'Ekle'),
              onPressed: () => onAdd!(context, ref, data.requireValue),
            )
          : null,
      body: RefreshIndicator(
        onRefresh: () {
          for (final other in refreshAlso) {
            ref.invalidate(pageProvider(other));
          }
          return ref.refresh(pageProvider(path).future);
        },
        child: data.when(
          skipLoadingOnRefresh: true,
          loading: () => const LoadingList(),
          error: (e, _) => ErrorRetry(
            message: '$e',
            onRetry: () => ref.invalidate(pageProvider(path)),
          ),
          data: (d) => ListView(
            padding: const EdgeInsets.fromLTRB(16, 4, 16, 96),
            children: builder(context, ref, d),
          ),
        ),
      ),
    );
  }
}

class EmptyNote extends StatelessWidget {
  const EmptyNote(this.text, {super.key});

  final String text;

  @override
  Widget build(BuildContext context) => Card(
    child: Padding(
      padding: const EdgeInsets.all(26),
      child: Text(
        text,
        textAlign: TextAlign.center,
        style: TextStyle(color: context.muted),
      ),
    ),
  );
}

class Gap extends StatelessWidget {
  const Gap({super.key});

  @override
  Widget build(BuildContext context) => const SizedBox(height: 10);
}

class ProgressCard extends StatelessWidget {
  const ProgressCard({
    super.key,
    required this.title,
    required this.detail,
    required this.value,
    this.actions = const [],
  });

  final String title;
  final String detail;
  final double value;
  final List<Widget> actions;

  @override
  Widget build(BuildContext context) => Card(
    child: Padding(
      padding: const EdgeInsets.fromLTRB(16, 12, 8, 14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  title,
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w800,
                    color: context.ink,
                  ),
                ),
              ),
              ...actions,
            ],
          ),
          Padding(
            padding: const EdgeInsets.only(right: 8, top: 4, bottom: 8),
            child: LinearProgressIndicator(
              value: value.clamp(0, 1),
              minHeight: 8,
              borderRadius: BorderRadius.circular(8),
              color: value >= 1 ? expense : brand,
              backgroundColor: context.soft,
            ),
          ),
          Text(detail, style: TextStyle(color: context.muted)),
        ],
      ),
    ),
  );
}

/// Runs a write, refreshes the page and reports failure without a blind retry.
Future<void> runAction(
  BuildContext context,
  WidgetRef ref,
  String refreshPath,
  Future<void> Function(Api api) action,
) async {
  final messenger = ScaffoldMessenger.of(context);
  try {
    await action(ref.read(apiProvider));
    HapticFeedback.lightImpact();
  } catch (e) {
    messenger.showSnackBar(SnackBar(content: Text('$e')));
  }
  ref.invalidate(pageProvider(refreshPath));
  ref.invalidate(dashboardProvider);
  ref.invalidate(transactionsProvider);
}

Future<bool> confirmDelete(BuildContext context, String name) async =>
    await showDialog<bool>(
      context: context,
      builder: (dialog) => AlertDialog(
        title: const Text('Silinsin mi?'),
        content: Text('"$name" silinecek. Bu işlem geri alınamaz.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialog, false),
            child: const Text('Vazgeç'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(dialog, true),
            child: const Text('Sil', style: TextStyle(color: expense)),
          ),
        ],
      ),
    ) ??
    false;

enum FieldKind { text, amount, choice, date }

class FieldSpec {
  const FieldSpec(
    this.key,
    this.label, {
    this.kind = FieldKind.text,
    this.options,
    this.required = true,
    this.initial,
    this.resets,
  });

  final String key;
  final String label;
  final FieldKind kind;
  final Map<String, String> Function(Map<String, dynamic> values)? options;
  final bool required;
  final Object? initial;

  /// Another field to clear when this one changes.
  final String? resets;
}

Future<void> showFormSheet(
  BuildContext context, {
  required String title,
  required List<FieldSpec> fields,
  required Future<void> Function(Map<String, dynamic> values) onSubmit,
}) => showModalBottomSheet(
  context: context,
  isScrollControlled: true,
  useSafeArea: true,
  shape: const RoundedRectangleBorder(
    borderRadius: BorderRadius.vertical(top: Radius.circular(22)),
  ),
  builder: (_) => _FormSheet(title, fields, onSubmit),
);

class _FormSheet extends StatefulWidget {
  const _FormSheet(this.title, this.fields, this.onSubmit);

  final String title;
  final List<FieldSpec> fields;
  final Future<void> Function(Map<String, dynamic>) onSubmit;

  @override
  State<_FormSheet> createState() => _FormSheetState();
}

class _FormSheetState extends State<_FormSheet> {
  final _form = GlobalKey<FormState>();
  late final Map<String, dynamic> _values = {
    for (final f in widget.fields)
      if (f.initial != null) f.key: f.initial,
  };
  bool _busy = false;
  String? _error;

  Future<void> _save() async {
    if (!_form.currentState!.validate()) return;
    _form.currentState!.save();
    setState(() {
      _busy = true;
      _error = null;
    });
    final messenger = ScaffoldMessenger.of(context);
    try {
      await widget.onSubmit(Map.of(_values));
      HapticFeedback.mediumImpact();
      if (mounted) Navigator.pop(context);
    } on ApiException catch (e) {
      if (e.outcomeUnknown) {
        if (mounted) Navigator.pop(context);
        messenger.showSnackBar(SnackBar(content: Text(e.message)));
      } else if (mounted) {
        setState(() {
          _error = e.message;
          _busy = false;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _error = 'Bir sorun oluştu. Lütfen tekrar deneyin.';
          _busy = false;
        });
      }
    }
  }

  Widget _field(FieldSpec f) {
    final decoration = InputDecoration(labelText: f.label);
    switch (f.kind) {
      case FieldKind.choice:
        final options = f.options!(_values);
        final current = options.containsKey(_values[f.key])
            ? _values[f.key] as String
            : null;
        return DropdownButtonFormField<String>(
          key: ValueKey('${f.key}-${options.keys.join()}'),
          isExpanded: true,
          initialValue: current,
          decoration: decoration,
          items: [
            for (final o in options.entries)
              DropdownMenuItem(
                value: o.key,
                child: Text(o.value, overflow: TextOverflow.ellipsis),
              ),
          ],
          onChanged: (v) => setState(() {
            _values[f.key] = v;
            if (f.resets != null) _values.remove(f.resets);
          }),
          validator: (v) => f.required && v == null ? 'Seçin' : null,
        );
      case FieldKind.date:
        final value = _values[f.key] as String?;
        return FormField<String>(
          validator: (_) =>
              f.required && _values[f.key] == null ? 'Tarih seçin' : null,
          builder: (state) => InkWell(
            onTap: () async {
              final picked = await showDatePicker(
                context: context,
                initialDate: DateTime.tryParse(value ?? '') ?? DateTime.now(),
                firstDate: DateTime(2015),
                lastDate: DateTime(2100),
              );
              if (picked != null) {
                setState(() => _values[f.key] = isoDate(picked));
                state.didChange(isoDate(picked));
              }
            },
            child: InputDecorator(
              decoration: decoration.copyWith(
                errorText: state.errorText,
                suffixIcon: const Icon(Icons.calendar_today, size: 18),
              ),
              child: Text(value == null ? 'Seçilmedi' : shortDate(value)),
            ),
          ),
        );
      case FieldKind.amount:
        return TextFormField(
          initialValue: f.initial?.toString(),
          keyboardType: const TextInputType.numberWithOptions(decimal: true),
          inputFormatters: [
            FilteringTextInputFormatter.allow(RegExp(r'[0-9.,]')),
          ],
          decoration: decoration,
          validator: (v) {
            if (!f.required && (v ?? '').isEmpty) return null;
            final n = parseAmount(v ?? '');
            return n != null && n >= 0 ? null : 'Geçerli bir tutar girin.';
          },
          onSaved: (v) => _values[f.key] = parseAmount(v ?? ''),
        );
      case FieldKind.text:
        return TextFormField(
          initialValue: f.initial?.toString(),
          textCapitalization: TextCapitalization.sentences,
          decoration: decoration,
          validator: (v) =>
              f.required && (v ?? '').trim().length < 2 ? 'En az 2 karakter girin.' : null,
          onSaved: (v) => _values[f.key] = (v ?? '').trim(),
        );
    }
  }

  @override
  Widget build(BuildContext context) => Padding(
    padding: EdgeInsets.fromLTRB(
      20,
      20,
      20,
      MediaQuery.viewInsetsOf(context).bottom + 20,
    ),
    child: SingleChildScrollView(
      child: Form(
        key: _form,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              widget.title,
              style: TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.w800,
                color: context.ink,
              ),
            ),
            const SizedBox(height: 14),
            for (final f in widget.fields) ...[
              _field(f),
              const SizedBox(height: 12),
            ],
            if (_error != null)
              Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: Text(_error!, style: const TextStyle(color: expense)),
              ),
            FilledButton(
              onPressed: _busy ? null : _save,
              child: Text(_busy ? 'Kaydediliyor…' : 'Kaydet'),
            ),
          ],
        ),
      ),
    ),
  );
}
