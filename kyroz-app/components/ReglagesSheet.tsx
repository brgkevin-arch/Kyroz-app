import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { ThemePalette, Spacing, Type, Radius, Trait, Icone, OPACITE_PRESSION, CIBLE_TACTILE_MIN, useTheme } from '../constants/theme';
import { Segmented, SectionTitle, MenuRow } from './ui';
import { useReminder } from '../hooks/useReminder';
import { usePlanCheckin } from '../hooks/usePlanCheckin';
import { useAnalyticsConsent } from '../hooks/useAnalyticsConsent';
import { useThemeMode, setThemeMode, ThemeMode } from '../lib/themeMode';
import { useAccentId, setAccentId, ACCENTS, ACCENT_IDS, readableOn } from '../lib/accentColor';
import { useHydrationEnabled } from './HydrationBar';
import { ReminderTimeField } from './ReminderTimeField';
import { ReminderTime, formatReminderTime, DEFAULT_REMINDER_TIME } from '../lib/reminder';
import { remindersSupported } from '../lib/notifications';
import { useDialog } from './Dialog';
import { TOURS } from '../lib/tours';
// ⚠️ `SUPPORT_EMAIL` était importé pour la ligne « Aide & contact », retirée le
// 2026-08-10 (elle poussait la même route que « Donner mon avis » en affichant une
// adresse qu'elle n'ouvrait pas). L'import a bien failli partir avec elle — il a
// entre-temps trouvé un SECOND lecteur : le repli « aucune application e-mail » de
// la suppression des statistiques. On garde donc la source unique, pas la ligne.
import { SUPPORT_EMAIL, lienSuppressionStats } from '../lib/feedback';
import { pseudonymeExistant } from '../lib/analytics';
import { DISCLAIMER } from '../constants/legal';
import { CIQUAL_ATTRIBUTION } from '../lib/foods';

// ── La feuille « Réglages » — ce qui vivait au fond du Profil ────────────────
//
// Décision fondateur du 2026-08-09 : *« le profil est plus une section fourre-tout.
// J'aimerais que le profil soit qu'avec les préférences et données de l'user, suivi
// du poids etc, et avec une petite roue dentée on met le reste. »*
//
// L'écran Profil empilait, à la suite : le poids, la série, les cartes de sécurité,
// les cibles, le TDEE, 11 lignes de menu, **6 interrupteurs système**, 5 lignes de
// menu de bas de page, la déconnexion et la suppression de compte. « Couleur
// d'accent » était à trois doigts de « Supprimer mon compte ».
//
// 🔴 TROIS PIÈGES ONT ÉTÉ VÉRIFIÉS AVANT D'ÉCRIRE CE FICHIER, parce qu'un réglage
// qui déménage dans un composant MONTÉ À LA DEMANDE perd tout effet de bord attaché
// à son montage. C'est E24 exactement — le rappel quotidien servait un texte de
// plusieurs mois parce que son ré-armement vivait dans un hook monté par le seul
// onglet Profil. Les quatre hooks déplacés ici ont donc été relus un par un :
//
//   • `useReminder`      → pur LECTEUR depuis E24 ; le ré-armement est dans
//                          `loadReminder()`, appelé par le layout RACINE. Sûr.
//   • `usePlanCheckin`   → son effet de montage ÉCRIT (il amorce `lastShown` à la
//                          première fois). Mais `plan.tsx` le monte aussi, et c'est
//                          l'écran d'arrivée de l'app : l'amorçage a déjà eu lieu.
//                          Sûr — pour la même raison qu'`applyWeighInReminder`
//                          n'a jamais eu le défaut d'E24.
//   • `useAnalyticsConsent` → lecture seule. Sûr.
//   • thème / accent / hydratation → chargés par le layout racine. Sûrs.
//
// ➡️ **Ne pas ajouter ici un hook sans refaire ce tour.** La question n'est pas
// « est-ce que ça s'affiche ? » mais « est-ce que quelque chose se PRODUISAIT au
// montage, et qui le déclenche maintenant ? ». Un effet qui n'a plus lieu ne se voit
// ni à l'écran, ni dans une capture, ni dans un diff.
//
// ⚠️ Cette feuille est rendue par `profil.tsx` comme les éditeurs : `Sheet` clone son
// enfant pour lui injecter `dragHandlers` et `sheetScrollProps` — d'où ces deux props,
// sans lesquelles l'en-tête ne serait pas glissable et le défilement ne fermerait pas.

interface Props {
  t: ThemePalette;
  version: string;
  onClose: () => void;
  onExport: () => void;
  onRevoirTutos: () => void;
  onLogout: () => void;
  onDelete: () => void;
  dragHandlers?: any;
  sheetScrollProps?: any;
}

