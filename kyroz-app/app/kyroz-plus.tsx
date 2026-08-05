import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useTheme, ThemePalette, Spacing, Radius, Type, Fond } from '../constants/theme';
import { useLayout } from '../constants/layout';
import { Card, OptionCard, PrimaryButton, SectionLabel } from '../components/ui';
import { useDialog } from '../components/Dialog';
import { usePremium } from '../hooks/usePremium';
import { PREMIUM_PRICES, annualSavingPct, paywallBanner, withStorePrices, type StorePrices } from '../lib/premium';
import { buy, fetchStorePrices, purchasesConfigured, restore } from '../lib/purchases';
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
// ✅ REVENUECAT EST CÂBLÉ depuis le 2026-08-02 (cf. AGENTS.md B2) : entitlement,
// prix localisés, achat et restauration passent par `lib/purchases.ts`. Le module
// reste DORMANT tant que `EXPO_PUBLIC_REVENUECAT_IOS_KEY` / `_ANDROID_KEY` n'est
// pas posée — dans ce cas les boutons restent désactivés et l'écran le dit.
// Le web ne peut pas encaisser (Kyroz vend par les stores, cf. CLAUDE.md §1) :
// l'écran le DIT au lieu d'afficher un bouton qui échouerait.

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
  "ton frigo, tes favoris, ta série, ta pesée et le recalcul de tes calories, " +
  "et la synchro de ton compte. Rien de tout ça ne passera jamais derrière un abonnement.";

