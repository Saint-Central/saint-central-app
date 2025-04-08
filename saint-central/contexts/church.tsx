import { Church, ChurchMember } from "@/types/church";
import { createContext, useContext } from "react";

export type ChurchContextData = {
  church?: Church;
  member?: ChurchMember;
};

export type ChurchContextValue = {
  data: ChurchContextData;
  update: (data: ChurchContextData) => void;
  reset: () => void;
};

export const ChurchContext = createContext<ChurchContextValue | null>(null);

export function useChurchContext() {
  const contextValue = useContext(ChurchContext);
  if (contextValue === null) {
    throw new Error("'useChurch' hook requires a 'ChurchProvider'");
  }
  return contextValue;
}
