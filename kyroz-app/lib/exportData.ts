import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, Share } from 'react-native';

// ── Droit à la portabilité (RGPD art. 20) ────────────────────────────────────
// Rassemble TOUTES les données locales de l'utilisateur (clés @kyroz:*) dans un
// JSON lisible et le met à disposition : téléchargement sur web, feuille de
// partage système sur mobile. Générique (lit getAllKeys) → reste complet même
// si de nouvelles clés sont ajoutées plus tard.

export interface ExportResult {
  ok: boolean;
  method: 'download' | 'share' | 'none';
  error?: string;
}

export async function buildExport(): Promise<Record<string, unknown>> {
  const keys = (await AsyncStorage.getAllKeys()).filter((k) => k.startsWith('@kyroz:'));
  const pairs = await AsyncStorage.multiGet(keys);
  const data: Record<string, unknown> = {};
  for (const [k, v] of pairs) {
    if (v == null) continue;
    const name = k.replace('@kyroz:', '');
    try { data[name] = JSON.parse(v); } catch { data[name] = v; }
  }
  return {
    app: 'Kyroz',
    exported_at: new Date().toISOString(),
    note: 'Export de tes données personnelles (RGPD — droit à la portabilité, art. 20).',
    data,
  };
}

export async function exportMyData(): Promise<ExportResult> {
  const payload = await buildExport();
  const json = JSON.stringify(payload, null, 2);
  const filename = 'kyroz-mes-donnees.json';

  if (Platform.OS === 'web') {
    // Téléchargement navigateur, sans dépendance (globals DOM accédés via globalThis
    // pour ne pas exiger la lib "dom" dans le tsconfig).
    try {
      const g = globalThis as any;
      const blob = new g.Blob([json], { type: 'application/json' });
      const url = g.URL.createObjectURL(blob);
      const a = g.document.createElement('a');
      a.href = url;
      a.download = filename;
      g.document.body.appendChild(a);
      a.click();
      a.remove();
      g.URL.revokeObjectURL(url);
      return { ok: true, method: 'download' };
    } catch (e) {
      return { ok: false, method: 'none', error: String(e) };
    }
  }

  // Mobile : feuille de partage système (AirDrop, Mail, Fichiers, Notes…).
  try {
    await Share.share({ title: filename, message: json });
    return { ok: true, method: 'share' };
  } catch (e) {
    return { ok: false, method: 'none', error: String(e) };
  }
}