export default function KyrozPlusScreen() {
  const t = useTheme();
  const s = useMemo(() => makeStyles(t), [t]);
  const layout = useLayout();
  const router = useRouter();
  const dialog = useDialog();
  const { reason } = usePremium();
  const [plan, setPlan] = useState<'monthly' | 'annual'>('monthly');
  const [prixStore, setPrixStore] = useState<StorePrices>({});
  const [enCours, setEnCours] = useState(false);

  const banner = paywallBanner(reason);
  const enVente = reason === 'locked';
  const surWeb = Platform.OS === 'web';
  const store = Platform.OS === 'android' ? 'Google Play' : 'App Store';
  const encaissable = purchasesConfigured();

  // Prix RÉELS du store, localisés. Tant qu'ils n'arrivent pas (dormant, offre non
  // publiée, réseau), on garde les tarifs français ET on le dit — cf. `withStorePrices`.
  const { plans, fallback } = useMemo(() => withStorePrices(prixStore), [prixStore]);
  const economie = useMemo(() => annualSavingPct(plans), [plans]);

  useEffect(() => {
    if (!enVente || !encaissable) return;
    let vivant = true;
    const ids = {
      monthly: PREMIUM_PRICES.find((p) => p.id === 'monthly')!.storeProductId,
      annual: PREMIUM_PRICES.find((p) => p.id === 'annual')!.storeProductId,
    };
    fetchStorePrices(ids).then((p) => { if (vivant) setPrixStore(p); });
    return () => { vivant = false; };
  }, [enVente, encaissable]);

  const choisi = plans.find((p) => p.id === plan) ?? plans[0];

  // ⚠️ `useDialog` et PAS `Alert.alert` : ce dernier est une fonction VIDE sur
  // react-native-web (CLAUDE.md §11). Un achat échoué y serait resté MUET.
  const acheter = async () => {
    if (enCours) return;
    setEnCours(true);
    const r = await buy(choisi.storeProductId);
    setEnCours(false);
    if (r.statut === 'annule') return;          // l'utilisateur a renoncé : rien à dire
    if (r.statut === 'ok') {
      await dialog.notify({
        title: r.entitled ? 'Kyroz+ est actif' : 'Achat enregistré',
        message: r.entitled
          ? 'Tes trois outils sont débloqués. Le renouvellement se gère dans ton compte ' + store + '.'
          : "L'achat est passé mais le droit n'est pas encore actif. Il le sera d'ici quelques instants.",
      });
      return;
    }
    await dialog.notify({
      title: "L'achat n'a pas abouti",
      message: r.statut === 'indisponible'
        ? "L'abonnement n'est pas disponible sur cet appareil pour l'instant. Rien ne t'a été débité."
        : `${r.message}\n\nRien ne t'a été débité.`,
    });
  };

  const restaurer = async () => {
    if (enCours) return;
    setEnCours(true);
    const r = await restore();
    setEnCours(false);
    if (r.statut === 'ok') {
      await dialog.notify({
        title: r.entitled ? 'Abonnement retrouvé' : 'Aucun abonnement à restaurer',
        message: r.entitled
          ? 'Ton Kyroz+ est de nouveau actif sur cet appareil.'
          : `Aucun achat Kyroz+ n'est associé à ce compte ${store}.`,
      });
      return;
    }
    await dialog.notify({
      title: 'Restauration impossible',
      message: r.statut === 'echec'
        ? r.message
        : "Les achats ne sont pas disponibles sur cet appareil.",
    });
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <StatusBar style={t.scheme === 'dark' ? 'light' : 'dark'} />
      <View style={[s.header, layout.header]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={10} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={26} color={t.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Kyroz+</Text>
      </View>

      <ScrollView contentContainerStyle={[s.content, layout.content]} showsVerticalScrollIndicator={false}>
        <Text style={s.h1}>{banner.title}</Text>
        <Text style={s.sub}>{banner.body}</Text>

        <View style={s.block}>
          <SectionLabel t={t}>Ce que Kyroz+ ajoute</SectionLabel>
          <View style={{ gap: Spacing.md, marginTop: Spacing.md }}>
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
          <Card t={t} style={{ marginTop: Spacing.md }}>
            <Text style={s.briqueCorps}>{GRATUIT}</Text>
          </Card>
        </View>

        {enVente && (
          <View style={s.block}>
            <SectionLabel t={t}>Choisis ta formule</SectionLabel>
            <View style={{ gap: Spacing.md, marginTop: Spacing.md }}>
              {plans.map((p) => (
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
              <Card t={t} style={{ marginTop: Spacing.lg }}>
                <Text style={s.briqueCorps}>
                  L'abonnement s'achète depuis l'app iPhone ou Android. Le navigateur ne peut pas
                  encaisser le paiement.
                </Text>
              </Card>
            ) : (
              <View style={{ marginTop: Spacing.lg, gap: Spacing.md }}>
                {/* Désactivé tant que la clé RevenueCat n'est pas posée. On le DIT
                    plus bas au lieu de laisser un bouton mort sans explication. */}
                <PrimaryButton
                  t={t}
                  label={enCours ? 'Un instant…' : "S'abonner"}
                  onPress={acheter}
                  disabled={!encaissable || enCours}
                />
                <TouchableOpacity
                  onPress={restaurer}
                  activeOpacity={0.7}
                  disabled={!encaissable || enCours}
                >
                  <Text style={[s.lienSecondaire, (!encaissable || enCours) && { opacity: 0.5 }]}>
                    Restaurer mes achats
                  </Text>
                </TouchableOpacity>
                {!encaissable && (
                  <Text style={s.mentions}>
                    L'abonnement n'est pas encore ouvert sur cette version de l'app. Tes trois
                    outils restent actifs en attendant.
                  </Text>
                )}
              </View>
            )}

            <Text style={s.mentions}>
              Le paiement est débité de ton compte {store} à la confirmation de l'achat.
              L'abonnement se renouvelle automatiquement au même tarif à la fin de chaque période,
              sauf si tu le désactives au moins 24 h avant. Tu peux le gérer ou l'arrêter à tout
              moment dans les réglages de ton compte {store}.
            </Text>
            {fallback && (
              <Text style={s.mentions}>
                Les montants ci-dessus sont les tarifs français. Le prix exact de ton pays
                s'affiche au moment de l'achat, avant toute validation.
              </Text>
            )}
          </View>
        )}

        <TouchableOpacity onPress={() => router.push('/legal')} activeOpacity={0.7} style={{ marginTop: Spacing.xxl }}>
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
    header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md },
    headerTitle: { color: t.text, ...Type.h3 },
    content: { padding: Spacing.xl, paddingBottom: Fond.ecran },
    h1: { color: t.text, ...Type.display, marginTop: Spacing.sm },
    sub: { ...Type.body, color: t.textSecondary, lineHeight: 22, marginTop: Spacing.sm },
    block: { marginTop: Spacing.xxxl },
    briqueTitre: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm },
    briqueNom: { color: t.text, ...Type.h3 },
    briqueCorps: { ...Type.bodySmall, color: t.textSecondary, lineHeight: 21 },
    confid: { ...Type.caption, color: t.textTertiary, lineHeight: 18, marginTop: Spacing.md },
    lienSecondaire: { ...Type.bodySmallStrong, color: t.textSecondary, textAlign: 'center' },
    mentions: { ...Type.caption, color: t.textTertiary, lineHeight: 18, marginTop: Spacing.lg },
    disclaimer: { ...Type.micro, color: t.textTertiary, lineHeight: 17, marginTop: Spacing.xxl, borderTopWidth: 1, borderTopColor: t.line, paddingTop: Spacing.lg },
  });
}
