import React, { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Presse } from '../components/Presse';
import { useTheme, ThemePalette, Spacing, Radius, Type, Fond, Icone, OPACITE_PRESSION, Trait, CIBLE_TACTILE_MIN } from '../constants/theme';
import { useLayout } from '../constants/layout';
import { OptionCard, PrimaryButton } from '../components/ui';
import { usePremium } from '../hooks/usePremium';
import { useAchatKyrozPlus } from '../hooks/useAchatKyrozPlus';
import { PURCHASE_BUDGET_MS } from '../lib/purchases';
import { FONCTIONS_KYROZ_PLUS, NOUVEAUTES_INCLUSES, friseEssai, mentionPaiement } from '../lib/offreKyrozPlus';

// ── La page Kyroz+ du parcours d'arrivée — route /offre-kyroz-plus ───────────
//
// Décision fondateur du 2026-10-20, sur le modèle de la page d'essai de Wikiloc : une fois,
// APRÈS la visite de l'app (« la personne a vu ce que l'app a dans le ventre »), avant l'offre
// du rappel. Elle remplace une règle écrite (MONETISATION.md : « pas d'essai, Kyroz+ se
// déclenche sur l'intention ») — *« aucune règle n'est définitive »*.
//
// ⚠️ CE QU'ELLE NE FAIT JAMAIS :
//   · bloquer : une croix et « Peut-être plus tard », d'un tap. Le plan reste gratuit — la
//     règle de l'app (CLAUDE.md §1), et Apple refuse une page d'abonnement qui ne se ferme pas ;
//   · promettre ce qui n'existe pas : ni liste « à venir » (`lib/offreKyrozPlus.ts`), ni essai
//     que le store n'accorde pas à CETTE personne (`essaiJours` vient du store, sinon rien) ;
//   · recopier l'achat : prix, abonnement, restauration et messages sont ceux de l'écran
//     Kyroz+ du Profil (`hooks/useAchatKyrozPlus.ts`).
// Le plan d'arrivée ne la montre qu'à un compte qui doit payer (`reason === 'locked'`) et sur
// une app qui peut encaisser (pas le web) — `app/(tabs)/plan.tsx::apresLaVisite`.

