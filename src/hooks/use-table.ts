import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";


export function useTable<T>(table: string) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    supabase
      .from(table)
      .select("*")
      .order("created_at", { ascending: true })
      // An unreachable server can hang instead of failing: give up after 10 s and show the error
      .abortSignal(AbortSignal.timeout(10_000))
      .then(
        ({ data: rows, error: err }) => {
          if (!alive) return;
          setError(!!err);
          setData((rows as T[] | null) ?? []);
          setLoading(false);
        },
        // Network failures can reject instead of returning { error }
        () => {
          if (!alive) return;
          setError(true);
          setLoading(false);
        }
      );
    return () => {
      alive = false;
    };
  }, [table, attempt]);

  const retry = useCallback(() => {
    setLoading(true);
    setError(false);
    setAttempt((n) => n + 1);
  }, []);

  return { data, loading, error, retry };
}
