import { Character } from "@entities/ModuleSystem/CharacterModel";
import { INPC } from "@entities/ModuleSystem/NPCModel";
import { MovementHelper } from "@providers/movement/MovementHelper";
import { provide } from "inversify-binding-decorators";
import { NPCMovement } from "./NPCMovement";
import { NPCTarget } from "./NPCTarget";

@provide(NPCMovementMoveAway)
export class NPCMovementMoveAway {
  constructor(private npcMovement: NPCMovement, private npcTarget: NPCTarget, private movementHelper: MovementHelper) {}

  public async startMovementMoveAway(npc: INPC): Promise<void> {
    const targetCharacter = await Character.findById(npc.targetCharacter);

    if (targetCharacter) {
      await this.npcTarget.checkTargetOutOfRangeOrLoggedOut(npc);

      const targetDirection = this.npcTarget.getTargetDirection(npc, targetCharacter.x, targetCharacter.y);

      const oppositeTargetDirection = this.movementHelper.getOppositeDirection(targetDirection);

      const { x: newX, y: newY } = this.movementHelper.calculateNewPositionXY(npc.x, npc.y, oppositeTargetDirection);

      if (this.movementHelper.isUnderRange(npc.x, npc.y, newX, newY, npc.maxRangeInGridCells!)) {
        await this.npcMovement.moveNPC(npc, npc.x, npc.y, newX, newY, oppositeTargetDirection);
      }
    } else {
      await this.npcTarget.tryToSetTarget(npc);
    }
  }
}
