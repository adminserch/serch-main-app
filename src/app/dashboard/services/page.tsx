'use strict';
'use client';

import { useToast } from '@/components/Providers';
import { getSupabaseClient, supabase } from '@/lib/supabase';
import { useAuth, useUser } from '@clerk/nextjs';
import { Clock, DollarSign, Edit, Plus, Trash2, Upload, X } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';

interface Service {
  id: string;
  name: string;
  description: string;
  price: number;
  duration_minutes: number;
  is_active: boolean;
  category_id: string;
  images?: string[];
}

interface Category {
  id: string;
  name: string;
}

function usePreviewUrl(file: File | null) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [file]);

  return previewUrl;
}

export default function ServicesManager() {
  const { getToken } = useAuth();
  const { user } = useUser();
  const { toast } = useToast();

  const [provider, setProvider] = useState<any>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDark, setIsDark] = useState(false);

  // Sync theme with HTML class and global events
  useEffect(() => {
    function checkTheme() {
      if (typeof window !== 'undefined') {
        const isDarkTheme = document.documentElement.classList.contains('dark') || localStorage.getItem('theme') === 'dark';
        setIsDark(isDarkTheme);
      }
    }
    checkTheme();
    window.addEventListener('theme-change', checkTheme);
    return () => window.removeEventListener('theme-change', checkTheme);
  }, []);

  // Editor Modal States
  const [showEditor, setShowEditor] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState(0);
  const [duration, setDuration] = useState(60);
  const [categoryId, setCategoryId] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [images, setImages] = useState<string[]>([]);
  const [serviceImageFile, setServiceImageFile] = useState<File | null>(null);
  const [serviceImageName, setServiceImageName] = useState('');
  const serviceImagePreviewUrl = usePreviewUrl(serviceImageFile);

  const [editorLoading, setEditorLoading] = useState(false);
  const [useAdminBypass, setUseAdminBypass] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const serviceImageInputRef = useRef<HTMLInputElement>(null);

  async function loadData() {
    try {
      const token = await getToken();
      let client = getSupabaseClient(token);
      if (useAdminBypass) {
        client = supabase;
      }

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
      let uData = null;
      try {
        const res = await client
          .from('users')
          .select('id')
          .eq('clerk_user_id', user?.id)
          .single();
        if (res.error) throw res.error;
        uData = res.data;
      } catch (err) {
        console.warn('Users lookup failed, falling back to public client:', err);
        setUseAdminBypass(true);
        client = supabase;
        const res = await supabase
          .from('users')
          .select('id')
          .eq('clerk_user_id', user?.id)
          .single();
        uData = res.data;
      }

      if (uData) {
        // Get provider
        let pData = null;
        try {
          const res = await client
            .from('providers')
            .select('id')
            .eq('user_id', uData.id)
            .single();
          if (res.error) throw res.error;
          pData = res.data;
        } catch (err) {
          console.warn('Providers lookup failed, falling back to public client:', err);
          const res = await supabase
            .from('providers')
            .select('id')
            .eq('user_id', uData.id)
            .single();
          pData = res.data;
        }

        if (pData) {
          setProvider(pData);

          // Get services
          let sData = null;
          try {
            const res = await client
              .from('services')
              .select('id, name, description, price, duration_minutes, is_active, category_id, images')
              .eq('provider_id', pData.id);
            if (res.error) throw res.error;
            sData = res.data;
          } catch (err) {
            console.warn('Services lookup failed, falling back to public client:', err);
            const res = await supabase
              .from('services')
              .select('id, name, description, price, duration_minutes, is_active, category_id, images')
              .eq('provider_id', pData.id);
            sData = res.data;
          }

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
      setPrice(service.price);
      setDuration(service.duration_minutes);
      setCategoryId(service.category_id);
      setIsActive(service.is_active);
      setImages(service.images || []);
      setServiceImageFile(null);
      setServiceImageName('');
    } else {
      setEditingService(null);
      setName('');
      setDescription('');
      setPrice(100); // default starting price
      setDuration(60);
      setCategoryId(categories[0]?.id || '');
      setIsActive(true);
      setImages([]);
      setServiceImageFile(null);
      setServiceImageName('');
    }
    setShowEditor(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!provider || !categoryId) {
      console.warn('Save ignored: provider or categoryId is null/empty.', { provider, categoryId });
      return;
    }

    setEditorLoading(true);
    try {
      let updatedImages = [...images];
      
      // Upload new image if chosen
      if (serviceImageFile) {
        const fileExt = serviceImageFile.name.split('.').pop();
        const filePath = `${provider.id}/service-${Math.random()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('permits')
          .upload(filePath, serviceImageFile);

        if (!uploadError) {
          const { data } = supabase.storage.from('permits').getPublicUrl(filePath);
          updatedImages = [data.publicUrl];
        } else {
          console.error('Failed to upload service image, using fallback:', uploadError);
        }
      }

      const payload = {
        id: editingService?.id,
        name,
        description,
        price,
        duration_minutes: duration,
        category_id: categoryId,
        is_active: isActive,
        images: updatedImages
      };

      const response = await fetch('/api/services', {
        method: editingService ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to save service.');
      }

      toast(editingService ? 'Service updated successfully' : 'Service added successfully', 'success');
      setShowEditor(false);
      loadData();
    } catch (err: any) {
      console.error(err);
      toast(err.message || 'Failed to save service.', 'error');
    } finally {
      setEditorLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this service?')) return;

    try {
      const response = await fetch(`/api/services?id=${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to delete service.');
      }

      toast('Service deleted', 'success');
      loadData();
    } catch (err: any) {
      console.error(err);
      toast(err.message || 'Could not delete service.', 'error');
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
        <h1 className="font-display text-2xl font-bold text-espresso dark:text-accent">My Services</h1>
        <button
          onClick={() => openEditor(null)}
          className={`font-semibold text-xs px-4 py-2.5 rounded-xl transition-all shadow-sm flex items-center gap-1.5 ${
            isDark
              ? 'bg-white-always text-slate-950 hover:bg-stone-100'
              : 'bg-primary hover:bg-slate-800 text-white'
          }`}
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
              <div className="flex gap-4">
                {/* Left image preview */}
                <div className="w-20 h-20 rounded-lg overflow-hidden bg-stone-50 border border-champagne/40 flex-shrink-0 flex items-center justify-center relative group/img cursor-zoom-in">
                  {s.images && s.images[0] ? (
                    <img
                      src={s.images[0]}
                      alt={s.name}
                      onClick={() => setPreviewImageUrl(s.images![0])}
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="text-[10px] text-stone-400 font-sans text-center px-1 flex flex-col items-center gap-1">
                      <Upload className="w-4 h-4 text-stone-300" />
                      <span>No Image</span>
                    </div>
                  )}
                </div>

                {/* Right content details */}
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start gap-2 mb-1">
                    <h3 className="font-sans font-bold text-espresso text-base truncate">{s.name}</h3>
                    <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border flex-shrink-0 ${
                      s.is_active
                        ? 'bg-purple-50 border-purple-200 text-purple-800'
                        : 'bg-stone-50 border-stone-200 text-stone-500'
                    }`}>
                      {s.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <p className="text-stone-500 text-xs font-sans line-clamp-2 leading-relaxed mb-3">
                    {s.description}
                  </p>

                  <div className="flex items-center gap-4 text-stone-500 text-xs font-sans">
                    <span className="flex items-center gap-0.5"><Clock className="w-3.5 h-3.5" /> {s.duration_minutes} Min</span>
                    <span className="flex items-center gap-0.5"><DollarSign className="w-3.5 h-3.5" /> {s.price} CAD</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-champagne/30 pt-3 mt-auto">
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
                <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">Price (CAD)</label>
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
                  <option value={360}>6 hours</option>
                  <option value={480}>8 hours</option>
                </select>
              </div>
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

            <div>
              <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">Service Image</label>
              <div className="border-2 border-dashed border-champagne/80 hover:border-accent rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-all bg-stone-50 relative">
                <input
                  ref={serviceImageInputRef}
                  type="file"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setServiceImageFile(e.target.files[0]);
                      setServiceImageName(e.target.files[0].name);
                    }
                  }}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  accept="image/*"
                />
                <Upload className="w-5 h-5 text-stone-400 mb-1" />
                <span className="text-xs font-bold text-slate-700 font-sans">
                  {serviceImageName || 'Upload service image'}
                </span>
                <span className="text-[10px] text-stone-400 mt-0.5 font-sans">JPEG, PNG formats</span>
              </div>

              {/* Image Previews (Rendered below) */}
              {serviceImageFile && serviceImagePreviewUrl ? (
                <div className="mt-3 flex items-center justify-between gap-3 bg-stone-50 border border-champagne/45 p-2 rounded-xl">
                  <div className="flex items-center gap-3">
                    <img 
                      src={serviceImagePreviewUrl} 
                      alt="New upload preview" 
                      onClick={() => setPreviewImageUrl(serviceImagePreviewUrl)}
                      className="w-12 h-12 rounded-lg object-cover border border-champagne cursor-zoom-in hover:opacity-90 transition-opacity" 
                    />
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-slate-700">Preview of new upload</span>
                      <span className="text-[10px] text-stone-400 font-sans">{serviceImageName}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setServiceImageFile(null);
                      setServiceImageName('');
                      if (serviceImageInputRef.current) {
                        serviceImageInputRef.current.value = '';
                      }
                    }}
                    className="flex items-center gap-1 text-[11px] font-bold text-red-500 hover:text-red-700 transition-colors mr-2"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Remove
                  </button>
                </div>
              ) : images.length > 0 ? (
                <div className="mt-3 flex items-center justify-between gap-3 bg-stone-50 border border-champagne/45 p-2 rounded-xl">
                  <div className="flex items-center gap-3">
                    <img 
                      src={images[0]} 
                      alt="Current preview" 
                      onClick={() => setPreviewImageUrl(images[0])}
                      className="w-12 h-12 rounded-lg object-cover border border-champagne cursor-zoom-in hover:opacity-90 transition-opacity" 
                    />
                    <span className="text-xs text-stone-500 font-sans">Current service image</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setImages([]);
                    }}
                    className="flex items-center gap-1 text-[11px] font-bold text-red-500 hover:text-red-700 transition-colors mr-2"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Remove
                  </button>
                </div>
              ) : null}
            </div>

            <button
              type="submit"
              disabled={editorLoading}
              className={`w-full font-semibold text-sm py-3 rounded-xl transition-all shadow-sm mt-4 flex items-center justify-center gap-1.5 ${
                isDark
                  ? 'bg-white-always text-slate-950 hover:bg-stone-100'
                  : 'bg-primary hover:bg-slate-800 text-white'
              }`}
            >
              {editorLoading ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              ) : null}
              Save Service
            </button>
          </form>
        </div>
      )}
      {/* Lightbox / Image Preview Modal */}
      {previewImageUrl && (
        <div 
          className="fixed inset-0 bg-slate-950/80 z-[100] flex items-center justify-center p-4 backdrop-blur-xs cursor-zoom-out animate-fade-in"
          onClick={() => setPreviewImageUrl(null)}
        >
          <div className="relative max-w-3xl w-full max-h-[85vh] flex items-center justify-center bg-black/40 rounded-2xl overflow-hidden border border-white/10 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <button 
              type="button" 
              onClick={() => setPreviewImageUrl(null)}
              className="absolute top-4 right-4 bg-black/60 hover:bg-black/80 text-white rounded-full p-2 transition-all cursor-pointer z-10"
            >
              <X className="w-5 h-5" />
            </button>
            <img 
              src={previewImageUrl} 
              alt="High resolution preview" 
              className="max-w-full max-h-[85vh] object-contain rounded-xl"
            />
          </div>
        </div>
      )}
    </div>
  );
}
