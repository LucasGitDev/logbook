import { create } from 'zustand'
import type { VaultState } from '@/types/vault'

interface VaultStore extends VaultState {
  setRootHandle: (handle: FileSystemDirectoryHandle | null) => void
  reset: () => void
}

const initialState: VaultState = {
  rootHandle: null,
  tasks: [],
  agendaItems: [],
  projects: [],
  isLoaded: false,
}

export const useVaultStore = create<VaultStore>((set) => ({
  ...initialState,
  setRootHandle: (rootHandle) => set({ rootHandle, isLoaded: rootHandle !== null }),
  reset: () => set(initialState),
}))
