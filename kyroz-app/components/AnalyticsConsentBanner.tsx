import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme, Radius, ThemePalette } from '../constants/theme';
import { useAnalyticsConsent } from '../hooks/useAnalyticsConsent';

/**
 * Prompt de consentement analytics (RGPD — opt-in explicite). S'affiche UNE fois,
 * après l'onboarding (écran Plan), tant que l'utilisateur n'a pas répondu
 * (`consent === null`). Réponse → disparaît ; modifiable ensuite dans le Profil.
 */
export function AnalyticsConsentBanner() {
  const t = useTheme();
  const { consent, choose } = useAnalyticsConsent();
  if (consent !== null) return null; // undefined = chargement · 'granted'/'denied' = déjà répondu
  const s = makeStyles(t);
  return (
    <View style={s.card}>
      <Text style={s.title}>Aide à améliorer Kyroz 🙏</Text>
      <Text style={s.body}>
        Partager des statistiques d'usage <Text style={{ fontWeight: '700' }}>anonymes</Text> (jamais ton nom ni tes données perso) pour qu'on améliore l'app. Modifiable à tout moment dans ton profil.
      </Text>
      <View style={s.row}>
        <TouchableOpacity style={[s.btn, { backgroundColor: t.fill }]} onPress={() => choose('denied')} activeOpacity={0.8}>
          <Text style={{ color: t.textSecondary, fontSize: 14, fontWeight: '700' }}>Non merci</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.btn, { backgroundColor: t.accent }]} onPress={() => choose('granted')} activeOpacity={0.85}>
          <Text style={{ color: t.onAccent, fontSize: 14, fontWeight: '700' }}>Activer</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function makeStyles(t: ThemePalette) {
  return StyleSheet.create({
    card: { backgroundColor: t.card, borderWidth: 1, borderColor: t.line, borderRadius: Radius.md, padding: 16, gap: 10 },
    title: { color: t.text, fontSize: 15, fontWeight: '700' },
    body: { color: t.textSecondary, fontSize: 13, lineHeight: 18 },
    row: { flexDirection: 'row', gap: 10, marginTop: 2 },
    btn: { flex: 1, paddingVertical: 11, borderRadius: Radius.sm, alignItems: 'center' },
  });
}
