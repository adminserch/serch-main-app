'use strict';
'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useToast } from '@/components/Providers';
import { Plus, Trash2, Edit2, FolderHeart, X, Check, Search, Hash } from 'lucide-react';

interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  is_active: boolean;
  created_at: string;
}

export default function CategoriesDashboard() {
  const { getToken } = useAuth();
  const { toast } = useToast();

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Form states
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [icon, setIcon] = useState('sparkles');
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  async function fetchCategories() {
    try {
      const response = await fetch('/api/categories');
      if (!response.ok) {
        throw new Error('Failed to load categories');
      }
      const data = await response.json();
      if (data.success) {
        setCategories(data.categories || []);
      }
    } catch (err: any) {
      console.error(err);
      toast('Could not load categories.', 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchCategories();
  }, []);

  // Auto-generate slug from name
  useEffect(() => {
    if (!editingCategory) {
      setSlug(name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
    }
  }, [name, editingCategory]);

  const openAddMode = () => {
    setEditingCategory(null);
    setName('');
    setSlug('');
    setIcon('sparkles');
    setIsActive(true);
    setShowForm(true);
  };

  const openEditMode = (category: Category) => {
    setEditingCategory(category);
    setName(category.name);
    setSlug(category.slug);
    setIcon(category.icon || 'sparkles');
    setIsActive(category.is_active);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !slug) return;

    setSubmitting(true);
    try {
      const method = editingCategory ? 'PUT' : 'POST';
      const bodyPayload = editingCategory 
        ? { id: editingCategory.id, name, slug, icon, is_active: isActive }
        : { name, slug, icon, is_active: isActive };

      const response = await fetch('/api/categories', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save category');
      }

      toast(editingCategory ? 'Category updated' : 'Category created', 'success');
      setShowForm(false);
      fetchCategories();
    } catch (err: any) {
      toast(err.message || 'Error saving category.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this category? This might impact services using it.')) return;

    try {
      const response = await fetch(`/api/categories?id=${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete category');
      }

      toast('Category deleted successfully', 'success');
      fetchCategories();
    } catch (err: any) {
      toast(err.message || 'Error deleting category.', 'error');
    }
  };

  const filteredCategories = categories.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.slug.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8 h-[50vh]">
        <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center border-b border-champagne/40 pb-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-espresso tracking-tight">Categories Directory</h1>
          <p className="text-stone-500 text-xs font-sans mt-0.5">Manage and organize platform service categories.</p>
        </div>
        <button
          onClick={openAddMode}
          className="bg-primary hover:bg-slate-800 text-white font-semibold text-xs px-4 py-2.5 rounded-xl transition-all shadow-sm flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" /> Add Category
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Columns: Categories List & Search */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="relative">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-stone-400" />
            <input
              type="text"
              placeholder="Search categories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-champagne rounded-xl text-xs focus:outline-none focus:border-accent"
            />
          </div>

          {filteredCategories.length === 0 ? (
            <div className="bg-white border border-champagne rounded-2xl p-12 text-center shadow-sm">
              <FolderHeart className="w-10 h-10 text-stone-300 mx-auto mb-3" />
              <p className="text-stone-400 text-sm font-sans">No categories found matching your query.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredCategories.map((c) => (
                <div 
                  key={c.id} 
                  className="bg-white border border-champagne/60 rounded-xl p-5 shadow-sm flex flex-col justify-between gap-4 hover:border-accent/40 transition-all"
                >
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-stone-50 border border-champagne/50 flex items-center justify-center text-espresso">
                        <Hash className="w-4 h-4 text-accent" />
                      </div>
                      <div>
                        <h3 className="font-sans font-bold text-espresso text-sm leading-tight">{c.name}</h3>
                        <span className="text-[10px] text-stone-400 font-mono">/{c.slug}</span>
                      </div>
                    </div>
                    <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                      c.is_active
                        ? 'bg-purple-50 border-purple-200 text-purple-800'
                        : 'bg-stone-50 border-stone-200 text-stone-500'
                    }`}>
                      {c.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-[10px] text-stone-400 font-sans border-t border-champagne/30 pt-3 mt-1">
                    <span>Icon: <span className="font-mono text-espresso font-bold">{c.icon || 'sparkles'}</span></span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEditMode(c)}
                        className="p-1.5 hover:bg-stone-100 border border-champagne/60 rounded-lg text-slate-700 transition-all"
                        title="Edit Category"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(c.id)}
                        className="p-1.5 hover:bg-red-100 bg-red-50/50 border border-red-200 rounded-lg text-red-700 transition-all"
                        title="Delete Category"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Inline Edit/Add Form */}
        <div className="flex flex-col gap-6">
          {showForm ? (
            <form onSubmit={handleSubmit} className="bg-white border border-champagne/80 rounded-2xl p-6 shadow-md flex flex-col gap-4 sticky top-24">
              <div className="flex justify-between items-center border-b border-champagne/45 pb-3">
                <h2 className="font-display font-bold text-espresso text-sm uppercase tracking-wider">
                  {editingCategory ? 'Edit Category' : 'New Category'}
                </h2>
                <button type="button" onClick={() => setShowForm(false)} className="text-stone-400 hover:text-stone-600">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">Category Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Roof Repair"
                  className="w-full border border-champagne rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">Slug</label>
                <input
                  type="text"
                  required
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="e.g. roof-repair"
                  className="w-full border border-champagne rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-accent font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">Icon Name</label>
                <input
                  type="text"
                  value={icon}
                  onChange={(e) => setIcon(e.target.value)}
                  placeholder="e.g. sparkles, wrench, zap"
                  className="w-full border border-champagne rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-accent"
                />
              </div>

              <div className="flex items-center gap-2 mt-1">
                <input
                  type="checkbox"
                  id="category_active"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="rounded text-accent focus:ring-accent"
                />
                <label htmlFor="category_active" className="text-xs font-semibold text-slate-700 select-none">
                  Mark as Active
                </label>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-primary hover:bg-slate-800 text-white font-semibold text-xs py-3 rounded-xl transition-all shadow-sm mt-2 flex items-center justify-center gap-1.5"
              >
                {submitting ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                ) : (
                  <Check className="w-4 h-4" />
                )}
                Save Category
              </button>
            </form>
          ) : (
            <div className="bg-stone-50/50 border border-dashed border-champagne rounded-2xl p-6 text-center text-stone-400 text-xs py-12">
              Select a category to edit or create a new one to begin editing here.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
