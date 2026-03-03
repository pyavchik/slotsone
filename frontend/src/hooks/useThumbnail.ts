import { useState, useEffect } from 'react';
import type { GameItem } from '@/data/catalog';
import { generateThumbnail } from '@/api';
import { useGameStore } from '@/store';

const cache = new Map<string, string>();
const pending = new Map<string, Promise<string | null>>();

export function useThumbnail(game: GameItem): { url: string | null; loading: boolean } {
  const token = useGameStore((s) => s.token);
  const hasStatic = Boolean(game.thumbnail);

  const [url, setUrl] = useState<string | null>(game.thumbnail ?? cache.get(game.slug) ?? null);
  const [loading, setLoading] = useState(!hasStatic && !cache.has(game.slug));

  useEffect(() => {
    // Static thumbnails — nothing to fetch
    if (hasStatic) return;

    if (cache.has(game.slug)) {
      setUrl(cache.get(game.slug)!);
      setLoading(false);
      return;
    }

    if (!token) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    const existing = pending.get(game.slug);
    const promise =
      existing ??
      generateThumbnail(token, {
        title: game.title,
        category: game.category,
        provider: game.provider,
      })
        .then((result) => {
          if (result.imageUrl) cache.set(game.slug, result.imageUrl);
          return result.imageUrl;
        })
        .catch(() => null)
        .finally(() => pending.delete(game.slug));

    if (!existing) pending.set(game.slug, promise);

    promise.then((imageUrl) => {
      if (cancelled) return;
      if (imageUrl) {
        cache.set(game.slug, imageUrl);
        setUrl(imageUrl);
      }
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [game.slug, game.title, game.category, game.provider, token, hasStatic]);

  return { url, loading };
}
