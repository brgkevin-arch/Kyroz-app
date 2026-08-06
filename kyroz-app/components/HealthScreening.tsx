import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useTheme, ThemePalette, Spacing, Radius, Type, Trait, Icone, OPACITE_PRESSION } from '../constants/theme';
import { useLayout } from '../constants/layout';
import { PrimaryButton, Segmented } from './ui';
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
  const layout = useLayout();
  const { signOut } = useAuth();

  // ⚠️ Réponses en TROIS états : oui / non / PAS ENCORE RÉPONDU.
  //
  // L'écran ne proposait qu'un interrupteur par situation : on tapait la carte pour
  // dire « oui », et « non » n'existait pas — c'était l'ABSENCE de tap. Sur un
  // portail de dépistage santé, ça ne va pas : rien ne distingue « j'ai lu et je ne
  // suis pas concerné » de « je n'ai rien vu et j'ai filé vers le bouton ». Or ce
  // qu'on demande ici n'est pas une préférence, c'est une déclaration qui décide si
  // l'app a le droit de servir un moteur de déficit calorique (CLAUDE.md §6).
  // `undefined` (aucune réponse) laisse donc « Continuer » désactivé.
  type Reponse = 'oui' | 'non';
  const [answers, setAnswers] = useState<Partial<Record<keyof ScreeningFlags, Reponse>>>({});
  const [attested, setAttested] = useState(false);
  const [showBlock, setShowBlock] = useState(false);
  const [busy, setBusy] = useState(false);

  // Les drapeaux restent des BOOLÉENS pour `screeningBlocked` : la logique bloquante
  // est testée et ne change pas — seule la façon de la renseigner change.
  const flags: ScreeningFlags = {
    ...EMPTY_FLAGS,
    pregnant_or_breastfeeding: answers.pregnant_or_breastfeeding === 'oui',
    chronic_condition: answers.chronic_condition === 'oui',
  };
  const anyFlag = screeningBlocked(flags);
  const allAnswered = CONDITIONS.every((c) => answers[c.key] != null);

  const answer = (k: keyof ScreeningFlags, v: Reponse) => {
    setAnswers((a) => ({ ...a, [k]: v }));
    setAttested(false); // toute modification invalide l'attestation précédente
  };

  const onContinue = async () => {
    if (busy) return;
    if (anyFlag) { setShowBlock(true); return; } // situation à risque → cul-de-sac
    if (!allAnswered || !attested) return;        // sinon : tout répondu + attestation
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
        <ScrollView contentContainerStyle={[s.blockContent, layout.content]} showsVerticalScrollIndicator={false}>
          <View style={s.iconWrap}>
            <Ionicons name="medkit-outline" size={Icone.vide} color={t.text} />
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
        <View style={[s.footer, layout.header]}>
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
      <ScrollView contentContainerStyle={[s.content, layout.content]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Text style={s.title}>Avant de commencer</Text>
        <Text style={s.sub}>
          Kyroz calcule des plans nutrition précis pour des adultes en bonne santé. Ces
          plans ne conviennent pas à toutes les situations et ne remplacent pas un avis
          médical.
        </Text>

        <Text style={s.prompt}>Es-tu concerné·e par l'une de ces situations ?</Text>
        <View style={{ gap: Spacing.md }}>
          {CONDITIONS.map((c) => (
            <View key={c.key} style={s.qCard}>
              <Text style={s.qTitle}>{c.title}</Text>
              <Text style={s.qSub}>{c.sub}</Text>
              {/* « Non » est une réponse à DONNER, pas l'absence de geste. */}
              <Segmented<'oui' | 'non'>
                t={t}
                options={[{ label: 'Non', value: 'non' }, { label: 'Oui', value: 'oui' }]}
                value={answers[c.key] ?? ('' as 'oui' | 'non')}
                onChange={(v) => answer(c.key, v)}
              />
            </View>
          ))}
        </View>

        {anyFlag ? (
          <View style={s.warnBox}>
            <Ionicons name="alert-circle" size={Icone.standard} color={t.warning} />
            <Text style={s.warnTxt}>
              D'après ta réponse, Kyroz n'est pas adapté à ta situation.
            </Text>
          </View>
        ) : !allAnswered ? (
          // Pas de reproche, juste ce qui manque : la moitié des gens arrivent ici
          // et cherchent le bouton avant de lire les questions.
          <Text style={s.pending}>Réponds aux deux questions pour continuer.</Text>
        ) : (
          <TouchableOpacity style={s.attest} onPress={() => setAttested((a) => !a)} activeOpacity={OPACITE_PRESSION}>
            <View style={[s.check, { borderColor: attested ? t.accent : t.lineStrong, backgroundColor: attested ? t.accent : 'transparent' }]}>
              {attested && <Ionicons name="checkmark" size={Icone.petite} color={t.onAccent} />}
            </View>
            <Text style={s.attestTxt}>
              Je confirme être un adulte en bonne santé et n'être concerné·e par aucune de ces situations.
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      <View style={[s.footer, layout.header]}>
        <PrimaryButton t={t} label="Continuer" onPress={onContinue} disabled={!anyFlag && (!allAnswered || !attested)} />
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
    content: { padding: Spacing.xl, gap: Spacing.lg, paddingBottom: Spacing.xxl },
    blockContent: { padding: Spacing.xl, gap: Spacing.lg, paddingBottom: Spacing.xxl, flexGrow: 1, justifyContent: 'center' },
    iconWrap: { width: 60, height: 60, borderRadius: 30, backgroundColor: t.fill, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.xs },
    title: { color: t.text, ...Type.h1 },
    sub: { ...Type.body, color: t.textSecondary, lineHeight: 21 },
    prompt: { ...Type.label, color: t.text, marginTop: Spacing.sm },
    qCard: { backgroundColor: t.card, borderWidth: Trait.fin, borderColor: t.line, borderRadius: Radius.card, padding: Spacing.lg, gap: Spacing.sm },
    qTitle: { ...Type.label, color: t.text },
    qSub: { ...Type.caption, color: t.textSecondary, lineHeight: 18, marginBottom: Spacing.sm },
    pending: { ...Type.bodySmall, color: t.textTertiary, lineHeight: 20, marginTop: Spacing.xs },
    body: { ...Type.body, color: t.textSecondary, lineHeight: 22 },
    warnBox: { flexDirection: 'row', gap: Spacing.md, alignItems: 'flex-start', backgroundColor: t.fill, borderRadius: Radius.card, padding: Spacing.lg, marginTop: Spacing.xs },
    warnTxt: { ...Type.bodySmallStrong, flex: 1, color: t.warning, lineHeight: 20 },
    attest: { flexDirection: 'row', gap: Spacing.md, alignItems: 'flex-start', marginTop: Spacing.sm, paddingHorizontal: Spacing.xs },
    check: { width: 22, height: 22, borderRadius: 6, borderWidth: Trait.controle, alignItems: 'center', justifyContent: 'center', marginTop: Spacing.xs },
    attestTxt: { ...Type.bodySmall, flex: 1, color: t.textSecondary, lineHeight: 20 },
    footer: { padding: Spacing.xl, paddingTop: Spacing.sm, backgroundColor: t.bg, borderTopWidth: 1, borderTopColor: t.line, gap: Spacing.md },
    linkBtn: { alignItems: 'center', paddingVertical: Spacing.xs },
    linkTxt: { ...Type.bodyStrong, color: t.textSecondary },
    disclaimer: { ...Type.micro, color: t.textTertiary, lineHeight: 16, textAlign: 'center' },
  });
}
