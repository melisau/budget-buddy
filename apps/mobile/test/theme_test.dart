import 'package:budgetbuddy/core/theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

double _contrast(Color a, Color b) {
  final l1 = a.computeLuminance();
  final l2 = b.computeLuminance();
  return (l1 > l2 ? l1 + .05 : l2 + .05) / (l1 > l2 ? l2 + .05 : l1 + .05);
}

void main() {
  for (final brightness in Brightness.values) {
    test('text stays readable in ${brightness.name} mode', () {
      final scheme = buildTheme(brightness).colorScheme;
      final page = buildTheme(brightness).scaffoldBackgroundColor;
      expect(
        _contrast(scheme.onSurface, scheme.surface),
        greaterThanOrEqualTo(7),
      );
      expect(
        _contrast(scheme.onSurfaceVariant, scheme.surface),
        greaterThanOrEqualTo(4.5),
      );
      expect(_contrast(scheme.onSurface, page), greaterThanOrEqualTo(7));
      expect(
        _contrast(scheme.primary, scheme.surface),
        greaterThanOrEqualTo(3),
      );
    });
  }

  testWidgets('widgets read the colors of the active mode', (tester) async {
    late Color ink;
    await tester.pumpWidget(
      MaterialApp(
        theme: buildTheme(),
        darkTheme: buildTheme(Brightness.dark),
        themeMode: ThemeMode.dark,
        home: Builder(
          builder: (context) {
            ink = context.ink;
            return const SizedBox();
          },
        ),
      ),
    );
    expect(ink.computeLuminance(), greaterThan(.5));
  });
}
