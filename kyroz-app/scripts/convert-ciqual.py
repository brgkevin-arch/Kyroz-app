#!/usr/bin/env python3
"""
Convertit la Table Ciqual 2025 (ANSES) en lib/foods.generated.ts.

Source attendue (NON commitée, cf .gitignore) :
  data/ciqual/Table Ciqual 2025_FR_*.xlsx
Sortie (commitée) :
  lib/foods.generated.ts  → export CIQUAL_FOODS: Food[]

Données : Table Ciqual 2025, ANSES — Licence Ouverte 2.0 (Etalab).
Stdlib uniquement (zipfile + ElementTree), aucune dépendance.

Rejouer après mise à jour Ciqual :  python3 scripts/convert-ciqual.py
"""
import glob, re, sys, zipfile
from xml.etree import ElementTree as ET

NS = '{http://schemas.openxmlformats.org/spreadsheetml/2006/main}'

# Index des colonnes utiles (cf. en-tête de la table à plat Ciqual 2025).
COL = {
    'grp': 3,        # alim_grp_nom_fr
    'nom': 7,        # alim_nom_fr
    'code': 6,       # alim_code
    'kcal': 10,      # Energie, Règlement UE 1169/2011 (kcal/100 g)
    'prot': 14,      # Protéines, N x facteur de Jones (g/100 g)
    'prot2': 15,     # Protéines, N x 6.25 (repli)
    'gluc': 16,      # Glucides (g/100 g)
    'lip': 17,       # Lipides (g/100 g)
}


def col_index(ref):
    m = re.match(r'([A-Z]+)', ref)
    n = 0
    for ch in m.group(1):
        n = n * 26 + (ord(ch) - 64)
    return n - 1


def clean(v):
    """Nettoie une valeur Ciqual → float ou None (non déterminée)."""
    if v is None:
        return None
    v = v.strip().replace('\xa0', '').replace(' ', '')
    if v in ('', '-'):
        return None
    if v.lower() == 'traces':
        return 0.0
    if v.startswith('<'):
        v = v[1:]
    v = v.replace(',', '.')
    try:
        return float(v)
    except ValueError:
        return None


def norm_text(s):
    return re.sub(r'\s+', ' ', (s or '').replace('\n', ' ')).strip()


def ts_str(s):
    return '"' + s.replace('\\', '\\\\').replace('"', '\\"') + '"'


def main():
    matches = glob.glob('data/ciqual/Table Ciqual*FR_*.xlsx')
    if not matches:
        sys.exit('❌ Fichier xlsx Ciqual introuvable dans data/ciqual/')
    path = sorted(matches)[-1]
    z = zipfile.ZipFile(path)

    shared = []
    root = ET.fromstring(z.read('xl/sharedStrings.xml'))
    for si in root.findall(f'{NS}si'):
        shared.append(''.join(t.text or '' for t in si.iter(f'{NS}t')))

    root = ET.fromstring(z.read('xl/worksheets/sheet1.xml'))
    rows = root.find(f'{NS}sheetData').findall(f'{NS}row')

    def cell(c):
        v = c.find(f'{NS}v')
        if v is None:
            return ''
        return shared[int(v.text)] if c.get('t') == 's' else v.text

    foods, skipped = [], 0
    for r in rows[1:]:
        vals = {}
        for c in r:
            vals[col_index(c.get('r'))] = cell(c)
        kcal = clean(vals.get(COL['kcal']))
        if kcal is None:               # pas d'énergie → aliment inutilisable
            skipped += 1
            continue
        prot = clean(vals.get(COL['prot']))
        if prot is None:
            prot = clean(vals.get(COL['prot2']))
        gluc = clean(vals.get(COL['gluc']))
        lip = clean(vals.get(COL['lip']))
        code = norm_text(vals.get(COL['code']))
        name = norm_text(vals.get(COL['nom']))
        grp = norm_text(vals.get(COL['grp'])) or 'autre'
        if not code or not name:
            skipped += 1
            continue
        foods.append({
            'id': f'ciqual-{code}',
            'name': name,
            'cat': grp.lower(),
            'kcal': round(kcal),
            'p': round(prot or 0, 1),
            'c': round(gluc or 0, 1),
            'f': round(lip or 0, 1),
        })

    foods.sort(key=lambda x: x['name'].lower())

    lines = [
        '// AUTO-GÉNÉRÉ par scripts/convert-ciqual.py — NE PAS ÉDITER À LA MAIN.',
        '// Source : Table Ciqual 2025 (ANSES), réutilisée sous Licence Ouverte 2.0 (Etalab).',
        '// Valeurs pour 100 g. Régénérer : python3 scripts/convert-ciqual.py',
        "import { Food } from './types';",
        '',
        'export const CIQUAL_FOODS: Food[] = [',
    ]
    for x in foods:
        lines.append(
            '  { id: %s, name_fr: %s, category: %s, per100g: { kcal: %d, protein_g: %s, carbs_g: %s, fat_g: %s } },'
            % (ts_str(x['id']), ts_str(x['name']), ts_str(x['cat']), x['kcal'], x['p'], x['c'], x['f'])
        )
    lines.append('];')
    lines.append('')

    with open('lib/foods.generated.ts', 'w', encoding='utf-8') as fh:
        fh.write('\n'.join(lines))

    print(f'✅ {len(foods)} aliments écrits dans lib/foods.generated.ts ({skipped} ignorés, sans énergie)')


if __name__ == '__main__':
    main()
