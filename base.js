const SCALE = 6;

const CARD_WIDTH = Math.round(180 * SCALE);
const CARD_HEIGHT = Math.round(250 * SCALE);

const CARD_OFFSET_X = Math.round(36.6666666667 * SCALE);
const CARD_OFFSET_Y = Math.round(18.6666666667 * SCALE);

const CARD_ROW_OFFSET = Math.round(6.66666666667 * SCALE);

const CARD_SLIDE_DURATION = 300;

var database;
var deckName = "";
var deck = [];

var libraryFocusCard;
var deckFocusCard;

var attachCharacter;

const cardScrollerEle = document.querySelector('cardScroller');
const cardLibraryListEle = document.querySelector('cardList.library');
const cardDeckListEle = document.querySelector('cardList.deck');
const cardTopControlsEle = document.querySelector('cardTopControls');

const searchInputEles = document.querySelectorAll('searchContainer input');
const searchInputClearEle = document.querySelector('searchContainer searchicon[type="clear"]');
const gridButtonEle = document.querySelector('.grid');

const removeFromDeckButtons = document.querySelectorAll("cardButton.removeFromDeck");
const showLibraryButton = document.querySelector("cardButton.showLibrary");
const searchButton = document.querySelector("cardButton.search");
const addUpgradeButtons = document.querySelectorAll("cardButton.addUpgrade");
const showDeckButton = document.querySelector("cardButton.showDeck");
const addToDeckButtons = document.querySelectorAll("cardButton.addToDeck");
const addCharacterButton = document.querySelector("add");
const attachUpgradeButton = document.querySelector("cardButton.attachUpgrade");

const deckTitleInput = document.querySelector("input#title");
const deckTitleInputMirror = document.querySelector("deckTitleMirror#titleMirror");

const removeLibraryCardEle = document.querySelector('menuControl.removeLibraryCard');
const returnEle = document.querySelector('menuControl.return');
const saveReturnEle = document.querySelector('menuControl.saveReturn');
const newDeckEle = document.querySelector('menuControl.newDeck');
const saveDeckEle = document.querySelector('menuControl.saveDeck');
const loadDeckEle = document.querySelector('menuControl.loadDeck');
const overlayMenuEle = document.querySelector('overlayMenu');

const awaitFrame = () => new Promise(resolve => {
  window.requestAnimationFrame(resolve);
});

const awaitTime = (time) => new Promise(resolve => {
  setTimeout(resolve, time);
});

const updateDeck = () => {
  // work out total points in deck :D
  const cards = deck.map(deckStore => [deckStore, ...(deckStore.upgrades || [])]).flat().map(deckStore => cardsStore[deckStore.uid]);
  const cost = cards.reduce((sum, card) => card ? sum + (parseInt(card.cost) || 0) : sum, 0);

  const deckCostEle = document.getElementById('points');

  deckCostEle.innerHTML = cost ? `&nbsp;(${cost})` : '';

  localStorage.setItem("deck", JSON.stringify(deck));
};

const scrollScroller = async (left) => {
  cardScrollerEle.scrollTo({left, top: 0, behavior: 'instant'});

  const startTime = Date.now();

  applyCarousel();

  do {
    await awaitFrame();
  } while (Date.now() - startTime < 1600);
}

const setDeckFocusCard = (newDeckFocusCard) => {
  // check if they're different
  if (deckFocusCard == newDeckFocusCard) return; 

  deckFocusCard = newDeckFocusCard;
};

const getCardFromPoint = (x, y, {canBePurchase, canBeChild} = {}) => {
  const pointEles = document.elementsFromPoint(x, y);
  const isLibrary = document.body.getAttribute("showing") == "library";

  const cardEles = pointEles
    // get the card that's in the right bucket, ie library when viewing library, deck when viewing deck
    .filter(ele => ele.parentElement && ["CARD", "PURCHASE", "IMPORT"].includes(ele.tagName))
    .map(ele => {
      if (ele.parentElement.tagName == "CARD") {
        return ele.parentElement;
      }
      return ele;
    })
    .filter(ele => {
      const closestCardList = ele.closest("cardList");

      if (!closestCardList) return false;

      return closestCardList.isSameNode(cardLibraryListEle) == isLibrary;
    });
    const cardEle = cardEles[0];

  if (cardEle?.tagName == 'CARD' || (canBePurchase && ["PURCHASE", "IMPORT"].includes(cardEle?.tagName))) {
    return cardEle;
  }
}

const getPointerCardEle = (touch, options) => {
  const x = touch.pageX;
  const y = touch.pageY;

  return getCardFromPoint(x, y, options);
};

const getCenterCardEle = (options) => {
  return getCardFromPoint(window.innerWidth * 0.5, window.innerHeight * 0.5, options);
};

