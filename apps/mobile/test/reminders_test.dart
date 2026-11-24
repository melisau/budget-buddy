import 'package:budgetbuddy/features/reminders.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  final today = DateTime(2026, 11, 25, 15);

  test('due text counts whole days', () {
    expect(dueText('2026-11-25', today), 'bugün');
    expect(dueText('2026-11-26', today), 'yarın');
    expect(dueText('2026-12-02', today), '7 gün sonra');
    expect(dueText('2026-11-23', today), '2 gün gecikti');
  });
}
