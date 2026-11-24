import 'package:budgetbuddy/features/avatar.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('initials come from the first and last name', () {
    expect(initialsOf('Melisa Uyar'), 'MU');
    expect(initialsOf('  ayşe  '), 'A');
    expect(initialsOf(''), '?');
  });

  test('the icon choices match the web', () {
    expect(avatarIcons.keys, [
      'initials',
      'cat',
      'dog',
      'flower',
      'sun',
      'mountain',
    ]);
  });
}
