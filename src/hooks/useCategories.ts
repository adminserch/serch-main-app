import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export interface Category {
  id: string;
  name: string;
}

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCategories() {
      try {
        const { data, error: categoriesError } = await supabase
          .from('categories')
          .select('id, name')
          .eq('is_active', true);
        if (!categoriesError && data) {
          setCategories(data);
        }
      } catch {
        // fail silently
      } finally {
        setLoading(false);
      }
    }
    loadCategories();
  }, []);

  return { categories, loading };
}