export default function OffreKyrozPlusScreen() {
  const t = useTheme();
  const s = useMemo(() => makeStyles(t), [t]);
  const layout = useLayout();
  const router = useRouter();
  // Acheter ou restaurer exige que RevenueCat sache à quel compte rattacher la transaction.
  const { reason } = usePremium({ forcerIdentification: true });
  const enVente = reason === 'locked';
  const { plan, setPlan, plans, economie, enCours, acheter, restaurer, store, encaissable, essaiJours, prixStoreChoisi } =
    useAchatKyrozPlus(enVente);

  const fermer = () => { if (router.canGoBack()) router.back(); else router.replace('/(tabs)/plan'); };
  // Abonné (achat abouti ou restauré) : la page n'a plus rien à dire, elle rend la main.
  useEffect(() => { if (reason === 'entitled') fermer(); }, [reason]);

  const frise = essaiJours && prixStoreChoisi
    ? friseEssai(essaiJours, new Date(), prixStoreChoisi, plan, store)
    : null;

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <StatusBar style={t.scheme === 'dark' ? 'light' : 'dark'} />
      <View style={[s.haut, layout.header]}>
        <Presse onPress={fermer} activeOpacity={OPACITE_PRESSION} style={s.croix} accessibilityLabel="Fermer">
          <Ionicons name="close" size={Icone.nav} color={t.text} />
        </Presse>
      </View>

      <ScrollView contentContainerStyle={[s.contenu, layout.content]} showsVerticalScrollIndicator={false}>
        <View style={s.marque}>
          <Text style={s.logo}>Kyroz</Text>
          <View style={s.badge}><Text style={s.badgeTexte}>PLUS</Text></View>
        </View>
        <Text style={s.titre}>
          {essaiJours ? `Essaie Kyroz+ gratuitement pendant ${essaiJours} jours` : 'Va plus loin avec Kyroz+'}
        </Text>
        <Text style={s.sous}>Ton plan, tes courses et tes recettes restent gratuits, pour toujours. Kyroz+ ajoute :</Text>

        <View style={s.fonctions}>
          {FONCTIONS_KYROZ_PLUS.map((f) => (
            <View key={f.feature} style={s.fonction}>
              <Ionicons name={f.icone as keyof typeof Ionicons.glyphMap} size={Icone.action} color={t.accent} />
              <View style={{ flex: 1 }}>
                <Text style={s.fonctionTitre}>{f.titre}</Text>
                <Text style={s.fonctionCorps}>{f.corps}</Text>
              </View>
            </View>
          ))}
          <Text style={s.fonctionCorps}>{NOUVEAUTES_INCLUSES}</Text>
        </View>

        {frise && (
          <View style={s.frise}>
            {frise.map((e, i) => (
              <View key={e.quand} style={s.etape}>
                <View style={s.rail}>
                  <View style={[s.point, i === 0 && { backgroundColor: t.accent, borderColor: t.accent }]} />
                  {i < frise.length - 1 && <View style={s.trait} />}
                </View>
                <View style={s.etapeTexte}>
                  <Text style={s.quand}>{e.quand}</Text>
                  <Text style={s.etapeTitre}>{e.titre}</Text>
                  <Text style={s.fonctionCorps}>{e.texte}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {enVente && (
          <View style={s.formules}>
            {plans.map((p) => (
              <OptionCard
                key={p.id}
                t={t}
                title={`${p.label} · ${p.price}`}
                subtitle={p.id === 'annual' && economie != null ? `${p.billed} Soit ${economie} % de moins que le mensuel.` : p.billed}
                selected={plan === p.id}
                onPress={() => setPlan(p.id)}
              />
            ))}
          </View>
        )}

        <Text style={s.mentions}>{mentionPaiement(store, essaiJours)}</Text>
        <Presse onPress={() => router.push('/legal')} activeOpacity={OPACITE_PRESSION} style={s.lien}>
          <Text style={s.lienTexte}>Conditions d'utilisation · Confidentialité</Text>
        </Presse>
      </ScrollView>

      <View style={[s.pied, layout.header]}>
        <PrimaryButton
          t={t}
          label={essaiJours ? `Essayer ${essaiJours} jours gratuitement` : "S'abonner"}
          loading={enCours}
          onPress={acheter}
          disabled={!encaissable || !enVente}
        />
        {enCours && (
          <Text style={s.mentions}>
            Validation auprès de {store} — jusqu'à {Math.round(PURCHASE_BUDGET_MS / 1000)} secondes.
          </Text>
        )}
        <View style={s.liensPied}>
          <Presse onPress={restaurer} activeOpacity={OPACITE_PRESSION} disabled={!encaissable || enCours} style={s.lien}>
            <Text style={s.lienTexte}>Restaurer les achats</Text>
          </Presse>
          <Presse onPress={fermer} activeOpacity={OPACITE_PRESSION} style={s.lien}>
            <Text style={s.lienTexte}>Peut-être plus tard</Text>
          </Presse>
        </View>
      </View>
    </SafeAreaView>
  );
}

const POINT = 12;

function makeStyles(t: ThemePalette) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: t.bg },
    haut: { paddingHorizontal: Spacing.lg, alignItems: 'flex-start' },
    croix: { minHeight: CIBLE_TACTILE_MIN, minWidth: CIBLE_TACTILE_MIN, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.pill, backgroundColor: t.fill },
    contenu: { paddingHorizontal: Spacing.xl, paddingBottom: Fond.ecran, gap: Spacing.xl },
    marque: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, marginTop: Spacing.sm },
    logo: { ...Type.h1, color: t.text },
    badge: { backgroundColor: t.accent, borderRadius: Radius.pill, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs },
    badgeTexte: { ...Type.microStrong, color: t.onAccent },
    titre: { ...Type.display, color: t.text, textAlign: 'center' },
    sous: { ...Type.body, color: t.textSecondary, textAlign: 'center' },
    fonctions: { gap: Spacing.lg },
    fonction: { flexDirection: 'row', gap: Spacing.md, alignItems: 'flex-start' },
    fonctionTitre: { ...Type.bodyStrong, color: t.text },
    fonctionCorps: { ...Type.bodySmall, color: t.textSecondary, marginTop: Spacing.xs },
    frise: { gap: 0 },
    etape: { flexDirection: 'row', gap: Spacing.md },
    rail: { width: POINT, alignItems: 'center' },
    point: { width: POINT, height: POINT, borderRadius: POINT / 2, borderWidth: Trait.controle, borderColor: t.textTertiary, marginTop: Spacing.xs },
    trait: { flex: 1, width: Trait.controle, backgroundColor: t.line, marginVertical: Spacing.xs },
    etapeTexte: { flex: 1, paddingBottom: Spacing.lg },
    quand: { ...Type.microStrong, color: t.textTertiary },
    etapeTitre: { ...Type.bodyStrong, color: t.text, marginTop: Spacing.xs },
    formules: { gap: Spacing.md },
    mentions: { ...Type.micro, color: t.textTertiary, textAlign: 'center' },
    pied: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.md, gap: Spacing.sm, borderTopWidth: Trait.fin, borderColor: t.line, backgroundColor: t.bg },
    liensPied: { flexDirection: 'row', justifyContent: 'space-between' },
    lien: { minHeight: CIBLE_TACTILE_MIN, justifyContent: 'center', alignItems: 'center' },
    lienTexte: { ...Type.caption, color: t.textSecondary },
  });
}
