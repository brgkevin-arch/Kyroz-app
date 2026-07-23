import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useTheme, ThemePalette, Spacing } from '../constants/theme';
import { PrimaryButton, OptionCard } from './ui';
import { useAuth } from '../hooks/useAuth';
import {
  ScreeningFlags, EMPTY_FLAGS, screeningBlocked, recordScreeningPassed,
} from '../lib/healthScreening';

// Écran-portail de dépistage santé, affiché AVANT l'assistant d'onboarding
// (cf. app/(auth)/onboarding.tsx). Hard block CLAUDE.md §6 : Kyroz ne convient pas
// à une grossesse/allaitement ni à une pathologie chronique → dans ces cas, l'accès
// à la génération de plan est refusé (renvoi vers un professionnel de santé).

const CONDITIONS: { key: keyof ScreeningFlags; title: string; sub: string }[] = [
  {
    key: 'pregnant_or_breastfeeding',
    title: 'Grossesse ou allaitement',
    sub: 'En cours ou prévu prochainement',
  },
  {
    key: 'chronic_condition',
    title: 'Pathologie chronique suivie',
    sub: 'Diabète, maladie rénale ou cardiaque, trouble du comportement alimentaire, ou autre condition suivie médicalement',
  },
];

export default function HealthScreening({ onPass }: { onPass: () => void }) {
  const t = useTheme();
  const s = useMemo(() => makeStyles(t), [t]);
  const { signOut } = useAuth();

  const [flags, setFlags] = useState<ScreeningFlags>(EMPTY_FLAGS);
  const [attested, setAttested] = useState(false);
  const [showBlock, setShowBlock] = useState(false);
  const [busy, setBusy] = useState(false);

  const anyFlag = screeningBlocked(flags);

  const toggle = (k: keyof ScreeningFlags) => {
    setFlags((f) => ({ ...f, [k]: !f[k] }));
    setAttested(false); // toute modification invalide l'attestation précédente
  };

  const onContinue = async () => {
    if (busy) return;
    if (anyFlag) { setShowBlock(true); return; } // situation à risque → cul-de-sac
    if (!attested) return;                        // sinon, attestation requise
    await recordScreeningPassed();
    onPass();
  };

  const logout = async () => {
    if (busy) return;
    setBusy(true);
    await signOut(); // le garde d'auth (index / (tabs)/_layout) renvoie au login
  };

  // ── Écran de blocage (cul-de-sac) ─────────────────────────────────────────
  if (showBlock) {
    return (
      <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
        <StatusBar style={t.scheme === 'dark' ? 'light' : 'dark'} />
        <ScrollView contentContainerStyle={s.blockContent} showsVerticalScrollIndicator={false}>
          <View style={s.iconWrap}>
            <Ionicons name="medkit-outline" size={30} color={t.text} />
          </View>
          <Text style={s.title}>Kyroz n'est pas adapté à ta situation</Text>
          <Text style={s.body}>
            En cas de grossesse, d'allaitement ou d'une pathologie chronique, un plan
            alimentaire doit être établi avec un professionnel de santé. Kyroz est conçu
            pour des adultes en bonne santé et ne peut pas s'y substituer.
          </Text>
          <Text style={s.body}>
            Parles-en à ton médecin ou à un·e diététicien·ne-nutritionniste, qui
            pourra t'accompagner en toute sécurité.
          </Text>
          <Text style={s.disclaimer}>
            Kyroz ne fournit pas d'avis médical et ne remplace pas une consultation.
          </Text>
        </ScrollView>
        <View style={s.footer}>
          <PrimaryButton t={t} label="Se déconnecter" onPress={logout} loading={busy} />
          <TouchableOpacity onPress={() => setShowBlock(false)} style={s.linkBtn} disabled={busy}>
            <Text style={s.linkTxt}>Revenir aux questions</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Écran de dépistage ────────────────────────────────────────────────────
  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <StatusBar style={t.scheme === 'dark' ? 'light' : 'dark'} />
      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Text style={s.title}>Avant de commencer</Text>
        <Text style={s.sub}>
          Kyroz calcule des plans nutrition précis pour des adultes en bonne santé. Ces
          plans ne conviennent pas à toutes les situations et ne remplacent pas un avis
          médical.
        </Text>

        <Text style={s.prompt}>Es-tu concerné·e par l'une de ces situations ?</Text>
        <View style={{ gap: 10 }}>
          {CONDITIONS.map((c) => (
            <OptionCard
              key={c.key}
              t={t}
              title={c.title}
              subtitle={c.sub}
              selected={flags[c.key]}
              onPress={() => toggle(c.key)}
            />
          ))}
        </View>

        {anyFlag ? (
          <View style={s.warnBox}>
            <Ionicons name="alert-circle" size={18} color={t.warning} />
            <Text style={s.warnTxt}>
              D'après ta réponse, Kyroz n'est pas adapté à ta situation.
            </Text>
          </View>
        ) : (
          <TouchableOpacity style={s.attest} onPress={() => setAttested((a) => !a)} activeOpacity={0.7}>
            <View style={[s.check, { borderColor: attested ? t.accent : t.lineStrong, backgroundColor: attested ? t.accent : 'transparent' }]}>
              {attested && <Ionicons name="checkmark" size={14} color={t.onAccent} />}
            </View>
            <Text style={s.attestTxt}>
              Je confirme être un adulte en bonne santé et n'être concerné·e par aucune de ces situations.
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      <View style={s.footer}>
        <PrimaryButton t={t} label="Continuer" onPress={onContinue} disabled={!anyFlag && !attested} />
        <Text style={s.disclaimer}>
          Kyroz est conçu pour des adultes en bonne santé et ne remplace pas l'avis d'un
          médecin ou diététicien-nutritionniste.
        </Text>
      </View>
    </SafeAreaView>
  );
}

function makeStyles(t: ThemePalette) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: t.bg },
    content: { padding: Spacing.xl, gap: 16, paddingBottom: 24 },
    blockContent: { padding: Spacing.xl, gap: 16, paddingBottom: 24, flexGrow: 1, justifyContent: 'center' },
    iconWrap: { width: 60, height: 60, borderRadius: 30, backgroundColor: t.fill, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
    title: { color: t.text, fontSize: 28, fontWeight: '800', letterSpacing: -0.8 },
    sub: { color: t.textSecondary, fontSize: 15, lineHeight: 21 },
    prompt: { color: t.text, fontSize: 16, fontWeight: '700', marginTop: 8 },
    body: { color: t.textSecondary, fontSize: 15, lineHeight: 22 },
    warnBox: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', backgroundColor: t.fill, borderRadius: 12, padding: 14, marginTop: 4 },
    warnTxt: { flex: 1, color: t.warning, fontSize: 14, lineHeight: 20, fontWeight: '600' },
    attest: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', marginTop: 8, paddingHorizontal: 2 },
    check: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
    attestTxt: { flex: 1, color: t.textSecondary, fontSize: 14, lineHeight: 20 },
    footer: { padding: Spacing.xl, paddingTop: 8, backgroundColor: t.bg, borderTopWidth: 1, borderTopColor: t.line, gap: 12 },
    linkBtn: { alignItems: 'center', paddingVertical: 4 },
    linkTxt: { color: t.textSecondary, fontSize: 15, fontWeight: '600' },
    disclaimer: { color: t.textTertiary, fontSize: 11, lineHeight: 16, textAlign: 'center' },
  });
}
