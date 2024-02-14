
const fs = require('fs');


Object.defineProperty(Array.prototype, 'shuffle', {
	'value': function() {
		var n = this.slice(0);
	
		for (var j, x, i = n.length; i; j = Math.floor(Math.random() * i), x = n[--i], n[i] = n[j], n[j] = x);
	
		return n;
	},
	'enumerable': false
});

const getId = (() => {
  let idIncrementer = 0;

  return () => ++idIncrementer;
})();

const characterStore = fs.readFileSync('./simCharacters.js', 'utf8');
const upgradeStore = fs.readFileSync('./simUpgrades.js', 'utf8');

const UPGRADES = JSON.parse(upgradeStore);
const CHARACTERS = JSON.parse(characterStore);
const BASE_ACTIONS = [
  {key: "Charge", type: "charge", condition: "target.x != character.x", target: [0], range: "character.move + character.combatRange"},
  {key: "Improvised Attack", type: "melee", damage: 0, target: [0], range: "character.move"},
  {key: "Move", type: "move", target: [0], range: 999},
  {key: "Move", type: "move", target: [0], range: 999},
  {key: "Move", type: "move", target: [0], range: 999},
  {key: "Move", type: "move", target: [0], range: 999},
  {key: "Move", type: "move", target: [0], range: 999},
  {key: "Move", type: "move", target: [0], range: 999},
];

const LOG = false;

const getCharacterOfKey = (key, x, team) =>{
  const characterData = CHARACTERS.find(character => character.key == key);
  const character = JSON.parse(JSON.stringify(characterData));

  character.uid = `${key}-${getId()}`;
  character.x = x;
  character.team = team;
  character.currentHealth = character.health;
  character.statuses = [];
  character.activated = false;

  character._armor = character.armor;
  character._activations = character.activations;

  if (!character.actions) throw `${character.key} has no actions`;

  return {
    ...character,
    get activations() {
      const character = this;
      return typeof(character._activations) == "string" ? eval(character._activations) : character._activations;
    },
    get combatRange() {
      return character.actions.filter(a => a.type == "melee").reduce((h, v) => Math.max(h, v.range), 0.5) || 0.5;
    },  
    get armor() {
      const character = this;
      return typeof(character._armor) == "string" ? eval(character._armor) : character._armor;
    }
  };
};

const rollDice = () => {
  return Math.ceil(Math.random() * 6);
}

const DEPRIORITIZE_DODGED_TARGETS = true;

const getTargetArmor = (target, team) => {
  const hasShieldWallWithinRange = team
    .filter(character => character.id != target.id)
    .filter(character => character.status.includes("shieldwall"))
    .filter(character => Math.abs(character.x - target.x) <= 1);
  
  return target.armor + hasShieldWallWithinRange ? 1 : 0;
}

const getCharactersInRange = (target, characters, range = 0.5) => {
  return characters.filter(character => Math.abs(character.x - target.x) <= character.combatRange);
}

const getPriotiryHealthTarget = (target, characters, range = 0.5) => {
  const closeCharacters = characters
    .filter(character => !character.isConstruct)
    .filter(character => !character.isSummon)
    .filter(character => Math.abs(character.x - target.x) <= character.combatRange);

  if (closeCharacters.length == 0) return null;
  if (closeCharacters.length == 1) return closeCharacters[0];

  return closeCharacters.reduce(
    (characterA, characterB) => 
      (characterA.maxHealth - characterA.currentHealth) * characterA.points > 
      (characterB.maxHealth - characterB.currentHealth) * characterB.points ? characterA : characterB);
}

const getCharacterEngagements = (target, enemeies) => {
  return enemeies.filter(enemy => {
    const enemyMeleeActions = enemy.actions
      .filter(action => action.type == "melee");

    const enemyMaxRange = (enemyMeleeActions.length == 0) ? 0.5 : 
      enemy.actions
        .filter(action => action.type == "melee")
        .reduce((highest, action) => Math.max(highest || 0.5, action.range || 0.5));
    
    return Math.abs(enemy.x - target.x) <= enemyMaxRange;
  });
};

