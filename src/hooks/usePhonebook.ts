import { useState, useEffect, useCallback } from "react";
import {
  readTextFile,
  writeTextFile,
  mkdir,
  exists,
} from "@tauri-apps/plugin-fs";
import { appDataDir } from "@tauri-apps/api/path";
import { BbsEntry } from "../types";
import { DEFAULT_PHONEBOOK } from "../phonebook-data";

const CUSTOM_FILE = "custom-phonebook.json";
const FAVORITES_FILE = "favorites.json";

export function usePhonebook() {
  const [customEntries, setCustomEntries] = useState<BbsEntry[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);

  // Load custom entries + favorites from disk
  useEffect(() => {
    (async () => {
      try {
        const dir = await appDataDir();
        const dirExists = await exists(dir);
        if (!dirExists) {
          await mkdir(dir, { recursive: true });
        }

        const customPath = `${dir}${CUSTOM_FILE}`;
        if (await exists(customPath)) {
          const content = await readTextFile(customPath);
          const parsed = JSON.parse(content);
          if (Array.isArray(parsed)) {
            setCustomEntries(parsed);
          }
        }

        const favsPath = `${dir}${FAVORITES_FILE}`;
        if (await exists(favsPath)) {
          const content = await readTextFile(favsPath);
          const parsed = JSON.parse(content);
          if (Array.isArray(parsed)) {
            setFavorites(new Set(parsed));
          }
        }
      } catch (e) {
        console.error("Failed to load phonebook data:", e);
      }
      setLoaded(true);
    })();
  }, []);

  const saveCustom = useCallback(async (entries: BbsEntry[]) => {
    try {
      const dir = await appDataDir();
      await mkdir(dir, { recursive: true });
      await writeTextFile(
        `${dir}${CUSTOM_FILE}`,
        JSON.stringify(entries, null, 2)
      );
    } catch (e) {
      console.error("Failed to save custom phonebook:", e);
    }
  }, []);

  const saveFavorites = useCallback(async (favs: Set<string>) => {
    try {
      const dir = await appDataDir();
      await mkdir(dir, { recursive: true });
      await writeTextFile(
        `${dir}${FAVORITES_FILE}`,
        JSON.stringify([...favs])
      );
    } catch (e) {
      console.error("Failed to save favorites:", e);
    }
  }, []);

  const toggleFavorite = useCallback(
    async (id: string) => {
      const updated = new Set(favorites);
      if (updated.has(id)) {
        updated.delete(id);
      } else {
        updated.add(id);
      }
      setFavorites(updated);
      await saveFavorites(updated);
    },
    [favorites, saveFavorites]
  );

  const addEntry = useCallback(
    async (entry: Omit<BbsEntry, "id" | "isCustom">) => {
      const newEntry: BbsEntry = {
        ...entry,
        id: `custom-${Date.now()}`,
        isCustom: true,
        category: "Custom",
      };
      const updated = [...customEntries, newEntry];
      setCustomEntries(updated);
      await saveCustom(updated);
    },
    [customEntries, saveCustom]
  );

  const removeEntry = useCallback(
    async (id: string) => {
      const updated = customEntries.filter((e) => e.id !== id);
      setCustomEntries(updated);
      await saveCustom(updated);
      // Also remove from favorites if present
      if (favorites.has(id)) {
        const updatedFavs = new Set(favorites);
        updatedFavs.delete(id);
        setFavorites(updatedFavs);
        await saveFavorites(updatedFavs);
      }
    },
    [customEntries, saveCustom, favorites, saveFavorites]
  );

  const allEntries = [...DEFAULT_PHONEBOOK, ...customEntries];

  // Split into favorites and categorized
  const favoriteEntries = allEntries.filter((e) => favorites.has(e.id));
  const nonFavorites = allEntries.filter((e) => !favorites.has(e.id));

  const categories = nonFavorites.reduce<Record<string, BbsEntry[]>>(
    (acc, entry) => {
      const cat = entry.category || "Other";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(entry);
      return acc;
    },
    {}
  );

  return {
    allEntries,
    favoriteEntries,
    categories,
    favorites,
    toggleFavorite,
    addEntry,
    removeEntry,
    loaded,
  };
}
