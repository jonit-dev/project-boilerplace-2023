import { Equipment, IEquipment } from "@entities/ModuleCharacter/EquipmentModel";
import { IEquipmentSet, IItem } from "@rpg-engine/shared";
import { provide } from "inversify-binding-decorators";
import { camelCase } from "lodash";

export type EquipmentSlotTypes =
  | "head"
  | "neck"
  | "leftHand"
  | "rightHand"
  | "ring"
  | "legs"
  | "boot"
  | "accessory"
  | "armor"
  | "inventory";

@provide(EquipmentSlots)
export class EquipmentSlots {
  private slots: EquipmentSlotTypes[] = [
    "head",
    "neck",
    "leftHand",
    "rightHand",
    "ring",
    "legs",
    "boot",
    "accessory",
    "armor",
    "inventory",
  ];

  public async areAllowedSlotsAvailable(slots: string[], equipment: IEquipment): Promise<boolean> {
    const equipmentSlots = await this.getEquipmentSlots(equipment._id);

    for (const slotData of slots) {
      const slot = camelCase(slotData) as EquipmentSlotTypes;

      if (equipmentSlots[slot] === undefined) {
        return true;
      }

      const equippedItem = equipmentSlots[slot] as unknown as IItem;
      const isStackable = equippedItem.maxStackSize > 1;

      if (!isStackable) {
        return false;
      }

      // stackable items

      if (equippedItem.stackQty === equippedItem.maxStackSize) {
        return false;
      }
    }

    return true;
  }

  public getAvailableSlot(item: IItem, equipment: IEquipmentSet): string {
    let availableSlot = "";
    const itemSlotTypes = this.slots;

    for (const allowedSlotType of item?.allowedEquipSlotType) {
      const allowedSlotTypeCamelCase = camelCase(allowedSlotType);
      const itemSubTypeCamelCase = camelCase(item.subType);

      const slotType = this.getSlotType(itemSlotTypes, allowedSlotTypeCamelCase, itemSubTypeCamelCase);

      if (equipment[slotType] === undefined) {
        availableSlot = slotType;
        break;
      }
    }

    return availableSlot;
  }

  public async getEquipmentSlots(equipmentId: string): Promise<IEquipmentSet> {
    const equipment = await Equipment.findById(equipmentId).lean().populate(this.slots.join(" ")).exec();

    const head = equipment?.head! as unknown as IItem;
    const neck = equipment?.neck! as unknown as IItem;
    const leftHand = equipment?.leftHand! as unknown as IItem;
    const rightHand = equipment?.rightHand! as unknown as IItem;
    const ring = equipment?.ring! as unknown as IItem;
    const legs = equipment?.legs! as unknown as IItem;
    const boot = equipment?.boot! as unknown as IItem;
    const accessory = equipment?.accessory! as unknown as IItem;
    const armor = equipment?.armor! as unknown as IItem;
    const inventory = equipment?.inventory! as unknown as IItem;

    return {
      _id: equipment!._id,
      head,
      neck,
      leftHand,
      rightHand,
      ring,
      legs,
      boot,
      accessory,
      armor,
      inventory,
    } as IEquipmentSet;
  }

  private getSlotType(itemSlotTypes: string[], slotType: string, subType: string): string {
    if (!itemSlotTypes.includes(slotType)) {
      return subType;
    }
    return slotType;
  }
}