const getDodgeTarget = (character, friends, enemies) => {
  // check if a friend is closer to the enemy.
  const nextAbility = character.actions.find(action => ["melee", "range", "spell"].includes(action.type));

  const isRange = !nextAbility || nextAbility.type != "melee";
  const engagedEnemies = getCharacterEngagements(character, enemies);
  
  const enemyCanRemoveDodgeTokens = enemies
    .filter(enemy => !enemy.activated)
    .filter(enemy => {
      const hasDodgeTokenAbility = enemy.actions.find(action => action.effect && action.effect.includes("dodge"));

      return hasDodgeTokenAbility;
    });

  if (enemyCanRemoveDodgeTokens) return 0;

  // check if there are many friends remaining?
    // near death?
  if (character.currentHealth <= 2 && !(friends.length <= 2 && enemies.length > 2)) {
    return 2;
  }

  if (isRange && engagedEnemies.length) {
    // probably put out at least one dodge token
    return 1;
  }

  if (!isRange && engagedEnemies.length) {
    // work out if you can kill the enemy?
    const target = engagedEnemies.reduce((lowest, next) => next.currentHealth < lowest.currentHealth ? next : lowest, engagedEnemies[0]);
    const damage = typeof(nextAbility.damage) == "string" ? eval(nextAbility.damage) : nextAbility.damage;

    if (damage > target.currentHealth + target.armor + (target.statuses.includes("dodge") ? 3.5 : 0)) {
      return character.currentActivations > 3 ? 1 : 0;
    }

    // one dodge token per enemy
    return engagedEnemies.length;
  }

  // work out if there are ranged attackers
  // work out if an enemy is vulnerable from your attacks
  // check if any of the unactivated enemies do shit with dodge tokens(like ogre, and warden)
  return character.currentActivations > 2 ? 1 : 0;
};

