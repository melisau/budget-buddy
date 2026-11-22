import 'package:flutter/material.dart';

import 'theme.dart';

class ErrorRetry extends StatelessWidget {
  const ErrorRetry({super.key, required this.message, required this.onRetry});

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) => ListView(
    padding: const EdgeInsets.all(32),
    children: [
      const SizedBox(height: 100),
      const Icon(Icons.cloud_off_rounded, size: 48, color: muted),
      const SizedBox(height: 14),
      Text(
        message,
        textAlign: TextAlign.center,
        style: const TextStyle(color: ink, fontSize: 16),
      ),
      const SizedBox(height: 18),
      FilledButton(onPressed: onRetry, child: const Text('Tekrar dene')),
    ],
  );
}

class LoadingList extends StatelessWidget {
  const LoadingList({super.key});

  @override
  Widget build(BuildContext context) => ListView.separated(
    padding: const EdgeInsets.all(16),
    physics: const NeverScrollableScrollPhysics(),
    itemCount: 6,
    separatorBuilder: (_, _) => const SizedBox(height: 12),
    itemBuilder: (_, _) => Container(
      height: 78,
      decoration: BoxDecoration(
        color: const Color(0xFFE9ECF4),
        borderRadius: BorderRadius.circular(16),
      ),
    ),
  );
}

class TransactionTile extends StatelessWidget {
  const TransactionTile({
    super.key,
    required this.title,
    required this.subtitle,
    required this.amount,
    required this.isIncome,
    this.currency = 'TRY',
    this.onTap,
  });

  final String title;
  final String subtitle;
  final String currency;
  final num amount;
  final bool isIncome;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final color = isIncome ? income : brand;
    return ListTile(
      onTap: onTap,
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 2),
      leading: CircleAvatar(
        backgroundColor: color.withValues(alpha: .12),
        child: Icon(
          isIncome ? Icons.south_west_rounded : Icons.north_east_rounded,
          color: color,
          size: 20,
        ),
      ),
      title: Text(
        title,
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
        style: const TextStyle(fontWeight: FontWeight.w700, color: ink),
      ),
      subtitle: Text(subtitle, maxLines: 1, overflow: TextOverflow.ellipsis),
      trailing: Text(
        '${isIncome ? '+' : '−'}${money(amount, currency)}',
        style: TextStyle(
          fontWeight: FontWeight.w800,
          color: isIncome ? income : expense,
        ),
      ),
    );
  }
}
