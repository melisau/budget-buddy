import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:intl/intl.dart';

import 'i18n.dart';

const brand = Color(0xFF4258D5);
const income = Color(0xFF238B70);
const expense = Color(0xFFD45050);

/// The few colors that differ between light and dark mode.
class _Palette {
  const _Palette({
    required this.ink,
    required this.muted,
    required this.line,
    required this.page,
    required this.surface,
    required this.soft,
    required this.primary,
  });

  final Color ink;
  final Color muted;
  final Color line;
  final Color page;
  final Color surface;
  final Color soft;
  final Color primary;
}

const _light = _Palette(
  ink: Color(0xFF17213C),
  // The web's muted gray: 4.5:1 on white, unlike the earlier #737C91.
  muted: Color(0xFF66708B),
  line: Color(0xFFE3E6EE),
  page: Color(0xFFF6F7FB),
  surface: Colors.white,
  soft: Color(0xFFE9ECF4),
  primary: brand,
);

// The brand blue is lightened on dark surfaces so text and icons stay readable.
const _dark = _Palette(
  ink: Color(0xFFE8EBF4),
  muted: Color(0xFF9AA3B8),
  line: Color(0xFF2C3448),
  page: Color(0xFF0F1420),
  surface: Color(0xFF181F2E),
  soft: Color(0xFF232B3D),
  primary: Color(0xFF8193F0),
);

/// Theme-aware colors for widgets: `context.ink`, `context.muted`, ...
extension AppColors on BuildContext {
  _Palette get _palette =>
      Theme.of(this).brightness == Brightness.dark ? _dark : _light;
  Color get ink => _palette.ink;
  Color get muted => _palette.muted;
  Color get line => _palette.line;
  Color get page => _palette.page;
  Color get surface => _palette.surface;
  Color get soft => _palette.soft;
  Color get accent => _palette.primary;
}

ThemeData buildTheme([Brightness brightness = Brightness.light]) {
  final p = brightness == Brightness.dark ? _dark : _light;
  final fieldBorder = OutlineInputBorder(
    borderRadius: BorderRadius.circular(12),
    borderSide: BorderSide(color: p.line),
  );
  return ThemeData(
    useMaterial3: true,
    brightness: brightness,
    colorScheme: ColorScheme.fromSeed(
      seedColor: brand,
      brightness: brightness,
      primary: p.primary,
      onPrimary: brightness == Brightness.dark
          ? Color(0xFF0F1420)
          : Colors.white,
      surface: p.surface,
      onSurface: p.ink,
      onSurfaceVariant: p.muted,
      outlineVariant: p.line,
    ),
    scaffoldBackgroundColor: p.page,
    appBarTheme: AppBarTheme(
      // Status and navigation bar icons follow the mode.
      systemOverlayStyle: SystemUiOverlayStyle(
        statusBarColor: Colors.transparent,
        statusBarIconBrightness: brightness == Brightness.dark
            ? Brightness.light
            : Brightness.dark,
        statusBarBrightness: brightness,
        systemNavigationBarColor: p.surface,
        systemNavigationBarIconBrightness: brightness == Brightness.dark
            ? Brightness.light
            : Brightness.dark,
      ),
      backgroundColor: p.page,
      foregroundColor: p.ink,
      elevation: 0,
      scrolledUnderElevation: 0,
      centerTitle: false,
      titleTextStyle: TextStyle(
        color: p.ink,
        fontSize: 26,
        fontWeight: FontWeight.w800,
      ),
    ),
    cardTheme: CardThemeData(
      color: p.surface,
      elevation: 0,
      margin: EdgeInsets.zero,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(18),
        side: BorderSide(color: p.line),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: p.surface,
      border: fieldBorder,
      enabledBorder: fieldBorder,
    ),
    navigationBarTheme: NavigationBarThemeData(backgroundColor: p.surface),
    bottomSheetTheme: BottomSheetThemeData(backgroundColor: p.surface),
    dialogTheme: DialogThemeData(backgroundColor: p.surface),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        minimumSize: Size.fromHeight(52),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        textStyle: TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
      ),
    ),
  );
}

String money(num value, [String currency = 'TRY']) {
  const symbols = {'TRY': '₺', 'EUR': '€', 'USD': r'$', 'GBP': '£'};
  return NumberFormat.currency(
    locale: I18n.locale,
    symbol: symbols[currency] ?? currency,
    decimalDigits: 2,
  ).format(value);
}

String shortDate(String iso) {
  final date = DateTime.tryParse(iso);
  return date == null
      ? iso
      : DateFormat('d MMM yyyy', I18n.locale).format(date);
}

/// Accepts Turkish input such as 1.250,50 as well as 1250.50.
double? parseAmount(String input) {
  final value = input.trim();
  final normalized = value.contains(',')
      ? value.replaceAll('.', '').replaceAll(',', '.')
      : value;
  return double.tryParse(normalized);
}

String monthLabel(String month) {
  final date = DateTime.tryParse('$month-01');
  return date == null ? month : DateFormat('MMM', I18n.locale).format(date);
}

String categoryLabel(String name) =>
    {
      'Housing': t('Konut'),
      'Groceries': t('Market'),
      'Dining': t('Yeme içme'),
      'Transport': t('Ulaşım'),
      'Utilities': t('Faturalar'),
      'Health': t('Sağlık'),
      'Education': t('Eğitim'),
      'Entertainment': t('Eğlence'),
      'Shopping': t('Alışveriş'),
      'Subscriptions': t('Abonelikler'),
      'Personal care': t('Kişisel bakım'),
      'Travel': t('Seyahat'),
      'Insurance': t('Sigorta'),
      'Debt payments': t('Borç ödemeleri'),
      'Gifts': t('Hediyeler'),
      'Other expenses': t('Diğer giderler'),
      'Salary': t('Maaş'),
      'Freelance income': t('Serbest gelir'),
      'Investment income': t('Yatırım geliri'),
      'Gift income': t('Hediye geliri'),
      'Other income': t('Diğer gelirler'),
      'Uncategorized': t('Kategorisiz'),
    }[name] ??
    name;
