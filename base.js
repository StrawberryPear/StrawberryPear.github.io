const SCALE = 1.5;

const CARD_WIDTH = Math.round(179.333333 * SCALE);
const CARD_HEIGHT = Math.round(244.666667 * SCALE);

const CARD_OFFSET_X = Math.round(36.6666666667 * SCALE);
const CARD_OFFSET_Y = Math.round(18.6666666667 * SCALE);

const CARD_ROW_OFFSET = Math.round(6.66666666667 * SCALE);

var PDFJS = window['pdfjs-dist/build/pdf'];
PDFJS.GlobalWorkerOptions.workerSrc = './pdf.worker.js';

var database;
var deck = [];

var libraryFocusCard;
var deckFocusCard;

var attachCharacter;

const cardScrollerEle = document.querySelector('cardScroller');
const cardLibraryListEle = document.querySelector('cardList.library');
const cardDeckListEle = document.querySelector('cardList.deck');
const cardTopControlsEle = document.querySelector('cardTopControls');

const searchInputEle = document.querySelector('searchContainer input');
const searchInputClearEle = document.querySelector('searchContainer searchicon[type="clear"]');
const removeLibraryCardEle = document.querySelector('menuControl.removeLibraryCard');
const gridButtonEle = document.querySelector('topButton.grid');

const removeFromDeckButton = document.querySelector("cardButton.removeFromDeck");
const showLibraryButton = document.querySelector("cardButton.showLibrary");
const addUpgradeButton = document.querySelector("cardButton.addUpgrade");
const showDeckButton = document.querySelector("cardButton.showDeck");
const addToDeckButton = document.querySelector("cardButton.addToDeck");
const addCharacterButton = document.querySelector("add");
const attachUpgradeButton = document.querySelector("cardButton.attachUpgrade");

const overlayMenuEle = document.querySelector('overlayMenu');

const awaitFrame = () => new Promise(resolve => {
  window.requestAnimationFrame(resolve);
});

const updateDeck = () => {
  // work out total points in deck :D
  const cards = deck.map(deckStore => [deckStore, ...(deckStore.upgrades || [])]).flat().map(deckStore => store[deckStore.uid]);
  const cost = cards.reduce((sum, card) => card ? sum + (parseInt(card.cost) || 0) : sum, 0);

  const deckCostEle = document.getElementById('points');

  deckCostEle.innerHTML = cost ? `&nbsp;(${cost})` : '';

  localStorage.setItem("deck", JSON.stringify(deck));
};

const scrollScroller = async (left) => {
  cardScrollerEle.scrollTo({left, top: 0, behavior: 'instant'});

  const startTime = Date.now();

  do {
    await awaitFrame();
  } while (Date.now() - startTime < 1600);
}

const setDeckFocusCard = (newDeckFocusCard) => {
  // check if they're different
  if (deckFocusCard == newDeckFocusCard) return; 

  deckFocusCard = newDeckFocusCard;

  console.trace("changed deckfocus card", deckFocusCard?.getAttribute('uid'));
};

const getCurrentDeckCardEle = () => {
  const pointEles = document.elementsFromPoint(window.innerWidth * 0.5, window.innerHeight * 0.5);
  const cardWrapperEle = pointEles.find(ele => ["CARDDECKWRAPPER"].includes(ele.tagName));
  if (!cardWrapperEle) return;
  const cardEle = cardWrapperEle.querySelector("card");

  return cardEle;
};

const getCurrentCardEle = (canBePurchase) => {
  const pointEles = document.elementsFromPoint(window.innerWidth * 0.5, window.innerHeight * 0.5);
  const cardEle = pointEles.find(ele => ["CARD", "PURCHASE", "IMPORT"].includes(ele.tagName));

  if (cardEle?.tagName == 'CARD' || (canBePurchase && ["PURCHASE", "IMPORT"].includes(cardEle?.tagName))) {
    return cardEle;
  }
};

const showModal = ((contentEle) => {

})();

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

  const cardHeight = containerCardEle.clientHeight;
  const rangeCardOffsetY = (0.175 / upgradeCardEles.length) * cardHeight;
  const containerOffsetY = Math.min(1, rangeScalar) * -cardHeight;

  for (const upgradeCardIndex in upgradeCardEles) {
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

  containerCardEle.style.setProperty("transform", `translateY(${-containerOffsetY}px)`);
  // find the snap point stuff
}