const modalOverlayEle = document.querySelector("modalOverlay");
const modalOverlayTextEle = modalOverlayEle.querySelector("modalText");
const modalOverlayReturnButtonEle = modalOverlayEle.querySelector("modalButton#modalReturn");
const modalOverlayAcceptButtonEle = modalOverlayEle.querySelector("modalButton#modalAccept");
const showConfirm = async (content) => {
  // hide the background 
  modalOverlayEle.classList.remove("hidden");

  // change the text, return true if they hit true/false false. 
  modalOverlayTextEle.innerHTML = content;

  const returnValue = await new Promise((resolve, reject) => {
    const onFinished = (event) => {
      // remove the button binds.
      // unbind the buttons.
      const id = event.target.getAttribute("id");

      modalOverlayAcceptButtonEle.removeEventListener("click", onFinished);
      modalOverlayReturnButtonEle.removeEventListener("click", onFinished);

      resolve(id == "modalAccept");
    };
  
    modalOverlayAcceptButtonEle.addEventListener("click", onFinished);
    modalOverlayReturnButtonEle.addEventListener("click", onFinished);
  });

  // hide the overlay
  modalOverlayEle.classList.add("hidden");

  return returnValue;
};
const showInput = async (content) => {
  // hide the background 
  modalOverlayEle.classList.remove("hidden");

  // change the text, return true if they hit true/false false. 
  modalOverlayTextEle.innerHTML = content;

  // attach events to the text input

  const input = document.createElement("input");
  input.type = "text";
  input.id = "modalInput";

  input.addEventListener("keyup", (event) => {
    if (event.keyCode === 13) {
      modalOverlayAcceptButtonEle.click();

      return;
    }
  });

  modalOverlayTextEle.append(input);

  input.focus();

  const returnValue = await new Promise((resolve, reject) => {
    const onFinished = (event) => {
      // remove the button binds.
      // unbind the buttons.
      const id = event.target.getAttribute("id");

      modalOverlayAcceptButtonEle.removeEventListener("click", onFinished);
      modalOverlayReturnButtonEle.removeEventListener("click", onFinished);

      resolve(id == "modalAccept" && document.getElementById("modalInput").value);
    };
  
    modalOverlayAcceptButtonEle.addEventListener("click", onFinished);
    modalOverlayReturnButtonEle.addEventListener("click", onFinished);
  });

  // hide the overlay
  modalOverlayEle.classList.add("hidden");

  return returnValue;
};
const showOption = async (content, options) => {
  // hide the background 
  modalOverlayEle.classList.remove("hidden");
  modalOverlayEle.classList.add("option");

  // change the text, return true if they hit true/false false. 
  modalOverlayTextEle.innerHTML = content;

  // attach events to the text input

  const returnValue = await new Promise((resolve, reject) => {
    const onFinished = (event) => {
      // remove the button binds.
      // unbind the buttons.
      const id = event.target.getAttribute("id");

      modalOverlayReturnButtonEle.removeEventListener("click", onFinished);

      resolve(id == "modalReturn" ? false : event.target.innerHTML);
    };
  
    for (const option of options) {
      const optionButton = document.createElement("modalButton");
      optionButton.innerHTML = option;
      optionButton.classList.add("fullwidth");

      optionButton.addEventListener("click", onFinished);
  
      modalOverlayTextEle.append(optionButton);
    }
    
    modalOverlayReturnButtonEle.addEventListener("click", onFinished);
  });

  // hide the overlay
  modalOverlayEle.classList.add("hidden");

  awaitTime(200).then(() => {
    modalOverlayEle.classList.remove("option");
  });

  return returnValue;
}
const showToast = (() => {
  var currentToastTimeout;

  const toastEle = document.querySelector('toast');

  window.addEventListener('touchstart', () => {
    toastEle.style.setProperty('opacity', 0);
  });

  return (toastText) => {
    if (currentToastTimeout) {
      clearTimeout(currentToastTimeout);
    }

    toastEle.innerHTML = toastText;
    toastEle.style.setProperty('opacity', 0.9);

    currentToastTimeout = setTimeout(() => {
      toastEle.style.setProperty('opacity', 0);
    }, 4000);
  }
})();

const awaitScrollStop = async () => {
  const startTime = Date.now();

  var lastScrollLeft = cardScrollerEle.scrollLeft;

  await awaitFrame();

  while (lastScrollLeft != cardScrollerEle.scrollLeft) {
    lastScrollLeft = cardScrollerEle.scrollLeft;
    await awaitFrame();
  }
  return startTime - Date.now();
};

const getDeckUpgradeRangeScalar = (containerCardEle, _scrollY) => {
  const scrollY = _scrollY * -1.3;
  // work out how many cards are there to stack
  const upgradeCardEles = [...containerCardEle.children].filter(ele => ele.tagName == "CARD");

  const cardHeight = containerCardEle.clientHeight;

  const upgradeOffsetY = scrollY;

  // we'll make the top card go down by a card height
  const rangeCardOffsetY = (0.175 / upgradeCardEles.length) * cardHeight;
  const rangeScalar = (-upgradeOffsetY) / cardHeight;

  return rangeScalar;
}

