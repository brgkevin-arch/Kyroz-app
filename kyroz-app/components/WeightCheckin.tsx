import React, { useMemo, useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, useWindowDimensions, Image, TouchableOpacity } from 'react-native';
import { Presse } from './Presse';
import { ConfirmationEnLigne } from './ConfirmationEnLigne';
import { Ionicons } from '@expo/vector-icons';
import { ThemePalette, Radius, Spacing, Type, Fond, Trait, Icone, CIBLE_TACTILE_MIN, OPACITE_PRESSION } from '../constants/theme';
import { SHEET_MAX_WIDTH } from '../constants/layout';
import { Field, PrimaryButton, SectionLabel, clavierScrollProps } from './ui';
import { WeightChart } from './WeightChart';
import { TrackVerdict, PhotoCompare } from './Transformation';
import { planFlags, trackingTarget } from '../lib/tdee';
import { useWeightLog } from '../hooks/useWeightLog';
import { useProfile } from '../hooks/useProfile';
import { pickProgressPhoto, cameraAvailable, PhotoSource, PHOTOS_NOTICE_LOCALE } from '../lib/photos';
import { todayStamp, localStamp, historiquePesees, HISTORIQUE_MAX, messageApresPesee, joursDeSaisie, indexAujourdhui } from '../lib/weight';
import { LocalIcon } from './Icons';
import { useRouter } from 'expo-router';
import { usePremium } from '../hooks/usePremium';
import { frnum } from '../lib/units';

interface Props {
  t: ThemePalette;
  onClose?: () => void;
  dragHandlers?: any;
  sheetScrollProps?: any;     // injecté par <Sheet> : lie le défilement à la fermeture
}

const frDate = (iso: string) =>
  new Date(iso + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });

// Carrousel du sélecteur de date.
// 🔴 LES JOURS À VENIR AVAIENT ÉTÉ RETIRÉS le 2026-08-14 (grief du fondateur : « la
// rangée de dates ») — trois cases grisées et INTOUCHABLES occupaient la moitié du
// sélecteur : on ne savait pas où taper, et la moitié du contrôle ne servait à rien.
// 🔴 ILS REVIENNENT LE 2026-09-20 (décision fondateur), et la différence est
// exactement ce que ce grief visait : **une case à venir ramène à aujourd'hui**. Elle
// n'est plus un mur, elle est un raccourci — et elle donne au carrousel la marge sans
// laquelle « aujourd'hui au milieu » n'existe pas.
// ⚠️ On ne PÈSE toujours pas demain : une date future n'est jamais saisissable.
// ⚠️ Et la rangée est REPLIÉE par défaut : la pesée du jour est le cas de très loin
// le plus courant, elle n'a pas à coûter un choix de date.
const CHIP_W = 46;
const CHIP_GAP = 6;

