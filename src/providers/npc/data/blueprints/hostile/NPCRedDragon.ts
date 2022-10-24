import { INPC } from "@entities/ModuleNPC/NPCModel";
import { Dice } from "@providers/constants/DiceConstants";
import { MovementSpeed } from "@providers/constants/MovementConstants";
import { ArmorsBlueprint, SwordsBlueprint } from "@providers/item/data/types/itemsBlueprintTypes";
import { HostileNPCsBlueprint } from "@providers/npc/data/types/npcsBlueprintTypes";
import { NPCAlignment } from "@rpg-engine/shared";
import { EntityAttackType } from "@rpg-engine/shared/dist/types/entity.types";
import { generateMoveTowardsMovement } from "../../abstractions/BaseNeutralNPC";

export const npcRedDragon = {
  ...generateMoveTowardsMovement(),
  name: "Red Dragon",
  key: HostileNPCsBlueprint.RedDragon,
  textureKey: HostileNPCsBlueprint.RedDragon,
  alignment: NPCAlignment.Hostile,
  attackType: EntityAttackType.Melee,
  speed: MovementSpeed.Fast,
  baseHealth: 600,
  healthRandomizerDice: Dice.D20,
  skillRandomizerDice: Dice.D20,
  skillsToBeRandomized: ["level", "strength", "dexterity", "resistance"],
  canSwitchToLowHealthTarget: true,
  skills: {
    level: 70,
    strength: {
      level: 70,
    },
    dexterity: {
      level: 70,
    },
    resistance: {
      level: 70,
    },
  },
  fleeOnLowHealth: true,
  loots: [
    {
      itemBlueprintKey: SwordsBlueprint.DragonsSword,
      chance: 40,
    },
    {
      itemBlueprintKey: ArmorsBlueprint.GoldenArmor,
      chance: 20,
    },
  ],
} as Partial<INPC>;