const addCharacterToDeck = (data, updateDeckStore = true) => {
  const uid = data.uid;
  if (!uid) return;

  const cardStore = store[uid];
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

const addUpgradeToCharacter = (upgradeUID, characterCardEle, deckCharacter, updateDeckStore = true) => {
  if (!upgradeUID) return;

  const upgradeCardStore = store[upgradeUID];
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
  }

  return cardCloneEle
};

// initialize the database.
const init = async () => {
  const updateAppSize = () => {
    const doc = document.documentElement;
    doc.style.setProperty('--screen-height', `${window.innerHeight}px`);
    doc.style.setProperty('--screen-width', `${window.innerWidth}px`);
  }
  window.addEventListener('resize', updateAppSize)
  updateAppSize()

  database = await idb.openDB('relicbladeCards', 2, {
    upgrade: (db, oldVersion) => {
      if (oldVersion == 1) {
        localStorage.setItem("deck", JSON.stringify([]));
        db.deleteObjectStore('cards');
      }

      const cardObjectStore = db.createObjectStore('cards', { keyPath: 'index', autoIncrement: true }); 

      cardObjectStore.createIndex('uid', 'uid', { unique: true });
    }});

  const transaction = database.transaction('cards');
  const cardStore = transaction.objectStore('cards');

  const cards = (await cardStore.getAll() || []).sort((ca, cb) => ca.index - cb.index);

  for (const card of cards) {
    loadCard(card);
  }

  applyFilters();
  applyCarousel();
  document.body.className = '';

  [...document.querySelectorAll('label.fileUpload')].map(ele => ele.addEventListener('click', event => {
    overlayMenuEle.className = 'hidden';
  }));

  [...document.querySelectorAll('input[type="file"]')].map(ele => {
    ele.addEventListener('change', (event) => {
      document.body.className = 'loading';
      try {
        let [file] = event.target.files;
        if (!file) {
          document.body.className = '';
        };

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
      } catch (error) {
        console.error(error);
        alert('Something failed... Sorry.')
      }
    })
  });

  var jsonDeck = [];
  try {
    jsonDeck = JSON.parse(localStorage.getItem('deck') || '[]');
  } catch (e) { }

  // inital deck production
  deck = jsonDeck.filter(v => v && cards.find(card => card.uid == v.uid));
  updateDeck();

  for (const cardData of deck) {
    addCharacterToDeck(cardData, false);
  }

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

  showLibraryButton.addEventListener('click', async () => {
    document.body.className = '';

    if (document.body.getAttribute("showing") !== 'deck') return;
    setDeckFocusCard(getCurrentDeckCardEle());
    // get the top level element

    // scroll to the last library focused' card
    document.body.setAttribute("showing", "library");

    applyCarousel();

    const time = Date.now();
    while (Date.now() - time < 600) {
      await awaitFrame();

      const cardScrollX = libraryFocusCard?.offsetLeft || 0;
      // cardScrollerEle.scrollTo({left: cardScrollX, top: 0, behavior: 'instant'});
      scrollScroller(cardScrollX);
    }
  });
  showDeckButton.addEventListener('click', async () => {
    if (document.body.getAttribute("showing") !== 'library') return;

    setSubFilter();

    const currentCard = getCurrentCardEle(true);
    libraryFocusCard = currentCard;

    // scroll to the last library focused' card
    document.body.setAttribute("showing", "deck");

    const time = Date.now();
    while (Date.now() - time < 600) {
      await awaitFrame();

      const cardScrollX = deckFocusCard?.parentElement.offsetLeft || 0;
      scrollScroller(cardScrollX);
      // cardScrollerEle.scrollTo({left: cardScrollX, top: 0, behavior: 'instant'});
    }
  });
  addUpgradeButton.addEventListener('click', () => {
    if (document.body.getAttribute("showing") !== 'deck') return;

    const deckCurrentCardEle = getCurrentDeckCardEle();
    if (!deckCurrentCardEle) {
      showToast("Can't attach upgrade to that");
      return;
    }

    const uid = deckCurrentCardEle.getAttribute("uid");
    const cardStore = store[uid];
    if (!cardStore) return;

    const currentCardIndex = [...cardDeckListEle.children].indexOf(deckCurrentCardEle.parentElement);

    // TODO: get what upgrades the character can use
    setSubFilter('upgrade', { classes: cardStore.classes, upgradeType: cardStore.upgradeTypes});

    setDeckFocusCard(deckCurrentCardEle);
    attachCharacter = deck[currentCardIndex];

    showLibraryButton.click();
  });
  addCharacterButton.addEventListener('click', () => {
    if (document.body.getAttribute("showing") !== 'deck') return;

    setSubFilter('character');

    showLibraryButton.click();
  });

  removeFromDeckButton.addEventListener('click', () => {
    const currentCardEle = getCurrentDeckCardEle();

    if (!currentCardEle) return;

    const currentCardIndex = [...cardDeckListEle.children].indexOf(currentCardEle.parentElement);

    if (currentCardIndex == -1) {
      showToast('Can\'t remove that');
      return;
    };

    const currentFocusSubIndex = currentCardEle.currentRangeScalar || 0;

    if (!currentFocusSubIndex) {
      const confirmValue = confirm('Are you sure you want to remove this card, and all it\'s upgrades from this deck?');
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
  addToDeckButton.addEventListener('click', () => {
    const currentCardEle = getCurrentCardEle();
    if (!currentCardEle) return;

    const uid = currentCardEle.getAttribute("uid");

    const cardEleClone = addCharacterToDeck({uid});
    if (!cardEleClone) return;

    updateDeck();
    setDeckFocusCard(cardEleClone);
    showToast(`Card added to deck`);
    showDeckButton.click();
  });
  attachUpgradeButton.addEventListener('click', (e) => {
    if (!attachCharacter) return;

    const currentCardEle = getCurrentCardEle();
    if (!currentCardEle) return;

    const uid = currentCardEle.getAttribute("uid");
    if (!uid) return;

    const cardEleClone = addUpgradeToCharacter(uid, deckFocusCard, attachCharacter, true);

    if (!cardEleClone) return;
    updateDeck();

    showToast(`Upgrade Attached`);
    showDeckButton.click();
  });
  cardScrollerEle.addEventListener('click', (e) => {
    // get the card that was clicked
    const cardEle = e.target;

    if (!["CARD", "PURCHASE", "IMPORT"].includes(cardEle.tagName)) {
      // not a valid type;
      return;
    }

    if (document.body.getAttribute("displayType") == "grid") {
      // target the new card and swap display type
      document.body.setAttribute("displayType", "");

      applyCarousel();

      const scrollLeft = cardEle.offsetLeft;
      scrollScroller(scrollLeft);
      // cardScrollerEle.scrollTo({left: scrollLeft, top: 0, behavior: 'instant'});

      return;
    }

    // if it's a grid, convert it to a non-grid with that card in view
    
    const currentCardEle = getCurrentCardEle(true);
    if (!currentCardEle) return;
    
    const uid = currentCardEle.getAttribute("uid");
    const cardStore = store[uid];
    if (!cardStore) return;

    // get the xy of where was clicked
    // get card bounds
    // const cardBounds = currentCardEle.getBoundingClientRect();

    // const markBoxX = (e.clientX - cardBounds.left) / cardBounds.width;
    // const markBoxY = (e.clientY - cardBounds.top) / cardBounds.height;

    // cardStore.markBoxes = cardStore.markBoxes || [];
    // cardStore.markBoxes.push([markBoxX, markBoxY, 0]);

    // console.log(`box marked: ${markBoxX} - ${markBoxY}`);

    switch (currentCardEle.tagName) {
      case "PURCHASE":
        if (!currentCardEle.classList.contains("bought")) {
          window.open("https://relicblade.com/shop?category=Cards");
        }
        break;
    }
  });

  searchInputEle.addEventListener('keyup', async () => {
    searchText = searchInputEle.value;

    applyFilters();
    applyCarousel();

    cardTopControlsEle.classList.toggle('searched', !!searchText);
  });
  searchInputClearEle.addEventListener("click", () => {
    searchText = "";
    searchInputEle.value = "";

    applyFilters();
    applyCarousel();
    cardTopControlsEle.classList.toggle('searched', !!searchText);
  })

  removeLibraryCardEle.addEventListener('click', async (e) => {
    overlayMenuEle.className = 'hidden';
    e.preventDefault();

    setTimeout(async () => {
      const currentCardEle = getCurrentCardEle();
      if (!currentCardEle) return;
      
      const confirmValue = confirm('Are you sure you want to remove this card from your library?');
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
  });

  gridButtonEle.addEventListener('click', () => {
    const currentDisplayType = document.body.getAttribute("displayType");

    document.body.setAttribute("displayType", currentDisplayType == 'grid' ? '' : 'grid');

    if (currentDisplayType != "grid") return;
    applyCarousel();
  });

  var scrollTimeout;
  cardScrollerEle.addEventListener("scroll", event => {
    updateCarousel();
    //TODO make the buttons update
  });

  cardScrollerEle.addEventListener("touchstart", event => {
    // check if we're in the deck
    if (document.body.getAttribute("showing") != "deck") return;

    setDeckFocusCard(getCurrentDeckCardEle());
    if (!deckFocusCard) return;

    const touch = event.touches[0];
  
    deckFocusCard.currentRangeScalar = deckFocusCard.currentRangeScalar || 0;
    
    deckFocusCard.scrollY = 0;
    deckFocusCard.momentumY = 0;

    deckFocusCard.startX = touch.pageX;
    deckFocusCard.startY = touch.pageY;

    deckFocusCard.previousX = touch.pageX;
    deckFocusCard.previousY = touch.pageY;
  });
  cardScrollerEle.addEventListener("touchmove", event => {
    // check if we're in the deck
    if (document.body.getAttribute("showing") != "deck") return;

    if (!deckFocusCard) return;

    const touch = event.touches[0];

    const currentX = touch.pageX;
    const currentY = touch.pageY;

    const deltaX = currentX - deckFocusCard.previousX;
    const deltaY = currentY - deckFocusCard.previousY;
  
    deckFocusCard.previousX = currentX;
    deckFocusCard.previousY = currentY;

    deckFocusCard.momentumY = deckFocusCard.momentumY * 0.8;

    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      return false;
    }
    console.log(deckFocusCard.currentRangeScalar);
    const rangeDelta = getDeckUpgradeRangeScalar(deckFocusCard, deltaY);
    const rangeScalar = deckFocusCard.currentRangeScalar + rangeDelta;
    
    deckFocusCard.momentumY += (rangeDelta || 0);

    applyDeckCardTopScroll(deckFocusCard, rangeScalar);
  });
  cardScrollerEle.addEventListener("touchend", async (event) => {
    if (!deckFocusCard) return;
    const focusCard = deckFocusCard;

    const upgradeCardEles = [...focusCard.children].filter(ele => ele.tagName == "CARD");
    
    // do the flickkkkk
    // animate it toward the closest scalar;
    const unsnappedTime = focusCard.unsnappedTime;
    const unsnappedRangeScalar = focusCard.unsnappedRangeScalar;
    const targetRangeScalar = Math.min(upgradeCardEles.length, Math.max(0, Math.round(unsnappedRangeScalar + focusCard.momentumY)));

    // animate to the card.
    const animationDuration = 200;

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
  });

  cardScrollerEle.addEventListener("click", event => {
    const currentCardEle = getCurrentCardEle();
    if (!currentCardEle) return;

    // scroll to focus the clicked card, both in the x and "y" coordinates
    
  })

  const onCarouselInteraction = event => {
    const touch = event.touches[0];
    const touchX = touch.clientX - carouselCanvasEle.offsetLeft;
    const scrollRatio = touchX / carouselCanvasEle.clientWidth;
    const newScroll = cardLibraryListEle.clientWidth * scrollRatio;

    scrollScroller(newScroll);
    // cardScrollerEle.scrollTo({left: newScroll, top: 0, behavior: 'instant'});
  }

  carouselEle.addEventListener("touchstart", onCarouselInteraction);
  carouselEle.addEventListener("touchmove", onCarouselInteraction);

  carouselEle.addEventListener("mousedown", onCarouselInteraction);
  carouselEle.addEventListener("mousemove", onCarouselInteraction);
};

init();