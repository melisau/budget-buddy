import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/theme.dart';
import 'data.dart';
import '../core/i18n.dart';

class AssistantScreen extends ConsumerStatefulWidget {
  const AssistantScreen({super.key});

  @override
  ConsumerState<AssistantScreen> createState() => _AssistantScreenState();
}

class _AssistantScreenState extends ConsumerState<AssistantScreen> {
  final _input = TextEditingController();
  final _scroll = ScrollController();
  final List<({bool mine, String text})> _messages = [];
  String? _conversationId;
  bool _busy = false;

  @override
  void dispose() {
    _input.dispose();
    _scroll.dispose();
    super.dispose();
  }

  void _toEnd() => WidgetsBinding.instance.addPostFrameCallback((_) {
    if (_scroll.hasClients) {
      _scroll.animateTo(
        _scroll.position.maxScrollExtent,
        duration: const Duration(milliseconds: 220),
        curve: Curves.easeOut,
      );
    }
  });

  Future<void> _send() async {
    final question = _input.text.trim();
    if (question.length < 2 || _busy) return;
    _input.clear();
    setState(() {
      _busy = true;
      _messages.add((mine: true, text: question));
    });
    _toEnd();
    try {
      final result = await ref.read(apiProvider).post('assistant', {
        'question': question,
        'language': 'tr',
        'conversationId': ?_conversationId,
      });
      final session = result['session'] as Map<String, dynamic>?;
      _conversationId =
          session?['conversation_id'] as String? ?? _conversationId;
      if (mounted) {
        setState(
          () => _messages.add((mine: false, text: '${result['answer']}')),
        );
      }
    } catch (e) {
      if (mounted) setState(() => _messages.add((mine: false, text: '$e')));
    } finally {
      if (mounted) setState(() => _busy = false);
      _toEnd();
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: Text(t('AI Asistan'))),
    body: Column(
      children: [
        Expanded(
          child: _messages.isEmpty
              ? Center(
                  child: Padding(
                    padding: EdgeInsets.all(32),
                    child: Text(
                      t(
                        'Harcamalarını sor, sade bir açıklama al.\nYatırım tavsiyesi vermez.',
                      ),
                      textAlign: TextAlign.center,
                      style: TextStyle(color: context.muted, fontSize: 16),
                    ),
                  ),
                )
              : ListView.builder(
                  controller: _scroll,
                  padding: const EdgeInsets.all(16),
                  itemCount: _messages.length + (_busy ? 1 : 0),
                  itemBuilder: (_, i) {
                    if (i == _messages.length) {
                      return const Align(
                        alignment: Alignment.centerLeft,
                        child: Padding(
                          padding: EdgeInsets.all(10),
                          child: SizedBox.square(
                            dimension: 20,
                            child: CircularProgressIndicator(strokeWidth: 2.5),
                          ),
                        ),
                      );
                    }
                    final m = _messages[i];
                    return Align(
                      alignment: m.mine
                          ? Alignment.centerRight
                          : Alignment.centerLeft,
                      child: Container(
                        constraints: BoxConstraints(
                          maxWidth: MediaQuery.sizeOf(context).width * .82,
                        ),
                        margin: const EdgeInsets.only(bottom: 10),
                        padding: const EdgeInsets.symmetric(
                          horizontal: 14,
                          vertical: 10,
                        ),
                        decoration: BoxDecoration(
                          color: m.mine ? brand : context.surface,
                          border: m.mine
                              ? null
                              : Border.all(color: context.line),
                          borderRadius: BorderRadius.circular(16),
                        ),
                        child: SelectableText(
                          m.text,
                          style: TextStyle(
                            color: m.mine ? Colors.white : context.ink,
                            height: 1.35,
                          ),
                        ),
                      ),
                    );
                  },
                ),
        ),
        SafeArea(
          top: false,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(12, 4, 12, 8),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _input,
                    maxLength: 800,
                    minLines: 1,
                    maxLines: 4,
                    textCapitalization: TextCapitalization.sentences,
                    decoration: InputDecoration(
                      hintText: t('Bir soru yaz'),
                      counterText: '',
                      isDense: true,
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                IconButton.filled(
                  tooltip: t('Gönder'),
                  onPressed: _busy ? null : _send,
                  icon: const Icon(Icons.send_rounded),
                ),
              ],
            ),
          ),
        ),
      ],
    ),
  );
}