// initially as you scroll down, only the container moves down
// then after that hits the bottom, the next card starts to go towards the bototm
// so everything needs to raise till the container hits the bottom.
const applyDeckCardTopScroll = (containerCardEle, rangeScalar, setScalar = true) => {
  if (!containerCardEle) return;

  if (setScalar) {
    containerCardEle.unsnappedRangeScalar = rangeScalar;
    containerCardEle.unsnappedTime = Date.now();
  }
  containerCardEle.currentRangeScalar = rangeScalar;

  // work out how many cards are there to stack
  const upgradeCardEles = [...containerCardEle.children].filter(ele => ele.tagName == "CARD");

  if (upgradeCardEles.length == 0) {
    containerCardEle.style.setProperty("transform", `translateY(0px)`);
    return;
  }

  const defaultCardHeight = containerCardEle.clientHeight;
  const defaultRangeCardOffsetY = (0.175 / upgradeCardEles.length) * defaultCardHeight;
  const defaultContainerOffsetY = Math.min(1, rangeScalar) * -defaultCardHeight;

  for (const upgradeCardIndex in upgradeCardEles) {
    const cardHeight = containerCardEle.clientHeight;
    const rangeCardOffsetY = (0.175 / upgradeCardEles.length) * cardHeight;
    const containerOffsetY = Math.min(1, rangeScalar) * -cardHeight;

    const upgradeCardEle = upgradeCardEles[upgradeCardIndex];

    const offsetCardOffsetY = rangeCardOffsetY * (parseInt(upgradeCardIndex) + 1);
    const upgradeScalar = Math.max(-0, Math.min(1, rangeScalar - (parseInt(upgradeCardIndex) + 1)));

    const minPoint = 0;
    const maxPoint = cardHeight;

    const range = maxPoint - minPoint;
    const rangeValue = range * upgradeScalar;

    const scrollDown = containerOffsetY + rangeValue - Math.max(containerOffsetY - offsetCardOffsetY, offsetCardOffsetY);

    upgradeCardEle.style.setProperty("transform", `translateY(${scrollDown}px) translateZ(-${upgradeCardIndex + 1}px)`);
  }

  // slowly move the container down
  const range = defaultRangeCardOffsetY * rangeScalar * 0.5;

  containerCardEle.style.setProperty("transform", `translateY(${-defaultContainerOffsetY + range}px)`);
  // find the snap point stuff
}

const addCharacterToDeck = (data, updateDeckStore = true) => {
  const uid = data.uid;
  if (!uid) return;

  const cardStore = cardsStore[uid];
  if (!cardStore) return;

  const libraryCardEles = [...cardLibraryListEle.children];
  const cardEle = libraryCardEles.find(ele => ele.getAttribute('uid') == uid);
  if (!cardEle) return;

  const wrapperEle = document.createElement("cardDeckWrapper");
  cardDeckListEle.insertBefore(wrapperEle, addCharacterButton);

  const cardCloneEle = cardEle.cloneNode(true);
  cardCloneEle.className = "";
  wrapperEle.append(cardCloneEle);

  // create mark boxes...
  (cardStore.markBoxes || []).forEach(([boxX, boxY, marked]) => {

    const boxEle = document.createElement("markBox");

    cardCloneEle.append(boxEle);

    boxEle.style.setProperty("top", `${boxY * 100}%`);
    boxEle.style.setProperty("left", `${boxX * 100}%`);
    boxEle.style.setProperty("transform", `translate(-50%, -50%) rotate(${Math.random() * 10 - 5}deg)`);

    boxEle.addEventListener("click", () => {
      boxEle.classList.toggle("marked");
    });
  });

  if (updateDeckStore) {
    deck.push({
      uid
    });
  }

  if (data.upgrades) {
    data.upgrades.forEach((upgrade) => {
      addUpgradeToCharacter(upgrade.uid, cardCloneEle, data, false);
    })
  }
  applyDeckCardTopScroll(cardCloneEle, 0, false);

  return cardCloneEle;
};

const getUpgradeType = (upgrade) => /(tactic|item|potion|spell|weapon)/.exec(cardsStore[upgrade.uid].types)[0];
const canCharacterEquipUpgrade = (attachCharacter, upgradeUid) => {
  // assume that it can take the upgrade, due to the filter.
  const upgradeBean = cardsStore[upgradeUid];
  if (!upgradeBean) return false;

  const characterBean = cardsStore[attachCharacter.uid];
  if (!characterBean) return false;

  const upgradeType = getUpgradeType(upgradeBean);
  if (!upgradeType) return true;
  
  const acceptableUpgradeTypes = characterBean.upgradeTypes
    .split(" ")
    .map(s => s.trim())
    .reduce((acc, type) => {
      acc[type] = acc[type] ? acc[type] + 1 : 1;

      return acc;
    }, {})

  // check the number of upgrades of that type, the character already has
  const currentCharacterUpgradeTypes = [...(attachCharacter.upgrades || []), upgradeBean]
    .map(getUpgradeType)
    .filter(v => v == upgradeType);

  for (const currentCharacterUpgradeType of currentCharacterUpgradeTypes) {
    if (acceptableUpgradeTypes[currentCharacterUpgradeType] === undefined) continue;

    acceptableUpgradeTypes[currentCharacterUpgradeType]--;

    if (acceptableUpgradeTypes[currentCharacterUpgradeType] < 0) return false;
  }

  return true;
};

const addUpgradeToCharacter = (upgradeUID, characterCardEle, deckCharacter, updateDeckStore = true) => {
  if (!upgradeUID) return;

  const upgradeCardStore = cardsStore[upgradeUID];
  if (!upgradeCardStore) return;

  const libraryCardEles = [...cardLibraryListEle.children];
  const cardEle = libraryCardEles.find(ele => ele.getAttribute('uid') == upgradeUID);
  if (!cardEle) return;

  const cardCloneEle = cardEle.cloneNode(true);
  characterCardEle.append(cardCloneEle);

  // create mark boxes...
  (upgradeCardStore.markBoxes || []).forEach(([boxX, boxY, marked]) => {
    const boxEle = document.createElement("markBox");

    cardCloneEle.append(boxEle);

    boxEle.style.setProperty("top", `${boxY * 100}%`);
    boxEle.style.setProperty("left", `${boxX * 100}%`);
    boxEle.style.setProperty("transform", `translate(-50%, -50%) rotate(${Math.random() * 10 - 5}deg)`);

    boxEle.addEventListener("click", () => {
      boxEle.classList.toggle("marked");
    });
  });

  if (updateDeckStore) {
    deckCharacter.upgrades = deckCharacter.upgrades || [];
    deckCharacter.upgrades.push({
      uid: upgradeUID
    });
    awaitFrame()
    .then(awaitFrame)
    .then(
      () => {
      applyDeckCardTopScroll(characterCardEle, 0, false);
      });
  }

  return cardCloneEle
};

