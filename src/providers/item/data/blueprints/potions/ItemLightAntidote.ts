import { IItem } from "@entities/ModuleInventory/ItemModel";
import { ItemSlotType, ItemSubType, ItemType } from "@rpg-engine/shared";

export const itemLightAntidote: Partial<IItem> = {
  key: "light-antidote",
  type: ItemType.Consumable,
  subType: ItemSubType.Magic,
  textureAtlas: "items",
  texturePath: "potions/light-antidote.png",
  textureKey: "light-antidote",
  name: "light-antidote",
  description: "A small flask containing an elixir of antidote.",
  weight: 0.5,
  allowedEquipSlotType: [ItemSlotType.Inventory],
};
