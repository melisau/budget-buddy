import 'package:budgetbuddy/features/allowance.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('allowance splits into savings and spending', () {
    final s = splitAllowance(1000, 20);
    expect(s.saved, 200);
    expect(s.spendable, 800);
  });
}
