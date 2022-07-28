import { ICharacter } from "@entities/ModuleCharacter/CharacterModel";
import { IEquipment } from "@entities/ModuleCharacter/EquipmentModel";
import { IItemContainer, ItemContainer } from "@entities/ModuleInventory/ItemContainerModel";
import { Item, IItem } from "@entities/ModuleInventory/ItemModel";
import { INPC } from "@entities/ModuleNPC/NPCModel";
import { EquipmentEquip } from "@providers/equipment/EquipmentEquip";
import { BowsBlueprint } from "@providers/item/data/types/itemsBlueprintTypes";
import { SocketMessaging } from "@providers/sockets/SocketMessaging";
import { BattleSocketEvents, IBattleRangedAttackFailed, ItemSlotType, ItemSubType } from "@rpg-engine/shared";
import { EntityType } from "@rpg-engine/shared/dist/types/entity.types";
import { provide } from "inversify-binding-decorators";
import _ from "lodash";
import { Types } from "mongoose";

interface IRequiredAmmo {
  location: string;
  id: Types.ObjectId;
  key: string;
  maxRange: number;
}

@provide(BattleRangedAttack)
export class BattleRangedAttack {
  constructor(private socketMessaging: SocketMessaging, private equipmentEquip: EquipmentEquip) {}

  public sendNoAmmoEvent(character: ICharacter, target: ICharacter | INPC): void {
    this.socketMessaging.sendEventToUser<IBattleRangedAttackFailed>(
      character.channelId!,
      BattleSocketEvents.RangedAttackFailure,
      {
        targetId: target.id,
        type: target.type as EntityType,
        reason: "Ranged attack failed because character does not have enough ammo",
      }
    );
  }

  public sendNotInRangeEvent(character: ICharacter, target: ICharacter | INPC): void {
    this.socketMessaging.sendEventToUser<IBattleRangedAttackFailed>(
      character.channelId!,
      BattleSocketEvents.RangedAttackFailure,
      {
        targetId: target.id,
        type: target.type as EntityType,
        reason: "Ranged attack failed because target distance exceeds weapon max range",
      }
    );
  }

  public async getAmmoForRangedAttack(weapon: IItem, equipment: IEquipment): Promise<IRequiredAmmo> {
    let result = {} as IRequiredAmmo;
    // Get ranged attack weapons (bow or spear)
    switch (weapon.subType) {
      case ItemSubType.Bow:
        // check if have enough arrows in inventory or equipment
        if (weapon.requiredAmmoKey !== BowsBlueprint.Arrow) {
          return result;
        }
        result = (await this.getRequiredAmmo(weapon.requiredAmmoKey, equipment)) as IRequiredAmmo;
        if (!_.isEmpty(result)) {
          result.maxRange = weapon.maxRange || 0;
        }
        break;
      // TODO: Implement Spear case
      // case ItemSubType.Spear:
      //   range = weapon.maxRange || 0;
      //   break;
    }
    return result;
  }

  private async getRequiredAmmo(requiredAmmoKey: string, equipment: IEquipment): Promise<Partial<IRequiredAmmo>> {
    // check if character has enough required ammo in inventory or equipment
    const accesory = await Item.findById(equipment.accessory);
    if (accesory && accesory.key === requiredAmmoKey) {
      return { location: ItemSlotType.Accessory, id: accesory._id, key: requiredAmmoKey };
    }

    if (!equipment.inventory) {
      return {} as IRequiredAmmo;
    }
    const backpack = equipment.inventory as unknown as IItem;
    const backpackContainer = await ItemContainer.findById(backpack.itemContainer);

    if (!backpackContainer) {
      throw new Error(`Backpack without item container. Item id ${backpack._id}`);
    }

    if (backpackContainer.emptySlotsQty === backpackContainer.slotQty) {
      return {} as IRequiredAmmo;
    }

    for (const item of await backpackContainer.items) {
      if (item.key === requiredAmmoKey) {
        return { location: ItemSlotType.Inventory, id: item._id, key: requiredAmmoKey };
      }
    }

    return {} as IRequiredAmmo;
  }

  public async consumeAmmo(equipment: IEquipment, ammo: IRequiredAmmo): Promise<void> {
    switch (ammo.location) {
      case ItemSlotType.Accessory:
        equipment.accessory = undefined;
        await equipment.save();
        break;
      case ItemSlotType.Inventory:
        const backpack = equipment.inventory as unknown as IItem;
        const backpackContainer = (await ItemContainer.findById(backpack.itemContainer)) as IItemContainer;
        await this.equipmentEquip.removeItemFromInventory(ammo.id.toString(), backpackContainer);
        break;
    }
    await Item.deleteOne({ _id: ammo.id });
  }
}
