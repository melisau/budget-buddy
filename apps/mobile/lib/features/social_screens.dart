import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/api.dart';
import '../core/config.dart';
import '../core/theme.dart';
import 'common.dart';
import 'data.dart';
import '../core/i18n.dart';

const _invitationsPath = 'family/invitations';
Map<String, String> get _inviteRoles => {
  'member': t('Üye'),
  'viewer': t('İzleyici'),
};

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
            child: Text(t('Vazgeç')),
          ),
          TextButton(
            onPressed: () => Navigator.pop(dialog, true),
            child: Text(action, style: TextStyle(color: expense)),
          ),
        ],
      ),
    ) ??
    false;

Map<String, String> get _occasions => {
  'birthday': t('Doğum günü'),
  'housewarming': t('Ev hediyesi'),
  'new_year': t('Yeni yıl'),
  'other': t('Diğer'),
};

class FamilyScreen extends StatelessWidget {
  const FamilyScreen({super.key});
  static const _path = 'family';

  @override
  Widget build(BuildContext context) => ApiPage(
    title: t('Aile Grubu'),
    path: _path,
    addLabel: t('Grup oluştur'),
    refreshAlso: [_invitationsPath],
    onAdd: (context, ref, _) => showFormSheet(
      context,
      title: t('Aile grubu oluştur'),
      fields: [FieldSpec('name', t('Grup adı'))],
      onSubmit: (v) async {
        await ref.read(apiProvider).post(_path, {...v, 'currency': 'TRY'});
        ref.invalidate(pageProvider(_path));
      },
    ),
    builder: (context, ref, d) {
      final groups = rows(d['groups']);
      if (groups.isEmpty) {
        return [_Invitations(), EmptyNote(t('Henüz aile grubun yok.'))];
      }
      return [
        const _Invitations(),
        for (final g in groups) ...[
          Card(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                ListTile(
                  leading: const CircleAvatar(
                    child: Icon(Icons.groups_outlined),
                  ),
                  title: Text(
                    '${g['name']}',
                    style: TextStyle(
                      fontWeight: FontWeight.w800,
                      color: context.ink,
                    ),
                  ),
                  subtitle: Text(
                    tx(
                      '${rows(g['members']).length} üye',
                      '${rows(g['members']).length} members',
                      '${rows(g['members']).length} Mitglieder',
                    ),
                  ),
                ),
                for (final m in rows(g['members']))
                  ListTile(
                    dense: true,
                    leading: const Icon(Icons.person_outline),
                    title: Text('${m['name'] ?? m['email'] ?? t('Üye')}'),
                    subtitle: Text(_memberState(m)),
                    trailing: g['role'] == 'owner' && m['role'] != 'owner'
                        ? _memberMenu(context, ref, '${g['id']}', m)
                        : null,
                  ),
                Padding(
                  padding: const EdgeInsets.fromLTRB(8, 0, 8, 8),
                  child: g['role'] == 'owner'
                      ? Wrap(
                          spacing: 4,
                          children: [
                            TextButton.icon(
                              onPressed: () =>
                                  _invite(context, ref, '${g['id']}'),
                              icon: const Icon(Icons.person_add_alt_1_outlined),
                              label: Text(t('Üye davet et')),
                            ),
                            if (transferCandidates(g).isNotEmpty)
                              TextButton.icon(
                                onPressed: () => _transfer(context, ref, g),
                                icon: const Icon(Icons.swap_horiz),
                                label: Text(t('Yöneticiliği devret')),
                              ),
                            TextButton.icon(
                              onPressed: () => _deleteGroup(context, ref, g),
                              style: TextButton.styleFrom(
                                foregroundColor: expense,
                              ),
                              icon: const Icon(Icons.delete_outline),
                              label: Text(t('Grubu sil')),
                            ),
                          ],
                        )
                      : TextButton.icon(
                          onPressed: () => _leave(context, ref, g),
                          style: TextButton.styleFrom(foregroundColor: expense),
                          icon: const Icon(Icons.logout),
                          label: Text(t('Gruptan ayrıl')),
                        ),
                ),
              ],
            ),
          ),
          Gap(),
          _Shopping(groupId: '${g['id']}', canEdit: g['role'] != 'viewer'),
          SizedBox(height: 16),
        ],
      ];
    },
  );

  static String _memberState(Map<String, dynamic> m) {
    final role =
        {
          'owner': t('Sahip'),
          'member': t('Üye'),
          'viewer': t('İzleyici'),
        }[m['role']] ??
        '${m['role']}';
    return m['invitationStatus'] == 'pending'
        ? tx(
            '$role · davet bekliyor',
            '$role · invitation pending',
            '$role · Einladung ausstehend',
          )
        : role;
  }

  static void _invite(BuildContext context, WidgetRef ref, String groupId) {
    final messenger = ScaffoldMessenger.of(context);
    showFormSheet(
      context,
      title: t('Üye davet et'),
      fields: [
        const FieldSpec('email', 'E-posta'),
        FieldSpec(
          'role',
          t('Yetki'),
          kind: FieldKind.choice,
          initial: 'member',
          options: (_) => _inviteRoles,
        ),
      ],
      onSubmit: (v) async {
        final email = '${v['email']}'.trim().toLowerCase();
        if (!isInviteEmail(email)) {
          throw ApiException(t('Geçerli bir e-posta girin.'));
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
            throw ApiException(t('Bu e-posta zaten davetli veya grupta.'));
          }
          rethrow;
        }
        ref.invalidate(pageProvider(_path));
        messenger.showSnackBar(
          SnackBar(
            content: Text(
              result['emailed'] == true
                  ? t('Davet e-postası gönderildi.')
                  : t(
                      'Davet oluşturuldu. Kişi bu e-postayla giriş yapınca görecek.',
                    ),
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
    final name = '${m['name'] ?? m['email'] ?? t('Üye')}';
    return PopupMenuButton<String>(
      tooltip: t('Üye seçenekleri'),
      onSelected: (choice) async {
        if (choice != 'remove') {
          await runAction(
            context,
            ref,
            _path,
            (api) => api.patch(path, {'role': choice}),
          );
          return;
        }
        final confirmed = await _confirm(
          context,
          title: pending
              ? t('Davet iptal edilsin mi?')
              : t('Üye çıkarılsın mı?'),
          message: pending
              ? tx(
                  '$name için gönderilen davet iptal edilecek.',
                  'The invitation sent to $name will be cancelled.',
                  'Die Einladung an $name wird zurückgezogen.',
                )
              : tx(
                  '$name aile grubundan çıkarılacak.',
                  '$name will be removed from the family group.',
                  '$name wird aus der Familiengruppe entfernt.',
                ),
          action: pending ? t('İptal et') : t('Çıkar'),
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
            pending ? t('Daveti iptal et') : t('Gruptan çıkar'),
            style: TextStyle(color: expense),
          ),
        ),
      ],
    );
  }

  /// Accepted members other than the owner, who can take over the group.
  static List<Map<String, dynamic>> transferCandidates(
    Map<String, dynamic> g,
  ) => rows(g['members'])
      .where(
        (m) =>
            m['role'] != 'owner' &&
            m['invitationStatus'] == 'accepted' &&
            m['userId'] != null,
      )
      .toList();

  static void _transfer(
    BuildContext context,
    WidgetRef ref,
    Map<String, dynamic> g,
  ) {
    final candidates = transferCandidates(g);
    showFormSheet(
      context,
      title: t('Yöneticiliği devret'),
      fields: [
        FieldSpec(
          'userId',
          t('Yeni yönetici'),
          kind: FieldKind.choice,
          options: (_) => {
            for (final m in candidates)
              '${m['userId']}': '${m['name'] ?? m['email'] ?? t('Üye')}',
          },
        ),
      ],
      onSubmit: (v) async {
        final name = candidates.firstWhere(
          (m) => '${m['userId']}' == v['userId'],
        )['name'];
        final confirmed = await _confirm(
          context,
          title: t('Yöneticilik devredilsin mi?'),
          message: tx(
            '${name ?? 'Seçilen üye'} grubun yöneticisi olacak; sen üye olarak kalırsın. Bunu yalnızca yeni yönetici geri alabilir.',
            '${name ?? 'The chosen member'} will own the group; you stay a member. Only the new owner can undo this.',
            '${name ?? 'Das gewählte Mitglied'} wird Verwalter der Gruppe; du bleibst Mitglied. Nur der neue Verwalter kann das rückgängig machen.',
          ),
          action: t('Devret'),
        );
        if (!confirmed) return;
        await ref.read(apiProvider).patch('family/${g['id']}', {
          'transferOwnershipTo': v['userId'],
        });
        ref.invalidate(pageProvider(_path));
      },
    );
  }

  static Future<void> _deleteGroup(
    BuildContext context,
    WidgetRef ref,
    Map<String, dynamic> g,
  ) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (_) => _DeleteGroupDialog(name: '${g['name']}'),
    );
    if (confirmed == true && context.mounted) {
      await runAction(
        context,
        ref,
        _path,
        (api) => api.delete('family/${g['id']}'),
      );
    }
  }

  static Future<void> _leave(
    BuildContext context,
    WidgetRef ref,
    Map<String, dynamic> g,
  ) async {
    final confirmed = await _confirm(
      context,
      title: t('Gruptan ayrılınsın mı?'),
      message: tx(
        '"${g['name']}" grubuna erişimin sona erecek.',
        'You will lose access to "${g['name']}".',
        'Du verlierst den Zugriff auf „${g['name']}“.',
      ),
      action: t('Ayrıl'),
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
        title: t('Davet reddedilsin mi?'),
        message: tx(
          '"${invite['groupName']}" grubuna katılmayacaksın.',
          'You will not join "${invite['groupName']}".',
          'Du trittst „${invite['groupName']}“ nicht bei.',
        ),
        action: t('Reddet'),
      );
      if (!confirmed || !context.mounted) return;
    }
    await runAction(
      context,
      ref,
      _invitationsPath,
      (api) => api.post('$_invitationsPath/${invite['id']}/respond', {
        'accept': accept,
      }),
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
          child: Text(t('Davetler yüklenemedi · Tekrar dene')),
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
                        style: TextStyle(
                          fontSize: 17,
                          fontWeight: FontWeight.w800,
                          color: context.ink,
                        ),
                      ),
                      const SizedBox(height: 3),
                      Text(
                        '${t('Aile grubu daveti')} · ${_inviteRoles[invite['role']] ?? invite['role']}',
                        style: TextStyle(color: context.muted),
                      ),
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          Expanded(
                            child: OutlinedButton(
                              onPressed: () =>
                                  _respond(context, ref, invite, false),
                              child: Text(t('Reddet')),
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: FilledButton(
                              onPressed: () =>
                                  _respond(context, ref, invite, true),
                              child: Text(t('Kabul et')),
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
            title: Text(
              t('Ortak alışveriş listesi'),
              style: TextStyle(fontWeight: FontWeight.w800, color: context.ink),
            ),
            trailing: canEdit
                ? IconButton(
                    tooltip: t('Ürün ekle'),
                    icon: Icon(Icons.add_circle_outline, color: brand),
                    onPressed: () => showFormSheet(
                      context,
                      title: t('Ürün ekle'),
                      fields: [
                        FieldSpec('name', t('Ürün')),
                        FieldSpec('quantity', t('Miktar'), required: false),
                      ],
                      onSubmit: (v) async {
                        await ref.read(apiProvider).post(path, {
                          ...v,
                          'quantity': v['quantity'] ?? '',
                        });
                        ref.invalidate(pageProvider(path));
                      },
                    ),
                  )
                : null,
          ),
          ...data.when(
            loading: () => const [
              Padding(
                padding: EdgeInsets.all(18),
                child: Center(child: CircularProgressIndicator()),
              ),
            ],
            error: (e, _) => [
              Padding(
                padding: EdgeInsets.all(16),
                child: TextButton(
                  onPressed: () => ref.invalidate(pageProvider(path)),
                  child: Text('$e · ${t('Tekrar dene')}'),
                ),
              ),
            ],
            data: (d) {
              final items = rows(d['items']);
              if (items.isEmpty) {
                return [
                  Padding(
                    padding: EdgeInsets.fromLTRB(16, 0, 16, 18),
                    child: Text(
                      t('Liste boş.'),
                      style: TextStyle(color: context.muted),
                    ),
                  ),
                ];
              }
              return [
                for (final i in items)
                  CheckboxListTile(
                    value: i['checked_at'] != null,
                    title: Text(
                      '${i['name']}',
                      style: TextStyle(
                        decoration: i['checked_at'] != null
                            ? TextDecoration.lineThrough
                            : null,
                      ),
                    ),
                    subtitle: '${i['quantity'] ?? ''}'.isEmpty
                        ? null
                        : Text('${i['quantity']}'),
                    onChanged: canEdit
                        ? (v) => runAction(
                            context,
                            ref,
                            path,
                            (api) => api.patch(path, {
                              'itemId': i['id'],
                              'checked': v == true,
                            }),
                          )
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

Map<String, String> get _onOff => {'true': t('Açık'), 'false': t('Kapalı')};

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
      groups = {
        for (final g in rows(family['groups'])) '${g['id']}': '${g['name']}',
      };
    } catch (_) {
      // Without the groups the list can still be created as personal.
    }
    if (!context.mounted) return;
    await showFormSheet(
      context,
      title: t('Yeni liste'),
      fields: [
        FieldSpec('title', t('Liste adı')),
        FieldSpec(
          'occasion',
          t('Vesile'),
          kind: FieldKind.choice,
          options: (_) => _occasions,
          initial: 'birthday',
        ),
        FieldSpec(
          'eventDate',
          t('Tarih'),
          kind: FieldKind.date,
          required: false,
        ),
        FieldSpec(
          'visibility',
          t('Kimler görsün'),
          kind: FieldKind.choice,
          options: (_) => {'': t('Yalnızca ben'), ...groups},
          initial: '',
        ),
        FieldSpec(
          'surprise',
          t('Sürpriz modu'),
          kind: FieldKind.choice,
          options: (_) => _onOff,
          initial: 'true',
        ),
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

  Future<void> _share(
    BuildContext context,
    WidgetRef ref,
    Map<String, dynamic> list,
  ) async {
    final messenger = ScaffoldMessenger.of(context);
    try {
      final result = await ref
          .read(apiProvider)
          .post('wishlists/${list['id']}/share', {});
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
        title: Text(t('Paylaşım bağlantısı')),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              t(
                'Bağlantıyı alan herkes dilekleri görür. Kimin ne aldığını göremez.',
              ),
              style: TextStyle(color: context.muted),
            ),
            SizedBox(height: 12),
            SelectableText(url),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialog),
            child: Text(t('Kapat')),
          ),
          FilledButton.icon(
            onPressed: () async {
              await Clipboard.setData(ClipboardData(text: url));
              if (dialog.mounted) Navigator.pop(dialog);
              if (context.mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text(t('Bağlantı kopyalandı.'))),
                );
              }
            },
            icon: Icon(Icons.copy, size: 18),
            label: Text(t('Kopyala')),
          ),
        ],
      ),
    );
  }

  void _addWish(
    BuildContext context,
    WidgetRef ref,
    Map<String, dynamic> list,
  ) => showFormSheet(
    context,
    title: t('Dilek ekle'),
    fields: [
      FieldSpec('name', t('Dilek')),
      FieldSpec('note', t('Not'), required: false),
      FieldSpec(
        'productUrl',
        t('Ürün bağlantısı (https://…)'),
        required: false,
      ),
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

  Future<void> _onMenu(
    BuildContext context,
    WidgetRef ref,
    Map<String, dynamic> list,
    String action,
  ) async {
    final id = list['id'];
    switch (action) {
      case 'add':
        _addWish(context, ref, list);
      case 'surprise':
        await runAction(
          context,
          ref,
          _path,
          (api) => api.patch('wishlists/$id', {
            'action': 'settings',
            'surprise': list['surprise'] != true,
          }),
        );
      case 'share':
        await _share(context, ref, list);
      case 'showLink':
        await _showLink(context, '${list['shareToken']}');
      case 'unshare':
        if (await _confirm(
              context,
              title: t('Bağlantı kaldırılsın mı?'),
              message: t('Bağlantıyı alan kişiler listeyi artık göremez.'),
              action: t('Kaldır'),
            ) &&
            context.mounted) {
          await runAction(
            context,
            ref,
            _path,
            (api) => api.delete('wishlists/$id/share'),
          );
        }
      case 'delete':
        if (await confirmDelete(context, '${list['title']}') &&
            context.mounted) {
          await runAction(
            context,
            ref,
            _path,
            (api) => api.delete('wishlists/$id', {}),
          );
        }
    }
  }

  String _subtitle(Map<String, dynamic> l, Map<String, String> groups) {
    final parts = <String>[
      _occasions[l['occasion']] ?? '${l['occasion']}',
      if (l['eventDate'] != null) shortDate('${l['eventDate']}'),
      l['familyGroupId'] == null
          ? t('Yalnızca sen')
          : (groups['${l['familyGroupId']}'] ?? 'Aile'),
      if (l['mine'] == true && l['surprise'] == true) t('Sürpriz'),
      if (l['shareToken'] != null) t('Bağlantıyla paylaşıldı'),
    ];
    return parts.join(' · ');
  }

  Widget _item(
    BuildContext context,
    WidgetRef ref,
    Map<String, dynamic> l,
    Map<String, dynamic> i,
  ) {
    final note = '${i['note'] ?? ''}';
    final url = '${i['productUrl'] ?? ''}';
    final mine = l['mine'] == true;
    return ListTile(
      dense: true,
      leading: const Icon(Icons.card_giftcard_outlined),
      title: Text('${i['name']}'),
      subtitle: note.isEmpty && url.isEmpty
          ? null
          : Text(
              [if (note.isNotEmpty) note, if (url.isNotEmpty) url].join('\n'),
              maxLines: 3,
              overflow: TextOverflow.ellipsis,
            ),
      onLongPress: url.isEmpty
          ? null
          : () async {
              await Clipboard.setData(ClipboardData(text: url));
              if (context.mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text(t('Ürün bağlantısı kopyalandı.'))),
                );
              }
            },
      trailing: mine
          ? Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                if (i['reserved'] == true)
                  Text(t('Alınıyor'), style: TextStyle(color: context.muted)),
                IconButton(
                  tooltip: t('Dileği sil'),
                  icon: const Icon(Icons.delete_outline),
                  onPressed: () async {
                    if (await confirmDelete(context, '${i['name']}') &&
                        context.mounted) {
                      await runAction(
                        context,
                        ref,
                        _path,
                        (api) => api.delete('wishlists/${l['id']}', {
                          'itemId': i['id'],
                        }),
                      );
                    }
                  },
                ),
              ],
            )
          : TextButton(
              onPressed: i['reserved'] == true && i['reservedByMe'] != true
                  ? null
                  : () => runAction(
                      context,
                      ref,
                      _path,
                      (api) => api.patch('wishlists/${l['id']}', {
                        'action': i['reservedByMe'] == true
                            ? 'release'
                            : 'reserve',
                        'itemId': i['id'],
                      }),
                    ),
              child: Text(
                i['reservedByMe'] == true
                    ? t('Bırak')
                    : (i['reserved'] == true ? t('Ayrıldı') : t('Ben alırım')),
              ),
            ),
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) => ApiPage(
    title: t('Dilek Listeleri'),
    path: _path,
    addLabel: t('Yeni liste'),
    onAdd: (context, ref, _) => _create(context, ref),
    builder: (context, ref, d) {
      final lists = rows(d['lists']);
      final groups = _groups(ref);
      if (lists.isEmpty) return [EmptyNote(t('Henüz dilek listen yok.'))];
      return [
        for (final l in lists) ...[
          Card(
            clipBehavior: Clip.antiAlias,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                ListTile(
                  title: Text(
                    '${l['title']}',
                    style: TextStyle(
                      fontWeight: FontWeight.w800,
                      color: context.ink,
                    ),
                  ),
                  subtitle: Text(_subtitle(l, groups)),
                  trailing: l['mine'] == true
                      ? PopupMenuButton<String>(
                          tooltip: t('Liste seçenekleri'),
                          onSelected: (action) =>
                              _onMenu(context, ref, l, action),
                          itemBuilder: (_) => [
                            PopupMenuItem(
                              value: 'add',
                              child: Text(t('Dilek ekle')),
                            ),
                            PopupMenuItem(
                              value: 'surprise',
                              child: Text(
                                l['surprise'] == true
                                    ? t('Sürpriz modunu kapat')
                                    : t('Sürpriz modunu aç'),
                              ),
                            ),
                            if (l['shareToken'] != null)
                              PopupMenuItem(
                                value: 'showLink',
                                child: Text(t('Bağlantıyı göster')),
                              ),
                            PopupMenuItem(
                              value: 'share',
                              child: Text(
                                l['shareToken'] == null
                                    ? t('Bağlantıyla paylaş')
                                    : t('Yeni bağlantı oluştur'),
                              ),
                            ),
                            if (l['shareToken'] != null)
                              PopupMenuItem(
                                value: 'unshare',
                                child: Text(t('Bağlantıyı kaldır')),
                              ),
                            PopupMenuItem(
                              value: 'delete',
                              child: Text(
                                t('Listeyi sil'),
                                style: TextStyle(color: expense),
                              ),
                            ),
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

/// Deleting a family group cannot be undone, so the group's name must be typed.
class _DeleteGroupDialog extends StatefulWidget {
  const _DeleteGroupDialog({required this.name});
  final String name;

  @override
  State<_DeleteGroupDialog> createState() => _DeleteGroupDialogState();
}

class _DeleteGroupDialogState extends State<_DeleteGroupDialog> {
  final _input = TextEditingController();

  @override
  void dispose() {
    _input.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final ready = _input.text.trim() == widget.name.trim();
    return AlertDialog(
      title: Text(t('Aile grubu silinsin mi?')),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            tx(
              '“${widget.name}” grubu, ortak işlemleri, alışveriş listesi ve gruba ait dilek listeleri herkes için kalıcı olarak silinir. Bu işlem geri alınamaz.',
              '“${widget.name}”, its shared transactions, shopping list and wishlists are permanently deleted for everyone. This cannot be undone.',
              '„${widget.name}“ mit gemeinsamen Transaktionen, Einkaufsliste und Wunschlisten wird für alle dauerhaft gelöscht. Dies kann nicht rückgängig gemacht werden.',
            ),
          ),
          const SizedBox(height: 14),
          TextField(
            controller: _input,
            autocorrect: false,
            decoration: InputDecoration(
              labelText: t('Onaylamak için grup adını yaz'),
              hintText: widget.name,
            ),
            onChanged: (_) => setState(() {}),
          ),
        ],
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context, false),
          child: Text(t('Vazgeç')),
        ),
        TextButton(
          onPressed: ready ? () => Navigator.pop(context, true) : null,
          child: Text(
            t('Kalıcı olarak sil'),
            style: TextStyle(color: ready ? expense : context.muted),
          ),
        ),
      ],
    );
  }
}
