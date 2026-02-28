import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './auth';

type Folder = {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
};

type FolderContextType = {
  folders: Folder[];
  isLoading: boolean;
  fetchFolders: () => Promise<void>;
  createFolder: (name: string) => Promise<Folder | null>;
  updateFolder: (id: string, name: string) => Promise<void>;
  deleteFolder: (id: string) => Promise<void>;
};

const FolderContext = createContext<FolderContextType>({
  folders: [],
  isLoading: true,
  fetchFolders: async () => {},
  createFolder: async () => null,
  updateFolder: async () => {},
  deleteFolder: async () => {},
});

export const FolderProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const [folders, setFolders] = useState<Folder[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchFolders = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    const { data, error } = await supabase
      .from('folders')
      .select('*')
      .eq('user_id', user.id)
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching folders:', error);
    } else {
      setFolders(data || []);
    }
    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    fetchFolders();
  }, [fetchFolders]);

  const createFolder = async (name: string) => {
    if (!user) return null;
    const { data, error } = await supabase
      .from('folders')
      .insert({ user_id: user.id, name })
      .select()
      .single();

    if (error) {
      console.error('Error creating folder:', error);
      return null;
    }
    setFolders((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
    return data;
  };

  const updateFolder = async (id: string, name: string) => {
    const { error } = await supabase
      .from('folders')
      .update({ name })
      .eq('id', id);

    if (error) {
      console.error('Error updating folder:', error);
    } else {
      setFolders((prev) =>
        prev.map((f) => (f.id === id ? { ...f, name } : f)).sort((a, b) => a.name.localeCompare(b.name))
      );
    }
  };

  const deleteFolder = async (id: string) => {
    const { error } = await supabase.from('folders').delete().eq('id', id);
    if (error) {
      console.error('Error deleting folder:', error);
    } else {
      setFolders((prev) => prev.filter((f) => f.id !== id));
    }
  };

  return (
    <FolderContext.Provider value={{ folders, isLoading, fetchFolders, createFolder, updateFolder, deleteFolder }}>
      {children}
    </FolderContext.Provider>
  );
};

export const useFolders = () => useContext(FolderContext);
