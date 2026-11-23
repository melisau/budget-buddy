import 'dart:io';
import 'dart:math';

import 'package:google_mlkit_text_recognition/google_mlkit_text_recognition.dart';
import 'package:image_picker/image_picker.dart';

import '../core/receipt_parser.dart';

const receiptParserVersion = 1;

/// Reads a receipt on the device. The photo and raw text never leave the phone.
/// Returns null when the user closes the camera.
Future<ParsedReceipt?> scanReceipt() async {
  final image = await ImagePicker().pickImage(source: ImageSource.camera);
  if (image == null) return null;
  final recognizer = TextRecognizer(script: TextRecognitionScript.latin);
  try {
    final text = await recognizer.processImage(
      InputImage.fromFilePath(image.path),
    );
    return parseReceipt(
      rowsFromLines([
        for (final block in text.blocks)
          for (final line in block.lines)
            OcrLine(
              line.text,
              line.boundingBox.left,
              line.boundingBox.top,
              line.boundingBox.bottom,
              right: line.boundingBox.right,
              angle: line.angle ?? 0,
            ),
      ]),
    );
  } finally {
    await recognizer.close();
    try {
      await File(image.path).delete();
    } on FileSystemException {
      // The picker's temporary copy may already be gone.
    }
  }
}

/// A random UUID v4 that makes a retried save safe.
String newScanId() {
  final random = Random.secure();
  final bytes = List<int>.generate(16, (_) => random.nextInt(256));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  final hex = bytes.map((b) => b.toRadixString(16).padLeft(2, '0')).join();
  return '${hex.substring(0, 8)}-${hex.substring(8, 12)}-${hex.substring(12, 16)}-'
      '${hex.substring(16, 20)}-${hex.substring(20)}';
}

String _limit(String value, int max) =>
    value.length <= max ? value : value.substring(0, max).trim();

/// The confirmed form as the `POST /api/receipts` body.
Map<String, dynamic> receiptRequest({
  required ParsedReceipt scan,
  required String scanId,
  required String title,
  required String category,
  required String? account,
  required double total,
  required String date,
  required bool includeItems,
}) {
  final itemsFit = includeItems && (scan.itemsTotal - total).abs() <= 0.05;
  final tax = scan.tax != null && scan.tax! <= total ? scan.tax : null;
  final merchant = scan.merchant == null ? null : _limit(scan.merchant!, 160);
  return {
    'title': title,
    'category': category,
    'account': account ?? '',
    'receipt': {
      'scanId': scanId,
      'merchant': merchant == null || merchant.isEmpty ? null : merchant,
      'date': date,
      'total': total,
      'tax': tax,
      'parserVersion': receiptParserVersion,
      'edited': {
        'merchant': title != scan.merchant,
        'date': date != scan.date,
        'total': total != scan.total,
        'tax': tax != scan.tax,
      },
      'items': [
        if (itemsFit)
          for (final item in scan.items.take(100))
            {
              'name': _limit(item.name, 120),
              'quantity': item.quantity,
              'unitPrice': item.unitPrice,
              'lineTotal': item.lineTotal,
            },
      ],
    },
  };
}