export function ReglagesSheet({
  t, version, onClose, onExport, onRevoirTutos, onLogout, onDelete, dragHandlers, sheetScrollProps,
}: Props) {
  const router = useRouter();
  const { notify } = useDialog();
  const { time: reminderTime, choose: chooseReminder } = useReminder();
  const { enabled: checkinEnabled, setEnabled: setCheckinEnabled } = usePlanCheckin();
  const themeMode = useThemeMode();
  const accentId = useAccentId();
  const [hydrationOn, setHydrationOn] = useHydrationEnabled();
  const { consent: analyticsConsent, choose: chooseConsent } = useAnalyticsConsent();
  const s = React.useMemo(() => makeStyles(t), [t]);

  // Identifiant pseudonyme, s'il en existe un. `pseudonymeExistant` ne le CRÉE pas :
  // ouvrir ses réglages ne doit pas fabriquer l'identifiant qu'on n'avait pas.
  const [pseudonyme, setPseudonyme] = React.useState<string | null>(null);
  React.useEffect(() => { pseudonymeExistant().then(setPseudonyme); }, []);

  const demanderSuppressionStats = async () => {
    if (!pseudonyme) return;
    const url = lienSuppressionStats(pseudonyme);
    const ok = await Linking.canOpenURL(url).catch(() => false);
    if (!ok) {
      // Même repli que l'écran « Donner mon avis » : sans client mail configuré,
      // `openURL` échouerait en silence et le bouton passerait pour mort.
      notify({ title: 'Aucune application e-mail', message: `Écris-nous à ${SUPPORT_EMAIL} en précisant ton identifiant : ${pseudonyme}` });
      return;
    }
    Linking.openURL(url);
  };

  // 🔴 ON FERME LA FEUILLE AVANT DE NAVIGUER, et ce n'est pas cosmétique. Une route
  // poussée depuis l'intérieur d'une `Modal` ouverte naît SOUS elle : l'utilisateur
  // taperait « Confidentialité & CGU » et ne verrait rien bouger. Même famille que
  // l'empilement de deux feuilles corrigé dans `ActionSheet.tsx` le 2026-08-09 —
  // ce qui décide, c'est l'ordre de montage, pas l'intention du code.
  const versRoute = (chemin: string) => { onClose(); router.push(chemin as never); };

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <View style={s.entete} {...(dragHandlers ?? {})}>
        <Text style={{ color: t.text, ...Type.h2 }}>Réglages</Text>
      </View>

      <ScrollView contentContainerStyle={s.contenu} showsVerticalScrollIndicator={false} {...(sheetScrollProps ?? {})}>
        {/* ── Notifications ────────────────────────────────────────────────── */}
        <SectionTitle t={t}>Notifications</SectionTitle>

        <Text style={s.label}>Rappel quotidien</Text>
        <Segmented<'off' | 'on'>
          t={t}
          value={reminderTime ? 'on' : 'off'}
          onChange={async (v) => {
            // Réactiver reprend l'heure affichée ; seule la PREMIÈRE activation
            // pose le matin par défaut.
            const next: ReminderTime | null = v === 'on' ? (reminderTime ?? DEFAULT_REMINDER_TIME) : null;
            const ok = await chooseReminder(next);
            if (!ok && next) {
              notify({
                title: remindersSupported ? 'Notifications désactivées' : 'Indisponible sur le web',
                message: remindersSupported
                  ? 'Active les notifications de Kyroz dans les réglages de ton téléphone pour recevoir le rappel.'
                  : 'Le rappel quotidien fonctionne sur l’app mobile (iOS/Android), pas dans le navigateur.',
              });
            }
          }}
          options={[{ label: 'Aucun', value: 'off' }, { label: 'Activé', value: 'on' }]}
        />
        {/* Aucun geste ne se JETTE ici — ni sur l'interrupteur, ni sur l'heure : les
            choix s'empilent dans `useReminder`. Le garde « un choix est déjà en
            cours » avait coûté une heure saisie perdue et un segment mort. */}
        {reminderTime ? <ReminderTimeField t={t} value={reminderTime} onChange={chooseReminder} /> : null}
        <Text style={s.aide}>
          {reminderTime
            ? `Chaque jour à ${formatReminderTime(reminderTime)}, avec une citation.`
            : 'Un rappel par jour, à l’heure que tu choisis, pour retrouver ton plan.'}
          {!remindersSupported && reminderTime ? ' La notif arrive sur l’app mobile (pas sur le web).' : ''}
        </Text>

        <Text style={s.label}>Propositions d'ajustement</Text>
        <Segmented<'on' | 'off'>
          t={t}
          value={checkinEnabled ? 'on' : 'off'}
          onChange={(v) => setCheckinEnabled(v === 'on')}
          options={[{ label: 'Activées', value: 'on' }, { label: 'Désactivées', value: 'off' }]}
        />
        <Text style={s.aide}>
          {checkinEnabled
            ? 'On te demandera de temps en temps si ton plan te va, avec des ajustements en un tap.'
            : 'On ne te proposera plus d’ajuster ton plan.'}
        </Text>

        {/* ── Affichage ────────────────────────────────────────────────────── */}
        <SectionTitle t={t}>Affichage</SectionTitle>

        <Text style={s.label}>Apparence</Text>
        <Segmented<ThemeMode>
          t={t}
          value={themeMode}
          onChange={setThemeMode}
          options={[
            { label: 'Système', value: 'system' },
            { label: 'Clair', value: 'light' },
            { label: 'Sombre', value: 'dark' },
          ]}
        />
        <Text style={s.aide}>
          {themeMode === 'system' ? 'Suit le réglage clair/sombre de ton téléphone.' : `Thème ${themeMode === 'light' ? 'clair' : 'sombre'} forcé.`}
        </Text>

        {/* Chaque pastille montre la couleur telle qu'elle sera DANS LE THÈME
            COURANT — un même bleu n'a pas la même valeur sur fond noir et clair. */}
        <Text style={s.label}>Couleur d'accent</Text>
        <View style={s.pastilles}>
          {ACCENT_IDS.map((id) => {
            const on = accentId === id;
            const couleur = ACCENTS[id][t.scheme];
            return (
              <TouchableOpacity
                key={id}
                onPress={() => setAccentId(id)}
                activeOpacity={OPACITE_PRESSION}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                accessibilityLabel={`Couleur d'accent ${ACCENTS[id].label}`}
                style={[s.pastille, { backgroundColor: couleur, borderColor: on ? t.text : t.line }]}
              >
                {/* La coche se calcule elle aussi : noir ou blanc selon la pastille. */}
                {on && <Ionicons name="checkmark" size={Icone.standard} color={readableOn(couleur)} />}
              </TouchableOpacity>
            );
          })}
        </View>
        <Text style={s.aide}>
          {accentId === 'mono'
            ? 'Monochrome : encre sur fond clair, blanc sur fond sombre.'
            : `${ACCENTS[accentId].label} — appliqué aux boutons et aux éléments actifs.`}
        </Text>

        <Text style={s.label}>Suivi d'hydratation</Text>
        <Segmented<'on' | 'off'>
          t={t}
          value={hydrationOn ? 'on' : 'off'}
          onChange={(v) => setHydrationOn(v === 'on')}
          options={[{ label: 'Affiché', value: 'on' }, { label: 'Masqué', value: 'off' }]}
        />
        <Text style={s.aide}>
          {hydrationOn
            ? 'Une mini-barre de suivi d’hydratation s’affiche au-dessus de tes repas du jour.'
            : 'La barre d’hydratation est masquée.'}
        </Text>

        {/* ── Aide et retours ──────────────────────────────────────────────── */}
        <SectionTitle t={t}>Aide et retours</SectionTitle>
        <View style={s.menu}>
          {/* En tête du bloc, et c'est voulu : c'est la ligne qu'on veut qu'un
              testeur trouve. « Aide & contact » n'affichait qu'une adresse à
              recopier — personne n'écrit un retour à ce prix-là.
              🔴 ET ELLE EST RESTÉE JUSTE EN DESSOUS, VIDÉE DE SON RÔLE. E25 lui a
              donné le même `onPress` que la ligne du dessus (`/avis`) tout en lui
              laissant l'adresse comme VALEUR : deux lignes voisines, une seule
              destination, et la seconde promettait un mail qu'elle n'ouvrait pas.
              Retirée le 2026-08-10. L'adresse n'est pas perdue — `/avis` la montre
              en repli quand aucun client mail ne répond (app/avis.tsx). Un doublon
              qui affiche une action qu'il ne fait pas est un mensonge d'interface,
              pas une commodité. */}
          <MenuRow t={t} label="Donner mon avis" value="Un problème, une idée" onPress={() => versRoute('/avis')} />
          <MenuRow t={t} label="Revoir les tutos" value={`${TOURS.length} visites guidées`} onPress={onRevoirTutos} last />
        </View>

        {/* ── Confidentialité ──────────────────────────────────────────────── */}
        <SectionTitle t={t}>Confidentialité</SectionTitle>

        <Text style={s.label}>Statistiques d'usage</Text>
        <Segmented<'on' | 'off'>
          t={t}
          value={analyticsConsent === 'granted' ? 'on' : 'off'}
          onChange={(v) => chooseConsent(v === 'on' ? 'granted' : 'denied')}
          options={[{ label: 'Partagées', value: 'on' }, { label: 'Non', value: 'off' }]}
        />
        {/* ⚠️ « PSEUDONYME », PAS « ANONYME » — cette ligne disait « anonymes » et c'était
            faux par construction : l'identifiant est stable, donc les mesures d'un même
            téléphone se regroupent, et c'est précisément ce qui rend possible la
            suppression proposée juste en dessous. Une donnée supprimable par individu
            n'est pas anonyme ; promettre les deux, c'est se contredire dans le même
            écran. Le vocabulaire fait partie de la promesse (synthèse §3.3). */}
        <Text style={s.aide}>
          {analyticsConsent === 'granted'
            ? 'Tu partages comment tu utilises l’app — écrans ouverts, repas cochés, erreurs. Jamais tes données de santé, ton prénom ni ton e-mail. C’est rattaché à un identifiant pseudonyme tiré sur cet appareil, hébergé dans l’UE, conservé 18 mois.'
            : 'Aucune statistique d’usage n’est partagée.'}
        </Text>

        <View style={s.menu}>
          {/* La ligne n'apparaît QUE si un identifiant existe, c'est-à-dire seulement
              si quelque chose a pu partir. Proposer d'effacer un néant serait une
              fausse réassurance ; et la faire dépendre du consentement COURANT la
              retirerait pile à qui vient de le retirer — le cas où elle sert le plus. */}
          {pseudonyme && (
            <MenuRow t={t} label="Supprimer mes statistiques" value="Demande par e-mail (RGPD)" onPress={demanderSuppressionStats} />
          )}
          <MenuRow t={t} label="Exporter mes données" value="Télécharger tout (RGPD)" onPress={onExport} />
          <MenuRow t={t} label="Confidentialité & CGU" value="RGPD, données de santé" onPress={() => versRoute('/legal')} last />
        </View>

        {/* ── Compte ───────────────────────────────────────────────────────── */}
        <SectionTitle t={t}>Compte</SectionTitle>
        <View style={s.menu}>
          <MenuRow t={t} label="Version" value={version} onPress={() => {}} readonly last />
        </View>

        <TouchableOpacity style={s.deco} onPress={onLogout} activeOpacity={OPACITE_PRESSION}>
          <Text style={s.decoTxt}>Se déconnecter</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.suppr} onPress={onDelete} activeOpacity={OPACITE_PRESSION}>
          <Text style={s.supprTxt}>Supprimer mon compte</Text>
        </TouchableOpacity>

        {/* §6 impose le disclaimer « à l'onboarding, AUX PARAMÈTRES, et sur chaque
            plan généré ». Cette feuille EST les paramètres : la règle est tenue
            ici, pas contournée en le retirant du Profil. */}
        <Text style={s.mention}>{DISCLAIMER}</Text>
        <Text style={s.mention}>{CIQUAL_ATTRIBUTION}</Text>
      </ScrollView>
    </View>
  );
}

