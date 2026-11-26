import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';

import '../core/theme.dart';
import 'common.dart';
import 'data.dart';
import '../core/i18n.dart';

const avatarPath = 'account/avatar';

/// Same choices as the web (lib/profile/avatar.ts).
const avatarIcons = <String, IconData>{
  'initials': Icons.person,
  'cat': Icons.pets,
  'dog': Icons.cruelty_free,
  'flower': Icons.local_florist,
  'sun': Icons.wb_sunny,
  'mountain': Icons.landscape,
};

String initialsOf(String name) {
  final parts = name
      .trim()
      .split(RegExp(r'\s+'))
      .where((part) => part.isNotEmpty)
      .toList();
  if (parts.isEmpty) return '?';
  final first = parts.first.characters.first;
  final last = parts.length > 1 ? parts.last.characters.first : '';
  return (first + last).toUpperCase();
}

/// The user's photo, chosen icon, or initials.
class ProfileAvatar extends ConsumerWidget {
  const ProfileAvatar({super.key, required this.name, this.radius = 24});
  final String name;
  final double radius;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final avatar = ref.watch(pageProvider(avatarPath)).value;
    final url = avatar?['url'] as String?;
    final icon = avatarIcons['${avatar?['icon']}'];
    return CircleAvatar(
      radius: radius,
      backgroundColor: brand.withValues(alpha: 0.15),
      foregroundColor: brand,
      backgroundImage: url != null ? NetworkImage(url) : null,
      child: url != null
          ? null
          : icon == null || avatar?['icon'] == 'initials'
          ? Text(
              initialsOf(name),
              style: TextStyle(
                fontWeight: FontWeight.w800,
                fontSize: radius * 0.7,
              ),
            )
          : Icon(icon, size: radius),
    );
  }
}

/// Bottom sheet: pick a photo from the gallery or one of the icons.
Future<void> showAvatarPicker(
  BuildContext context,
  WidgetRef ref,
  String name,
) => showModalBottomSheet<void>(
  context: context,
  showDragHandle: true,
  builder: (sheet) {
    final messenger = ScaffoldMessenger.of(context);
    Future<void> run(Future<Map<String, dynamic>> Function() action) async {
      Navigator.pop(sheet);
      try {
        await action();
        ref.invalidate(pageProvider(avatarPath));
        messenger.showSnackBar(
          SnackBar(content: Text(t('Profil fotoğrafın güncellendi.'))),
        );
      } catch (e) {
        messenger.showSnackBar(SnackBar(content: Text('$e')));
      }
    }

    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              t('Profil fotoğrafı'),
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w800,
                color: sheet.ink,
              ),
            ),
            const SizedBox(height: 14),
            ListTile(
              contentPadding: EdgeInsets.zero,
              leading: const Icon(Icons.photo_library_outlined),
              title: Text(t('Galeriden fotoğraf seç')),
              subtitle: Text(t('JPG, PNG veya WebP, en fazla 2 MB')),
              onTap: () => run(() async {
                final image = await ImagePicker().pickImage(
                  source: ImageSource.gallery,
                  maxWidth: 512,
                  maxHeight: 512,
                  imageQuality: 85,
                );
                if (image == null) return <String, dynamic>{};
                final bytes = await image.readAsBytes();
                final png = image.name.toLowerCase().endsWith('.png');
                return ref
                    .read(apiProvider)
                    .upload(
                      avatarPath,
                      bytes,
                      filename: png ? 'avatar.png' : 'avatar.jpg',
                      contentType: png ? 'image/png' : 'image/jpeg',
                    );
              }),
            ),
            const SizedBox(height: 8),
            Text('ya da bir simge', style: TextStyle(color: sheet.muted)),
            const SizedBox(height: 10),
            Wrap(
              spacing: 12,
              runSpacing: 12,
              children: [
                for (final entry in avatarIcons.entries)
                  InkWell(
                    borderRadius: BorderRadius.circular(30),
                    onTap: () => run(
                      () => ref.read(apiProvider).patch(avatarPath, {
                        'icon': entry.key,
                      }),
                    ),
                    child: CircleAvatar(
                      radius: 26,
                      backgroundColor: brand.withValues(alpha: 0.12),
                      foregroundColor: brand,
                      child: entry.key == 'initials'
                          ? Text(
                              initialsOf(name),
                              style: const TextStyle(
                                fontWeight: FontWeight.w800,
                              ),
                            )
                          : Icon(entry.value),
                    ),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  },
);
