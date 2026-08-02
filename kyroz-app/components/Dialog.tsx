import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useTheme, ThemePalette, Radius } from '../constants/theme';
import { ActionSheet } from './ActionSheet';

// ── Boîtes de dialogue — POURQUOI CE FICHIER EXISTE ─────────────────────────
//
// `Alert.alert` de React Native est une FONCTION VIDE sur react-native-web :
//
//     class Alert { static alert() {} }      ← node_modules/react-native-web
//
// Sur le web — c'est-à-dire sur la version que les gens utilisent aujourd'hui —
// chaque appel ne faisait donc STRICTEMENT RIEN, sans erreur, sans trace. Dix
// interactions étaient mortes, et pas des cosmétiques :
//   · « Régénérer mon plan » (bouton inerte — remonté par le fondateur) ;
//   · l'onboarding qui REFUSE un profil inéligible (mineur, IMC de départ) : le
//     bouton final ne répondait plus, sans le moindre message ;
//   · la suppression d'une pesée, l'export RGPD, l'erreur de validation d'un
//     éditeur…
// `WeightCheckin` s'en était déjà sorti seul avec un `window.confirm`, ce qui
// prouve que le piège avait été rencontré une fois — mais jamais généralisé.
//
// Ce module remplace `Alert` PARTOUT, y compris sur natif : un seul chemin de
// code, une seule apparence, et rien qui dépende d'une implémentation de
// plateforme. Il s'appuie sur `ActionSheet` (déjà thémée, déjà bornée en
// largeur sur tablette), et rend une PROMESSE — donc un appelant écrit
// `if (await confirm(...))` au lieu d'éparpiller sa logique dans des callbacks.
//
// ⚠️ Règle : ne plus jamais importer `Alert` de react-native dans ce projet.

type Btn<T> = { label: string; value: T; destructive?: boolean; primary?: boolean };

interface Request {
  title: string;
  message?: string;
  buttons: Btn<unknown>[];
  /** Valeur rendue quand on ferme sans choisir (fond, glissement, retour). */
  dismissValue: unknown;
  resolve: (v: unknown) => void;
}

interface DialogValue {
  /** Oui / non. Rend `false` si l'utilisateur ferme sans répondre. */
  confirm: (o: {
    title: string; message?: string;
    confirmLabel?: string; cancelLabel?: string; destructive?: boolean;
  }) => Promise<boolean>;
  /** Information simple. La promesse se résout à la fermeture. */
  notify: (o: { title: string; message?: string; okLabel?: string }) => Promise<void>;
  /** Choix multiple. Rend `null` si l'utilisateur ferme sans choisir. */
  choose: <T>(o: {
    title: string; message?: string;
    options: { label: string; value: T; destructive?: boolean }[];
    cancelLabel?: string;
  }) => Promise<T | null>;
}

const DialogContext = createContext<DialogValue | null>(null);

export function DialogProvider({ children }: { children: React.ReactNode }) {
  const t = useTheme();
  const [req, setReq] = useState<Request | null>(null);
  // La demande en cours vit AUSSI dans une ref : la fermeture peut être
  // déclenchée par un geste (glissement) après que l'état a été vidé, et une
  // promesse jamais résolue laisserait l'appelant bloqué pour de bon.
  const pending = useRef<Request | null>(null);

  const open = useCallback((r: Omit<Request, 'resolve'>) => new Promise<unknown>((resolve) => {
    // Une demande déjà à l'écran est résolue à sa valeur de fermeture plutôt
    // que d'être écrasée en silence (sinon : promesse orpheline).
    if (pending.current) pending.current.resolve(pending.current.dismissValue);
    const full: Request = { ...r, resolve };
    pending.current = full;
    setReq(full);
  }), []);

  const settle = useCallback((v: unknown) => {
    const cur = pending.current;
    pending.current = null;
    setReq(null);
    cur?.resolve(v);
  }, []);

  const value: DialogValue = {
    confirm: (o) => open({
      title: o.title,
      message: o.message,
      dismissValue: false,
      buttons: [
        { label: o.confirmLabel ?? 'Confirmer', value: true, destructive: o.destructive, primary: !o.destructive },
        { label: o.cancelLabel ?? 'Annuler', value: false },
      ],
    }).then((v) => v === true),

    notify: (o) => open({
      title: o.title,
      message: o.message,
      dismissValue: undefined,
      buttons: [{ label: o.okLabel ?? 'OK', value: undefined, primary: true }],
    }).then(() => undefined),

    choose: <T,>(o: {
      title: string; message?: string;
      options: { label: string; value: T; destructive?: boolean }[];
      cancelLabel?: string;
    }) => open({
      title: o.title,
      message: o.message,
      dismissValue: null,
      buttons: [
        ...o.options.map((op, i) => ({ label: op.label, value: op.value, destructive: op.destructive, primary: i === 0 })),
        { label: o.cancelLabel ?? 'Annuler', value: null },
      ] as Btn<unknown>[],
    }).then((v) => (v ?? null) as T | null),
  };

  return (
    <DialogContext.Provider value={value}>
      {children}
      <ActionSheet visible={req !== null} onClose={() => settle(req?.dismissValue ?? null)}>
        <Text style={{ color: t.text, fontSize: 20, fontWeight: '800', letterSpacing: -0.4 }}>
          {req?.title}
        </Text>
        {!!req?.message && (
          <Text style={{ color: t.textSecondary, fontSize: 14, lineHeight: 20, marginTop: 6 }}>
            {req.message}
          </Text>
        )}
        <View style={{ gap: 8, marginTop: 18 }}>
          {req?.buttons.map((b, i) => <DialogButton key={i} t={t} b={b} onPress={() => settle(b.value)} />)}
        </View>
      </ActionSheet>
    </DialogContext.Provider>
  );
}

function DialogButton({ t, b, onPress }: { t: ThemePalette; b: Btn<unknown>; onPress: () => void }) {
  const bg = b.destructive ? t.danger : b.primary ? t.accent : t.fill;
  const fg = b.destructive ? t.onAccent : b.primary ? t.onAccent : t.text;
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={{
        backgroundColor: bg,
        borderRadius: Radius.md,
        paddingVertical: 15,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: b.destructive || b.primary ? 'transparent' : t.line,
      }}
    >
      <Text style={{ color: fg, fontSize: 16, fontWeight: '700' }}>{b.label}</Text>
    </TouchableOpacity>
  );
}

export function useDialog(): DialogValue {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error('useDialog doit être utilisé dans un <DialogProvider>');
  return ctx;
}
