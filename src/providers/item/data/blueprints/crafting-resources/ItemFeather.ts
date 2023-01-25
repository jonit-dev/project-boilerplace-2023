import { IItemUseWith } from "@providers/useWith/useWithTypes";
import { ItemSubType, ItemType } from "@rpg-engine/shared";
import { CraftingResourcesBlueprint } from "../../types/itemsBlueprintTypes";

export const itemFeather: Partial<IItemUseWith> = {
  key: CraftingResourcesBlueprint.Feather,
  type: ItemType.CraftingResource,
  subType: ItemSubType.CraftingResource,
  textureAtlas: "items",
  texturePath: "crafting-resources/feather.png",
  name: "Feather",
  description: "A common crafting resource, used mainly for making projectiles",
  weight: 0.01,
  maxStackSize: 70,
  basePrice: 0.5,
  hasUseWith: true,
};
