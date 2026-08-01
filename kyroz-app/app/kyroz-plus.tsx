import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useTheme, ThemePalette, Spacing, Radius } from '../constants/theme';
import { Card, OptionCard, PrimaryButton, SectionLabel } from '../components/ui';
import { usePremium } from '../hooks/usePremium';
import { PREMIUM_PRICES, PREMIUM_PRICES_ARE_LOCAL_FALLBACK, annualSavingPct, paywallBanner } from '../lib/premium';
import { DISCLAIMER } from '../constants/legal';

// ── Écran Kyroz+ — route racine /kyroz-plus ──────────────────────────────────
//
// Il sert QUATRE états, pas un (cf. `AccessReason` dans lib/premium.ts) :
//   not_launched  → aujourd'hui, pour tout le monde. Rien n'est en vente.
//   grandfathered → compte antérieur au lancement : gratuit à vie.
//   entitled      → abonné actif.
//   locked        → compte postérieur sans abonnement : le seul état qui vend.
//
// ⚠️ TANT QUE `PAYWALL_LAUNCH` VAUT `null`, SEUL `not_launched` EST ATTEIGNABLE.
// L'écran est donc informatif et n'affiche AUCUN prix. C'est voulu : la règle
// produit interdit de mettre la pression, et rien n'est achetable.
//
// PARTI PRIS (arbitré le 2026-08-01, angle « sobre ») : cet écran ressemble à un
// écran de réglages de Kyroz, pas à une page de vente. Pas de compte à rebours,
// pas de badge « offre limitée », pas de superlatif. On explique AVANT de
// demander, et le bloc « ce qui reste gratuit » est aussi long que l'argumentaire.
// Deux angles concurrents ont été écartés : un paywall contextuel (16 rendus à
// vérifier, 24 phrases dupliquant le comportement du moteur) et un paywall
// « valeur d'abord » qui rejouait le moteur à chaque rendu pour montrer un
// exemple personnalisé — lequel, calculé honnêtement, décourage plus qu'il ne
// convainc.
//
// ⚠️ CE QUI RESTE À FAIRE LE JOUR DU CÂBLAGE REVENUECAT (cf. AGENTS.md B2) :
//   1. `useEntitlement()` dans hooks/usePremium.ts → `Purchases.getCustomerInfo()`
//   2. les prix viennent du store (`priceString`, LOCALISÉ), pas de PREMIUM_PRICES
//   3. brancher `onSubscribe` et « Restaurer mes achats » sur le SDK
// Le web ne peut pas encaisser (`react-native-purchases` n'existe pas côté
// navigateur) : l'écran le DIT au lieu d'afficher un bouton qui échouerait.

const BRIQUES = [
  {
    icone: 'rocket-outline' as const,
    titre: 'Objectif daté',
    corps:
      "Tu poses un poids et une date. Kyroz calcule le rythme tenable pour ton corps, " +
      "réajuste tes calories à chaque pesée, et te dit franchement quand la date ne l'est pas.",
  },
  {
    icone: 'wallet-outline' as const,
    titre: 'Banque de calories',
    corps:
      "Un resto samedi ? Tu le déclares, Kyroz reprend l'écart sur tes autres jours. " +
      "Tes protéines ne bougent pas, et aucun jour ne descend sous ton plancher de sécurité.",
  },
  {
    icone: 'trending-up-outline' as const,
    titre: 'Suivi de transformation',
    corps:
      "Ta courbe de poids avec, par-dessus, la trajectoire visée. Un mot honnête sur ta pente " +
      "à chaque pesée — un repère, jamais une alarme. Et l'avant/après en photo.",
  },
];

const GRATUIT =
  "Ton plan de la semaine macro par macro, ta liste de courses, toutes les recettes, " +
  "ton garde-manger, tes favoris, ta série, ta pesée et le recalcul de tes calories, " +
  "et la synchro de ton compte. Rien de tout ça ne passera jamais derrière un abonnement.";

