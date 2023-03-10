import { INPC } from "@entities/ModuleNPC/NPCModel";
import {
  ArmorsBlueprint,
  AxesBlueprint,
  DaggersBlueprint,
  MacesBlueprint,
  ShieldsBlueprint,
  SwordsBlueprint,
} from "@providers/item/data/types/itemsBlueprintTypes";
import { generateRandomMovement } from "@providers/npc/data/abstractions/BaseNeutralNPC";
import { CharacterGender } from "@rpg-engine/shared";

export const npcBlacksmith = {
  ...generateRandomMovement(),
  key: "blacksmith",
  name: "Thorne Forgehammer",
  textureKey: "fat-bald-man",
  gender: CharacterGender.Male,
  isTrader: true,
  traderItems: [
    {
      key: SwordsBlueprint.ShortSword,
    },

    {
      key: ArmorsBlueprint.StuddedArmor,
    },
    {
      key: MacesBlueprint.Club,
    },
    {
      key: AxesBlueprint.Axe,
    },
    {
      key: AxesBlueprint.WoodenAxe,
    },
    {
      key: DaggersBlueprint.WoodenDagger,
    },
    {
      key: MacesBlueprint.WoodenMace,
    },
    {
      key: ShieldsBlueprint.WoodenShield,
    },
    {
      key: SwordsBlueprint.WoodenSword,
    },
  ],
} as Partial<INPC>;
