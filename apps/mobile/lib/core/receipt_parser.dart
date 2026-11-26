import 'dart:math';

class OcrLine {
  const OcrLine(
    this.text,
    this.left,
    this.top,
    this.bottom, {
    double? right,
    this.angle = 0,
  }) : right = right ?? left;

  final String text;
  final double left;
  final double right;
  final double top;
  final double bottom;
  final double angle;

  double get center => (top + bottom) / 2;
  double get middleX => (left + right) / 2;
  double get height => bottom - top;
}

class ReceiptItem {
  const ReceiptItem(this.name, this.quantity, this.unitPrice, this.lineTotal);

  final String name;
  final double quantity;
  final double unitPrice;
  final double lineTotal;
}

class ParsedReceipt {
  const ParsedReceipt({
    this.merchant,
    this.date,
    this.total,
    this.tax,
    this.items = const [],
  });

  final String? merchant;
  final String? date;
  final double? total;
  final double? tax;
  final List<ReceiptItem> items;

  double get itemsTotal => items.fold(0, (sum, item) => sum + item.lineTotal);
  bool get itemsMatchTotal =>
      total != null && items.isNotEmpty && (itemsTotal - total!).abs() <= 0.05;
}

// OCR often adds a space after the decimal comma or drops a final zero after "*".
final _amount = RegExp(
  r'(?<![\d.,])(\d{1,3}(?:[. ]\d{3})+,\s?\d{2}|\d+[.,]\s?\d{2}|(?<=\*)\d{1,3}(?:\.\d{3})*,\d)(?![\d])',
);
final _date = RegExp(
  r'(?<!\d)(\d{2})\s?[./-]\s?(\d{2})\s?[./-]\s?(\d{4}|\d{2})(?!\d)',
);
final _percent = RegExp(r'%\s*\d+(?:[.,]\d+)?');
final _quantity = RegExp(
  r'^\s*(\d+(?:[.,]\d+)?)\s*(?:AD|ADET|KG|GR|LT)?\.?\s*[X*]\s*\*?(\d+(?:[. ]\d{3})*[.,]\s?\d{1,2})',
);
final _noise = RegExp(
  r'TARIH|SAAT|FIS|KDV|TOPLAM|\bTOP\b|TUTAR|NAKIT|KREDI|KART|PARA USTU|VKN|TCKN|'
  r'V\.?D|VERGI|TEL|MERSIS|ADRES|KASIYER|EKU|\bZ NO\b|ODEME|INDIRIM|TESEKKUR|'
  r'ONAY|POS|BANKA|REF',
);

String _fold(String value) {
  const map = {
    'ç': 'C',
    'Ç': 'C',
    'ğ': 'G',
    'Ğ': 'G',
    'ı': 'I',
    'İ': 'I',
    'i': 'I',
    'ö': 'O',
    'Ö': 'O',
    'ş': 'S',
    'Ş': 'S',
    'ü': 'U',
    'Ü': 'U',
  };
  return value.split('').map((c) => map[c] ?? c.toUpperCase()).join();
}

/// Receipts are printed in capitals, so stray lowercase OCR letters are fixed.
String _cleanCase(String value) {
  final letters = RegExp(r'\p{L}', unicode: true).allMatches(value).length;
  final upper = RegExp(r'\p{Lu}', unicode: true).allMatches(value).length;
  if (letters == 0 || upper / letters < 0.6) return value;
  return value.replaceAll('i', 'İ').replaceAll('ı', 'I').toUpperCase();
}

double? _parseAmount(String raw) {
  final clean = raw.replaceAll(' ', '');
  final decimal = clean.lastIndexOf(RegExp(r'[.,]'));
  if (decimal < 0) return null;
  final whole = clean.substring(0, decimal).replaceAll(RegExp(r'[.,]'), '');
  return double.tryParse('$whole.${clean.substring(decimal + 1)}');
}

bool _isSensitive(String row) {
  final compact = row.replaceAll(RegExp(r'[ -]'), '');
  return RegExp(r'\d{12,19}').hasMatch(compact) ||
      RegExp(r'\d{4,6}\*{4,}|\*{4,}\d{4}').hasMatch(compact);
}

/// Rebuilds visual rows, because OCR often returns receipt columns separately.
List<String> rowsFromLines(List<OcrLine> lines) {
  if (lines.isEmpty) return [];
  final angles = lines.map((e) => e.angle).toList()..sort();
  final slope = tan(angles[angles.length ~/ 2] * pi / 180);
  double level(OcrLine line) => line.center - line.middleX * slope;
  final sorted = [...lines]..sort((a, b) => level(a).compareTo(level(b)));
  final rows = <List<OcrLine>>[];
  for (final line in sorted) {
    if (rows.isNotEmpty) {
      final row = rows.last;
      final center = row.map(level).reduce((a, b) => a + b) / row.length;
      if ((level(line) - center).abs() <= line.height * 0.6) {
        row.add(line);
        continue;
      }
    }
    rows.add([line]);
  }
  return rows.map((row) {
    row.sort((a, b) => a.left.compareTo(b.left));
    return row.map((e) => e.text.trim()).join(' ');
  }).toList();
}

