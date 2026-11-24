import 'package:budgetbuddy/features/notifications.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('budget warning names the category and links to budgets', () {
    final n = describeNotification('budget_warning', {
      'categoryName': 'Market',
      'usage': 85,
      'spent': 850,
      'limit': 1000,
      'currency': 'TRY',
    });
    expect(n.title, contains('%85'));
    expect(n.route, '/more/budgets');
  });

  test('goal due tomorrow says yarın', () {
    final n = describeNotification('goal_due', {
      'goalName': 'Tatil',
      'daysLeft': 1,
      'remaining': 500,
    });
    expect(n.title, contains('yarın'));
    expect(n.route, '/more/goals');
  });

  test('unknown kinds fall back safely', () {
    expect(describeNotification('other', {}).route, '/overview');
  });
}
