import { create } from 'zustand';
import type { Customizable, Selection } from '../shared/food';
import type { BarcodeLookup } from './services/foods';
import type { Draft, Meal } from './store';

/** Hand-off state between screens (not persisted). */
type Handoff = {
  build: { custom: Customizable; selection?: Selection; via: Draft['via']; meal?: Meal | null } | null;
  product: BarcodeLookup | null;
  labelPrefill: {
    code?: string;
    name?: string | null;
    brand?: string | null;
    serving?: string;
    grams?: number | null;
    nutrients?: import('../shared/food').Nutrients;
  } | null;
  setBuild: (b: Handoff['build']) => void;
  setProduct: (p: BarcodeLookup | null) => void;
  setLabelPrefill: (p: Handoff['labelPrefill']) => void;
};

export const useHandoff = create<Handoff>()((set) => ({
  build: null,
  product: null,
  labelPrefill: null,
  setBuild: (build) => set({ build }),
  setProduct: (product) => set({ product }),
  setLabelPrefill: (labelPrefill) => set({ labelPrefill }),
}));
