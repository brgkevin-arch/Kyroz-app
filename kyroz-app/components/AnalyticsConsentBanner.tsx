import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme, Radius, ThemePalette, Type, Spacing, CIBLE_TACTILE_MIN, Trait, OPACITE_PRESSION } from '../constants/theme';
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
        <TouchableOpacity style={[s.btn, { backgroundColor: t.fill }]} onPress={() => choose('denied')} activeOpacity={OPACITE_PRESSION}>
          <Text style={{ ...Type.bodySmallStrong, color: t.textSecondary }}>Non merci</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.btn, { backgroundColor: t.accent }]} onPress={() => choose('granted')} activeOpacity={OPACITE_PRESSION}>
          <Text style={{ ...Type.bodySmallStrong, color: t.onAccent }}>Activer</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function makeStyles(t: ThemePalette) {
  return StyleSheet.create({
    card: { backgroundColor: t.card, borderWidth: Trait.fin, borderColor: t.line, borderRadius: Radius.card, padding: Spacing.lg, gap: Spacing.md },
    title: { ...Type.bodyStrong, color: t.text },
    body: { ...Type.caption, color: t.textSecondary, lineHeight: 18 },
    row: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.xs },
    btn: { flex: 1, paddingVertical: Spacing.md, minHeight: CIBLE_TACTILE_MIN, justifyContent: 'center', borderRadius: Radius.button, alignItems: 'center' },
  });
}
