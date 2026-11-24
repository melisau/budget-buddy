import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/api.dart';
import '../core/config.dart';
import '../core/theme.dart';
import 'common.dart';
import 'data.dart';

const _invitationsPath = 'family/invitations';
const _inviteRoles = {'member': 'Üye', 'viewer': 'İzleyici'};

bool isInviteEmail(String value) =>
    RegExp(r'^\S+@\S+\.\S+$').hasMatch(value.trim());

Future<bool> _confirm(
  BuildContext context, {
  required String title,
  required String message,
  required String action,
}) async =>
    await showDialog<bool>(
      context: context,
      builder: (dialog) => AlertDialog(
        title: Text(title),
        content: Text(message),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialog, false),
            child: const Text('Vazgeç'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(dialog, true),
            child: Text(action, style: const TextStyle(color: expense)),
          ),
        ],
      ),
    ) ??
    false;

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
    refreshAlso: const [_invitationsPath],
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
      if (groups.isEmpty) {
        return const [_Invitations(), EmptyNote('Henüz aile grubun yok.')];
      }
      return [
        const _Invitations(),
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
                    trailing: g['role'] == 'owner' && m['role'] != 'owner'
                        ? _memberMenu(context, ref, '${g['id']}', m)
                        : null,
                  ),
                Padding(
                  padding: const EdgeInsets.fromLTRB(8, 0, 8, 8),
                  child: g['role'] == 'owner'
                      ? TextButton.icon(
                          onPressed: () => _invite(context, ref, '${g['id']}'),
                          icon: const Icon(Icons.person_add_alt_1_outlined),
                          label: const Text('Üye davet et'),
                        )
                      : TextButton.icon(
                          onPressed: () => _leave(context, ref, g),
                          style: TextButton.styleFrom(foregroundColor: expense),
                          icon: const Icon(Icons.logout),
                          label: const Text('Gruptan ayrıl'),
                        ),
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

  static void _invite(BuildContext context, WidgetRef ref, String groupId) {
    final messenger = ScaffoldMessenger.of(context);
    showFormSheet(
      context,
      title: 'Üye davet et',
      fields: [
        const FieldSpec('email', 'E-posta'),
        FieldSpec(
          'role',
          'Yetki',
          kind: FieldKind.choice,
          initial: 'member',
          options: (_) => _inviteRoles,
        ),
      ],
      onSubmit: (v) async {
        final email = '${v['email']}'.trim().toLowerCase();
        if (!isInviteEmail(email)) {
          throw ApiException('Geçerli bir e-posta girin.');
        }
        final Map<String, dynamic> result;
        try {
          result = await ref.read(apiProvider).post(_invitationsPath, {
            'familyGroupId': groupId,
            'email': email,
            'role': v['role'],
          });
        } on ApiException catch (e) {
          if (e.status == 403) {
            throw ApiException('Bu e-posta zaten davetli veya grupta.');
          }
          rethrow;
        }
        ref.invalidate(pageProvider(_path));
        messenger.showSnackBar(
          SnackBar(
            content: Text(
              result['emailed'] == true
                  ? 'Davet e-postası gönderildi.'
                  : 'Davet oluşturuldu. Kişi bu e-postayla giriş yapınca görecek.',
            ),
          ),
        );
      },
    );
  }

  static Widget _memberMenu(
    BuildContext context,
    WidgetRef ref,
    String groupId,
    Map<String, dynamic> m,
  ) {
    final path = 'family/$groupId/members/${m['id']}';
    final pending = m['invitationStatus'] == 'pending';
    final name = '${m['name'] ?? m['email'] ?? 'Üye'}';
    return PopupMenuButton<String>(
      tooltip: 'Üye seçenekleri',
      onSelected: (choice) async {
        if (choice != 'remove') {
          await runAction(context, ref, _path, (api) => api.patch(path, {'role': choice}));
          return;
        }
        final confirmed = await _confirm(
          context,
          title: pending ? 'Davet iptal edilsin mi?' : 'Üye çıkarılsın mı?',
          message: pending
              ? '$name için gönderilen davet iptal edilecek.'
              : '$name aile grubundan çıkarılacak.',
          action: pending ? 'İptal et' : 'Çıkar',
        );
        if (confirmed && context.mounted) {
          await runAction(context, ref, _path, (api) => api.delete(path));
        }
      },
      itemBuilder: (_) => [
        for (final role in _inviteRoles.entries)
          if (role.key != m['role'])
            PopupMenuItem(value: role.key, child: Text('${role.value} yap')),
        PopupMenuItem(
          value: 'remove',
          child: Text(
            pending ? 'Daveti iptal et' : 'Gruptan çıkar',
            style: const TextStyle(color: expense),
          ),
        ),
      ],
    );
  }

  static Future<void> _leave(
    BuildContext context,
    WidgetRef ref,
    Map<String, dynamic> g,
  ) async {
    final confirmed = await _confirm(
      context,
      title: 'Gruptan ayrılınsın mı?',
      message: '"${g['name']}" grubuna erişimin sona erecek.',
      action: 'Ayrıl',
    );
    if (confirmed && context.mounted) {
      await runAction(
        context,
        ref,
        _path,
        (api) => api.post('family/${g['id']}/leave', const {}),
      );
    }
  }
}

