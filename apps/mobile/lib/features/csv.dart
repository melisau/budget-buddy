import 'dart:convert';
import 'dart:typed_data';

import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/theme.dart';
import 'data.dart';
import '../core/i18n.dart';

/// Reads CSV bytes as text: UTF-8 (with or without BOM), else Windows-1254
/// style bytes are kept as Latin-1 so the server can still report bad rows.
String decodeCsv(List<int> bytes) {
  final start =
      bytes.length >= 3 &&
          bytes[0] == 0xEF &&
          bytes[1] == 0xBB &&
          bytes[2] == 0xBF
      ? 3
      : 0;
  try {
    return utf8.decode(bytes.sublist(start));
  } on FormatException {
    return latin1.decode(bytes.sublist(start));
  }
}

/// "Verilerin" card in Ayarlar: export all transactions as CSV, or import a CSV.
class CsvCard extends ConsumerStatefulWidget {
  const CsvCard({super.key});

  @override
  ConsumerState<CsvCard> createState() => _CsvCardState();
}

class _CsvCardState extends ConsumerState<CsvCard> {
  bool _busy = false;

  Future<void> _export() async {
    final messenger = ScaffoldMessenger.of(context);
    setState(() => _busy = true);
    try {
      final bytes = await ref
          .read(apiProvider)
          .getBytes('transactions/export?scope=all');
      final saved = await FilePicker.saveFile(
        dialogTitle: t('CSV dosyasını kaydet'),
        fileName: 'budgetbuddy-islemler.csv',
        mimeType: 'text/csv',
        bytes: Uint8List.fromList(bytes),
      );
      if (saved != null) {
        messenger.showSnackBar(
          SnackBar(content: Text(t('İşlemlerin CSV olarak kaydedildi.'))),
        );
      }
    } catch (e) {
      messenger.showSnackBar(SnackBar(content: Text('$e')));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _import() async {
    final messenger = ScaffoldMessenger.of(context);
    final file = await FilePicker.pickFile(
      type: FileType.custom,
      allowedExtensions: const ['csv', 'txt'],
    );
    if (file == null || !mounted) return;
    if ((await file.length() ?? 0) > 2 * 1024 * 1024) {
      messenger.showSnackBar(
        SnackBar(content: Text(t('CSV dosyası en fazla 2 MB olabilir.'))),
      );
      return;
    }
    final csv = decodeCsv(await file.readAsBytes());
    if (!mounted) return;
    setState(() => _busy = true);
    try {
      final api = ref.read(apiProvider);
      final preview = await api.post('transactions/import', {
        'csv': csv,
        'preview': true,
      });
      final count = (preview['count'] as num?)?.toInt() ?? 0;
      final issueCount = (preview['issueCount'] as num?)?.toInt() ?? 0;
      if (!mounted) return;
      if (count == 0) {
        messenger.showSnackBar(
          SnackBar(
            content: Text(
              t(
                'Bu dosyadan işlem okunamadı. Tarih, açıklama ve tutar sütunları olmalı.',
              ),
            ),
          ),
        );
        return;
      }
      final ok = await showDialog<bool>(
        context: context,
        builder: (dialog) => AlertDialog(
          title: Text(
            tx(
              '$count işlem içe aktarılsın mı?',
              'Import $count transactions?',
              '$count Transaktionen importieren?',
            ),
          ),
          content: Text(
            tx(
                  '${file.name} dosyasından $count işlem okundu.',
                  '$count transactions were read from ${file.name}.',
                  '$count Transaktionen wurden aus ${file.name} gelesen.',
                ) +
                (issueCount > 0
                    ? tx(
                        ' $issueCount satır okunamadı ve atlanacak.',
                        ' $issueCount rows could not be read and will be skipped.',
                        ' $issueCount Zeilen konnten nicht gelesen werden und werden übersprungen.',
                      )
                    : '') +
                t(' Daha önce eklenmiş aynı işlemler tekrar eklenmez.'),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(dialog, false),
              child: Text(t('Vazgeç')),
            ),
            FilledButton(
              onPressed: () => Navigator.pop(dialog, true),
              child: Text(t('İçe aktar')),
            ),
          ],
        ),
      );
      if (ok != true) return;
      final result = await api.post('transactions/import', {'csv': csv});
      final imported = result['imported'] ?? 0;
      final duplicates = (result['duplicates'] as num?)?.toInt() ?? 0;
      messenger.showSnackBar(
        SnackBar(
          content: Text(
            '${tx('$imported işlem aktarıldı', '$imported transactions imported', '$imported Transaktionen importiert')}'
            '${duplicates > 0 ? tx(', $duplicates mükerrer satır atlandı', ', $duplicates duplicate rows skipped', ', $duplicates doppelte Zeilen übersprungen') : ''}.',
          ),
        ),
      );
      ref.invalidate(transactionsProvider);
      ref.invalidate(dashboardProvider);
    } catch (e) {
      messenger.showSnackBar(SnackBar(content: Text('$e')));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => Card(
    child: Column(
      children: [
        ListTile(
          leading: const Icon(Icons.file_download_outlined),
          title: Text(t('CSV olarak dışa aktar')),
          subtitle: Text(t('Tüm işlemlerini telefona kaydet')),
          enabled: !_busy,
          onTap: _export,
        ),
        Divider(height: 1, color: context.line),
        ListTile(
          leading: const Icon(Icons.file_upload_outlined),
          title: Text(t('CSV\'den içe aktar')),
          subtitle: Text(t('Banka ekstresi veya başka uygulamadan')),
          enabled: !_busy,
          onTap: _import,
          trailing: _busy
              ? const SizedBox.square(
                  dimension: 20,
                  child: CircularProgressIndicator(strokeWidth: 2),
                )
              : null,
        ),
      ],
    ),
  );
}
