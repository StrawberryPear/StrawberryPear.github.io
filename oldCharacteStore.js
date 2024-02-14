const CHARACTERS = [
  { 
    key: "questingKnight",
    activations: 4,
    move: 3,
    armor: 3,
    actions: [
      {key: "Longsword", type: "melee", target: [4], damage: 4, canFocus: true},
      {key: "Vicious Strike", type: "melee", target: [4, 3], damage: 5, canFocus: true},
    ],
    health: 5,
    criticalHealth: 2,
    points: 23,
    team: "G"
  },
  { 
    key: "bountyHunter",
    activations: 4,
    move: 3,
    armor: 1,
    actions: [
      {key: "Bastard Sword", type: "melee", target: [4], damage: 3, canFocus: true},
      {key: "Bastard Sword", type: "melee", target: [4], damage: 3, canFocus: true},
      {key: "Crossbow", type: "melee", target: [2, 2], range: 12, damage: 3, canFocus: true}
    ],
    health: 5,
    criticalHealth: 2,
    points: 23,
    team: "G"
  },
  { 
    key: "wardenOfJustice",
    activations: 4,
    move: 3,
    armor: 2,
    actions: [
      {key: "Sacred Blade", type: "melee", target: [3], damage: 3, canFocus: true},
      {key: "Inner Peace", type: "custom", target: [4], range: 24, condition: "character.currentHealth <= character.health - 2", effect: "heal(character, 3)", canFocus: true},
      {key: "Sacred Blade", type: "melee", target: [3], damage: 3, canFocus: true}
    ],
    health: 5,
    criticalHealth: 2,
    points: 23,
    team: "G"
  },
  { 
    key: "spiritWeapon",
    activations: 2,
    move: 3,
    armor: 0,
    actions: [
      {key: "Spirit Hammer", type: "melee", target: [4], damage: 3, canFocus: true},
    ],
    health: 1,
    points: 1000,
    team: "G"
  },
  { 
    key: "clericOfJustice",
    activations: 4,
    move: 3,
    armor: 2,
    actions: [
      {key: "Spirit Weapon Upkeep", type: "custom", target: [1], condition: "character.spiritWeapon && character.spiritWeapon.currentHealth > 0", canFocus: false},
      {key: "Spirit Weapon", type: "custom", target: [3, 2], effect: "character.spiritWeapon = getCharacterOfKey('spiritWeapon', character.x, character.team); characters.push(character.spiritWeapon);", condition: "character.spiritWeapon && character.spiritWeapon.currentHealth <= 0", canFocus: true},
      {key: "Mighty Blow", type: "melee", target: [4, 3], canFocus: true},
      {key: "War Hammer", type: "melee", target: [4], damage: 3, canFocus: true},
    ],
    health: 5,
    criticalHealth: 2,
    points: 23,
    team: "G"
  },
  { 
    key: "loneGuardCommander",
    activations: 5,
    move: 3,
    armor: 2,
    actions: [
      {key: "Tireless Onslaught", type: "melee", target: [4], damage: 4, canFocus: true},
      {key: "Tireless Onslaught", type: "melee", target: [4], damage: 4, canFocus: true},
      {key: "Tireless Onslaught", type: "melee", target: [4], damage: 4, canFocus: true},
    ],
    health: 5,
    criticalHealth: 2,
    points: 30,
    team: "G"
  },
  { 
    key: "loneGuardRanger",
    activations: 4,
    move: 3,
    armor: 1,
    actions: [
      {key: "Longbow", type: "range", range: 12, target: [4], damage: `(target.statuses.includes("bound") ? 2 : 0) + 3`, canFocus: true},
      {key: "Hand Weapon", type: "melee", target: [4], damage: `(target.statuses.includes("bound") ? 2 : 0) + 3`, canFocus: true},
    ],
    health: 5,
    criticalHealth: 2,
    points: 21,
    team: "G"
  },
  {
    key: "saberTooth",
    activations: 2,
    move: 6,
    armor: 1,
    actions: [
      {key: "Grapple", type: "custom", target: [4], effect: `target.statuses.push("bound")`, canFocus: true},
      {key: "Gore", type: "melee", target: [3], damage: 2, canFocus: true}
    ],
    health: 3,
    criticalHealth: 0,
    points: 5,
    team: "G"
  },
  {
    key: "billman",
    activations: 2,
    move: 5,
    armor: 1,
    actions: [
      {key: "Hook", type: "custom", range: 1, target: [4], condition: `target.statuses.includes("dodge") && character.currentActivations > 1`, effect: `const dodgeIndex = target.statuses.findIndex(status => status == dodge); target.statuses = target.statuses.filter((status, index) => index == dodgeIndex)`, canFocus: true},
      {key: "Bill", type: "melee", range: 1, target: [4], damage: 3, canFocus: true},
    ],
    health: 4,
    criticalHealth: 1,
    points: 10,
    team: "G"
  },
  {
    key: "loneGuardWarrior",
    activations: 4,
    move: 3,
    armor: 2,
    actions: [
      {key: "Bastard Sword", type: "melee", target: [4], damage: 3, canFocus: true},
      {key: "Bastard Sword", type: "melee", target: [4], damage: 3, canFocus: true},
      {key: "Shield Bash", type: "melee", target: [4], damage: 2, canFocus: true},
    ],
    health: 5,
    criticalHealth: 2,
    points: 23,
    team: "G"
  },
  { 
    key: "loneGuardWatchmen",
    activations: 2,
    move: 5,
    armor: 2,
    actions: [
      {key: "Short Bow", type: "range", range: 10, target: [4], damage: 3, canFocus: true},
      {key: "Hand Weapon", type: "melee", target: [4], damage: 3, canFocus: true},
    ],
    health: 4,
    criticalHealth: 1,
    limit: 2,
    multiplier: 2,
    points: 9,
    team: "G"
  },
  {
    key: "arbolethSentinel",
    activations: 5,
    move: 2,
    armor: 2,
    actions: [
      {key: "War Claws", type: "melee", target: [4], damage: 4, canFocus: true},
      {key: "War Claws", type: "melee", target: [4], damage: 4, canFocus: true},
      {key: "Throw", type: "melee", target: [4, 2], damage: 2, canFocus: true},
    ],
    health: 6,
    criticalHealth: 1,
    points: 23,
    team: "G"
  },
  {
    key: "gnomeBattlesmith",
    activations: 4,
    move: 3,
    armor: 2,
    actions: [
      {key: "Precision Strike", type: "melee", target: [4, 3], damage: "target.armor + 3", range: 1, canFocus: true, condition: "target.armor > 1"},
      {key: "Poleaxe", type: "melee", target: [4], damage: 4, range: 1, canFocus: true},
      {key: "Precision Strike", type: "melee", target: [4, 3], damage: "target.armor + 3", range: 1, canFocus: true, condition: "target.armor <= 1"},
    ],
    health: 4,
    criticalHealth: 1,
    points: 23,
    team: "G"
  },
  {
    key: "gnomeGrenadier",
    activations: 4,
    move: 3,
    armor: 2,
    actions: [
      {key: "Gun", type: "range", target: [3, 2], damage: "target.armor + 3", range: 10, canFocus: true},
      {key: "Grenade", type: "range", target: [4], damage: 4, range: 6, canFocus: true},
      {key: "Flashbang", type: "custom", target: [4], effect: "target.x -= 3", canFocus: true},
    ],
    health: 4,
    criticalHealth: 1,
    points: 23,
    team: "G"
  },
  {
    key: "wildElfPathfinder",
    activations: 4,
    move: 3,
    armor: 1,
    actions: [
      {key: "Elderhorn Recurve", type: "range", target: [3], damage: 2, range: 10, canFocus: true},
      {key: "Shadow Strider", type: "custom", target: [4], effect: "target.x -= 6", canFocus: true},
    ],
    health: 4,
    criticalHealth: 1,
    points: 21,
    team: "G"
  },
  {
    key: "hellHoundBerserker",
    activations: 4,
    move: 3,
    armor: 2,
    actions: [
      {key: "Gut Spiller", type: "melee", target: [3], damage: "3 + character.missedAttacksThisActivation", canFocus: true},
      {key: "Gut Spiller", type: "melee", target: [3], damage: "3 + character.missedAttacksThisActivation", canFocus: true},
      {key: "Extreme Violence", type: "melee", target: [4, 2], damage: "4 + character.missedAttacksThisActivation", effect: "attackDidDamage && target.statuses.push('deadly')", canFocus: true},
    ],
    health: 5,
    criticalHealth: 2,
    points: 23,
    team: "G"
  },
  { 
    key: "shieldPig",
    activations: 3,
    move: 4,
    armor: 1,
    actions: [
      {key: "Shield Wall", type: "custom", condition: "friendCharacters.filter(friend => Math.abs(character.x - friend.x) <= 1).length", target: [3], effect: "character.statuses.push('shieldwall')", canFocus: true},
      {key: "Hand Weapon", type: "melee", target: [4], damage: 3, canFocus: true},
      {key: "Gore", type: "melee", target: [3], damage: 2, canFocus: true}
    ],
    health: 4,
    criticalHealth: 2,
    limit: 2,
    points: 16,
    team: "E"
  },
  {
    key: "soldierPig",
    activations: 3,
    move: 4,
    armor: 1,
    actions: [
      {key: "Halberd", type: "melee", target: [4, 2], damage: 5, range: 1, canFocus: true},
      {key: "Gore", type: "melee", target: [3], damage: 2, canFocus: true}
    ],
    tough: true,
    health: 4,
    criticalHealth: 2,
    limit: 2,
    points: 14,
    team: "E"
  },
  { 
    key: "axePig",
    activations: 3,
    move: 4,
    armor: 1,
    actions: [
      {key: "Battle Axe", type: "melee", target: [5], damage: 4, range: 1, canFocus: true},
      {key: "Gore", type: "melee", target: [3], damage: 2, canFocus: true}
    ],
    tough: true,
    health: 4,
    criticalHealth: 2,
    limit: 2,
    points: 14,
    team: "E"
  },
  { 
    key: "raiderPig",
    activations: 3,
    move: 4,
    armor: 1,
    actions: [
      {key: "Hand Axe", type: "melee", target: [5], damage: 4, canFocus: true},
      {key: "Gore", type: "melee", target: [3], damage: 2, canFocus: true},
      {key: "Dagger", type: "melee", target: [4], damage: 2, range: 6, canFocus: true},
    ],
    health: 4,
    criticalHealth: 2,
    limit: 2,
    points: 16,
    team: "E"
  },
  { 
    key: "pigWarlord",
    activations: 3,
    move: 4,
    armor: 2,
    actions: [
      {key: "Tireless Onslaught", type: "melee", target: [4], damage: 4, canFocus: true},
      {key: "Tireless Onslaught", type: "melee", target: [4], damage: 4, canFocus: true},
      {key: "Tireless Onslaught", type: "melee", target: [4], damage: 4, canFocus: true},
      {key: "Inhuman Aggression", type: "range", target: [4], damage: 3, effect: "character.x = target.x", canFocus: true},
    ],
    health: 6,
    criticalHealth: 1,
    points: 23,
    team: "E"
  },
  { 
    key: "sharkWarrior",
    activations: 4,
    move: 3,
    armor: 3,
    actions: [
      {key: "Dual Strike", type: "melee", target: [4, 3], damage: 4, effect: "character.duelStrikedTurnIndex = turnIndex", canFocus: true},
      {key: "Dual Strike2", type: "melee", target: [], damage: 2, condition: "character.duelStrikedTurnIndex == turnIndex", canFocus: false},
      {key: "Wavy Sword", type: "melee", target: [4], damage: 4, canFocus: true},
      {key: "Thrashing Bite", type: "melee", target: [5], damage: 3, canFocus: true},
    ],
    health: 5,
    criticalHealth: 2,
    points: 23,
    team: "E"
  },
  {
    key: "giblinFishers",
    activations: 2,
    move: 5,
    armor: 1,
    actions: [
      {key: "Hook", type: "custom", range: 1, target: [4], condition: `target.statuses.includes("dodge") && character.currentActivations > 1`, effect: `const dodgeIndex = target.statuses.findIndex(status => status == dodge); target.statuses = target.statuses.filter((status, index) => index == dodgeIndex)`, canFocus: true},
      {key: "Barbed Stick", type: "melee", range: 1, target: [4], damage: 2, canFocus: true},
    ],
    health: 3,
    points: 7,
    limit: 4,
    multiplier: 2,
    team: "E"
  },
  {
    key: "shrimpHarpooners",
    activations: 2,
    move: 5,
    armor: 1,
    actions: [
      {key: "Harpoon", type: "range", range: 8, target: [4], damage: 2, canFocus: true},
    ],
    health: 3,
    points: 7,
    limit: 4,
    multiplier: 2,
    team: "E"
  },
  { 
    key: "darkWanderer",
    activations: 4,
    move: 3,
    armor: 2,
    actions: [
      {key: "Frailty", type: "custom", range: 8, target: [4], condition: `target.statuses.includes("dodge") && character.currentActivations > 2`, effect: `target.statuses = target.statuses.filter(status => status != "dodge")`, canFocus: true},
      {key: "Dread Maul", type: "melee", target: [5], damage: 5, canFocus: true},
      {key: "Stone Knife", type: "melee", target: [3], damage: 3, canFocus: true},
    ],
    health: 5,
    criticalHealth: 2,
    points: 23,
    team: "E"
  },
  { 
    key: "darkWatcher",
    activations: 4,
    move: 3,
    armor: 2,
    actions: [
      {key: "Frailty", type: "custom", range: 8, target: [4], condition: `target.statuses.includes("dodge") && character.currentActivations > 2`, effect: `target.statuses = target.statuses.filter(status => status != "dodge")`, canFocus: true},
      {key: "Long Bow", type: "range", target: [4], range: 12, damage: 3, canFocus: true},
      {key: "Stone Knife", type: "melee", target: [3], damage: 3, canFocus: true},
    ],
    health: 5,
    criticalHealth: 2,
    points: 23,
    team: "E"
  },
  { 
    key: "boneStalker",
    activations: 3,
    move: 5,
    armor: 1,
    actions: [
      {key: "Gore", type: "melee", target: [3], damage: 2, canFocus: true},
      {key: "Gore", type: "melee", target: [3], damage: 2, canFocus: true},
    ],
    health: 4,
    criticalHealth: 1,
    limit: 4,
    points: 12,
    team: "E"
  },
  { 
    key: "boneFury",
    activations: 3,
    move: 5,
    armor: 1,
    actions: [
      {key: "Barbed Claws", type: "melee", range: 2, target: [3], damage: "2 + (character.currentHealth < 3 ? 2 : 0)", canFocus: true},
      {key: "Barbed Claws", type: "melee", range: 2, target: [3], damage: "2 + (character.currentHealth < 3 ? 2 : 0)", canFocus: true},
    ],
    health: 5,
    criticalHealth: 2,
    limit: 2,
    points: 16,
    team: "E"
  },
  { 
    key: "boneConstruct",
    activations: "character.currentHealth",
    move: 3,
    armor: 3,
    actions: [
      {key: "Reaping Claw", range: 1, type: "melee", target: [5], damage: 5, canFocus: true},
      {key: "Howl", range: 8, type: "melee", target: [5], damage: 3, canFocus: true}
    ],
    health: 4,
    criticalHealth: 0,
    points: 17, // factor in bone harvest, crappy solution :(
    requires: ["darkWatcher", "darkWanderer"],
    team: "E"
  },
  { 
    key: "swarmLord",
    activations: 5,
    move: 3,
    armor: 2,
    actions: [
      {key: "Strange Claws", type: "melee", target: [4], damage: 4, canFocus: true},
      {key: "Strange Claws", type: "melee", target: [4], damage: 4, canFocus: true},
      {key: "Strange Claws", type: "melee", target: [4], damage: 4, canFocus: true},
      {key: "Cruel Swarm", type: "spell", target: [2, 2], damage: 3, canFocus: true},
    ],
    health: 5,
    criticalHealth: 2,
    points: 26,
    team: "E"
  },
  { 
    key: "ogreRatarius",
    activations: 4,
    move: 3,
    armor: 2,
    actions: [
      {key: "Entangle", type: "custom", target: [4], condition: `target.statuses.includes("dodge") && character.currentActivations > 2`, effect: `target.statuses = target.statuses.filter(status => status != "dodge"); target.statuses.push("ogreADReduction")`, canFocus: true},
      {key: "Wicked Trident", range: 1, type: "melee", target: [4], damage: 4, effect: `if (attackDidDamage) heal(character, 1);`, canFocus: true},
      {key: "Wicked Trident", range: 1, type: "melee", target: [4], damage: 4, effect: `if (attackDidDamage) heal(character, 1);`, canFocus: true},
    ],
    health: 6,
    criticalHealth: 1,
    points: 26,
    team: "E"
  },
  { 
    key: "moldorfHearthguard",
    activations: 4,
    move: 3,
    armor: 2,
    actions: [
      {key: "Vicious Strike", type: "melee", target: [4, 3], damage: 5, canFocus: true},
      {key: "War Spear", range: 1, type: "melee", target: [4], damage: 4, canFocus: true},
    ],
    health: 5,
    criticalHealth: 2,
    points: 23
  },
  { 
    key: "moldorfArchaeologian",
    activations: 4,
    move: 3,
    armor: 1,
    actions: [
      {key: "Gem Cutter", type: "melee", target: [4], damage: "target.armor + 3", canFocus: true},
      {key: "Crossbow", range: 12, type: "range", target: [2, 2], damage: 3, canFocus: true},
    ],
    health: 4,
    criticalHealth: 1,
    points: 23
  },
  {
    key: "lotusBladesong",
    activations: 5,
    move: 3,
    armor: "1 + character.statuses.filter(status => status == 'dodge').length",
    actions: [
      {key: "Singing Blade", type: "melee", target: [3], damage: "(bonusCritDamage ? target.armor : 0) + 3", canFocus: true},
    ],
    health: 4,
    criticalHealth: 1,
    points: 26
  },
  {
    key: "akadhGungobs",
    activations: 2,
    move: 5,
    armor: 1,
    actions: [
      {key: "Gun", type: "range", target: [3, 2], damage: "target.armor + 3", range: 10, canFocus: true},
      {key: "Heavy Stock", type: "melee", target: [3], damage: 2, canFocus: true},
    ],
    health: 3,
    limit: 4,
    multiplier: 2,
    points: 9
  },
  {
    key: "akadhImmortal",
    activations: 4,
    move: 3,
    armor: 2,
    actions: [
      {key: "Frenzy", type: "custom", target: [], condition: "character.currentHealth > 4", effect: "const roll = Math.ceil(rollDice() / 2); character.currentActivations += roll; character.currentHealth -= roll;", canFocus: true},
      {key: "Tireless Assault", type: "melee", target: [4], damage: 4, canFocus: true},
      {key: "Tireless Assault", type: "melee", target: [4], damage: 4, canFocus: true},
      {key: "Tireless Assault", type: "melee", target: [4], damage: 4, canFocus: true},
    ],
    health: 5,
    criticalHealth: 2,
    points: 23
  }
];//.shuffle();