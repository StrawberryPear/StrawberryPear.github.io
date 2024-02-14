
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

const MATCH_COUNT = 1;

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