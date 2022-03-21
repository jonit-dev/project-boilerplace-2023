import { CharacterClass, CharacterGender } from "@rpg-engine/shared";
import { generateMoveAwayMovement } from "./abstractions/BaseNeutralNPC";

export const annieMetaData = {
  ...generateMoveAwayMovement(36, 9),
  key: "annie",
  name: "Annie",
  textureKey: "female-npc",
  scene: "MainScene",
  class: CharacterClass.None,
  gender: CharacterGender.Female,
};
