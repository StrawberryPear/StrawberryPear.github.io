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

const cardScrollerEle = document.querySelector('cardScroller');
const cardLibraryListEle = document.querySelector('cardList.library');
const cardDeckListEle = document.querySelector('cardList.deck');
const cardTopControlsEle = document.querySelector('cardTopControls');

const cardScroller = document.querySelector('cardScroller');
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

const updateDeck = () => {
  // work out total points in deck :D
  const cards = deck.map(id => store[id]);
  const cost = cards.reduce((sum, card) => card ? sum + (parseInt(card.cost) || 0) : sum, 0);

  const deckCostEle = document.getElementById('points');

  deckCostEle.innerHTML = cost ? `&nbsp;(${cost})` : '';
};

const getCurrentCardEle = (canBePurchase) => {
  const pointEles = document.elementsFromPoint(window.innerWidth * 0.5, window.innerHeight * 0.25);
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

const addCharacterToDeck = (data, updateDeckStore = true) => {
  const uid = data.uid;
  if (!uid) return;

  const cardStore = store[uid];
  if (!cardStore) return;

  const libraryCardEles = [...cardLibraryListEle.children];
  const cardEle = libraryCardEles.find(ele => ele.getAttribute('uid') == uid);
  if (!cardEle) return;

  const cardCloneEle = cardEle.cloneNode(true);
  cardDeckListEle.insertBefore(cardCloneEle, addCharacterButton);

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

        cardScroller.scrollTo(0, 0);
      });
    });
    
  applyFilters();
  applyCarousel();

  var libraryFocusCard;
  var deckFocusCard;

  showLibraryButton.addEventListener('click', () => {
    document.body.className = '';

    if (document.body.getAttribute("showing") !== 'deck') return;
    const currentCard = getCurrentCardEle(true);

    deckFocusCard = currentCard;

    // scroll to the last library focused' card
    document.body.setAttribute("showing", "library");

    applyCarousel();

    const cardScrollX = libraryFocusCard?.offsetLeft || 0;
    cardScroller.scrollTo(cardScrollX, 0);
  });
  showDeckButton.addEventListener('click', () => {
    if (document.body.getAttribute("showing") !== 'library') return;

    setSubFilter();

    const currentCard = getCurrentCardEle(true);
    libraryFocusCard = currentCard;

    // scroll to the last library focused' card
    document.body.setAttribute("showing", "deck");

    const cardScrollX = deckFocusCard?.offsetLeft || 0;
    cardScroller.scrollTo(cardScrollX, 0);
  });
  addUpgradeButton.addEventListener('click', () => {
    if (document.body.getAttribute("showing") !== 'deck') return;

    const currentCard = getCurrentCardEle();
    if (!currentCard) return;

    const uid = currentCard.getAttribute("uid");
    const cardStore = store[uid];
    if (!cardStore) return;

    // TODO: get what upgrades the character can use
    setSubFilter('upgrade', { classes: cardStore.classes, upgradeType: cardStore.upgradeTypes});

    showLibraryButton.click();
  });
  addCharacterButton.addEventListener('click', () => {
    if (document.body.getAttribute("showing") !== 'deck') return;

    setSubFilter('character');

    showLibraryButton.click();
  });

  removeFromDeckButton.addEventListener('click', () => {
    const currentCardEle = getCurrentCardEle();

    if (!currentCardEle) return;
    const currentCardIndex = [...cardDeckListEle.children].indexOf(currentCardEle);

    const confirmValue = confirm('Are you sure you want to remove this card from this deck?');
    if (!confirmValue) return;


    deck.splice(currentCardIndex, 1);
    localStorage.setItem('deck', JSON.stringify(deck));
    updateDeck();

    showToast(`Card removed from deck`);
    currentCardEle.remove();
  });
  addToDeckButton.addEventListener('click', () => {
    debugger;
    const currentCardEle = getCurrentCardEle();
    if (!currentCardEle) return;

    const uid = currentCardEle.getAttribute("uid");

    const cardEleClone = addCharacterToDeck({uid});
    if (!cardEleClone) return;

    updateDeck();

    deckFocusCard = cardEleClone;
    showToast(`Card added to deck`);
    showDeckButton.click();

    localStorage.setItem('deck', JSON.stringify(deck));
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
      cardScroller.scrollTo(scrollLeft, 0);

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

    if (scrollTimeout) clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
      console.log("scrollEnd");
    }, 200);
  });

  const onCarouselInteraction = event => {
    console.log('touch');
    const touch = event.touches[0];
    const touchX = touch.clientX - carouselCanvasEle.offsetLeft;
    const scrollRatio = touchX / carouselCanvasEle.clientWidth;
    const newScroll = cardLibraryListEle.clientWidth * scrollRatio;

    cardScrollerEle.scrollTo(newScroll, 0);
  }

  carouselEle.addEventListener("touchstart", onCarouselInteraction);
  carouselEle.addEventListener("touchmove", onCarouselInteraction);

  carouselEle.addEventListener("mousedown", onCarouselInteraction);
  carouselEle.addEventListener("mousemove", onCarouselInteraction);
};

init();