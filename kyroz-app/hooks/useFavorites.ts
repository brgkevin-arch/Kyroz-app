import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { pushFavorites } from '../lib/sync';

const FAV_KEY = '@kyroz:favorites';

export function useFavorites() {
  const [ids, setIds] = useState<string[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(FAV_KEY).then((raw) => {
      if (raw) setIds(JSON.parse(raw));
    });
  }, []);

  const toggle = useCallback(async (recipeId: string) => {
    setIds((prev) => {
      const next = prev.includes(recipeId)
        ? prev.filter((id) => id !== recipeId)
        : [...prev, recipeId];
      AsyncStorage.setItem(FAV_KEY, JSON.stringify(next));
      pushFavorites(next); // miroir cloud (best-effort)
      return next;
    });
  }, []);

  const isFavorite = useCallback((recipeId: string) => ids.includes(recipeId), [ids]);

  return { favorites: ids, toggle, isFavorite };
}
