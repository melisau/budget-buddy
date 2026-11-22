import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/theme.dart';
import 'common.dart';
import 'data.dart';

const _occasions = {
  'birthday': 'Doğum günü',
  'housewarming': 'Ev hediyesi',
  'new_year': 'Yeni yıl',
  'other': 'Diğer',
};

class FamilyScreen extends StatelessWidget {
  const FamilyScreen({super.key});
  static const _path = 'family';

  @override
  Widget build(BuildContext context) => ApiPage(
    title: 'Aile Grubu',
    path: _path,
    addLabel: 'Grup oluştur',
    onAdd: (context, ref, _) => showFormSheet(
      context,
      title: 'Aile grubu oluştur',
      fields: const [FieldSpec('name', 'Grup adı')],
      onSubmit: (v) async {
        await ref.read(apiProvider).post(_path, {...v, 'currency': 'TRY'});
        ref.invalidate(pageProvider(_path));
      },
    ),
    builder: (context, ref, d) {
      final groups = rows(d['groups']);
      if (groups.isEmpty) return const [EmptyNote('Henüz aile grubun yok.')];
      return [
        for (final g in groups) ...[
          Card(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                ListTile(
                  leading: const CircleAvatar(child: Icon(Icons.groups_outlined)),
                  title: Text('${g['name']}', style: const TextStyle(fontWeight: FontWeight.w800, color: ink)),
                  subtitle: Text('${rows(g['members']).length} üye'),
                ),
                for (final m in rows(g['members']))
                  ListTile(
                    dense: true,
                    leading: const Icon(Icons.person_outline),
                    title: Text('${m['name'] ?? m['email'] ?? 'Üye'}'),
                    subtitle: Text(_memberState(m)),
                  ),
              ],
            ),
          ),
          const Gap(),
          _Shopping(groupId: '${g['id']}', canEdit: g['role'] != 'viewer'),
          const SizedBox(height: 16),
        ],
      ];
    },
  );

  static String _memberState(Map<String, dynamic> m) {
    final role = const {'owner': 'Sahip', 'member': 'Üye', 'viewer': 'İzleyici'}[m['role']] ?? '${m['role']}';
    return m['invitationStatus'] == 'pending' ? '$role · davet bekliyor' : role;
  }
}

class _Shopping extends ConsumerWidget {
  const _Shopping({required this.groupId, required this.canEdit});

  final String groupId;
  final bool canEdit;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final path = 'family/$groupId/shopping';
    final data = ref.watch(pageProvider(path));
    return Card(
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          ListTile(
            title: const Text('Ortak alışveriş listesi', style: TextStyle(fontWeight: FontWeight.w800, color: ink)),
            trailing: canEdit
                ? IconButton(
                    tooltip: 'Ürün ekle',
                    icon: const Icon(Icons.add_circle_outline, color: brand),
                    onPressed: () => showFormSheet(
                      context,
                      title: 'Ürün ekle',
                      fields: const [
                        FieldSpec('name', 'Ürün'),
                        FieldSpec('quantity', 'Miktar', required: false),
                      ],
                      onSubmit: (v) async {
                        await ref.read(apiProvider).post(path, {...v, 'quantity': v['quantity'] ?? ''});
                        ref.invalidate(pageProvider(path));
                      },
                    ),
                  )
                : null,
          ),
          ...data.when(
            loading: () => const [Padding(padding: EdgeInsets.all(18), child: Center(child: CircularProgressIndicator()))],
            error: (e, _) => [
              Padding(
                padding: const EdgeInsets.all(16),
                child: TextButton(onPressed: () => ref.invalidate(pageProvider(path)), child: Text('$e · Tekrar dene')),
              ),
            ],
            data: (d) {
              final items = rows(d['items']);
              if (items.isEmpty) {
                return const [Padding(padding: EdgeInsets.fromLTRB(16, 0, 16, 18), child: Text('Liste boş.', style: TextStyle(color: muted)))];
              }
              return [
                for (final i in items)
                  CheckboxListTile(
                    value: i['checked_at'] != null,
                    title: Text(
                      '${i['name']}',
                      style: TextStyle(decoration: i['checked_at'] != null ? TextDecoration.lineThrough : null),
                    ),
                    subtitle: '${i['quantity'] ?? ''}'.isEmpty ? null : Text('${i['quantity']}'),
                    onChanged: canEdit
                        ? (v) => runAction(context, ref, path, (api) => api.patch(path, {'itemId': i['id'], 'checked': v == true}))
                        : null,
                  ),
              ];
            },
          ),
        ],
      ),
    );
  }
}

class WishlistsScreen extends StatelessWidget {
  const WishlistsScreen({super.key});
  static const _path = 'wishlists';

  @override
  Widget build(BuildContext context) => ApiPage(
    title: 'Dilek Listeleri',
    path: _path,
    addLabel: 'Yeni liste',
    onAdd: (context, ref, _) => showFormSheet(
      context,
      title: 'Yeni liste',
      fields: [
        const FieldSpec('title', 'Liste adı'),
        FieldSpec('occasion', 'Vesile', kind: FieldKind.choice, options: (_) => _occasions, initial: 'birthday'),
        const FieldSpec('eventDate', 'Tarih', kind: FieldKind.date, required: false),
      ],
      onSubmit: (v) async {
        await ref.read(apiProvider).post(_path, {...v, 'surprise': true});
        ref.invalidate(pageProvider(_path));
      },
    ),
    builder: (context, ref, d) {
      final lists = rows(d['lists']);
      if (lists.isEmpty) return const [EmptyNote('Henüz dilek listen yok.')];
      return [
        for (final l in lists) ...[
          Card(
            clipBehavior: Clip.antiAlias,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                ListTile(
                  title: Text('${l['title']}', style: const TextStyle(fontWeight: FontWeight.w800, color: ink)),
                  subtitle: Text(_occasions[l['occasion']] ?? '${l['occasion']}'),
                  trailing: l['mine'] == true
                      ? IconButton(
                          tooltip: 'Dilek ekle',
                          icon: const Icon(Icons.add_circle_outline, color: brand),
                          onPressed: () => showFormSheet(
                            context,
                            title: 'Dilek ekle',
                            fields: const [
                              FieldSpec('name', 'Dilek'),
                              FieldSpec('note', 'Not', required: false),
                            ],
                            onSubmit: (v) async {
                              await ref.read(apiProvider).patch('wishlists/${l['id']}', {'action': 'add', 'name': v['name'], 'note': v['note'] ?? ''});
                              ref.invalidate(pageProvider(_path));
                            },
                          ),
                        )
                      : null,
                ),
                for (final i in rows(l['items']))
                  ListTile(
                    dense: true,
                    leading: const Icon(Icons.card_giftcard_outlined),
                    title: Text('${i['name']}'),
                    subtitle: '${i['note'] ?? ''}'.isEmpty ? null : Text('${i['note']}'),
                    trailing: l['mine'] == true
                        ? (l['surprise'] == true ? const Text('Sürpriz') : null)
                        : TextButton(
                            onPressed: i['reserved'] != null && i['reservedByMe'] != true
                                ? null
                                : () => runAction(context, ref, _path, (api) => api.patch('wishlists/${l['id']}', {
                                    'action': i['reservedByMe'] == true ? 'release' : 'reserve',
                                    'itemId': i['id'],
                                  })),
                            child: Text(i['reservedByMe'] == true ? 'Bırak' : (i['reserved'] != null ? 'Ayrıldı' : 'Ben alırım')),
                          ),
                  ),
              ],
            ),
          ),
          const Gap(),
        ],
      ];
    },
  );
}