export default function KyrozPlusScreen() {
  const t = useTheme();
  const s = useMemo(() => makeStyles(t), [t]);
  const router = useRouter();
  const { reason } = usePremium();
  const [plan, setPlan] = useState<'monthly' | 'annual'>('monthly');

  const banner = paywallBanner(reason);
  const economie = annualSavingPct();
  const enVente = reason === 'locked';
  const surWeb = Platform.OS === 'web';
  const store = Platform.OS === 'android' ? 'Google Play' : 'App Store';

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <StatusBar style={t.scheme === 'dark' ? 'light' : 'dark'} />
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={10} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={26} color={t.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Kyroz+</Text>
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <Text style={s.h1}>{banner.title}</Text>
        <Text style={s.sub}>{banner.body}</Text>

        <View style={s.block}>
          <SectionLabel t={t}>Ce que Kyroz+ ajoute</SectionLabel>
          <View style={{ gap: 10, marginTop: 10 }}>
            {BRIQUES.map((b) => (
              <Card key={b.titre} t={t}>
                <View style={s.briqueTitre}>
                  <Ionicons name={b.icone} size={19} color={t.text} />
                  <Text style={s.briqueNom}>{b.titre}</Text>
                </View>
                <Text style={s.briqueCorps}>{b.corps}</Text>
              </Card>
            ))}
          </View>
          <Text style={s.confid}>
            Tes photos de progression restent sur ton téléphone. Elles ne sont jamais envoyées.
          </Text>
        </View>

        <View style={s.block}>
          <SectionLabel t={t}>Ce qui reste gratuit</SectionLabel>
          <Card t={t} style={{ marginTop: 10 }}>
            <Text style={s.briqueCorps}>{GRATUIT}</Text>
          </Card>
        </View>

        {enVente && (
          <View style={s.block}>
            <SectionLabel t={t}>Choisis ta formule</SectionLabel>
            <View style={{ gap: 10, marginTop: 10 }}>
              {PREMIUM_PRICES.map((p) => (
                <OptionCard
                  key={p.id}
                  t={t}
                  title={`${p.label} — ${p.price}`}
                  subtitle={
                    p.id === 'annual' && economie != null
                      ? `${p.billed} Soit ${economie} % de moins que le mensuel.`
                      : p.billed
                  }
                  selected={plan === p.id}
                  onPress={() => setPlan(p.id)}
                />
              ))}
            </View>

            {surWeb ? (
              <Card t={t} style={{ marginTop: 14 }}>
                <Text style={s.briqueCorps}>
                  L'abonnement s'achète depuis l'app iPhone ou Android. Le navigateur ne peut pas
                  encaisser le paiement.
                </Text>
              </Card>
            ) : (
              <View style={{ marginTop: 14, gap: 12 }}>
                {/* ⚠️ Inerte tant que RevenueCat n'est pas branché — et cet état
                    est inatteignable aujourd'hui (PAYWALL_LAUNCH === null). */}
                <PrimaryButton t={t} label="S'abonner" onPress={() => {}} disabled />
                <TouchableOpacity onPress={() => {}} activeOpacity={0.7} disabled>
                  <Text style={s.lienSecondaire}>Restaurer mes achats</Text>
                </TouchableOpacity>
              </View>
            )}

            <Text style={s.mentions}>
              Le paiement est débité de ton compte {store} à la confirmation de l'achat.
              L'abonnement se renouvelle automatiquement au même tarif à la fin de chaque période,
              sauf si tu le désactives au moins 24 h avant. Tu peux le gérer ou l'arrêter à tout
              moment dans les réglages de ton compte {store}.
            </Text>
            {PREMIUM_PRICES_ARE_LOCAL_FALLBACK && (
              <Text style={s.mentions}>
                Les montants ci-dessus sont les tarifs français. Le prix exact de ton pays
                s'affiche au moment de l'achat, avant toute validation.
              </Text>
            )}
          </View>
        )}

        <TouchableOpacity onPress={() => router.push('/legal')} activeOpacity={0.7} style={{ marginTop: 26 }}>
          <Text style={s.lienSecondaire}>Conditions d'utilisation · Confidentialité</Text>
        </TouchableOpacity>

        <Text style={s.disclaimer}>{DISCLAIMER}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(t: ThemePalette) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: t.bg },
    header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: Spacing.xl, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: t.line },
    headerTitle: { color: t.text, fontSize: 18, fontWeight: '800', letterSpacing: -0.4 },
    content: { padding: Spacing.xl, paddingBottom: 60 },
    h1: { color: t.text, fontSize: 26, fontWeight: '800', letterSpacing: -0.6, marginTop: 8 },
    sub: { color: t.textSecondary, fontSize: 15, lineHeight: 22, marginTop: 8 },
    block: { marginTop: 28 },
    briqueTitre: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
    briqueNom: { color: t.text, fontSize: 17, fontWeight: '700', letterSpacing: -0.3 },
    briqueCorps: { color: t.textSecondary, fontSize: 14, lineHeight: 21 },
    confid: { color: t.textTertiary, fontSize: 12.5, lineHeight: 18, marginTop: 10 },
    lienSecondaire: { color: t.textSecondary, fontSize: 14, fontWeight: '600', textAlign: 'center' },
    mentions: { color: t.textTertiary, fontSize: 12, lineHeight: 18, marginTop: 14 },
    disclaimer: { color: t.textTertiary, fontSize: 11.5, lineHeight: 17, marginTop: 26, borderTopWidth: 1, borderTopColor: t.line, paddingTop: 14 },
  });
}
