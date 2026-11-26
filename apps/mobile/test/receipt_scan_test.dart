import 'package:budgetbuddy/core/receipt_parser.dart';
import 'package:budgetbuddy/features/receipt_scan.dart';
import 'package:flutter_test/flutter_test.dart';

Map<String, dynamic> _request(ParsedReceipt scan, double total, bool items) =>
    receiptRequest(
          scan: scan,
          scanId: newScanId(),
          title: 'MARKET',
          category: 'category',
          account: null,
          total: total,
          date: '2026-11-23',
          includeItems: items,
        )['receipt']
        as Map<String, dynamic>;

void main() {
  const scan = ParsedReceipt(
    merchant: 'MARKET',
    date: '2026-11-23',
    total: 100,
    tax: 10,
    items: [ReceiptItem('SÜT', 2, 50, 100)],
  );

  test('creates a valid UUID v4', () {
    expect(
      newScanId(),
      matches(
        RegExp(
          r'^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$',
        ),
      ),
    );
  });

  test('sends items only after the user opts in', () {
    expect(_request(scan, 100, false)['items'], isEmpty);
    expect(_request(scan, 100, true)['items'], hasLength(1));
  });

  test('drops items when the corrected total no longer matches', () {
    final receipt = _request(scan, 120, true);
    expect(receipt['items'], isEmpty);
    expect((receipt['edited'] as Map)['total'], isTrue);
  });

  test('parses OCR spacing and removes card rows', () {
    final parsed = parseReceipt([
      'MARKET',
      'TARİH: 19.02. 2026',
      'sÜT 1L %1 *134, 50',
      'KART 4111 1111 1111 1111 9,00',
      'TOPKDV *1, 33',
      'TOPLAM *134, 50',
    ]);
    expect(parsed.date, '2026-02-19');
    expect(parsed.total, 134.50);
    expect(parsed.items.single.name, 'SÜT 1L');
  });
}
