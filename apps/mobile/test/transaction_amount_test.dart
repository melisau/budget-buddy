import 'package:budgetbuddy/core/theme.dart';
import 'package:budgetbuddy/features/transactions.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('edit form amount text parses back to the same value', () {
    for (final amount in <num>[1500, 1500.5, 0.75, 2150.25, 1000000]) {
      expect(parseAmount(amountText(amount)), amount);
    }
  });
}
