import 'package:budgetbuddy/features/category_rules.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  final categories = [
    {'id': 'a', 'name': 'Market', 'type': 'expense'},
    {'id': 'b', 'name': 'Maaş', 'type': 'income'},
  ];

  test('category choices follow the chosen type', () {
    expect(CategoryRulesScreen.categoriesFor(categories, 'income').keys, ['b']);
    expect(CategoryRulesScreen.categoriesFor(categories, null).keys, ['a']);
  });
}
