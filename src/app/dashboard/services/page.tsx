'use strict';
'use client';

import React, { useState, useEffect } from 'react';
import { useAuth, useUser } from '@clerk/nextjs';
import { supabase, getSupabaseClient } from '@/lib/supabase';
import { useToast } from '@/components/Providers';
import { Plus, Trash2, Edit, CheckCircle, Clock, DollarSign, X } from 'lucide-react';

interface Service {
  id: string;
  name: string;
  description: string;
  price: number;
  duration_minutes: number;
  is_active: boolean;
  category_id: string;
}

interface Category {
  id: string;
  name: string;
}

export default function ServicesManager() {
  const { getToken } = useAuth();
  const { user } = useUser();
  const { toast } = useToast();

  const [provider, setProvider] = useState<any>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Editor Modal States
  const [showEditor, setShowEditor] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState(0);
  const [duration, setDuration] = useState(60);
  const [categoryId, setCategoryId] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [editorLoading, setEditorLoading] = useState(false);

  async function loadData() {
    try {
      const token = await getToken();
      if (!token) return;

      const client = getSupabaseClient(token);

      // Get categories from secure server API (independent of provider load status)
      try {
        const cResponse = await fetch('/api/categories');
        if (cResponse.ok) {
          const cData = await cResponse.json();
          if (cData.success) {
            const activeCats = cData.categories.filter((cat: any) => cat.is_active);
            setCategories(activeCats);
            if (activeCats.length > 0 && !categoryId) {
              setCategoryId(activeCats[0].id);
            }
          }
        }
      } catch (catErr) {
        console.error('Failed to load categories:', catErr);
      }

      // Get user
      const { data: uData } = await client
        .from('users')
        .select('id')
        .eq('clerk_user_id', user?.id)
        .single();

      if (uData) {
        // Get provider
        const { data: pData } = await client
          .from('providers')
          .select('id')
          .eq('user_id', uData.id)
          .single();

        if (pData) {
          setProvider(pData);

          // Get services
          const { data: sData } = await client
            .from('services')
            .select('id, name, description, price, duration_minutes, is_active, category_id')
            .eq('provider_id', pData.id);

          if (sData) setServices(sData);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const openEditor = (service: Service | null = null) => {
    if (service) {
      setEditingService(service);
      setName(service.name);
      setDescription(service.description);
      setPrice(Number(service.price));
      setDuration(service.duration_minutes);
      setCategoryId(service.category_id);
      setIsActive(service.is_active);
    } else {
      setEditingService(null);
      setName('');
      setDescription('');
      setPrice(1000);
      setDuration(60);
      setCategoryId(categories[0]?.id || '');
      setIsActive(true);
    }
    setShowEditor(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!provider || !categoryId) return;

    setEditorLoading(true);
    try {
      const token = await getToken();
      const client = getSupabaseClient(token);

      if (editingService) {
        // Update
        const { error } = await client
          .from('services')
          .update({
            name,
            description,
            price,
            duration_minutes: duration,
            category_id: categoryId,
            is_active: isActive
          })
          .eq('id', editingService.id);

        if (error) throw error;
        toast('Service updated successfully', 'success');
      } else {
        // Create
        const { error } = await client
          .from('services')
          .insert({
            provider_id: provider.id,
            name,
            description,
            price,
            duration_minutes: duration,
            category_id: categoryId,
            is_active: isActive
          });

        if (error) throw error;
        toast('Service added successfully', 'success');
      }

      setShowEditor(false);
      loadData();
    } catch (err) {
      toast('Failed to save service.', 'error');
    } finally {
      setEditorLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this service?')) return;

    try {
      const token = await getToken();
      const client = getSupabaseClient(token);

      const { error } = await client
        .from('services')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast('Service deleted', 'success');
      loadData();
    } catch (err) {
      toast('Could not delete service.', 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8 h-[50vh]">
        <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <h1 className="font-display text-2xl font-bold text-espresso">My Services</h1>
        <button
          onClick={() => openEditor(null)}
          className="bg-primary hover:bg-slate-800 text-white font-semibold text-xs px-4 py-2.5 rounded-xl transition-all shadow-sm flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" /> Add Service
        </button>
      </div>

      {services.length === 0 ? (
        <div className="bg-white border border-champagne rounded-2xl p-12 text-center shadow-sm">
          <Trash2 className="w-10 h-10 text-stone-300 mx-auto mb-3" />
          <p className="text-stone-400 text-sm font-sans mb-4">You have not registered any services yet.</p>
          <button onClick={() => openEditor(null)} className="text-xs font-semibold text-accent hover:underline">
            Register your first service now
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {services.map((s) => (
            <div key={s.id} className="bg-white border border-champagne/60 rounded-xl p-5 shadow-sm flex flex-col justify-between gap-4">
              <div>
                <div className="flex justify-between items-start gap-2 mb-2">
                  <h3 className="font-sans font-bold text-espresso text-base">{s.name}</h3>
                  <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                    s.is_active
                      ? 'bg-teal-50 border-teal-200 text-teal-800'
                      : 'bg-stone-50 border-stone-200 text-stone-500'
                  }`}>
                    {s.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <p className="text-stone-500 text-xs font-sans line-clamp-2 leading-relaxed mb-4">
                  {s.description}
                </p>

                <div className="flex items-center gap-4 text-stone-500 text-xs font-sans">
                  <span className="flex items-center gap-0.5"><Clock className="w-3.5 h-3.5" /> {s.duration_minutes} Min</span>
                  <span className="flex items-center gap-0.5"><DollarSign className="w-3.5 h-3.5" /> {s.price} PHP</span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-champagne/30 pt-4 mt-auto">
                <button
                  onClick={() => openEditor(s)}
                  className="p-2 bg-stone-50 hover:bg-stone-100 border border-champagne/60 rounded-lg text-slate-700 transition-all text-xs font-semibold flex items-center gap-1"
                >
                  <Edit className="w-3.5 h-3.5" /> Edit
                </button>
                <button
                  onClick={() => handleDelete(s.id)}
                  className="p-2 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg text-red-700 transition-all text-xs font-semibold flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Editor Modal */}
      {showEditor && (
        <div className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4">
          <form onSubmit={handleSave} className="bg-white border border-champagne rounded-2xl p-6 shadow-2xl max-w-md w-full flex flex-col gap-4">
            <div className="flex justify-between items-center border-b border-champagne/45 pb-3">
              <h2 className="font-display font-bold text-espresso text-lg">
                {editingService ? 'Edit Service' : 'Add New Service'}
              </h2>
              <button type="button" onClick={() => setShowEditor(false)} className="text-stone-400 hover:text-stone-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">Service Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Master Bedroom Cleaning"
                className="w-full border border-champagne rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-accent"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detail what is included in this service..."
                rows={3}
                className="w-full border border-champagne rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-accent"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">Price (PHP)</label>
                <input
                  type="number"
                  required
                  value={price}
                  onChange={(e) => setPrice(Number(e.target.value))}
                  className="w-full border border-champagne rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-accent"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">Duration (Minutes)</label>
                <select
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="w-full border border-champagne rounded-xl px-4 py-2.5 text-xs bg-white focus:outline-none focus:border-accent"
                >
                  <option value={30}>30 mins</option>
                  <option value={60}>1 hour</option>
                  <option value={90}>1.5 hours</option>
                  <option value={120}>2 hours</option>
                  <option value={180}>3 hours</option>
                  <option value={240}>4 hours</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">Category</label>
              <select
                required
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full border border-champagne rounded-xl px-4 py-2.5 text-xs bg-white focus:outline-none focus:border-accent"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 mt-2">
              <input
                type="checkbox"
                id="is_active"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="rounded text-accent focus:ring-accent"
              />
              <label htmlFor="is_active" className="text-xs font-semibold text-slate-700 select-none">
                Active (Visible on search and profiles)
              </label>
            </div>

            <button
              type="submit"
              disabled={editorLoading}
              className="w-full bg-primary hover:bg-slate-800 text-white font-semibold text-sm py-3 rounded-xl transition-all shadow-sm mt-4 flex items-center justify-center gap-1.5"
            >
              {editorLoading ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              ) : null}
              Save Service
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
