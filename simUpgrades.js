[
  {
    "key": "healthPotion",
    "type": "potion",
    "points": 2,
    "effect": `character.actions.unshift({
      'key': 'Apply Potion',
      'type': 'custom',
      'target': [1],
      'condition': 'const healCharacter = getPriotiryHealthTarget(character, friends, 3); healCharacter.maxHealth - healCharacter.currentHealth > 2',
      'effect': 'const healCharacter = getPriotiryHealthTarget(character, friends, 3); heal(healCharacter);',
      'canFocus': false
    })`
  },
  {
    "key": "cudgel",
    "type": "weapon",
    "conditional": "character.keywords.includes('pig')",
    "points": -2,
    "effect": `for (const action in character.actions) {
      if (action.key === 'attack' && action.keyword == "weapon") {
        action.target = [3];
        action.range = 0.5;
        action.damage = 1;
      }
    }`
  },
  {
    "key": "magicRing",
    "type": "item",
    "points": 1,
    "effect": `const uid = getUID(); character.actions.unshift({
      key: 'Magic Ring',
      type: 'custom',
      target: [],
      condition: '!character.hasUsedRing',
      effect: 'character.states.push("dodgeRing")'
    })`
  },
]

