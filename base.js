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

const updateDeck = () => {
  // work out total points in deck :D
  const cards = deck.map(id => store[id]);
  const cost = cards.reduce((sum, card) => card ? sum + (parseInt(card.cost) || 0) : sum, 0);

  const deckCostEle = document.getElementById('points');

  deckCostEle.innerHTML = cost ? `&nbsp;(${cost})` : '';
};

const cardScrollerEle = document.querySelector('cardScroller');
const cardLibraryListEle = document.querySelector('cardList.library');
const cardDeckListEle = document.querySelector('cardList.deck');
const cardTopControlsEle = document.querySelector('cardTopControls');

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
})()

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
        localStorage.setItem("deck", []);
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

  // inital deck production
  deck = (localStorage.getItem('deck') || '')
    .split(',')
    .filter(v => v && cards.find(card => card.uid == v));
  updateDeck();
  const initialLibraryCardEles = [...cardLibraryListEle.children];

  for (const cardId of deck) {
    const cardEle = initialLibraryCardEles.find(ele => ele.getAttribute('uid') == cardId);
    if (!cardEle) continue;

    const cardCloneEle = cardEle.cloneNode(true);
    cardDeckListEle.insertBefore(cardCloneEle, cardDeckListEle.lastChild);
  }

  applyFilters();
  applyCarousel();

  const cardScroller = document.querySelector('cardScroller');

  var libraryFocusCard;
  var deckFocusCard;

  document.querySelector('.showLibrary').addEventListener('click', () => {
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
  document.querySelector('.showDeck').addEventListener('click', () => {
    if (document.body.getAttribute("showing") !== 'library') return;
    const currentCard = getCurrentCardEle(true);

    libraryFocusCard = currentCard;

    // scroll to the last library focused' card
    document.body.setAttribute("showing", "deck");

    const cardScrollX = deckFocusCard?.offsetLeft || 0;
    cardScroller.scrollTo(cardScrollX, 0);
  });

  document.querySelector('cardButton.removeFromDeck').addEventListener('click', () => {
    const currentCardEle = getCurrentCardEle();

    if (currentCardEle) {
      const currentCardIndex = [...cardDeckListEle.children].indexOf(currentCardEle);

      deck.splice(currentCardIndex, 1);
      localStorage.setItem('deck', deck);
      updateDeck();

      showToast(`Card removed from deck`);
      currentCardEle.remove();
    }
  });
  document.querySelector('cardButton.addToDeck').addEventListener('click', () => {
    const currentCardEle = getCurrentCardEle();
    if (!currentCardEle) return;

    const cardEleClone = currentCardEle.cloneNode(true);

    cardDeckListEle.append(cardEleClone);
    deck.push(currentCardEle.getAttribute('uid'));
    updateDeck();

    showToast(`Card added to deck`);
    localStorage.setItem('deck', deck);
  });
  document.querySelector("cardScroller").addEventListener('click', (e) => {
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

    switch (currentCardEle.tagName) {
      case "PURCHASE":
        if (!currentCardEle.classList.contains("bought")) {
          window.open("https://relicblade.com/shop?category=Cards");
        }
        break;
    }
  });

  const searchInputEle = document.querySelector('searchContainer input');
  searchInputEle.addEventListener('keyup', async () => {
    searchText = searchInputEle.value;

    applyFilters();
    applyCarousel();

    cardTopControlsEle.classList.toggle('searched', !!searchText);
  });
  document.querySelector('searchContainer searchicon[type="clear"]').addEventListener("click", () => {
    searchText = "";
    searchInputEle.value = "";

    applyFilters();
    applyCarousel();
    cardTopControlsEle.classList.toggle('searched', !!searchText);
  })

  document.querySelector('menuControl.removeLibraryCard').addEventListener('click', async (e) => {
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

  const overlayMenuEle = document.querySelector('overlayMenu');
  overlayMenuEle.addEventListener('click', e => {
    if (e.target !== overlayMenuEle) return;
    overlayMenuEle.className = 'hidden';
  });

  document.querySelector('ham').addEventListener('click', () => {
    overlayMenuEle.className = '';
  });

  document.querySelector('topButton.grid').addEventListener('click', () => {
    const currentDisplayType = document.body.getAttribute("displayType");

    document.body.setAttribute("displayType", currentDisplayType == 'grid' ? '' : 'grid');

    if (currentDisplayType != "grid") return;
    applyCarousel();
  });

  cardScrollerEle.addEventListener("scroll", event => {
    updateCarousel();
    //TODO make the buttons update
  });

  const onCarouselInteraction = event => {
    const touch = event.touches[0];
    const touchX = touch.clientX - carouselCanvasEle.offsetLeft;
    const scrollRatio = touchX / carouselCanvasEle.clientWidth;
    const newScroll = cardLibraryListEle.clientWidth * scrollRatio;

    cardScrollerEle.scrollTo(newScroll, 0);
  }

  carouselEle.addEventListener("touchstart", onCarouselInteraction);

  carouselEle.addEventListener("touchmove", onCarouselInteraction);
};

init();