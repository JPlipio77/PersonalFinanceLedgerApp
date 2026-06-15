import { useState, useEffect } from 'react';
import * as categoriesApi from '../api/categoriesApi';

export function useCategories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = async () => {
    try {
      setLoading(true);
      const data = await categoriesApi.getCategories();
      setCategories(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const create = async (data) => {
    const cat = await categoriesApi.createCategory(data);
    setCategories((prev) => [...prev, cat]);
    return cat;
  };

  const update = async (id, data) => {
    const cat = await categoriesApi.updateCategory(id, data);
    setCategories((prev) => prev.map((c) => (c._id === id ? cat : c)));
    return cat;
  };

  const remove = async (id) => {
    await categoriesApi.deleteCategory(id);
    setCategories((prev) => prev.filter((c) => c._id !== id));
  };

  return { categories, loading, error, create, update, remove, reload: load };
}
