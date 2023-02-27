export const NPC_BASE_HEALTH_MULTIPLIER = 1;
export const NPC_SKILL_LEVEL_MULTIPLIER = 1.5;
export const NPC_SKILL_STRENGTH_MULTIPLIER = 1.3;
export const NPC_SKILL_DEXTERITY_MULTIPLIER = 1.3;
export const NPC_SKILL_RESISTANCE_MULTIPLIER = 1.3;
export const NPC_LOOT_CHANCE_MULTIPLIER = 0.5;

// Performance
export const NPC_MAX_SIMULTANEOUS_ACTIVE_PER_INSTANCE = 20; // remember that in pm2 (prod) this is multiplied by the number of instances (CPUs)

// PZ

export const NPC_CAN_ATTACK_IN_NON_PVP_ZONE = true;
