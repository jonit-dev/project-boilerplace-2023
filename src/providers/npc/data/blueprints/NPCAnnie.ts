import { INPC } from "@entities/ModuleNPC/NPCModel";
import { CharacterClass, CharacterGender } from "@rpg-engine/shared";
import { generateMoveAwayMovement } from "../abstractions/BaseNeutralNPC";

export const npcAnnie = {
  ...generateMoveAwayMovement(),
  key: "annie",
  name: "Annie",
  textureKey: "female-npc",
  scene: "MainScene",
  class: CharacterClass.None,
  gender: CharacterGender.Female,
} as Partial<INPC>;
