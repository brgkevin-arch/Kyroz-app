import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Recipe } from '../lib/types';
import { RECIPES_PLACEHOLDER, setRecipeOverrides } from '../lib/recipes';
import { pushRecipeOverrides } from '../lib/sync';

// Recettes personnalisées par l'utilisateur. Deux rôles :
//  • hydrate le registre module (`setRecipeOverrides`) au démarrage → le MOTEUR
//    (fonction pure, hors React) voit les overrides à la génération ;
//  • expose la liste fusionnée + saveOverride/resetOverride en CONTEXTE → les
//    écrans (Recettes, Plan) se re-rendent quand une recette change.

const KEY = '@kyroz:recipeOverrides';
type Overrides = Record<string, Recipe>;

interface Ctx {
  overrides: Overrides;
  recipes: Recipe[];                 // base ⊕ overrides
  ready: boolean;
  saveOverride: (recipe: Recipe) => void;
  resetOverride: (id: string) => void;
  isCustom: (id: string) => boolean;
}

const RecipeCtx = createContext<Ctx | null>(null);

export function RecipeOverridesProvider({ children }: { children: React.ReactNode }) {
  const [overrides, setOverrides] = useState<Overrides>({});
  const [ready, setReady] = useState(false);
  const ref = useRef<Overrides>({});

  useEffect(() => {
    AsyncStorage.getItem(KEY).then((raw) => {
      const map: Overrides = raw ? JSON.parse(raw) : {};
      ref.current = map;
      setRecipeOverrides(map); // hydrate le registre lu par le moteur
      setOverrides(map);
      setReady(true);
    });
  }, []);

  const persist = useCallback(async (map: Overrides) => {
    ref.current = map;
    setRecipeOverrides(map);
    setOverrides(map);
    await AsyncStorage.setItem(KEY, JSON.stringify(map));
    pushRecipeOverrides(map); // miroir cloud (best-effort)
  }, []);

  const saveOverride = useCallback((recipe: Recipe) => {
    persist({ ...ref.current, [recipe.id]: recipe });
  }, [persist]);

  const resetOverride = useCallback((id: string) => {
    const next = { ...ref.current };
    delete next[id];
    persist(next);
  }, [persist]);

  const recipes = useMemo(
    () => RECIPES_PLACEHOLDER.map((r) => overrides[r.id] ?? r),
    [overrides],
  );

  const value = useMemo<Ctx>(() => ({
    overrides,
    recipes,
    ready,
    saveOverride,
    resetOverride,
    isCustom: (id: string) => Object.prototype.hasOwnProperty.call(overrides, id),
  }), [overrides, recipes, ready, saveOverride, resetOverride]);

  return <RecipeCtx.Provider value={value}>{children}</RecipeCtx.Provider>;
}

export function useRecipeOverrides(): Ctx {
  const ctx = useContext(RecipeCtx);
  if (!ctx) throw new Error('useRecipeOverrides doit être utilisé dans RecipeOverridesProvider');
  return ctx;
}
