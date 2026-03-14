import { create } from "zustand";
import type { SortBy, SortOrder } from "@/lib/api/member-food-types";

type SearchFilterState = {
  query: string;
  categoryId: string | null;
  sortBy: SortBy;
  sortOrder: SortOrder;
};

type SearchFilterActions = {
  setQuery: (query: string) => void;
  setCategoryId: (categoryId: string | null) => void;
  setSortBy: (sortBy: SortBy) => void;
  setSortOrder: (sortOrder: SortOrder) => void;
  resetFilters: () => void;
};

type SearchFilterStore = SearchFilterState & SearchFilterActions;

const DEFAULT_STATE: SearchFilterState = {
  query: "",
  categoryId: null,
  sortBy: "name",
  sortOrder: "asc",
};

export const useSearchFilterStore = create<SearchFilterStore>((set) => ({
  ...DEFAULT_STATE,

  setQuery: (query) => set({ query }),
  setCategoryId: (categoryId) => set({ categoryId }),
  setSortBy: (sortBy) => set({ sortBy }),
  setSortOrder: (sortOrder) => set({ sortOrder }),
  resetFilters: () => set(DEFAULT_STATE),
}));

export const useSearchQuery = () =>
  useSearchFilterStore((state) => state.query);

export const useSearchCategoryId = () =>
  useSearchFilterStore((state) => state.categoryId);

export const useSearchSortBy = () =>
  useSearchFilterStore((state) => state.sortBy);

export const useSearchSortOrder = () =>
  useSearchFilterStore((state) => state.sortOrder);

export const useHasActiveFilters = () =>
  useSearchFilterStore(
    (state) =>
      state.categoryId !== null ||
      state.sortBy !== "name" ||
      state.sortOrder !== "asc"
  );
