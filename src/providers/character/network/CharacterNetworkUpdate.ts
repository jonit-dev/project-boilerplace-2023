import { Character, ICharacter } from "@entities/ModuleCharacter/CharacterModel";
import { ItemView } from "@providers/item/ItemView";
import { GridManager } from "@providers/map/GridManager";
import { MapNonPVPZone } from "@providers/map/MapNonPVPZone";
import { MapTransition } from "@providers/map/MapTransition";
import { MovementHelper } from "@providers/movement/MovementHelper";
import { NPCManager } from "@providers/npc/NPCManager";
import { NPCWarn } from "@providers/npc/NPCWarn";
import { SocketAuth } from "@providers/sockets/SocketAuth";
import { SocketMessaging } from "@providers/sockets/SocketMessaging";
import { SocketChannel } from "@providers/sockets/SocketsTypes";
import {
  AnimationDirection,
  CharacterSocketEvents,
  ICharacterPositionUpdateConfirm,
  ICharacterPositionUpdateFromClient,
  ToGridX,
  ToGridY,
} from "@rpg-engine/shared";
import { provide } from "inversify-binding-decorators";
import { CharacterView } from "../CharacterView";
import { CharacterMovementValidation } from "../characterMovement/CharacterMovementValidation";
import { CharacterMovementWarn } from "../characterMovement/CharacterMovementWarn";

@provide(CharacterNetworkUpdate)
export class CharacterNetworkUpdate {
  constructor(
    private socketMessaging: SocketMessaging,
    private socketAuth: SocketAuth,
    private movementHelper: MovementHelper,
    private itemView: ItemView,
    private characterView: CharacterView,
    private mapTransition: MapTransition,
    private npcManager: NPCManager,
    private gridManager: GridManager,
    private mapNonPVPZone: MapNonPVPZone,
    private npcWarn: NPCWarn,
    private characterMovementValidation: CharacterMovementValidation,
    private characterMovementWarn: CharacterMovementWarn
  ) {}

  public onCharacterUpdatePosition(channel: SocketChannel): void {
    this.socketAuth.authCharacterOn(
      channel,
      CharacterSocketEvents.CharacterPositionUpdate,
      async (data: ICharacterPositionUpdateFromClient, character: ICharacter) => {
        if (data) {
          // sometimes the character is just changing facing direction and not moving.. That's why we need this.
          const isMoving = this.movementHelper.isMoving(character.x, character.y, data.newX, data.newY);

          // send message back to the user telling that the requested position update is not valid!

          let isPositionUpdateValid = true;

          const { x: newX, y: newY } = this.movementHelper.calculateNewPositionXY(
            character.x,
            character.y,
            data.direction
          );

          if (isMoving) {
            isPositionUpdateValid = await this.characterMovementValidation.isValid(character, newX, newY, isMoving);
          }

          if (isPositionUpdateValid) {
            await this.characterMovementWarn.warn(character, data);

            await this.npcManager.startNearbyNPCsBehaviorLoop(character);

            // update emitter position from
            await this.updateServerSideEmitterInfo(character, newX, newY, isMoving, data.direction);

            await this.handleMapTransition(character, newX, newY);

            this.handleNonPVPZone(character, newX, newY);
          }

          // lets make sure we send the confirmation back to the user only after all the other pre-requirements above are done.
          this.socketMessaging.sendEventToUser<ICharacterPositionUpdateConfirm>(
            character.channelId!,
            CharacterSocketEvents.CharacterPositionUpdateConfirm,
            {
              id: character.id,
              isValid: isPositionUpdateValid,
              position: {
                originX: character.x,
                originY: character.y,
                direction: data.direction,
              },
            }
          );
        }
      }
    );
  }

  private handleNonPVPZone(character: ICharacter, newX: number, newY: number): void {
    /* 
          Verify if we're in a non pvp zone. If so, we need to trigger 
          an attack stop event in case player was in a pvp combat
          */
    const nonPVPZone = this.mapNonPVPZone.getNonPVPZoneAtXY(character.scene, newX, newY);
    if (nonPVPZone) {
      this.mapNonPVPZone.stopCharacterAttack(character);
    }
  }

  private async handleMapTransition(character: ICharacter, newX: number, newY: number): Promise<void> {
    // verify if we're in a map transition. If so, we need to trigger a scene transition
    const transition = this.mapTransition.getTransitionAtXY(character.scene, newX, newY);
    if (transition) {
      const map = this.mapTransition.getTransitionProperty(transition, "map");
      const gridX = Number(this.mapTransition.getTransitionProperty(transition, "gridX"));
      const gridY = Number(this.mapTransition.getTransitionProperty(transition, "gridY"));

      if (!map || !gridX || !gridY) {
        console.error("Failed to fetch required destination properties.");
        return;
      }

      const destination = {
        map,
        gridX,
        gridY,
      };

      /*
   Check if we are transitioning to the same map, 
   if so we should only teleport the character
   */
      if (destination.map === character.scene) {
        await this.mapTransition.teleportCharacter(character, destination);
      } else {
        await this.mapTransition.changeCharacterScene(character, destination);
      }
    }
  }

  private async updateServerSideEmitterInfo(
    character: ICharacter,
    newX: number,
    newY: number,
    isMoving: boolean,
    direction: AnimationDirection
  ): Promise<void> {
    const map = character.scene;

    const { gridOffsetX, gridOffsetY } = this.gridManager.getGridOffset(map)!;

    if (isMoving) {
      // if character is moving, update the position

      // old position is now walkable
      this.gridManager.setWalkable(map, ToGridX(character.x) + gridOffsetX, ToGridY(character.y) + gridOffsetY, true);

      await Character.updateOne(
        { _id: character._id },
        {
          $set: {
            x: newX,
            y: newY,
            direction: direction,
            lastMovement: new Date(),
          },
        }
      );

      // update our grid with solid information

      this.gridManager.setWalkable(map, ToGridX(newX) + gridOffsetX, ToGridY(newY) + gridOffsetY, false);
    }
  }
}
