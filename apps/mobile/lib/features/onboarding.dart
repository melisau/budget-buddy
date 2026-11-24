import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../core/onboarding.dart';
import '../core/theme.dart';
import '../core/theme_mode.dart';

class _Intro {
  const _Intro(this.icon, this.color, this.title, this.body);
  final IconData icon;
  final Color color;
  final String title;
  final String body;
}

const _intros = [
  _Intro(
    Icons.receipt_long_rounded,
    Color(0xFF4258D5),
    'Paran nereye gidiyor, gör',
    'Gelir ve giderlerini saniyeler içinde ekle. Sık kullanılan kategoriler tek dokunuşla, fişler tarayarak.',
  ),
  _Intro(
    Icons.savings_rounded,
    Color(0xFF238B70),
    'Bütçe koy, hedef belirle',
    'Bütçe, bir kategoride bu ay en fazla ne kadar harcayacağın. Hedef, bir şey için biriktirmek istediğin tutar.',
  ),
  _Intro(
    Icons.groups_rounded,
    Color(0xFFC84F43),
    'Ailecek birlikte',
    'Ortak harcamaları, alışveriş listesini ve dilek listelerini aile grubunla paylaş.',
  ),
  _Intro(
    Icons.lock_rounded,
    Color(0xFF7565D6),
    'Verilerin sende',
    'Banka hesabına bağlanmayız, kart bilgisi istemeyiz. Kayıtların yalnızca sana ve izin verdiklerine görünür.',
  ),
];

/// Welcome pages shown once before the first sign-in, ending with
/// language, currency and appearance.
class OnboardingScreen extends ConsumerStatefulWidget {
  const OnboardingScreen({super.key});

  @override
  ConsumerState<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends ConsumerState<OnboardingScreen> {
  final _pages = PageController();
  int _page = 0;
  String _language = 'tr';
  String _currency = 'TRY';

  int get _last => _intros.length;

  @override
  void dispose() {
    _pages.dispose();
    super.dispose();
  }

  void _next() => _pages.nextPage(
    duration: const Duration(milliseconds: 280),
    curve: Curves.easeOut,
  );

  Future<void> _finish() async {
    await Onboarding.finish(language: _language, currency: _currency);
    if (mounted) context.go('/sign-in');
  }

  @override
  Widget build(BuildContext context) {
    final onPrefs = _page == _last;
    return Scaffold(
      body: SafeArea(
        child: Column(
          children: [
            Align(
              alignment: Alignment.centerRight,
              child: TextButton(
                onPressed: onPrefs
                    ? null
                    : () => _pages.animateToPage(
                        _last,
                        duration: const Duration(milliseconds: 320),
                        curve: Curves.easeOut,
                      ),
                child: Text(onPrefs ? '' : 'Atla'),
              ),
            ),
            Expanded(
              child: PageView(
                controller: _pages,
                onPageChanged: (page) => setState(() => _page = page),
                children: [
                  for (final intro in _intros) _IntroPage(intro),
                  _prefsPage(context),
                ],
              ),
            ),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                for (var i = 0; i <= _last; i++)
                  AnimatedContainer(
                    duration: const Duration(milliseconds: 200),
                    margin: const EdgeInsets.symmetric(horizontal: 4),
                    width: i == _page ? 22 : 8,
                    height: 8,
                    decoration: BoxDecoration(
                      color: i == _page ? brand : context.line,
                      borderRadius: BorderRadius.circular(8),
                    ),
                  ),
              ],
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 18, 24, 20),
              child: SizedBox(
                width: double.infinity,
                height: 52,
                child: FilledButton(
                  onPressed: onPrefs ? _finish : _next,
                  child: Text(onPrefs ? 'Başla' : 'İleri'),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _prefsPage(BuildContext context) => ListView(
    padding: const EdgeInsets.fromLTRB(24, 8, 24, 8),
    children: [
      Text(
        'Senin için ayarlayalım',
        style: TextStyle(
          fontSize: 26,
          fontWeight: FontWeight.w800,
          color: context.ink,
        ),
      ),
      const SizedBox(height: 8),
      Text(
        'Bunları daha sonra Ayarlar\'dan değiştirebilirsin.',
        style: TextStyle(color: context.muted),
      ),
      const SizedBox(height: 26),
      _label(context, 'Dil'),
      SegmentedButton<String>(
        segments: [
          for (final entry in Onboarding.languages.entries)
            ButtonSegment(value: entry.key, label: Text(entry.value)),
        ],
        selected: {_language},
        onSelectionChanged: (value) => setState(() => _language = value.first),
      ),
      const SizedBox(height: 6),
      Text(
        'Uygulama şimdilik Türkçe; seçimin web sitesine ve e-postalarına uygulanır.',
        style: TextStyle(color: context.muted, fontSize: 12),
      ),
      const SizedBox(height: 22),
      _label(context, 'Para birimi'),
      Wrap(
        spacing: 8,
        runSpacing: 8,
        children: [
          for (final currency in Onboarding.currencies)
            ChoiceChip(
              label: Text(currency),
              selected: _currency == currency,
              onSelected: (_) => setState(() => _currency = currency),
            ),
        ],
      ),
      const SizedBox(height: 22),
      _label(context, 'Görünüm'),
      SegmentedButton<ThemeMode>(
        segments: const [
          ButtonSegment(value: ThemeMode.system, label: Text('Sistem')),
          ButtonSegment(value: ThemeMode.light, label: Text('Açık')),
          ButtonSegment(value: ThemeMode.dark, label: Text('Koyu')),
        ],
        selected: {ref.watch(themeModeProvider)},
        onSelectionChanged: (value) =>
            ref.read(themeModeProvider.notifier).set(value.first),
      ),
    ],
  );

  Widget _label(BuildContext context, String text) => Padding(
    padding: const EdgeInsets.only(bottom: 10),
    child: Text(
      text,
      style: TextStyle(fontWeight: FontWeight.w700, color: context.ink),
    ),
  );
}

class _IntroPage extends StatelessWidget {
  const _IntroPage(this.intro);
  final _Intro intro;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(horizontal: 32),
    child: Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Container(
          width: 132,
          height: 132,
          decoration: BoxDecoration(
            color: intro.color.withValues(alpha: 0.14),
            shape: BoxShape.circle,
          ),
          child: Icon(intro.icon, size: 64, color: intro.color),
        ),
        const SizedBox(height: 36),
        Text(
          intro.title,
          textAlign: TextAlign.center,
          style: TextStyle(
            fontSize: 26,
            fontWeight: FontWeight.w800,
            color: context.ink,
          ),
        ),
        const SizedBox(height: 14),
        Text(
          intro.body,
          textAlign: TextAlign.center,
          style: TextStyle(fontSize: 16, height: 1.45, color: context.muted),
        ),
      ],
    ),
  );
}
