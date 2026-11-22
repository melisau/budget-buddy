import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

const brand = Color(0xFF5267DF);
const ink = Color(0xFF17213C);
const muted = Color(0xFF737C91);
const line = Color(0xFFE3E6EE);
const income = Color(0xFF238B70);
const expense = Color(0xFFD45050);
const page = Color(0xFFF6F7FB);

ThemeData buildTheme() {
  final fieldBorder = OutlineInputBorder(
    borderRadius: BorderRadius.circular(12),
    borderSide: const BorderSide(color: line),
  );
  return ThemeData(
    useMaterial3: true,
    colorScheme: ColorScheme.fromSeed(
      seedColor: brand,
      primary: brand,
      surface: Colors.white,
    ),
    scaffoldBackgroundColor: page,
    appBarTheme: const AppBarTheme(
      backgroundColor: page,
      foregroundColor: ink,
      elevation: 0,
      scrolledUnderElevation: 0,
      centerTitle: false,
      titleTextStyle: TextStyle(
        color: ink,
        fontSize: 26,
        fontWeight: FontWeight.w800,
      ),
    ),
    cardTheme: CardThemeData(
      color: Colors.white,
      elevation: 0,
      margin: EdgeInsets.zero,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(18),
        side: const BorderSide(color: line),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: Colors.white,
      border: fieldBorder,
      enabledBorder: fieldBorder,
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        minimumSize: const Size.fromHeight(52),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        textStyle: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
      ),
    ),
  );
}

String money(num value, [String currency = 'TRY']) {
  const symbols = {'TRY': '₺', 'EUR': '€', 'USD': r'$', 'GBP': '£'};
  return NumberFormat.currency(
    locale: 'tr_TR',
    symbol: symbols[currency] ?? currency,
    decimalDigits: 2,
  ).format(value);
}

String shortDate(String iso) {
  final date = DateTime.tryParse(iso);
  return date == null ? iso : DateFormat('d MMM yyyy', 'tr_TR').format(date);
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
  return date == null ? month : DateFormat('MMM', 'tr_TR').format(date);
}

String categoryLabel(String name) => const {
  'Housing': 'Konut',
  'Groceries': 'Market',
  'Dining': 'Yeme içme',
  'Transport': 'Ulaşım',
  'Utilities': 'Faturalar',
  'Health': 'Sağlık',
  'Education': 'Eğitim',
  'Entertainment': 'Eğlence',
  'Shopping': 'Alışveriş',
  'Subscriptions': 'Abonelikler',
  'Personal care': 'Kişisel bakım',
  'Travel': 'Seyahat',
  'Insurance': 'Sigorta',
  'Debt payments': 'Borç ödemeleri',
  'Gifts': 'Hediyeler',
  'Other expenses': 'Diğer giderler',
  'Salary': 'Maaş',
  'Freelance income': 'Serbest gelir',
  'Investment income': 'Yatırım geliri',
  'Gift income': 'Hediye geliri',
  'Other income': 'Diğer gelirler',
  'Uncategorized': 'Kategorisiz',
}[name] ?? name;