const performSearchForString = (newSearchText) => {
  const currentFocusCard = getCenterCardEle();

  const libraryCardEles = [...cardLibraryListEle.children];
  const previousActiveLibraryCardEles = libraryCardEles.filter(e => !e.classList.contains('inactive'));

  setSearchText(newSearchText);
  
  const currentActiveLibraryCardEles = libraryCardEles.filter(e => !e.classList.contains('inactive'));

  if (currentActiveLibraryCardEles.length != previousActiveLibraryCardEles.length) {
    // scroll to the current focus card
    const currentFocusCardIndex = currentActiveLibraryCardEles.indexOf(currentFocusCard);

    if (currentFocusCardIndex != -1) {
      const currentFocusCardEle = currentActiveLibraryCardEles[currentFocusCardIndex];
      const scrollLeft = currentFocusCardEle.offsetLeft;
      scrollScroller(scrollLeft);
    } else {
      scrollScroller(0);
    }
  }

  applyCarousel();

  // try to maintain the scroll?

  cardTopControlsEle.classList.toggle('searched', !!getSearchText());
};

const loadDeckFromLocal = () => {
  // clear the deck.
  [...cardDeckListEle.children].filter(ele => ele.tagName == "CARDDECKWRAPPER").forEach(ele => ele.remove());
  
  var localJsonDeck = [];
  var localDeckName = "";
  try {
    localJsonDeck = JSON.parse(localStorage.getItem('deck') || '[]');
    localDeckName = localStorage.getItem('deckName') || '';
  } catch (e) { }

  const libraryCards = [...cardLibraryListEle.children].map(ele => ({uid: ele.getAttribute("uid")}));

  // inital deck production
  deck = localJsonDeck.filter(v => v && libraryCards.find(card => card.uid == v.uid));
  deckName = localDeckName ;

  deckTitleInput.value = deckName;
  deckTitleInputMirror.innerText = deckName || deckTitleInput.placeholder;

  updateDeck();

  for (const cardData of deck) {
    addCharacterToDeck(cardData, false);
  }

  var localJsonDecks = {};

  try {
    localJsonDecks = JSON.parse(localStorage.getItem('decks') || '{}');
  } catch (e) { }

  // update the deckstore
  [...document.querySelectorAll("menuControl.saveSlot")].forEach((saveSlotEle) => {
    const saveSlotIdx = saveSlotEle.getAttribute("idx");
    const localJsonDeckIdx = localJsonDecks[saveSlotIdx] || {deckName: "Empty Slot"};

    saveSlotEle.innerText = `${saveSlotIdx}. ${localJsonDeckIdx.deckName}`;
  });
}