const doCombat = (characters) => {
  const teams = characters
    .map(character => character.team)
    .filter((team, index, array) => array.indexOf(team) == index)
    .reduce((object, team) => ({...object, [team]: characters.filter(character => character.team == team)}), {});
  const teamKeys = Object.keys(teams);

  const performActivation = (character) => {
    const friendCharacters = teams[character.team];
    const enemyCharacters = characters.filter(enemy => enemy.team != character.team);

    character.activated = true;
    character.currentActivations = character.activations;
    character.hasFocused = false;
    character.missedAttacksThisActivation = 0;

    // TODO: check to apply statuses -- poison
    if (character.currentHealth <= character.criticalHealth) {
      character.currentActivations -= 1;
    }

    if (character.statuses.includes("poison")) {
      character.currentActivations -= 1;
    }

    if (character.statuses.includes("ogreADReduction")) {
      character.currentActivations -= 1;
    }

    // clear statuses
    character.statuses = [...character.statuses.filter(status => ["deadly"].includes(status))];

    const targetDodgeCount = getDodgeTarget(character, friendCharacters, enemyCharacters)

    if (targetDodgeCount) {
      if (targetDodgeCount > 2) {
        character.hasFocused = true;
        character.statuses.push("dodge");
        character.currentActivations -= 1;
      }
      character.statuses.push("dodge");
      character.currentActivations -= 1;
    }

    const getTurnActions = () => {
      const characterWillCharge = !!character.actions.find(action => action.type == "melee");
      
      const actions = [...character.actions, ...BASE_ACTIONS]
        .filter(action => action.type != "charge" || characterWillCharge);
      actions.forEach(action => action.activated = false);

      return actions;
    }
    
    const turnActions = getTurnActions();
    
    const getEnemiesWithinRange = (range) => {
      const distanceSortedEnemies = enemyCharacters
        .filter((enemy) => {
          const distance = Math.abs(character.x - enemy.x);

          return distance <= range;
        })
        .sort((enemyA, enemyB) => {
          const distanceA = Math.abs(character.x - enemyA.x);
          const distanceB = Math.abs(character.x - enemyB.x);

          return distanceA - distanceB;
        })

      return distanceSortedEnemies.filter(enemy => enemy.currentHealth > 0);
    };

    const checkActionHit = (action, isFocused) => {
      const diceToRoll = action.target.length + (isFocused ? 1 : 0);
      const rolledDice = [...Array(diceToRoll)].map(rollDice);

      const aggTarget = action.target.reduce((s, v) => s + v, 0);
      const aggDice = rolledDice.reduce((s, v) => s + v, 0);

      const hits = aggDice >= aggTarget
      if (!hits) return [hits, 0];

      // so it hits
      const missingCritDice = action.target.filter(targetDie => !rolledDice.includes(targetDie));
      const missingTargetDice = rolledDice.filter(rolledDie => !action.target.includes(rolledDie));

      const isCrit = !missingCritDice && !missingTargetDice;
      const critDice = isCrit ? diceToRoll : 0;

      return [hits, critDice];
    }

    const perfromAction = (action, target, critDiceCount) => {
      // used for some abilities
      const heal = (healTarget, value) => {
        healTarget.currentHealth = Math.min(healTarget.health, healTarget.currentHealth + value);

        if (value > 0) {
          healTarget.statuses = healTarget.statuses.filter(status => status != "deadly");
        }
      };
      let attackDidDamage = false;

      switch(action.type) {
        case "custom":
          break;
        case "charge":
          character.currentActivations += 1;
          character.x = target.x;
          break;
        case "move":
          if (target.x < character.x) {
            character.x -= character.move;
          } else {
            character.x += character.move;
          }
          break;
        case "dodge":
          character.statuses.push("dodge");
          break;
        case "melee":
        case "range":
          const targetDodgeTokenIndex = target.statuses.indexOf("dodge");

          // remove dodge token
          target.statuses.splice(targetDodgeTokenIndex, 1);

          const bonusCritDamage = critDiceCount == 1 ? 2 : [...Array(critDiceCount)].reduce((sum) => sum + rollDice(), 0);
          // do damage rolls
          
          const attackBaseDamage = typeof(action.damage) == "string" ? eval(action.damage) : action.damage;

          // check if the characters vs the damage?
          const willDodge = targetDodgeTokenIndex != -1 && (attackBaseDamage > (target.armor + 1) || bonusCritDamage);

          const challengeDamage = attackBaseDamage + rollDice() + bonusCritDamage;
          const challengeDefence = target.armor + rollDice() + (willDodge ? rollDice() : 0);

          const damageTaken = Math.max(0, challengeDamage - challengeDefence);

          if (damageTaken > 0) attackDidDamage = true;

          target.currentHealth = Math.max(0, target.currentHealth - damageTaken);

          if (LOG) console.log(`${character.uid} - (${challengeDamage}(${attackBaseDamage}) vs ${challengeDefence}(${target.armor})) = deals ${damageTaken} to ${target.uid}(${willDodge ? 'dodged' : 'not dodged'})`);
          break;
      }

      if (action.effect) {
        if (LOG) console.log(`evalating, ${action.effect}`);

        eval(action.effect);
      }
    };

    const getActionTargets = (action) => {
      // check range
      const actionRange = (typeof(action.range) == "string" ? eval(action.range) : action.range) || 0.5;
      const enemiesInRange = getEnemiesWithinRange(actionRange)
        .filter(target => {
          if (action.type != "range") return true;
          const targetRangeToCharacter = Math.abs(character.x - target.x);

          return targetRangeToCharacter > 0.5;
        })
        .filter(target => {
          return !action.condition || eval(action.condition);
        });

      if (!enemiesInRange) return false;
      return enemiesInRange;
    }

    while (character.currentActivations > 0) {
      let pickAction = turnActions.find(action => {
        // check if we have enough activations
        if (action.activated) return false;
        if (character.currentActivations < action.target.length) return false;

        const targets = getActionTargets(action);

        return !!targets.length;
      });

      if (!pickAction) break;
      
        // we're using the action
      pickAction.activated = true;

      // pick a target
      const actionTargets = getActionTargets(pickAction);
      const rankedTargets = DEPRIORITIZE_DODGED_TARGETS 
        ? actionTargets.sort((targetA, targetB) => targetA.statuses.includes("dodge") - targetB.statuses.includes("dodge"))
        : actionTargets;

      const target = rankedTargets[0];

      const willFocus = pickAction.canFocus && (!character.hasFocused && (character.currentActivations > pickAction.target.length));

      character.hasFocused = character.hasFocused || willFocus;
      
      const actionActivationUsed = pickAction.target.length + (willFocus ? 1 : 0);
      character.currentActivations -= actionActivationUsed;

      const [hits, critDiceCount] = checkActionHit(pickAction, willFocus);  

      const range = Math.abs(character.x - target.x);

      if (LOG) console.log(`${character.uid} uses ${pickAction.key} - at range ${range} - using ${actionActivationUsed} dice, ${hits ? "hitting" : "missing"} ${target && `- ${target.uid}`}`);

      if (!hits) {
        character.missedAttacksThisActivation += 1;
        continue;
      }

      perfromAction(pickAction, target, critDiceCount);
    };
  };

  const getAliveTeams = () => teamKeys.filter(team => characters.find(character => character.currentHealth > 0 && character.team == team));

  var turnIndex = 0;

  do {
    if (LOG) console.log("=== TURN START ===");
    let teamIndex = Math.floor(Math.random() * teamKeys.length);
    // alternate who gets to go first

    // perform recovery phase
    characters.forEach(character => character.activated = false);

    do {
      teamIndex = (teamIndex + 1) % teamKeys.length;

      const teamCheck = teamKeys[teamIndex];
      const nextCharacter = characters
        .filter(character => character.currentHealth)
        .sort((characterA, characterB) => characterA.currentHealth - characterB.currentHealth)
        .find(character => character.team == teamCheck && !character.activated);

      if (nextCharacter) {
        if (LOG) console.log(`${nextCharacter.uid} - activated`);
        performActivation(nextCharacter);
        if (LOG) console.log(`${nextCharacter.uid} - finished`);
      }

    } while (characters.find(character => (!character.activated && character.currentHealth)));
    // cycle through teams activating character by character till all character activated

    turnIndex += 1;
  } while (getAliveTeams().length > 1);

  const winningTeam = getAliveTeams()[0];

  if (LOG) console.log(`$$$ Team ${winningTeam} Wins $$$`);

  return winningTeam
};

