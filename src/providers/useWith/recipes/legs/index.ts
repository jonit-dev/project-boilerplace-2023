import { LegsBlueprint } from "@providers/item/data/types/itemsBlueprintTypes";
import { IUseWithCraftingRecipe } from "@providers/useWith/useWithTypes";
import { recipeBloodfireLegs } from "./recipeBloodfireLegs";
import { recipeFalconLegs } from "./recipeFalconLegs";
import { recipeStuddedLegs } from "./recipeStuddedLegs";
import { recipeLeatherLegs } from "./recipeLeatherLegs";

export const recipeLegsIndex: Record<string, IUseWithCraftingRecipe[]> = {
  [LegsBlueprint.StuddedLegs]: [recipeStuddedLegs],
  [LegsBlueprint.BloodfireLegs]: [recipeBloodfireLegs],
  [LegsBlueprint.FalconsLegs]: [recipeFalconLegs],
  [LegsBlueprint.LeatherLegs]: [recipeLeatherLegs],
};