// initialize the database.
const init = async () => {
  // constantly measure the scrolling


  const updateAppSize = () => {
    const doc = document.documentElement;
    doc.style.setProperty('--screen-height', `${window.innerHeight}px`);
    doc.style.setProperty('--screen-width', `${window.innerWidth}px`);

    window?.plugins?.safearea?.get(
      (result) => {
        // elegantly set the result somewhere in app state
        doc.style.setProperty('--safe-area-top', `${result.top}px`);
        doc.style.setProperty('--safe-area-bottom', `${result.bottom}px`);

        doc.style.setProperty('--screen-height', `${window.innerHeight - result.top - result.bottom}px`);
      },
      (error) => {
        // maybe set some sensible fallbacks?
      }
    );
  }
  document.addEventListener("resume", updateAppSize);
  window.addEventListener('resize', updateAppSize)
  updateAppSize()

  database = await idb.openDB('relicbladeCards', 3, {
    upgrade: (db, oldVersion) => {
      if (oldVersion < 2) {
        localStorage.setItem("deck", JSON.stringify([]));
      }
      if (oldVersion < 3) {
        try {
          db.deleteObjectStore('cards');
        } catch (err) {
          // ignore error
        }
      }

      const cardObjectStore = db.createObjectStore('cards', { keyPath: 'index', autoIncrement: true }); 

      cardObjectStore.createIndex('uid', 'uid', { unique: true });

    }});

  await (async () => {
    const baseTransaction = database.transaction('cards', 'readwrite');
    const baseObjectStore = baseTransaction.objectStore('cards');

    const allCards = await baseObjectStore.getAll();

    for (const baseCardKey of Object.keys(baseCards)) {
      if (allCards.find(card => card.uid == baseCardKey)) continue;

      try {
        await baseObjectStore.add({uid: baseCardKey, image: baseCards[baseCardKey]});
      } catch (err) {
        console.error(err);
      }
    }
  })();
  
  const transaction = database.transaction('cards');
  const cardStore = transaction.objectStore('cards');

  const cards = (await cardStore.getAll() || []).sort((ca, cb) => ca.index - cb.index);

  for (const card of cards) {
    loadCard(card);
  }

  applyFilters();
  applyCarousel();
  document.body.className = '';

  [...document.querySelectorAll('label.fileUpload')].map((ele) => {
    ele.addEventListener('click', async (event) => {
      document.body.className = 'loading';
      overlayMenuEle.className = 'hidden';

      // accept a pdf
      try {
        const [fileHandle] = await window.showOpenFilePicker({types: [{accept: {'application/pdf': ['.pdf']}}]});
        const file = await fileHandle.getFile();

        const reader = new FileReader();
        reader.onloadend = async () => {
          try {
            await loadCardsFromUrl(reader.result);

            applyFilters();
            applyCarousel();
          } finally {
            document.body.className = '';
          }
        }
        reader.readAsDataURL(file)
      } catch (err) {
        console.log(err);
        document.body.className = '';
      }
    });
  });

  loadDeckFromLocal();

  Object.keys(filters)
    .forEach(key => {
      const object = filters[key];
      object.ele.addEventListener('click', () => {
        const startsInactive = object.ele.classList.contains('inactive');
        object.ele.classList.toggle('inactive');
    
        const isActive = !!startsInactive;
        object.active = isActive;
        
        applyFilters();
        applyCarousel();
      });
    });
  scrollScroller(0);
  // cardScrollerEle.scrollTo({left: 0, top: 0, behavior: 'instant'});
    
  applyFilters();
  applyCarousel();

  const onShowLibrary = async (event) => {
    if (event) {
      attachCharacter = undefined;
    }
    
    document.body.className = '';

    if (document.body.getAttribute("showing") !== 'deck') return;
    const centerCardEle = getCenterCardEle();

    if (centerCardEle) {
      console.log(`Save deck card - ${centerCardEle.getAttribute("uid")}`);
    }

    setDeckFocusCard(centerCardEle);
    // get the top level element

    // scroll to the last library focused' card
    document.body.setAttribute("showing", "library");

    applyCarousel();
    
    await awaitScrollStop();

    const screenWidthOffset = window.innerWidth * 0.5;
    const cardScrollX = (libraryFocusCard?.offsetLeft || 0) - screenWidthOffset;

    scrollScroller(cardScrollX);
  };

  showLibraryButton.addEventListener('click', onShowLibrary);
  searchButton.addEventListener('click', async () => {
    // check if we're already searching
    if (document.body.getAttribute("showing") !== 'library') return;

    const hasSearched = cardTopControlsEle.classList.contains('searched');
    if (hasSearched) {
      searchButton.classList.remove("searched");

      performSearchForString("");
      return;
    }
    
    const searchValue = await showInput("Search for a card");
    performSearchForString(searchValue || "");

    if (!searchValue) return;
    searchButton.classList.add("searched");
  });
  showDeckButton.addEventListener('click', async () => {
    if (document.body.getAttribute("showing") !== 'library') return;

    setSubFilter();

    const currentCard = getCenterCardEle({canBePurchase: true});
    libraryFocusCard = currentCard;

    // scroll to the last library focused' card
    document.body.setAttribute("showing", "deck");

    await awaitScrollStop();

    const screenWidthOffset = window.innerWidth * 0.5;
    const cardScrollX = (deckFocusCard?.parentElement.offsetLeft || 0) - screenWidthOffset;
    scrollScroller(cardScrollX);
  });
  addUpgradeButtons.forEach(addUpgradeButton => {
    addUpgradeButton.addEventListener('click', () => {
      if (document.body.getAttribute("showing") !== 'deck') return;
  
      const deckCurrentCardEle = getCenterCardEle();
      if (!deckCurrentCardEle) {
        showToast("Can't attach upgrade to that");
        return;
      }
  
      const uid = deckCurrentCardEle.getAttribute("uid");
      const cardStore = cardsStore[uid];
      if (!cardStore) return;
  
      const currentCardIndex = [...cardDeckListEle.children].indexOf(deckCurrentCardEle.parentElement);
  
      setSubFilter('upgrade', { classes: cardStore.classes, upgradeType: cardStore.upgradeTypes});
  
      setDeckFocusCard(deckCurrentCardEle);
      attachCharacter = deck[currentCardIndex];
  
      onShowLibrary();
    });
  });
  addCharacterButton.addEventListener('click', () => {
    if (document.body.getAttribute("showing") !== 'deck') return;

    setSubFilter('character');

    showLibraryButton.click();
  });

  removeFromDeckButtons.forEach(removeForDeckButton => {
    removeForDeckButton.addEventListener('click', async () => {
      const currentCardEle = getCenterCardEle();

      if (!currentCardEle) {
        showToast('Can\'t remove that');
        return;
      }

      const currentCardIndex = [...cardDeckListEle.children].indexOf(currentCardEle.parentElement);

      if (currentCardIndex == -1) {
        showToast('Can\'t remove that');
        return;
      };

      const currentFocusSubIndex = currentCardEle.currentRangeScalar || 0;

      if (!currentFocusSubIndex) {
        const confirmValue = await showConfirm('Are you sure you want to remove this card, and all it\'s upgrades from this deck?');
        await awaitTime(200);
  
        if (!confirmValue) return;

        deck.splice(currentCardIndex, 1);
        currentCardEle.parentElement.remove();
      } else {
        const upgradeIndex = currentFocusSubIndex - 1;

        deck[currentCardIndex].upgrades.splice(upgradeIndex, 1);
        const upgradeCardEle = [...currentCardEle.querySelectorAll("card")][upgradeIndex];

        upgradeCardEle.remove();

        applyDeckCardTopScroll(currentCardEle, 0);
      }
      updateDeck();

      showToast(`Card removed from deck`);
    }); 
  });
  addToDeckButtons.forEach(addToDeckButton => {
    addToDeckButton.addEventListener('click', () => {
      const currentCardEle = getCenterCardEle();
      if (!currentCardEle) return;
  
      const uid = currentCardEle.getAttribute("uid");
  
      const cardEleClone = addCharacterToDeck({uid});
      if (!cardEleClone) return;
  
      updateDeck();
      setDeckFocusCard(cardEleClone);
      showToast(`Card added to deck`);
      showDeckButton.click();
    });
  });
  attachUpgradeButton.addEventListener('click', async (e) => {
    if (!attachCharacter) return;

    const currentCardEle = getCenterCardEle();
    if (!currentCardEle) return;

    const uid = currentCardEle.getAttribute("uid");
    if (!uid) return;

    // check if the character can use the card
    const isAcceptable = canCharacterEquipUpgrade(attachCharacter, uid);
    
    if (!isAcceptable) {
      // prompt the user saying the character can't ususally use this
      const upgradeType = getUpgradeType(cardsStore[uid]);
      const confirmValue = await showConfirm(`This character already has too many, ${upgradeType}s. Do you want to still add this?`);
      await awaitTime(200);

      if (!confirmValue) return;
    }

    const cardEleClone = addUpgradeToCharacter(uid, deckFocusCard, attachCharacter, true);

    if (!cardEleClone) return;
    updateDeck();

    showToast(`Upgrade Attached`);
    showDeckButton.click();
  });

  searchInputEles.forEach(searchInputEle => searchInputEle.addEventListener('keyup', async event => {
    if (event.keyCode === 13) {
      event.preventDefault();
      event.target.blur();
    }

    performSearchForString(searchInputEle.value);
  }));
  searchInputClearEle.addEventListener("click", () => {
    searchInputEles.forEach(searchInputEle => searchInputEle.value = "");

    setSearchText("");

    applyCarousel();
    cardTopControlsEle.classList.toggle('searched', !!getSearchText());
  })

  removeLibraryCardEle.addEventListener('click', async (event) => {
    overlayMenuEle.className = 'hidden';
    if (event.cancelable) event.preventDefault();

    setTimeout(async () => {
      const currentCardEle = getCenterCardEle();
      if (!currentCardEle) return;
      
      const confirmValue = await showConfirm('Are you sure you want to remove this card from your library?');

      await awaitTime(200);

      if (!confirmValue) return;
  
      // remove it from the library.
      const transaction = database.transaction(['cards'], 'readwrite');
      const objectStore = transaction.objectStore('cards');
  
      const index = parseInt(currentCardEle.getAttribute('index'))
  
      await objectStore.delete(index);
  
      showToast('Card Removed');
      currentCardEle.remove();
    }, 200);
  });

  overlayMenuEle.addEventListener('click', e => {
    if (e.target !== overlayMenuEle) return;
    overlayMenuEle.className = 'hidden';
  });

  document.querySelector('ham').addEventListener('click', () => {
    overlayMenuEle.className = '';
    overlayMenuEle.setAttribute("showing", "mainMenu");
  });

  gridButtonEle.addEventListener('click', () => {
    const currentDisplayType = document.body.getAttribute("displayType");

    document.body.setAttribute("displayType", currentDisplayType == 'grid' ? '' : 'grid');

    if (currentDisplayType != "grid") return;
    applyCarousel();
  });

  cardScrollerEle.addEventListener("scroll", event => {
    if (document.body.getAttribute("showing") != "library") return;
    if (document.body.getAttribute("displayType") == "grid") return;

    applyCarousel();
  });

  cardScrollerEle.addEventListener("touchstart", event => {
    // check if we're in the deck
    if (document.body.getAttribute("showing") != "deck") return;
    
    const touch = event.touches[0];

    setDeckFocusCard(getPointerCardEle(touch));
    if (!deckFocusCard) return;
  
    deckFocusCard.touchStart = Date.now();
    deckFocusCard.deckDragging = false;

    return;
  }, {passive: false});
  cardScrollerEle.addEventListener("touchmove", event => {
    // check if we're in the deck
    if (document.body.getAttribute("showing") != "deck") return;
    if (!deckFocusCard) return;
    
    const touch = event.touches[0];

    if (!deckFocusCard.deckDragging) {
      deckFocusCard.currentRangeScalar = deckFocusCard.currentRangeScalar || 0;
    
      deckFocusCard.scrollY = 0;
      deckFocusCard.momentumY = 0;

      deckFocusCard.previousX = touch.pageX;
      deckFocusCard.previousY = touch.pageY;

      deckFocusCard.hasVerticallity = false;

      deckFocusCard.deckDragging = true;
    }

    const currentX = touch.pageX;
    const currentY = touch.pageY;

    const deltaX = currentX - deckFocusCard.previousX;
    const deltaY = currentY - deckFocusCard.previousY;
  
    deckFocusCard.previousX = currentX;
    deckFocusCard.previousY = currentY;

    deckFocusCard.momentumY = deckFocusCard.momentumY * 0.8;

    if (Math.abs(deltaX) >= Math.abs(deltaY)) {
      return;
    }
    if (event.cancelable) event.preventDefault();

    deckFocusCard.hasVerticallity = true;

    const rangeDelta = getDeckUpgradeRangeScalar(deckFocusCard, deltaY);
    const rangeScalar = deckFocusCard.currentRangeScalar + rangeDelta;
    
    deckFocusCard.momentumY += (rangeDelta || 0);

    applyDeckCardTopScroll(deckFocusCard, rangeScalar);
  }, {passive: false});
  
  cardScrollerEle.addEventListener("touchend", async (event) => {
    if (document.body.getAttribute("showing") != "deck") return;

    if (!deckFocusCard) return;
    if (!deckFocusCard.deckDragging) return;

    const focusCard = deckFocusCard;

    const upgradeCardEles = [...focusCard.children].filter(ele => ele.tagName == "CARD");

    if (!focusCard.hasVerticallity) return;

    // do the flickkkkk
    // animate it toward the closest scalar;
    const unsnappedTime = focusCard.unsnappedTime;
    const unsnappedRangeScalar = focusCard.unsnappedRangeScalar;
    const momentumScaled = focusCard.momentumY * 2;
    const maxCardIndex = Math.ceil(unsnappedRangeScalar);
    const minCardIndex = Math.floor(unsnappedRangeScalar);
    const targetRangeScalar = Math.max(0, Math.min(upgradeCardEles.length, maxCardIndex, Math.max(0, minCardIndex, Math.round(unsnappedRangeScalar + momentumScaled))));

    // animate to the card.
    const animationDuration = CARD_SLIDE_DURATION;

    focusCard.targetRangeScalar = targetRangeScalar;

    console.log(targetRangeScalar);

    do {
      if (unsnappedTime != focusCard.unsnappedTime) return;
      await awaitFrame();

      var delta = Math.min(1, (Date.now() - unsnappedTime) / animationDuration);
      const tweenDelta = delta * delta;

      const range = targetRangeScalar - unsnappedRangeScalar;

      const newRangeScalar = unsnappedRangeScalar + range * tweenDelta;

      applyDeckCardTopScroll(focusCard, newRangeScalar, false);
      // move the thing toward it.
    } while (delta < 1);

    // do the next crap.
  });

  cardScrollerEle.addEventListener("contextmenu", async (event) => {
    event.preventDefault();
    // ignore if vertical
    if (window.innerHeight > window.innerWidth) return;

    const selectedCardEle = event.target;

    if (!selectedCardEle) return;
    if (selectedCardEle.tagName != "CARD") return;

    // are we in grid mode
    if (document.body.getAttribute("showing") == "library" && document.body.getAttribute("displayType") == "grid") return;
    
    // add selected to the card
    awaitTime(100).then(() => {
      selectedCardEle.classList.toggle("highlight", true);
    })
  
    // are we in deck mode?
    if (document.body.getAttribute("showing") == "deck") {
      // center the card
      const currentFocusCardEle = selectedCardEle;
      const scrollLeft = currentFocusCardEle.closest("cardDeckWrapper").offsetLeft;
      scrollScroller(scrollLeft - window.innerWidth * 0.5);

      // show a modal with add upgrade, remove, cancel
      const optionResult = await showOption("", ["Add Upgrade", "Remove"]);

      selectedCardEle.classList.toggle("highlight", false);

      await awaitTime(200);
      
      if (optionResult == "Add Upgrade") {
        addUpgradeButtons[0].click();
      } else if (optionResult == "Remove") {
        removeFromDeckButtons[0].click();
      }

      return;
    }

    // center the card
    const currentFocusCardEle = selectedCardEle;
    const scrollLeft = currentFocusCardEle.offsetLeft;
    scrollScroller(scrollLeft - window.innerWidth * 0.5);

    // are we in attach upgrade mode?
    if (attachCharacter) {
      const attachedCharacterStore = cardsStore[attachCharacter.uid];
      const confirmResult = await showConfirm(`Do you want to attach this card to ${attachedCharacterStore.name}?`);
      
      selectedCardEle.classList.toggle("highlight", false);

      await awaitTime(200);
      // await scrolling stopping
      await awaitScrollStop();

      if (confirmResult) {
        attachUpgradeButton.click();
      }

      return;
    }

    // finally we're in add character mode
    const confirmResult = await showConfirm(`Do you want to add this character to your deck?`);

    await awaitTime(200);

    selectedCardEle.classList.toggle("highlight", false);

    // await scrolling stopping
    await awaitScrollStop();

    if (confirmResult) {
      addToDeckButtons[0].click();
    }

    return;
  });

  cardScrollerEle.addEventListener("click", async (event) => {
    const clickedCardEle = event?.target;
    if (!clickedCardEle) return;
    if (clickedCardEle.tagName != "CARD") return;
  
    if (document.body.getAttribute("showing") !== 'library') {
      // do events for horizontal view.
      return;
    }

    if (document.body.getAttribute("displayType") !== "grid") {
      const centerCard = getCenterCardEle();
  
      if (centerCard.getAttribute("index") !== clickedCardEle.getAttribute("index")) {
        // scroll to focus the clicked card, both in the x and "y" coordinates
  
        // work out the centre of the screen
        const cardWidth = clickedCardEle.clientWidth;
        const cardsPerScreen = Math.floor(window.innerWidth / cardWidth);
  
        const offsetCenterLeft = cardsPerScreen * 0.5 * cardWidth;
        
        // check if we're in the center already
        
        const timeToStop = await awaitScrollStop();
  
        if (timeToStop < 50) {
          const cardScrollX = clickedCardEle.offsetLeft || 0;
          scrollScroller(cardScrollX - offsetCenterLeft);
        }
        
        return;
      }

      // do the weird cards
      
      switch (clickedCardEle.tagName) {
        case "PURCHASE":
          try {
            // open a browser window.
            window.open("https://relicblade.com", "_blank");
          } catch (error) {
            showToast(error.message);
          }
          return;
        case "IMPORT":
          document.querySelector("#fileUpload").click();
          return;
      }

      // do the cool cards.
    }
  
    if (document.body.getAttribute("displayType") == "grid") {
      // target the new card and swap display type
      document.body.setAttribute("displayType", "");
  
      applyCarousel();
  
      const timeToStop = await awaitScrollStop();
      
      // work out the centre of the screen
      const cardWidth = clickedCardEle.clientWidth;
      const cardsPerScreen = Math.floor(window.innerWidth / cardWidth);

      const offsetCenterLeft = cardsPerScreen * 0.5 * cardWidth;

      const cardScrollX = clickedCardEle.offsetLeft || 0;
      scrollScroller(cardScrollX - offsetCenterLeft);
  
      return;
    }
  
    if (document.body.getAttribute("displayType") != "deck") return;
  
    
    
    // get the xy of where was clicked
    // get card bounds
    // const cardBounds = currentCardEle.getBoundingClientRect();
  
    // const markBoxX = (e.clientX - cardBounds.left) / cardBounds.width;
    // const markBoxY = (e.clientY - cardBounds.top) / cardBounds.height;
  
    // cardStore.markBoxes = cardStore.markBoxes || [];
    // cardStore.markBoxes.push([markBoxX, markBoxY, 0]);
  
    // console.log(`box marked: ${markBoxX}, ${markBoxY}`);
  });

  const onCarouselInteraction = event => {
    if (!event.touches) return;

    const touch = event.touches[0];
    const touchX = touch.clientX - carouselCanvasEle.offsetLeft;
    const scrollRatio = touchX / carouselCanvasEle.clientWidth;
    const newScroll = cardLibraryListEle.clientWidth * scrollRatio;

    scrollScroller(newScroll);
    // cardScrollerEle.scrollTo({left: newScroll, top: 0, behavior: 'instant'});
  }

  carouselEle.addEventListener("touchstart", onCarouselInteraction);
  carouselEle.addEventListener("touchmove", onCarouselInteraction);

  deckTitleInput.addEventListener("input", event => {
    deckTitleInputMirror.innerText = deckTitleInput.value || deckTitleInput.placeholder;
    deckName = deckTitleInput.value;
    localStorage.setItem("deckName", deckName);
  });

  const handleSave = async (saveSlotIdx) => {
    var localJsonDecks = {};
  
    try {
      localJsonDecks = JSON.parse(localStorage.getItem('decks') || '{}');
    } catch (e) { }

    // check if a save is already up there
    if (localJsonDecks[saveSlotIdx]) {
      const confirmValue = await showConfirm(`Are you sure you want to override ${localJsonDecks[saveSlotIdx].deckName || 'Untitled Deck'}?`);

      await awaitTime(200);

      if (!confirmValue) {
        return;
      }
    }
    // save to that slot
    localJsonDecks[saveSlotIdx] = {deck, deckName};

    localStorage.setItem('decks', JSON.stringify(localJsonDecks));

    loadDeckFromLocal();
    // hide the menu
    overlayMenuEle.classList.add("hidden");

    showToast(`Deck, ${deckName} saved to slot ${saveSlotIdx}`);
  };

  const handleLoad = async (loadSlotIdx) => {
    var localJsonDecks = {};
  
    try {
      localJsonDecks = JSON.parse(localStorage.getItem('decks') || '{}');
    } catch (e) { }

    // check if a save is already up there
    if (!localJsonDecks[loadSlotIdx]) {
      showToast(`Deck slot, ${loadSlotIdx} is empty`);
      return;
    }

    if (deck.length) {
      const confirmValue = await showConfirm("If your current deck is unsaved, it will be lost. Are you sure you want to load a new deck?");

      await awaitTime(200);

      if (!confirmValue) {
        return;
      }
    }
    // save to that slot
    deck = localJsonDecks[loadSlotIdx].deck || {};
    deckName = localJsonDecks[loadSlotIdx].deckName || "";

    localStorage.setItem('deck', JSON.stringify(deck));
    localStorage.setItem('deckName', deckName);

    loadDeckFromLocal();
    // hide the menu
    overlayMenuEle.classList.add("hidden");

    showToast(`Deck, ${deckName || "Untitled Deck"} loaded!`);
  };

  [...document.querySelectorAll("menuControl.saveSlot")].forEach((saveSlotEle) => {
    // add event listeners to each to save 
    saveSlotEle.addEventListener("click", (event) => {
      const isSaveState = overlayMenuEle.getAttribute("saveMode") == "save";
      const saveIdx = saveSlotEle.getAttribute("idx");

      if (isSaveState) {
        handleSave(saveIdx);
      } else {
        handleLoad(saveIdx);
      }
    });
  });

  saveReturnEle.addEventListener("click", event => {
    // show deckslots
    overlayMenuEle.setAttribute("showing", "mainMenu");
  });

  saveDeckEle.addEventListener("click", event => {
    // show deckslots
    overlayMenuEle.setAttribute("showing", "savesMenu");
    overlayMenuEle.setAttribute("saveMode", "save");
  });

  loadDeckEle.addEventListener("click", event => {
    // show decklists
    overlayMenuEle.setAttribute("showing", "savesMenu");
    overlayMenuEle.setAttribute("saveMode", "load");
  });

  newDeckEle.addEventListener("click", async (event) => {
    // create new deck
    const value = await showConfirm("If your current deck is unsaved, it will be lost. Are you sure you want to create a new deck?");

    await awaitTime(200);

    if (!value) {
      return;
    }

    overlayMenuEle.classList.add("hidden");

    localStorage.setItem("deck", "[]");
    localStorage.setItem("deckName", "");

    loadDeckFromLocal();
  });
  
  returnEle.addEventListener("click", event => {
    overlayMenuEle.classList.add("hidden");
  });
};

init();