const findNextWarband = (warbandStore, pointTarget, characterList = CHARACTERS, currentWarband = [], currentCharacterIndex = 0, currentUsedPoints = 0) => {
  // make warbands close to the point target
  const lowestCostMinion = characterList.reduce((lowest, character) => Math.min(lowest, character.points), 100);

  if (currentUsedPoints + lowestCostMinion > pointTarget) {
    // we can't add anymore, add a threshold so we don't have crappy warbands messing things up
    if (currentUsedPoints < pointTarget - 6) {
      return;
    }

    warbandStore.push(currentWarband);

    return;
  }

  if (currentCharacterIndex >= characterList.length) return;

  const nextCharacter = characterList[currentCharacterIndex];
  const nextCharacterInWarbandCount = currentWarband.filter(key => nextCharacter.key == key).length;
  const nextPoints = currentUsedPoints + nextCharacter.points;

  if (nextCharacterInWarbandCount < (nextCharacter.limit || 1)) {
    if (nextPoints < pointTarget) {
      const nextWarband = [...currentWarband, nextCharacter.key];

      findNextWarband(warbandStore, pointTarget, characterList, nextWarband, currentCharacterIndex, nextPoints);
    }
  }

  findNextWarband(warbandStore, pointTarget, characterList, currentWarband, currentCharacterIndex + 1, currentUsedPoints);
}
const getAllPossibleWarbands = (pointTarget, team) => {
  const warbands = [];

  const characterList = CHARACTERS.filter(character => !team || !character.team || character.team == team)
  findNextWarband(warbands, pointTarget, characterList);

  // remove invalids

  return warbands.filter(warband => {
    const multipliedCharacters = warband
      .filter(key => CHARACTERS.find(character => character.key == key).multiplier)
      .filter((key, index, array) => array.indexOf(key) == index);

    // check if the multiplied characters are in the correct numbers
    for (const mulitpliedCharacter of multipliedCharacters) {
      const multiplier = CHARACTERS.find(character => character.key == mulitpliedCharacter).multiplier;
      const count = warband.filter(key => key == mulitpliedCharacter).length;

      if (count % multiplier != 0) return false;
    }

    return true;
  });
}

const goodWarbandsKeys = getAllPossibleWarbands(50, "G");
const evilWarbandsKeys = getAllPossibleWarbands(50, "E");

const MATCH_COUNT = 24;

const warbandResults = [];

for (const evilWarbandKeys of evilWarbandsKeys) {
  for (const goodWarbandKeys of goodWarbandsKeys) {
    const advocateWins = [...Array(MATCH_COUNT)].map(() => {
      const goodWarband = goodWarbandKeys.map(key => getCharacterOfKey(key, 4, "advocate"));
      const evilWarband = evilWarbandKeys.map(key => getCharacterOfKey(key, 20, "adversary"));

      return doCombat([
        ...goodWarband,
        ...evilWarband
      ])
    }).filter(team => team == 'advocate').length;

    const ratio = advocateWins / MATCH_COUNT;

    const returnValue = {evil: evilWarbandKeys, good: goodWarbandKeys, ratio};

    warbandResults.push(returnValue);
  }
}

const characterResults = [];

for (const character of CHARACTERS) {
  if (character.team == "G") {
    const keyResults = warbandResults.filter(result => result.good.includes(character.key));
    const ratio = keyResults.reduce((sum, result) => sum + result.ratio, 0) / keyResults.length;

    characterResults.push({key: character.key, ratio});
  } else if (character.team == "E") {
    const keyResults = warbandResults.filter(result => result.evil.includes(character.key));
    const ratio = 1 - (keyResults.reduce((sum, result) => sum + result.ratio, 0) / keyResults.length);

    characterResults.push({key: character.key, ratio});
  } else {
    // neutral
    const goodKeyResults = warbandResults.filter(result => result.good.includes(character.key));
    const goodRatio = goodKeyResults.reduce((sum, result) => sum + result.ratio, 0) / goodKeyResults.length;

    const evilKeyResults = warbandResults.filter(result => result.evil.includes(character.key));
    const evilRatio = 1 - (evilKeyResults.reduce((sum, result) => sum + result.ratio, 0) / evilKeyResults.length);

    characterResults.push({key: character.key, ratio: Math.max(goodRatio, evilRatio), goodRatio, evilRatio});
  }
}

// get the top ten and bottom ten warbands.

console.log('=== DUMP ===')
console.log(JSON.stringify(warbandResults.sort((a, b) => b.ratio - a.ratio)));
console.log('=== RESULTS ===')
console.log(JSON.stringify(characterResults.sort((a, b) => b.ratio - a.ratio)));