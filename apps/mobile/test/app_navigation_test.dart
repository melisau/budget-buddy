import 'package:budgetbuddy/features/app_navigation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('Add stays separate from tab routes', (tester) async {
    final tabs = <int>[];
    var adds = 0;
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          bottomNavigationBar: AppNavigationBar(
            currentIndex: 2,
            onTabSelected: tabs.add,
            onAdd: () => adds++,
          ),
        ),
      ),
    );

    expect(
      tester.widget<NavigationBar>(find.byType(NavigationBar)).selectedIndex,
      3,
    );
    await tester.tap(find.byIcon(Icons.add));
    await tester.tap(find.text('İşlemler'));
    await tester.tap(find.text('Diğer'));
    await tester.pump();

    expect(adds, 1);
    expect(tabs, [1, 3]);
  });
}
