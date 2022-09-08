import { INPC } from "@entities/ModuleNPC/NPCModel";
import { Dice } from "@providers/constants/DiceConstants";
import { MovementSpeed } from "@providers/constants/MovementConstants";
import { NPCAlignment } from "@rpg-engine/shared";
import { EntityAttackType } from "@rpg-engine/shared/dist/types/entity.types";
import { generateMoveAwayMovement } from "../../abstractions/BaseNeutralNPC";

export const npcDeer = {
  ...generateMoveAwayMovement(),
  name: "Deer",
  key: "deer",
  textureKey: "deer",
  alignment: NPCAlignment.Neutral,
  attackType: EntityAttackType.Melee,
  speed: MovementSpeed.ExtraFast,
  baseHealth: 10,
  healthRandomizerDice: Dice.D4,
  skills: {
    level: 1,
    strength: {
      level: 1,
    },
    dexterity: {
      level: 1,
    },
    resistance: {
      level: 2,
    },
  },
  experience: 20,
  loots: [
    {
      itemBlueprintKey: "bread",
      chance: 60,
    },
  ],
} as Partial<INPC>;
