import 'package:flutter/material.dart';

import '../core/theme.dart';

const _addSlot = 2;

/// Bottom navigation matching the mobile web layout, with Add in the centre.
/// [currentIndex] counts tabs only, so the Add slot never shifts a route.
class AppNavigationBar extends StatelessWidget {
  const AppNavigationBar({
    super.key,
    required this.currentIndex,
    required this.onTabSelected,
    required this.onAdd,
  });

  final int currentIndex;
  final ValueChanged<int> onTabSelected;
  final VoidCallback onAdd;

  @override
  Widget build(BuildContext context) => NavigationBar(
    labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
    selectedIndex: currentIndex < _addSlot ? currentIndex : currentIndex + 1,
    onDestinationSelected: (slot) {
      if (slot == _addSlot) {
        onAdd();
      } else {
        onTabSelected(slot < _addSlot ? slot : slot - 1);
      }
    },
    destinations: const [
      NavigationDestination(
        icon: Icon(Icons.home_outlined),
        selectedIcon: Icon(Icons.home),
        label: 'Ana Sayfa',
      ),
      NavigationDestination(
        icon: Icon(Icons.receipt_long_outlined),
        selectedIcon: Icon(Icons.receipt_long),
        label: 'İşlemler',
      ),
      NavigationDestination(
        icon: _AddIcon(),
        label: 'Ekle',
        tooltip: 'İşlem ekle',
      ),
      NavigationDestination(
        icon: Icon(Icons.auto_awesome_outlined),
        selectedIcon: Icon(Icons.auto_awesome),
        label: 'AI Asistanı',
      ),
      NavigationDestination(icon: Icon(Icons.more_horiz), label: 'Diğer'),
    ],
  );
}

class _AddIcon extends StatelessWidget {
  const _AddIcon();

  @override
  Widget build(BuildContext context) => SizedBox.square(
    // Keeps the label on the same line as the other tabs.
    dimension: 24,
    child: OverflowBox(
      maxWidth: 46,
      maxHeight: 40,
      child: Container(
        width: 46,
        height: 40,
        decoration: BoxDecoration(
          color: brand,
          borderRadius: BorderRadius.circular(14),
          boxShadow: [
            BoxShadow(
              color: brand.withValues(alpha: 0.32),
              blurRadius: 10,
              offset: const Offset(0, 3),
            ),
          ],
        ),
        child: const Icon(Icons.add, color: Colors.white, size: 28),
      ),
    ),
  );
}
