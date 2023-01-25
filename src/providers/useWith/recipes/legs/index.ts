import { LegsBlueprint } from "@providers/item/data/types/itemsBlueprintTypes";
import { IUseWithCraftingRecipe } from "@providers/useWith/useWithTypes";
import { recipeStuddedLegs } from "./recipeStuddedLegs";

export const recipeLegsIndex: Record<string, IUseWithCraftingRecipe[]> = {
  [LegsBlueprint.StuddedLegs]: [recipeStuddedLegs],
};