class _Invitations extends ConsumerWidget {
  const _Invitations();

  Future<void> _respond(
    BuildContext context,
    WidgetRef ref,
    Map<String, dynamic> invite,
    bool accept,
  ) async {
    if (!accept) {
      final confirmed = await _confirm(
        context,
        title: 'Davet reddedilsin mi?',
        message: '"${invite['groupName']}" grubuna katılmayacaksın.',
        action: 'Reddet',
      );
      if (!confirmed || !context.mounted) return;
    }
    await runAction(
      context,
      ref,
      _invitationsPath,
      (api) => api.post('$_invitationsPath/${invite['id']}/respond', {'accept': accept}),
    );
    ref.invalidate(pageProvider(FamilyScreen._path));
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final data = ref.watch(pageProvider(_invitationsPath));
    return data.when(
      skipLoadingOnRefresh: true,
      loading: () => const SizedBox.shrink(),
      error: (e, _) => Card(
        child: TextButton(
          onPressed: () => ref.invalidate(pageProvider(_invitationsPath)),
          child: Text('Davetler yüklenemedi · Tekrar dene'),
        ),
      ),
      data: (d) => Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          for (final invite in rows(d['invitations']))
            Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: Card(
                child: Padding(
                  padding: const EdgeInsets.all(14),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Text(
                        '${invite['groupName']}',
                        style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800, color: ink),
                      ),
                      const SizedBox(height: 3),
                      Text(
                        'Aile grubu daveti · ${_inviteRoles[invite['role']] ?? invite['role']}',
                        style: const TextStyle(color: muted),
                      ),
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          Expanded(
                            child: OutlinedButton(
                              onPressed: () => _respond(context, ref, invite, false),
                              child: const Text('Reddet'),
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: FilledButton(
                              onPressed: () => _respond(context, ref, invite, true),
                              child: const Text('Kabul et'),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ),
        ],
      ),
    );
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

const _onOff = {'true': 'Açık', 'false': 'Kapalı'};

String wishlistShareUrl(String token) => '${AppConfig.apiUrl}/w/$token';

class WishlistsScreen extends ConsumerWidget {
  const WishlistsScreen({super.key});
  static const _path = 'wishlists';
  static const _familyPath = 'family';

  Map<String, String> _groups(WidgetRef ref) => {
    for (final g in rows(ref.watch(pageProvider(_familyPath)).value?['groups']))
      '${g['id']}': '${g['name']}',
  };

  Future<void> _create(BuildContext context, WidgetRef ref) async {
    Map<String, String> groups = {};
    try {
      final family = await ref.read(pageProvider(_familyPath).future);
      groups = {for (final g in rows(family['groups'])) '${g['id']}': '${g['name']}'};
    } catch (_) {
      // Without the groups the list can still be created as personal.
    }
    if (!context.mounted) return;
    await showFormSheet(
      context,
      title: 'Yeni liste',
      fields: [
        const FieldSpec('title', 'Liste adı'),
        FieldSpec('occasion', 'Vesile', kind: FieldKind.choice, options: (_) => _occasions, initial: 'birthday'),
        const FieldSpec('eventDate', 'Tarih', kind: FieldKind.date, required: false),
        FieldSpec('visibility', 'Kimler görsün', kind: FieldKind.choice, options: (_) => {'': 'Yalnızca ben', ...groups}, initial: ''),
        FieldSpec('surprise', 'Sürpriz modu', kind: FieldKind.choice, options: (_) => _onOff, initial: 'true'),
      ],
      onSubmit: (v) async {
        final visibility = '${v['visibility'] ?? ''}';
        await ref.read(apiProvider).post(_path, {
          'title': v['title'],
          'occasion': v['occasion'],
          'eventDate': v['eventDate'],
          'familyGroupId': visibility.isEmpty ? null : visibility,
          'surprise': v['surprise'] != 'false',
        });
        ref.invalidate(pageProvider(_path));
      },
    );
  }

  Future<void> _share(BuildContext context, WidgetRef ref, Map<String, dynamic> list) async {
    final messenger = ScaffoldMessenger.of(context);
    try {
      final result = await ref.read(apiProvider).post('wishlists/${list['id']}/share', {});
      ref.invalidate(pageProvider(_path));
      if (context.mounted) await _showLink(context, '${result['shareToken']}');
    } catch (e) {
      messenger.showSnackBar(SnackBar(content: Text('$e')));
    }
  }

  Future<void> _showLink(BuildContext context, String token) {
    final url = wishlistShareUrl(token);
    return showDialog<void>(
      context: context,
      builder: (dialog) => AlertDialog(
        title: const Text('Paylaşım bağlantısı'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Bağlantıyı alan herkes dilekleri görür. Kimin ne aldığını göremez.', style: TextStyle(color: muted)),
            const SizedBox(height: 12),
            SelectableText(url),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(dialog), child: const Text('Kapat')),
          FilledButton.icon(
            onPressed: () async {
              await Clipboard.setData(ClipboardData(text: url));
              if (dialog.mounted) Navigator.pop(dialog);
              if (context.mounted) {
                ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Bağlantı kopyalandı.')));
              }
            },
            icon: const Icon(Icons.copy, size: 18),
            label: const Text('Kopyala'),
          ),
        ],
      ),
    );
  }

  void _addWish(BuildContext context, WidgetRef ref, Map<String, dynamic> list) => showFormSheet(
    context,
    title: 'Dilek ekle',
    fields: const [
      FieldSpec('name', 'Dilek'),
      FieldSpec('note', 'Not', required: false),
      FieldSpec('productUrl', 'Ürün bağlantısı (https://…)', required: false),
    ],
    onSubmit: (v) async {
      final url = '${v['productUrl'] ?? ''}';
      await ref.read(apiProvider).patch('wishlists/${list['id']}', {
        'action': 'add',
        'name': v['name'],
        'note': v['note'] ?? '',
        if (url.isNotEmpty) 'productUrl': url,
      });
      ref.invalidate(pageProvider(_path));
    },
  );

  Future<void> _onMenu(BuildContext context, WidgetRef ref, Map<String, dynamic> list, String action) async {
    final id = list['id'];
    switch (action) {
      case 'add':
        _addWish(context, ref, list);
      case 'surprise':
        await runAction(context, ref, _path, (api) => api.patch('wishlists/$id', {'action': 'settings', 'surprise': list['surprise'] != true}));
      case 'share':
        await _share(context, ref, list);
      case 'showLink':
        await _showLink(context, '${list['shareToken']}');
      case 'unshare':
        if (await _confirm(context, title: 'Bağlantı kaldırılsın mı?', message: 'Bağlantıyı alan kişiler listeyi artık göremez.', action: 'Kaldır') && context.mounted) {
          await runAction(context, ref, _path, (api) => api.delete('wishlists/$id/share'));
        }
      case 'delete':
        if (await confirmDelete(context, '${list['title']}') && context.mounted) {
          await runAction(context, ref, _path, (api) => api.delete('wishlists/$id', {}));
        }
    }
  }

  String _subtitle(Map<String, dynamic> l, Map<String, String> groups) {
    final parts = <String>[
      _occasions[l['occasion']] ?? '${l['occasion']}',
      if (l['eventDate'] != null) shortDate('${l['eventDate']}'),
      l['familyGroupId'] == null ? 'Yalnızca sen' : (groups['${l['familyGroupId']}'] ?? 'Aile'),
      if (l['mine'] == true && l['surprise'] == true) 'Sürpriz',
      if (l['shareToken'] != null) 'Bağlantıyla paylaşıldı',
    ];
    return parts.join(' · ');
  }

  Widget _item(BuildContext context, WidgetRef ref, Map<String, dynamic> l, Map<String, dynamic> i) {
    final note = '${i['note'] ?? ''}';
    final url = '${i['productUrl'] ?? ''}';
    final mine = l['mine'] == true;
    return ListTile(
      dense: true,
      leading: const Icon(Icons.card_giftcard_outlined),
      title: Text('${i['name']}'),
      subtitle: note.isEmpty && url.isEmpty
          ? null
          : Text([if (note.isNotEmpty) note, if (url.isNotEmpty) url].join('\n'), maxLines: 3, overflow: TextOverflow.ellipsis),
      onLongPress: url.isEmpty
          ? null
          : () async {
              await Clipboard.setData(ClipboardData(text: url));
              if (context.mounted) {
                ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Ürün bağlantısı kopyalandı.')));
              }
            },
      trailing: mine
          ? Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                if (i['reserved'] == true) const Text('Alınıyor', style: TextStyle(color: muted)),
                IconButton(
                  tooltip: 'Dileği sil',
                  icon: const Icon(Icons.delete_outline),
                  onPressed: () async {
                    if (await confirmDelete(context, '${i['name']}') && context.mounted) {
                      await runAction(context, ref, _path, (api) => api.delete('wishlists/${l['id']}', {'itemId': i['id']}));
                    }
                  },
                ),
              ],
            )
          : TextButton(
              onPressed: i['reserved'] == true && i['reservedByMe'] != true
                  ? null
                  : () => runAction(context, ref, _path, (api) => api.patch('wishlists/${l['id']}', {
                      'action': i['reservedByMe'] == true ? 'release' : 'reserve',
                      'itemId': i['id'],
                    })),
              child: Text(i['reservedByMe'] == true ? 'Bırak' : (i['reserved'] == true ? 'Ayrıldı' : 'Ben alırım')),
            ),
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) => ApiPage(
    title: 'Dilek Listeleri',
    path: _path,
    addLabel: 'Yeni liste',
    onAdd: (context, ref, _) => _create(context, ref),
    builder: (context, ref, d) {
      final lists = rows(d['lists']);
      final groups = _groups(ref);
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
                  subtitle: Text(_subtitle(l, groups)),
                  trailing: l['mine'] == true
                      ? PopupMenuButton<String>(
                          tooltip: 'Liste seçenekleri',
                          onSelected: (action) => _onMenu(context, ref, l, action),
                          itemBuilder: (_) => [
                            const PopupMenuItem(value: 'add', child: Text('Dilek ekle')),
                            PopupMenuItem(value: 'surprise', child: Text(l['surprise'] == true ? 'Sürpriz modunu kapat' : 'Sürpriz modunu aç')),
                            if (l['shareToken'] != null) const PopupMenuItem(value: 'showLink', child: Text('Bağlantıyı göster')),
                            PopupMenuItem(value: 'share', child: Text(l['shareToken'] == null ? 'Bağlantıyla paylaş' : 'Yeni bağlantı oluştur')),
                            if (l['shareToken'] != null) const PopupMenuItem(value: 'unshare', child: Text('Bağlantıyı kaldır')),
                            const PopupMenuItem(value: 'delete', child: Text('Listeyi sil', style: TextStyle(color: expense))),
                          ],
                        )
                      : null,
                ),
                for (final i in rows(l['items'])) _item(context, ref, l, i),
              ],
            ),
          ),
          const Gap(),
        ],
      ];
    },
  );
}