export function WeightCheckin({ t, onClose, dragHandlers, sheetScrollProps }: Props) {
  const s = useMemo(() => makeStyles(t), [t]);

  // ── Verrou Kyroz+ « suivi de transformation » (2026-08-25) ─────────────────
  //
  // 🔴 CE VERROU MANQUAIT, et c'est le trou que l'audit du paywall a trouvé :
  // `transformation` était dans `PREMIUM_FEATURES` depuis le 2026-07-27, mais
  // `can('transformation')` n'était appelé NULLE PART. Le jour où `PAYWALL_LAUNCH`
  // reçoit une date, l'objectif daté se serait verrouillé et les photos seraient
  // restées ouvertes — un paywall qui annonce deux briques et n'en garde qu'une.
  //
  // ⚠️ POURQUOI ÇA A ÉCHAPPÉ, et c'est réutilisable : le verrou de l'app est branché
  // sur `profil.tsx::openEditor`, qui garde les ÉDITEURS du Profil. Les photos n'en
  // sont pas un — elles vivent dans la feuille de PESÉE, atteignable depuis Profil
  // ET depuis Plan. Un point d'étranglement ne garde que ce qui passe par lui.
  //
  // ⚠️ CE QUI EST VERROUILLÉ, ET CE QUI NE L'EST JAMAIS. La pesée, la courbe, la
  // note et l'historique sont GRATUITS et le restent — sans pesée, le TDEE ne se
  // corrige jamais et les garde-fous de perte rapide n'ont plus de signal. Ce qui
  // se vend, c'est la TRANSFORMATION : prendre de nouvelles photos, la comparaison
  // avant/après, et la trajectoire posée sur la courbe.
  //
  // ⚠️ LA VIGNETTE DE L'HISTORIQUE RESTE, elle, et c'est délibéré : elle montre une
  // photo que la personne a DÉJÀ prise. La masquer lui retirerait sa propre donnée.
  // On vend la comparaison, jamais la possession.
  const router = useRouter();
  const premium = usePremium();
  const transfoOk = premium.can('transformation');
  // ⚠️ Fermer la feuille AVANT de pousser la route. Ce fichier a déjà payé deux fois
  // le fait qu'une modale ouverte depuis une modale ne tient nulle part sur iOS —
  // une route poussée sous une feuille encore montée est la même famille de panne.
  const ouvrirKyrozPlus = () => { onClose?.(); router.push('/kyroz-plus'); };
  const { entries, photos, last, logWeight, removeWeight, setPhoto } = useWeightLog();
  // Quelle pesée attend sa confirmation (par sa DATE, qui est sa clé).
  const [aConfirmer, setAConfirmer] = useState<string | null>(null);
  // Le choix de la source de photo, posé DANS la feuille pour la même raison.
  const [choixPhoto, setChoixPhoto] = useState(false);
  /** La rangée de dates est repliée : on pèse aujourd'hui, sauf exception. */
  const [choixDate, setChoixDate] = useState(false);
  /** Note et photo aussi : facultatives, elles ne doivent pas séparer le poids du bouton. */
  const [details, setDetails] = useState(false);

  // 🔴 LA CONFIRMATION VIT DANS LA FEUILLE, PLUS DANS UNE BOÎTE DE DIALOGUE
  // (2026-08-14). Cet écran vit dans une feuille, donc dans une `Modal` ; la
  // boîte de dialogue en monte une seconde, et iOS refuse de la présenter —
  // silencieusement. Mesuré au simulateur sur le même mécanisme.
  // ⚠️ Ce fichier avait DÉJÀ contourné un piège de la même famille une fois, avec
  // un `window.confirm` (la boîte grise du navigateur, hors charte). C'est la
  // deuxième fois que la confirmation d'une pesée tombe : le motif n'est pas la
  // malchance, c'est qu'une modale ouverte depuis une modale ne tient nulle part.
  // ⚠️ ET LE CHOIX DE LA PHOTO TOMBAIT PAREIL — trouvé en écrivant le garde-fou,
  // pas en regardant l'écran : `choosePhoto` ouvrait un `choose()`, donc une
  // troisième modale, depuis la même feuille. « Ajouter une photo de progression »
  // ne répondait donc pas non plus sur iPhone. C'est le compteur qui l'a désigné.
  const supprimerPesee = (d: string) => {
    setAConfirmer(null);
    removeWeight(d);
    setSaved(null);
  };
  const { profile, saveProfile } = useProfile();
  // ⚠️ `freq` / `setFreq` ont été RETIRÉS d'ici le 2026-09-20. Ils étaient MORTS depuis
  // le 2026-08-14, jour où le réglage de cadence a déménagé dans la roue dentée : plus
  // aucun rendu ne les lisait, mais `setFreq` savait encore écrire `weigh_in_frequency`
  // et ré-armer la notification. Un demi-écrivain sans écran, qui ignorait le JOUR de
  // pesée arrivé depuis — le prochain appelant aurait posé une cadence en effaçant
  // l'ancrage. Le réglage vit à UN endroit (`ReglagesSheet`), et un seul.
  const [date, setDate] = useState(todayStamp());
  const [val, setVal] = useState('');
  const [note, setNote] = useState('');
  const [pendingPhoto, setPendingPhoto] = useState<string | null>(null);
  // Confirmation structurée après enregistrement.
  const [saved, setSaved] = useState<{ updated: boolean; label: string; delta: number | null; date: string } | null>(null);

  // Objectif de SUIVI : la date que le moteur tiendra, pas celle qui a été saisie.
  // Coûte une simulation, d'où le mémo — elle ne bouge que si le profil bouge.
  // ⚠️ `suiviAffiche` (plus bas) et non `suiviTarget` dans le rendu : la TRAJECTOIRE
  // est vendue avec Kyroz+, la COURBE ne l'est jamais. Aujourd'hui le cas ne se
  // produit qu'après une résiliation — un compte verrouillé ne peut pas créer
  // d'objectif daté, donc `suiviTarget` y est déjà vide. C'est justement le cas
  // résiduel qu'un verrou branché sur le seul éditeur laissait passer.
  const suiviTarget = useMemo(
    () => (profile ? trackingTarget(profile, todayStamp()) : undefined),
    [profile?.goal_target?.target_date, profile?.goal_target?.target_weight_kg, profile?.weight_kg, profile?.target_kcal], // eslint-disable-line react-hooks/exhaustive-deps
  );
  /** La trajectoire réellement AFFICHÉE : rien sans Kyroz+. La courbe, elle, reste. */
  const suiviAffiche = transfoOk ? suiviTarget : undefined;

  // Message honnête : explique si (et pourquoi) le plan a été ajusté.
  //
  // 🔴 IL DISAIT « Le plan ne suit que ta pesée du jour », ET C'EST DEVENU FAUX LE
  // 2026-09-20. Le plan suit la pesée la plus RÉCENTE — donc une pesée rattrapée hier
  // ajuste bel et bien les macros. Laisser la phrase d'avant aurait produit le défaut
  // exactement inverse de celui qu'on vient de corriger : un écran qui annonce que
  // rien n'a bougé pendant que le moteur, lui, a changé de cible.
  // ⚠️ Le test porte sur « est-ce le point le plus récent ? », jamais sur la date du
  // jour : c'est la même règle que `recalageDuProfil`, et deux formulations de la même
  // règle finissent toujours par diverger.
  const planStatusMsg = (d: string) =>
    messageApresPesee(entries, d, profile?.macro_mode === 'manual', frDate);

  // CARROUSEL DE DATES, dans le SENS DU TEMPS (décision fondateur, 2026-09-20) :
  //   [le plus ancien … J-1] · [AUJOURD'HUI, au milieu] · [J+1 … J+7, grisés]
  // → glisser vers la droite = remonter le passé ; vers la gauche = la semaine à venir.
  //
  // 🔴 L'ordre d'avant partait d'aujourd'hui et remontait le temps vers la droite
  // (« Auj. 20 · Sam. 19 · Ven. 18 … »). Il se justifiait par le GESTE — « la case
  // qu'on veut est déjà sous le pouce » — et il se lisait à l'envers de la courbe
  // posée juste au-dessus.
  // ⚠️ **Ce que cet ordre payait ne disparaît pas pour autant** : aujourd'hui n'est
  // plus la première case, donc sans le centrage ci-dessous le cas le plus courant
  // (se peser aujourd'hui) deviendrait le plus difficile à atteindre. On aurait
  // déplacé le défaut au lieu de le corriger.
  // ⚠️ L'ORDRE ET LA PROFONDEUR vivent dans `joursDeSaisie` (testée) ; ce `useMemo` ne
  // fait plus que l'habillage — un sens de lecture ne se défend pas dans une boucle de
  // rendu, il s'y perd à la première refonte.
  const days = useMemo(() => {
    const aujourdhui = todayStamp();
    return joursDeSaisie(entries).map(({ iso, futur }) => {
      const d = new Date(Date.parse(iso + 'T00:00:00'));
      return {
        iso,
        futur,
        wd: d.toLocaleDateString('fr-FR', { weekday: 'short' }),
        num: d.getDate(),
        today: iso === aujourdhui,
      };
    });
  }, [entries]);

  /**
   * Le carrousel s'ouvre avec AUJOURD'HUI au milieu.
   *
   * ⚠️ Il faut DEUX mesures, et c'est pour ça que le calcul vit ici et pas dans un
   * effet : la largeur du CONTENU (`onContentSizeChange`) dit que les cases sont
   * posées, la largeur VISIBLE (`onLayout`) dit où est le milieu. Tant que l'une des
   * deux manque, la destination n'existe pas — un `scrollTo` à ce moment-là n'irait
   * nulle part, en silence.
   * ⚠️ `animated: false` : on POSE la vue au bon endroit, on ne joue pas un défilement
   * que personne n'a demandé.
   * ⚠️ Et une seule fois PAR OUVERTURE : le contenu se re-mesure à chaque pesée
   * enregistrée (la profondeur du passé suit l'historique), et re-centrer alors
   * arracherait l'écran des doigts de quelqu'un qui cherchait une date à gauche.
   * 🔴 D'où `basculerChoixDate`, et ce n'est pas de la coquetterie : le garde vit dans
   * un `useRef` du PARENT, qui survit au démontage de la rangée. Laissé tel quel, il
   * aurait été `true` pour toujours après la première ouverture — donc la DEUXIÈME
   * ouverture serait repartie tout à gauche, sur une date d'il y a trois mois. Un garde
   * « une seule fois » doit toujours dire *une seule fois par quoi*.
   */
  const stripRef = useRef<ScrollView>(null);
  const posePremiere = useRef(false);
  const largeurVisible = useRef(0);
  const centrerAujourdhui = () => {
    if (posePremiere.current || !largeurVisible.current) return;
    const i = indexAujourdhui(days.map(({ iso, futur }) => ({ iso, futur })));
    // Le centre de la case d'aujourd'hui, ramené au centre de la fenêtre. Le
    // `ScrollView` borne lui-même les valeurs hors plage, d'où le seul `max(0)`.
    const x = i * (CHIP_W + CHIP_GAP) + CHIP_W / 2 - largeurVisible.current / 2;
    posePremiere.current = true;
    stripRef.current?.scrollTo({ x: Math.max(x, 0), animated: false });
  };
  /** Ouvre (ou ferme) la rangée — et réarme le positionnement à chaque ouverture. */
  const basculerChoixDate = () => setChoixDate((ouverte) => {
    if (!ouverte) posePremiere.current = false;
    return !ouverte;
  });

  // Sélectionne une date et préremplit avec la pesée existante de ce jour, le cas échéant.
  const pickDate = (iso: string) => {
    setDate(iso);
    setSaved(null);
    const existing = entries.find((e) => e.date === iso);
    setVal(existing ? String(existing.weight_kg) : '');
    setNote(existing?.note ?? '');
  };

  const pick = async (src: PhotoSource) => {
    const uri = await pickProgressPhoto(src);
    if (uri) { setPendingPhoto(uri); setSaved(null); }
  };
  const choosePhoto = () => {
    // Sans appareil photo, il n'y a pas de choix à poser : on va droit au but.
    if (!cameraAvailable) { pick('library'); return; }
    setChoixPhoto(true);
  };
  const choisirSource = (src: PhotoSource) => { setChoixPhoto(false); pick(src); };

  // ⚠️ La largeur du graphe est celle de la FEUILLE, pas de l'écran : sur iPad
  // la feuille est bornée à SHEET_MAX_WIDTH, et lire l'écran (1024) faisait
  // déborder la courbe hors de son cadre. `useWindowDimensions` et non
  // `Dimensions.get` pour suivre la rotation.
  const { width: winW } = useWindowDimensions();
  const width = Math.min(winW, SHEET_MAX_WIDTH) - Spacing.xxl * 2;
  const wN = parseFloat(val.replace(',', '.'));
  const valid = wN >= 40 && wN <= 250;

  const save = async () => {
    if (!valid) return;
    const updated = entries.some((e) => e.date === date);
    // Delta vs le point chronologiquement précédent (correct même en backfill).
    const before = entries.filter((e) => e.date < date).sort((a, b) => a.date.localeCompare(b.date)).pop();
    const delta = before ? Math.round((wN - before.weight_kg) * 10) / 10 : null;

    await logWeight(wN, note, date);
    if (pendingPhoto) await setPhoto(date, pendingPhoto);

    // ⚠️ AUCUN ARTICLE DEVANT CETTE ÉTIQUETTE — la phrase disait « Point du
    // ${label} mis à jour », ce qui donnait « Point du aujourd'hui mis à jour ».
    // Même faute que celle déjà corrigée dans `OffPlanHistory`, et même remède :
    // un TIRET plutôt qu'un accord impossible. « du 5 août » et « d'aujourd'hui »
    // ne prennent pas le même article, donc aucune formulation collée ne peut
    // être juste pour les deux valeurs. La date se met devant, elle garde sa
    // majuscule, et la phrase la suit.
    const label = date === todayStamp() ? "Aujourd'hui" : frDate(date);
    setSaved({ updated, label, delta, date });
    setVal('');
    setNote('');
    setPendingPhoto(null);
  };

  // Les `HISTORIQUE_MAX` dernières pesées, écart compris. ⚠️ Le calcul de l'écart
  // est dans `lib/weight.ts`, PAS ici : tant qu'il vivait dans la boucle ci-dessous,
  // il lisait le voisin dans la liste déjà coupée et la dernière ligne montrait « — »
  // comme s'il n'y avait rien avant elle. Cf. `historiquePesees`.
  const reversed = historiquePesees(entries, HISTORIQUE_MAX);

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <View style={s.header} {...(dragHandlers ?? {})}>
        <Text style={s.title}>Suivi du poids</Text>
        {/* ⚠️ TROIS LIGNES D'EXPLICATION SONT DEVENUES UNE (2026-08-14). Elles
            poussaient la saisie ET la courbe vers le bas — deux des trois griefs
            du fondateur sur cette feuille. Ce qui a sauté n'est pas faux, c'est
            redondant : « Kyroz réajuste calories, macros et plan » est déjà dit
            par la confirmation, AU MOMENT où ça arrive. */}
        <Text style={s.sub}>Chaque pesée recale ton plan.</Text>
      </View>

      {/* Seul le ScrollView VERTICAL reçoit `sheetScrollProps` — la timeline
          horizontale juste en dessous ne doit pas fermer la feuille. */}
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false} {...clavierScrollProps} {...(sheetScrollProps ?? {})}>
        {/* ── LA DATE : une LIGNE, pas un sélecteur ─────────────────────────
            La rangée de sept cases était le premier grief du fondateur. Elle
            s'ouvre désormais à la demande : le jour même est le cas de très loin
            le plus courant, il ne doit rien coûter. Le rattrapage reste à un tap. */}
        <View style={s.dateLigne}>
          <Text style={s.dateTexte}>{date === todayStamp() ? "Aujourd'hui" : frDate(date)}</Text>
          <Presse onPress={basculerChoixDate} activeOpacity={OPACITE_PRESSION} style={s.dateBtn} accessibilityRole="button">
            <Text style={s.dateBtnTxt}>{choixDate ? 'Fermer' : 'Une autre date'}</Text>
            <Ionicons name={choixDate ? 'chevron-up' : 'chevron-down'} size={Icone.petite} color={t.textSecondary} />
          </Presse>
        </View>

        {choixDate && (
          <ScrollView
            ref={stripRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.dateRow}
            onLayout={(e) => { largeurVisible.current = e.nativeEvent.layout.width; centrerAujourdhui(); }}
            onContentSizeChange={centrerAujourdhui}
          >
            {days.map((d) => {
              const on = d.iso === date;
              const has = entries.some((e) => e.date === d.iso);
              return (
                <Presse
                  key={d.iso}
                  /* 🔴 UNE CASE À VENIR N'EST PAS MORTE — elle RAMÈNE À AUJOURD'HUI
                     (décision fondateur, 2026-09-20). C'est la différence avec les
                     cases grisées et intouchables retirées le 2026-08-14 sur son
                     propre grief (« on ne savait pas où taper ») : ici, taper dans le
                     futur fait exactement ce qu'on voulait faire — se peser au jour
                     le plus récent qui existe. On ne pèse toujours pas demain. */
                  onPress={() => { pickDate(d.futur ? todayStamp() : d.iso); setChoixDate(false); }}
                  activeOpacity={OPACITE_PRESSION}
                  accessibilityLabel={d.futur ? `${d.wd} ${d.num}, à venir : ramène à aujourd'hui` : undefined}
                  style={[
                    s.dateChip,
                    { backgroundColor: on ? t.accent : t.card, borderColor: on ? t.accent : t.line },
                    d.futur && s.dateChipFuture,
                  ]}
                >
                  <Text style={[s.dateWd, { color: on ? t.onAccent : t.textTertiary }]}>{d.today ? 'Auj.' : d.wd}</Text>
                  <Text style={[s.dateNum, { color: on ? t.onAccent : t.textSecondary }]}>{d.num}</Text>
                  {has && <View style={[s.dateDot, { backgroundColor: on ? t.onAccent : t.textTertiary }]} />}
                </Presse>
              );
            })}
          </ScrollView>
        )}

        <View style={s.inputRow}>
          <View style={{ flex: 1 }}>
            <Field
              t={t}
              label={date === todayStamp() ? "Ton poids aujourd'hui" : `Ton poids le ${frDate(date)}`}
              suffix="kg"
              keyboardType="decimal-pad"
              value={val}
              onChangeText={(x) => { setVal(x); setSaved(null); }}
              placeholder={last ? String(last.weight_kg) : '80'}
            />
          </View>
        </View>
        <PrimaryButton t={t} label="Enregistrer" onPress={save} disabled={!valid} />

        {saved && (
          <View style={s.confirm}>
            <Text style={s.confirmTitle}>
              {`✓ ${saved.label}, point ${saved.updated ? 'mis à jour' : 'enregistré'}`}
              {saved.delta != null ? `  ·  ${saved.delta > 0 ? '+' : ''}${frnum(saved.delta)} kg` : ''}
            </Text>
            <Text style={s.confirmSub}>{planStatusMsg(saved.date)}</Text>
          </View>
        )}

        <SectionLabel t={t}>Évolution</SectionLabel>
        {/* ⚠️ `trackingTarget`, PAS `profile.goal_target` : le couloir vise la date que
            le moteur tiendra, pas celle qui a été saisie. Sans ça, on affiche « en
            retard » à quelqu'un qui suit le plan à la lettre — mesuré, dès J+7. */}
        {/* ⚠️ Plus de trajectoire SUR la courbe depuis le 2026-09-20 : la zone est
            partie (décision fondateur), et avec elle l'étirement de l'axe du temps
            jusqu'à la date cible. Ce qui reste de l'objectif daté est le VERDICT,
            juste en dessous — et lui est toujours réservé à Kyroz+. */}
        <WeightChart t={t} entries={entries} width={width} />
        {profile && suiviAffiche && (
          // `paused` vient du PRODUCTEUR UNIQUE : quand le moteur a cessé de piloter
          // la trajectoire (insuffisance pondérale, poids cible à contresens), la
          // ligne idéale continue de descendre alors que le plan est au maintien —
          // sans ce drapeau on affichait « en retard » à quelqu'un à qui l'app venait
          // d'interdire tout déficit.
          <TrackVerdict
            t={t} goalTarget={suiviAffiche} currentWeightKg={profile.weight_kg}
            paused={planFlags(profile).some((f) => f === 'UNDERWEIGHT_NO_DEFICIT' || f === 'GOAL_DIRECTION_MISMATCH')}
          />
        )}

        {/* ── LE FACULTATIF, REPLIÉ ────────────────────────────────────────
            Note et photo séparaient le poids de son bouton et poussaient la courbe
            hors de l'écran — deux des trois griefs du fondateur. Elles ne
            disparaissent pas : elles cessent d'être sur le chemin de tout le monde
            pour un usage qui n'est celui de personne tous les jours. */}
        <Presse onPress={() => setDetails((v) => !v)} activeOpacity={OPACITE_PRESSION} style={s.detailsBtn} accessibilityRole="button">
          <Ionicons name={details ? 'chevron-up' : 'add'} size={Icone.petite} color={t.textSecondary} />
          {/* ⚠️ Le libellé suit le VERROU : promettre « ou une photo » à quelqu'un qui
              ne peut pas en ajouter est exactement le mensonge que la charte interdit. */}
          <Text style={s.detailsTxt}>{details ? 'Masquer' : (transfoOk ? 'Ajouter une note ou une photo' : 'Ajouter une note')}</Text>
        </Presse>

        {details && (
          <>
        <Field
          t={t}
          label="Note (optionnel)"
          value={note}
          onChangeText={(x) => { setNote(x); setSaved(null); }}
          placeholder="ex. voyage, malade, grosse semaine d'entraînement…"
          autoCapitalize="sentences"
        />

        {/* Photo de progression (optionnelle, reste sur l'appareil) */}
        {!transfoOk ? (
          <Presse onPress={ouvrirKyrozPlus} style={s.photoBtn} activeOpacity={OPACITE_PRESSION} accessibilityRole="button">
            <Ionicons name="camera-outline" size={Icone.standard} color={t.textSecondary} />
            <Text style={[s.photoBtnTxt, { color: t.textSecondary }]}>Les photos de progression font partie de Kyroz+</Text>
          </Presse>
        ) : pendingPhoto ? (
          <View style={s.photoPreview}>
            <Image source={{ uri: pendingPhoto }} style={s.photoBig} />
            {/* La ZONE fait 44, la PASTILLE reste à 26 : cf. `photoRemove`. */}
            <Presse onPress={() => setPendingPhoto(null)} style={s.photoRemove}>
              <View style={s.photoRemovePastille}>
                <Ionicons name="close-circle" size={Icone.nav} color={t.text} />
              </View>
            </Presse>
          </View>
        ) : (
          <Presse onPress={choosePhoto} style={s.photoBtn} activeOpacity={OPACITE_PRESSION}>
            <Ionicons name="camera-outline" size={Icone.standard} color={t.text} />
            <Text style={s.photoBtnTxt}>Ajouter une photo de progression</Text>
          </Presse>
        )}
        {choixPhoto && (
          <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
            <Presse style={[s.photoBtn, { flex: 1 }]} onPress={() => choisirSource('camera')} activeOpacity={OPACITE_PRESSION}>
              <Text style={s.photoBtnTxt}>Prendre une photo</Text>
            </Presse>
            <Presse style={[s.photoBtn, { flex: 1 }]} onPress={() => choisirSource('library')} activeOpacity={OPACITE_PRESSION}>
              <Text style={s.photoBtnTxt}>Ma galerie</Text>
            </Presse>
          </View>
        )}
        {transfoOk && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
            <LocalIcon color={t.textTertiary} size={Icone.petite} />
            {/* 🔴 « restent sur ton téléphone » ne dit PAS « tu les perdras en changeant
                de téléphone » (audit paywall, 2026-08-25) : vendre une fonctionnalité
                sans annoncer sa fragilité est un mensonge par omission. */}
            <Text style={[s.photoHint, { flex: 1 }]}>{PHOTOS_NOTICE_LOCALE}</Text>
          </View>
        )}
          </>
        )}

        {/* Transformation : la preuve visuelle (photos LOCAL-ONLY, cf. lib/photos.ts) */}
        {Object.keys(photos).filter((d) => photos[d]).length >= 2 && (
          <>
            <SectionLabel t={t}>Transformation</SectionLabel>
            {transfoOk ? (
              <PhotoCompare t={t} photos={photos} entries={entries} />
            ) : (
              // Cas de l'ancien abonné : ses photos sont toujours sur son téléphone et
              // toujours visibles une par une dans l'historique. Seule la COMPARAISON
              // s'en va. On le DIT, plutôt que de faire disparaître un bloc sans un mot.
              <Presse onPress={ouvrirKyrozPlus} style={s.photoBtn} activeOpacity={OPACITE_PRESSION} accessibilityRole="button">
                <Text style={[s.photoBtnTxt, { color: t.textSecondary, flex: 1, textAlign: 'center' }]}>
                  Tes photos sont toujours sur ton téléphone. La comparaison avant/après fait partie de Kyroz+.
                </Text>
              </Presse>
            )}
          </>
        )}

        {/* 🔴 « RAPPEL DE PESÉE » EST PARTI DANS LA ROUE DENTÉE le 2026-08-14
            (décision fondateur). C'est un réglage de NOTIFICATION : il vivait au
            milieu d'une saisie, entre une courbe et un historique, et le fondateur
            ne savait même pas qu'il était là. La règle de rangement du Profil
            s'applique mot pour mot (CLAUDE.md §8) : *ce réglage change-t-il ce que
            Kyroz me SERT ?* Non — il change quand Kyroz me PARLE. Il rejoint donc
            les notifications, avec le rappel quotidien. */}

        {reversed.length > 0 && (
          <>
            <SectionLabel t={t}>Historique</SectionLabel>
            <View style={s.histCard}>
              {reversed.map((e, i) => {
                const d = e.delta;
                return (
                  <View key={e.date} style={[s.histItem, i < reversed.length - 1 && s.histDivider]}>
                    <View style={s.histRow}>
                      <Text style={s.histDate}>{frDate(e.date)}</Text>
                      <Text style={s.histW}>{frnum(e.weight_kg)} kg</Text>
                      <Text style={[s.histD, { color: d == null ? t.textTertiary : d <= 0 ? t.success : t.warning }]}>
                        {d == null ? '—' : `${d > 0 ? '+' : ''}${frnum(d)}`}
                      </Text>
                      <Presse onPress={() => setAConfirmer(e.date)} hitSlop={8} style={s.histDel}>
                        <Ionicons name="close" size={Icone.petite} color={t.textTertiary} />
                      </Presse>
                    </View>
                    {aConfirmer === e.date && (
                      <ConfirmationEnLigne
                        t={t}
                        question={`Supprimer cette pesée ? ${frDate(e.date)} · ${frnum(e.weight_kg)} kg. Tes cibles se recalculent sur les pesées restantes.`}
                        confirmLabel="Supprimer"
                        onCancel={() => setAConfirmer(null)}
                        onConfirm={() => supprimerPesee(e.date)}
                      />
                    )}
                    {e.note ? <Text style={s.histNote}>{e.note}</Text> : null}
                    {photos[e.date] ? (
                      <Image source={{ uri: photos[e.date] }} style={s.histPhoto} />
                    ) : null}
                  </View>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function makeStyles(t: ThemePalette) {
  return StyleSheet.create({
    header: { paddingHorizontal: Spacing.xxl, paddingBottom: Spacing.sm, gap: Spacing.sm },
    title: { color: t.text, ...Type.h2 },
    sub: { ...Type.bodySmall, color: t.textSecondary, lineHeight: 20 },
    content: { padding: Spacing.xxl, paddingTop: Spacing.md, gap: Spacing.lg, paddingBottom: Fond.feuille },
    dateRow: { gap: CHIP_GAP, paddingVertical: Spacing.xs },
    dateLigne: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, minHeight: CIBLE_TACTILE_MIN },
    dateTexte: { ...Type.bodyStrong, color: t.text, flex: 1 },
    dateBtn: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, minHeight: CIBLE_TACTILE_MIN, justifyContent: 'center' },
    dateBtnTxt: { ...Type.bodySmallStrong, color: t.textSecondary },
    detailsBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, minHeight: CIBLE_TACTILE_MIN, borderRadius: Radius.button, backgroundColor: t.fill },
    detailsTxt: { ...Type.bodySmallStrong, color: t.textSecondary },
    dateChip: { width: CHIP_W, height: 56, borderRadius: Radius.button, borderWidth: Trait.fin, alignItems: 'center', justifyContent: 'center', gap: Spacing.xs },
    dateChipFuture: { backgroundColor: t.fill, borderColor: t.line, opacity: 0.5 },
    dateWd: { ...Type.microStrong, textTransform: 'capitalize' },
    dateNum: { ...Type.bodyStrong },
    dateDot: { width: 4, height: 4, borderRadius: 2, position: 'absolute', bottom: 7 },
    inputRow: { flexDirection: 'row', gap: Spacing.md },
    confirm: { backgroundColor: t.fill, borderRadius: Radius.card, padding: Spacing.lg, gap: Spacing.xs },
    confirmTitle: { ...Type.bodyStrong, color: t.text },
    confirmSub: { ...Type.caption, color: t.textSecondary },
    histCard: { backgroundColor: t.card, borderRadius: Radius.card, borderWidth: Trait.fin, borderColor: t.line, paddingHorizontal: Spacing.lg },
    histItem: { paddingVertical: Spacing.md },
    histRow: { flexDirection: 'row', alignItems: 'center' },
    histDivider: { borderBottomWidth: Trait.fin, borderBottomColor: t.line },
    histDate: { ...Type.bodySmall, flex: 1, color: t.textSecondary },
    histW: { ...Type.bodyStrong, color: t.text, width: 80, textAlign: 'right' },
    histD: { ...Type.bodySmallStrong, width: 56, textAlign: 'right' },
    histDel: { marginLeft: Spacing.md, padding: Spacing.xs },
    histNote: { ...Type.caption, color: t.textSecondary, lineHeight: 18, marginTop: Spacing.xs, fontStyle: 'italic' },
    histPhoto: { width: 64, height: 84, borderRadius: Radius.sm, marginTop: Spacing.sm, backgroundColor: t.fill },
    photoBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, paddingVertical: Spacing.lg, borderRadius: Radius.button, borderWidth: Trait.fin, borderColor: t.line, borderStyle: 'dashed' },
    photoBtnTxt: { ...Type.bodyStrong, color: t.text },
    photoPreview: { alignSelf: 'flex-start' },
    photoBig: { width: 150, height: 200, borderRadius: Radius.card, backgroundColor: t.fill },
    // 🔴 LA ZONE TACTILE FAIT 44, LA PASTILLE VISIBLE EN FAIT 26 (2026-08-26).
    // Les deux étaient le même carré : 26 pt à viser, rattrapés par un `hitSlop`
    // de 8 — donc 42, toujours sous la cible, et surtout un bouton qui a l'air
    // petit reste difficile à viser même quand sa zone est plus large.
    // ⚠️ Le contenu est aligné en HAUT À DROITE, et l'ancrage `-8 / -8` ne bouge
    // pas : la pastille occupe donc exactement les mêmes pixels qu'avant, et les
    // 18 pt gagnés s'étendent vers l'INTÉRIEUR de la photo — pas au-delà du
    // parent, où un enfant hors cadre cesse d'être touchable sur Android.
    photoRemove: {
      position: 'absolute', top: -8, right: -8,
      width: CIBLE_TACTILE_MIN, height: CIBLE_TACTILE_MIN,
      alignItems: 'flex-end', justifyContent: 'flex-start',
    },
    // Pastille de fond DERRIÈRE l'icône « close-circle » de 26 : sa taille est
    // donc dictée par l'icône, et son rayon en est la moitié. Elle valait 14 pour
    // 26 de large — donc pas tout à fait un disque, ce qui se voyait au liseré.
    photoRemovePastille: { backgroundColor: t.bg, width: 26, height: 26, borderRadius: 13 },
    photoHint: { ...Type.caption, color: t.textTertiary, lineHeight: 16, marginTop: -Spacing.xs },
  });
}
