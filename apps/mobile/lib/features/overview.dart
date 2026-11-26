import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/theme.dart';
import '../core/widgets.dart';
import 'common.dart';
import 'data.dart';
import 'reminders.dart';
import '../core/i18n.dart';

class OverviewScreen extends ConsumerWidget {
  const OverviewScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final data = ref.watch(dashboardProvider);
    final cached = ref.watch(cachedDashboardProvider).value;
    return Scaffold(
      appBar: AppBar(title: Text(t('Genel Bakış'))),
      body: RefreshIndicator(
        onRefresh: () {
          ref.invalidate(pageProvider(remindersPath));
          return ref.refresh(dashboardProvider.future);
        },
        child: data.when(
          skipLoadingOnRefresh: true,
          // The previous visit's numbers appear at once; a thin bar shows the
          // fresh ones are still loading.
          loading: () => cached == null
              ? const LoadingList()
              : Column(
                  children: [
                    const LinearProgressIndicator(minHeight: 2),
                    Expanded(child: _Content(cached)),
                  ],
                ),
          error: (e, _) => ErrorRetry(
            message: '$e',
            onRetry: () => ref.invalidate(dashboardProvider),
          ),
          data: (d) => _Content(d),
        ),
      ),
    );
  }
}

class _Content extends StatelessWidget {
  const _Content(this.data);

  final Map<String, dynamic> data;

  @override
  Widget build(BuildContext context) {
    final summary = data['summary'] as Map<String, dynamic>;
    final currency = (data['filters'] as Map)['currency'] as String? ?? 'TRY';
    final recent = (data['recent'] as List).cast<Map<String, dynamic>>();
    final flow = (data['cashFlow'] as List).cast<Map<String, dynamic>>();
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 4, 16, 110),
      children: [
        const DueReminders(),
        Container(
          padding: const EdgeInsets.all(22),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(22),
            gradient: const LinearGradient(
              colors: [Color(0xFF1A2747), Color(0xFF3954AC)],
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                t('Toplam bakiye'),
                style: TextStyle(color: Color(0xFFC7CEE2)),
              ),
              const SizedBox(height: 6),
              FittedBox(
                child: Text(
                  money(summary['balance'] as num, currency),
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 32,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: _Stat(
                t('Aylık gelir'),
                money(summary['income'] as num, currency),
                income,
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: _Stat(
                t('Aylık gider'),
                money(summary['expenses'] as num, currency),
                expense,
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  t('Nakit akışı'),
                  style: TextStyle(
                    fontSize: 17,
                    fontWeight: FontWeight.w700,
                    color: context.ink,
                  ),
                ),
                const SizedBox(height: 16),
                SizedBox(height: 180, child: CashFlowChart(flow)),
              ],
            ),
          ),
        ),
        const SizedBox(height: 20),
        Text(
          t('Son işlemler'),
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.w800,
            color: context.ink,
          ),
        ),
        const SizedBox(height: 8),
        if (recent.isEmpty)
          Card(
            child: Padding(
              padding: EdgeInsets.all(24),
              child: Text(
                t('Bu ay henüz işlem yok.'),
                textAlign: TextAlign.center,
              ),
            ),
          )
        else
          Card(
            clipBehavior: Clip.antiAlias,
            child: Column(
              children: [
                for (final t in recent)
                  TransactionTile(
                    title: '${t['title']}',
                    subtitle: shortDate('${t['transaction_date']}'),
                    amount: t['amount'] as num,
                    isIncome: t['type'] == 'income',
                    currency: currency,
                  ),
              ],
            ),
          ),
      ],
    );
  }
}

class _Stat extends StatelessWidget {
  const _Stat(this.label, this.value, this.color);

  final String label;
  final String value;
  final Color color;

  @override
  Widget build(BuildContext context) => Card(
    child: Padding(
      padding: const EdgeInsets.all(14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: TextStyle(color: context.muted)),
          const SizedBox(height: 4),
          FittedBox(
            child: Text(
              value,
              style: TextStyle(
                color: color,
                fontSize: 18,
                fontWeight: FontWeight.w800,
              ),
            ),
          ),
        ],
      ),
    ),
  );
}

class CashFlowChart extends StatelessWidget {
  const CashFlowChart(this.flow, {super.key});

  final List<Map<String, dynamic>> flow;

  LineChartBarData _line(String key, Color color) => LineChartBarData(
    isCurved: true,
    preventCurveOverShooting: true,
    color: color,
    barWidth: 3,
    dotData: const FlDotData(show: false),
    spots: [
      for (var i = 0; i < flow.length; i++)
        FlSpot(i.toDouble(), (flow[i][key] as num).toDouble()),
    ],
  );

  @override
  Widget build(BuildContext context) => LineChart(
    LineChartData(
      gridData: const FlGridData(drawVerticalLine: false),
      borderData: FlBorderData(show: false),
      titlesData: FlTitlesData(
        topTitles: const AxisTitles(),
        rightTitles: const AxisTitles(),
        leftTitles: const AxisTitles(),
        bottomTitles: AxisTitles(
          sideTitles: SideTitles(
            showTitles: true,
            interval: 1,
            getTitlesWidget: (value, _) {
              final i = value.toInt();
              if (i < 0 || i >= flow.length) return const SizedBox();
              return Padding(
                padding: const EdgeInsets.only(top: 6),
                child: Text(
                  monthLabel('${flow[i]['month']}'),
                  style: const TextStyle(fontSize: 11),
                ),
              );
            },
          ),
        ),
      ),
      lineBarsData: [_line('income', income), _line('expense', expense)],
    ),
  );
}
