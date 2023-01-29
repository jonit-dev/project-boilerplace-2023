import { IItem } from "@entities/ModuleInventory/ItemModel";
import { ItemSlotType, ItemSubType, ItemType } from "@rpg-engine/shared";
import { EntityAttackType } from "@rpg-engine/shared/dist/types/entity.types";
import { SwordsBlueprint } from "../../types/itemsBlueprintTypes";

export const itemBasiliskSword: Partial<IItem> = {
  key: SwordsBlueprint.BasiliskSword,
  type: ItemType.Weapon,
  subType: ItemSubType.Sword,
  textureAtlas: "items",
  texturePath: "swords/basilisk-sword.png",
  name: "Basilisk Sword",
  description:
    "A fearsome sword crafted from the remains of a powerful basilisk, imbued with deadly venom and corrosive properties.",
  attack: 14,
  defense: 6,
  weight: 1,
  allowedEquipSlotType: [ItemSlotType.LeftHand, ItemSlotType.RightHand],
  rangeType: EntityAttackType.Melee,
  basePrice: 77,
};
