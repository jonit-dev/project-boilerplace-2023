import { IItem } from "@entities/ModuleInventory/ItemModel";
import { ItemSubType, ItemType } from "@rpg-engine/shared";
import { CraftingResourcesBlueprint } from "../../types/itemsBlueprintTypes";

export const itemCorruptionIngot: Partial<IItem> = {
  key: CraftingResourcesBlueprint.CorruptionIngot,
  type: ItemType.CraftingResource,
  subType: ItemSubType.CraftingResource,
  textureAtlas: "items",
  texturePath: "crafting-resources/corruption-ingot.png",
  name: "corruption-ingot",
  description: "A dark and malevolent ingot infused with corruptive energy, often used for crafting weapons.",
  weight: 1,
  maxStackSize: 100,
  basePrice: 25,
};
