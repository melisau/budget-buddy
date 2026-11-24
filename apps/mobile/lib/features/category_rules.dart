import 'package:flutter/material.dart';

import '../core/theme.dart';
import 'common.dart';
import 'data.dart';

/// "If the description contains X, use category Y" rules, same as the web.
class CategoryRulesScreen extends StatelessWidget {
  const CategoryRulesScreen({super.key});
  static const _path = 'category-rules';
  static const _types = {'expense': 'Gider', 'income': 'Gelir'};

  static Map<String, String> categoriesFor(
    List<Map<String, dynamic>> categories,
    Object? type,
  ) => {
    for (final c in categories)
      if (c['type'] == (type ?? 'expense'))
        '${c['id']}': categoryLabel('${c['name']}'),
  };

  @override
  Widget build(BuildContext context) => ApiPage(
    title: 'Kategori kuralları',
    path: _path,
    addLabel: 'Kural ekle',
    onAdd: (context, ref, d) => showFormSheet(
      context,
      title: 'Kural ekle',
      fields: [
        const FieldSpec('keyword', 'Açıklama şunu içerirse'),
        const FieldSpec(
          'type',
          'Tür',
          kind: FieldKind.choice,
          options: _typeOptions,
          initial: 'expense',
          resets: 'categoryId',
        ),
        FieldSpec(
          'categoryId',
          'Kategori',
          kind: FieldKind.choice,
          options: (v) => categoriesFor(rows(d['categories']), v['type']),
        ),
      ],
      onSubmit: (v) async {
        await ref.read(apiProvider).post(_path, {
          ...v,
          'keyword': '${v['keyword']}'.trim(),
        });
        ref.invalidate(pageProvider(_path));
      },
    ),
    builder: (context, ref, d) {
      if (d['available'] == false) {
        return const [EmptyNote('Kategori kuralları şu anda kullanılamıyor.')];
      }
      final items = rows(d['rules']);
      return [
        Padding(
          padding: const EdgeInsets.only(bottom: 10),
          child: Text(
            'Yeni ve içe aktarılan işlemlerin açıklaması bir kelimeyi içeriyorsa kategori otomatik seçilir.',
            style: TextStyle(color: context.muted),
          ),
        ),
        if (items.isEmpty)
          const EmptyNote('Henüz kural yok. Örneğin "Migros" → Market.'),
        for (final r in items)
          Card(
            child: ListTile(
              leading: Icon(
                Icons.rule,
                color: r['type'] == 'income' ? income : expense,
              ),
              title: Text(
                '“${r['keyword']}”',
                style: TextStyle(
                  fontWeight: FontWeight.w700,
                  color: context.ink,
                ),
              ),
              subtitle: Text(
                '${_types[r['type']] ?? ''} → ${categoryLabel('${r['categoryName']}')}',
              ),
              trailing: IconButton(
                tooltip: 'Kuralı sil',
                icon: Icon(Icons.delete_outline, color: context.muted),
                onPressed: () async {
                  if (await confirmDelete(context, '“${r['keyword']}”') &&
                      context.mounted) {
                    await runAction(
                      context,
                      ref,
                      _path,
                      (api) => api.delete('$_path/${r['id']}'),
                    );
                  }
                },
              ),
            ),
          ),
      ];
    },
  );

  static Map<String, String> _typeOptions(Map<String, dynamic> _) => _types;
}