double? _lastAmount(String row) {
  final matches = _amount.allMatches(row.replaceAll(_percent, ' ')).toList();
  return matches.isEmpty ? null : _parseAmount(matches.last.group(1)!);
}

String? _findDate(List<String> rows) {
  for (final row in rows) {
    for (final match in _date.allMatches(row)) {
      final day = int.parse(match.group(1)!);
      final month = int.parse(match.group(2)!);
      final rawYear = match.group(3)!;
      final year = rawYear.length == 2
          ? 2000 + int.parse(rawYear)
          : int.parse(rawYear);
      final date = DateTime.utc(year, month, day);
      if (date.day == day && date.month == month && year >= 2000) {
        return '${year.toString().padLeft(4, '0')}-${month.toString().padLeft(2, '0')}-${day.toString().padLeft(2, '0')}';
      }
    }
  }
  return null;
}

String? _findMerchant(List<String> rows) {
  for (final row in rows.take(6)) {
    final letters = RegExp(r'\p{L}', unicode: true).allMatches(row).length;
    if (letters >= 3 &&
        letters >= row.length / 2 &&
        !_noise.hasMatch(_fold(row))) {
      return _cleanCase(row.trim());
    }
  }
  return null;
}

(int, double?) _findTotal(List<String> rows) {
  var index = -1;
  double? total;
  var grand = false;
  for (var i = 0; i < rows.length; i++) {
    final row = _fold(rows[i]);
    final isTotal =
        RegExp(r'TOPLAM|\bTOP\b|\bTUTAR\b').hasMatch(row) &&
        !RegExp(r'ARA|KDV|INDIRIM').hasMatch(row);
    if (!isTotal) continue;
    final isGrand = row.contains('GENEL');
    if (grand && !isGrand) continue;
    final amount =
        _lastAmount(rows[i]) ??
        (i + 1 < rows.length ? _lastAmount(rows[i + 1]) : null);
    if (amount == null) continue;
    index = i;
    total = amount;
    grand = isGrand;
  }
  return (index, total);
}

double? _findTax(List<String> rows) {
  double? fallback;
  for (var i = 0; i < rows.length; i++) {
    final row = _fold(rows[i]);
    if (!row.contains('KDV')) continue;
    final amount =
        _lastAmount(rows[i]) ??
        (i + 1 < rows.length ? _lastAmount(rows[i + 1]) : null);
    if (amount == null) continue;
    if (row.contains('TOP')) return amount;
    fallback ??= amount;
  }
  return fallback;
}

List<ReceiptItem> _findItems(List<String> rows, int totalIndex) {
  final end = totalIndex < 0 ? rows.length : totalIndex;
  final items = <ReceiptItem>[];
  (double, double)? pending;
  for (final raw in rows.take(end)) {
    final row = _fold(raw);
    final quantity = _quantity.firstMatch(row);
    if (quantity != null &&
        !RegExp(r'[A-Z]{3,}')
            .hasMatch(row.replaceAll(RegExp(r'ADET|\bAD\b'), ''))) {
      pending = (
        _plain(quantity.group(1)!),
        _parseAmount(quantity.group(2)!) ?? 0,
      );
      continue;
    }
    if (_noise.hasMatch(row)) {
      pending = null;
      continue;
    }
    final matches = _amount.allMatches(raw.replaceAll(_percent, ' ')).toList();
    if (matches.isEmpty) continue;
    final clean = raw.replaceAll(_percent, ' ');
    final name = clean
        .substring(0, matches.last.start)
        .replaceAll(RegExp(r'[*#]+'), ' ')
        .replaceAll(RegExp(r'\s+'), ' ')
        .trim();
    if (RegExp(r'\p{L}', unicode: true).allMatches(name).length < 2) continue;
    final lineTotal = _parseAmount(matches.last.group(1)!);
    if (lineTotal == null) continue;
    final qty = pending?.$1 ?? 1;
    final unit = pending?.$2 ?? lineTotal;
    items.add(ReceiptItem(_cleanCase(name), qty, unit, lineTotal));
    pending = null;
    if (items.length == 100) break;
  }
  return items;
}

double _plain(String value) => double.tryParse(value.replaceAll(',', '.')) ?? 1;

/// Sensitive rows are dropped first. The result never contains the raw OCR text.
ParsedReceipt parseReceipt(List<String> rawRows) {
  final rows = rawRows.where((row) => !_isSensitive(row)).toList();
  final (totalIndex, total) = _findTotal(rows);
  return ParsedReceipt(
    merchant: _findMerchant(rows),
    date: _findDate(rows),
    total: total,
    tax: _findTax(rows),
    items: _findItems(rows, totalIndex),
  );
}