function makeStyles(t: ThemePalette) {
  return StyleSheet.create({
    entete: { paddingHorizontal: Spacing.xxl, paddingBottom: Spacing.sm },
    contenu: { padding: Spacing.xxl, paddingTop: Spacing.md, gap: Spacing.lg },
    label: { ...Type.captionStrong, color: t.textSecondary, marginTop: Spacing.sm },
    aide: { ...Type.caption, color: t.textTertiary, lineHeight: 18, marginTop: -Spacing.sm },
    menu: { backgroundColor: t.card, borderRadius: Radius.card, paddingHorizontal: Spacing.lg },
    pastilles: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' },
    pastille: {
      width: CIBLE_TACTILE_MIN, height: CIBLE_TACTILE_MIN, borderRadius: Radius.pill,
      alignItems: 'center', justifyContent: 'center', borderWidth: Trait.controle,
    },
    deco: {
      alignItems: 'center', justifyContent: 'center', minHeight: CIBLE_TACTILE_MIN,
      backgroundColor: t.card, borderRadius: Radius.button, marginTop: Spacing.md,
    },
    decoTxt: { ...Type.label, color: t.text },
    suppr: { alignItems: 'center', justifyContent: 'center', minHeight: CIBLE_TACTILE_MIN },
    supprTxt: { ...Type.bodySmallStrong, color: t.danger },
    mention: { ...Type.micro, color: t.textQuaternary, lineHeight: 16, textAlign: 'center' },
  });
}
