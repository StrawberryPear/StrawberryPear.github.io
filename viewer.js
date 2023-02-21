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
  const cost = cards.reduce((sum, card) => card ? sum + (parseInt(card.match(/\d+/)) || 0) : sum, 0);

  const deckCostEle = document.getElementById('points');

  deckCostEle.innerHTML = cost ? `&nbsp;(${cost})` : "";
}

const loadCardDataFromUrl = (() => {
  const loadingCanvas = document.createElement('canvas');

  const CARD_ROWS = 3;
  const CARD_COLS = 3;
  const CARD_PER_PAGE = CARD_ROWS * CARD_COLS;

  const CARD_ROW_OFFSET = 10;

  return async (url) => {
    const cardImages = [];

    const loadingTask = PDFJS.getDocument(url);

    const getCanvasDataURL = (() => {
      const saveCanvas = document.createElement('canvas');

      return (originCanvas, x, y, w, h) => {
        saveCanvas.width = w;
        saveCanvas.height = h;

        const saveContext = saveCanvas.getContext('2d');

        saveContext.drawImage(originCanvas, x, y, w, h, 0, 0, w, h);

        // check if it has a border most of the way around, at least 90%.
        const imageData = saveContext.getImageData(0, 0, w, h);
        const pixelData = imageData.data;

        var blackCount = 0;

        const bottomOffset = (h - 1) * w * 4;
        const rightOffset = (w - 1) * 4;

        for (var xi = 0; xi < w; xi++) {
          const ri = xi * 4;
          const gi = xi * 4 + 1;
          const bi = xi * 4 + 2;

          const topPixel = pixelData[ri] + pixelData[gi] + pixelData[bi];
          const bottomPixel = pixelData[bottomOffset + ri] + pixelData[bottomOffset + gi] + pixelData[bottomOffset + bi];
          
          blackCount += topPixel + bottomPixel;
        }
        
        for (var yi = 0; yi < h; yi++) {
          const oi = yi * 4 * w;

          const ri = oi;
          const gi = oi + 1;
          const bi = oi + 2;

          const leftPixel = pixelData[ri] + pixelData[gi] + pixelData[bi];
          const rightPixel = pixelData[rightOffset + ri] + pixelData[rightOffset + gi] + pixelData[rightOffset + bi];

          blackCount += leftPixel + rightPixel;
        }
        
        const MAX_PIXEL_VALUE = (w * 2 + h * 2) * 3 * 255;

        if (blackCount > MAX_PIXEL_VALUE * 0.05) {
          return "";
        }

        return saveCanvas.toDataURL();
      }
    })();

    const pdf = await loadingTask.promise;
    const metaData = await pdf.getMetadata();

    var totalPages = pdf.numPages
    var data = [];

    for (let pageNumber = 1; pageNumber <= totalPages; pageNumber++) {
      const page = await pdf.getPage(pageNumber);
      
      const text = await page.getTextContent();

      var viewport = page.getViewport({ scale: SCALE });

      // Prepare canvas using PDF page dimensions
      var context = loadingCanvas.getContext('2d');
      loadingCanvas.height = viewport.height;
      loadingCanvas.width = viewport.width;

      // Render PDF page into canvas context
      var renderContext = { canvasContext: context, viewport: viewport };

      const render = await page.render(renderContext).promise;

      [...Array(CARD_PER_PAGE)].map((_, i) => {
        const r = Math.floor(i / CARD_COLS);
        const c = i % CARD_COLS;

        const x = CARD_OFFSET_X + CARD_WIDTH * c;
        const y = CARD_OFFSET_Y + CARD_HEIGHT * r + CARD_ROW_OFFSET * r;

        cardImages.push(getCanvasDataURL(loadingCanvas, x, y, CARD_WIDTH, CARD_HEIGHT));
      });
    }

    return [cardImages, metaData.info.Title];
  }
})();

const cardScrollerEle = document.querySelector("cardScroller");
const cardLibraryListEle = document.querySelector("cardList.library");
const cardDeckListEle = document.querySelector("cardList.deck");
const cardControlsEle = document.querySelector("cardControls");

const loadCardsFromUrl = async (url) => {
  const [images, title] = await loadCardDataFromUrl(url);

  var cardsLoaded = 0;

  for (const imageIndex in images) {
    const image = images[imageIndex];

    if (image.length < 8064) continue;

    await addCardToDatabase(image, `${title} - ${cardsLoaded}`);
  
    cardsLoaded++;
  }
  
  showToast(`${cardsLoaded} cards added to library`);
};

const loadCard = (card) => {
  const cardEle = document.createElement("card");
  cardLibraryListEle.append(cardEle);

  cardEle.setAttribute("uid", card.uid);
  cardEle.setAttribute("index", card.index);

  cardEle.style.setProperty("background-image", `url('${card.image}')`);
};

const addCardToDatabase = async (image, uid) => {
  const transaction = database.transaction('cards', 'readwrite');

  try {
    const objectStore = transaction.objectStore('cards');
    const storeId = await objectStore.add({uid, image});

    const result = await objectStore.get(storeId);

    loadCard(result);
    
    return true;
  } catch(err) {
    console.error(err);
    return false;
  }
};

const getCurrentCardEle = () => {
  const cardEle = document.elementFromPoint(window.innerWidth * 0.5, window.innerHeight * 0.25);

  if (cardEle.tagName == "CARD") {
    return cardEle;
  }
};

const showToast = (() => {
  var currentToastTimeout;

  const toastEle = document.querySelector("toast");

  window.addEventListener("touchstart", () => {
    toastEle.style.setProperty("opacity", 0);
  });

  return (toastText) => {
    if (currentToastTimeout) {
      clearTimeout(currentToastTimeout);
    }

    toastEle.innerHTML = toastText;
    toastEle.style.setProperty("opacity", 0.9);

    currentToastTimeout = setTimeout(() => {
      toastEle.style.setProperty("opacity", 0);
    }, 4000);
  }
})()

// initialize the database.
const init = async () => {
  database = await idb.openDB('relicbladeCards', 2, {
    upgrade: (db, oldVersion) => {
      if (oldVersion == 1) {
        db.deleteObjectStore('cards');
      }
      const cardObjectStore = db.createObjectStore('cards', { keyPath: 'index', autoIncrement: true }); 

      cardObjectStore.createIndex("uid", "uid", { unique: true });
    }});

  const transaction = database.transaction('cards');
  const cardStore = transaction.objectStore('cards');

  const cards = (await cardStore.getAll() || []).sort((ca, cb) => ca.index - cb.index);

  for (const card of cards) {
    loadCard(card);
  }

  document.body.className = cards.length ? "" : "empty";

  const fileUploadEle = document.getElementById("fileUpload");

  fileUploadEle.addEventListener("change", (event) => {
    try {
      document.body.className = "loading";

      let [file] = event.target.files;
      if (!file) {
        document.body.className = "";
      };

      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          await loadCardsFromUrl(reader.result);
        } finally {
          document.body.className = "";
        }
      }
      reader.readAsDataURL(file)
    } catch (error) {
      console.error(error);
      alert("Something failed... Sorry.")
    }
  });

  deck = (localStorage.getItem("deck") || "")
    .split(',')
    .filter(v => v && cards.find(card => card.uid == v));
  updateDeck();
  const initialLibraryCardEles = [...cardLibraryListEle.children];

  for (const cardId of deck) {
    const cardEle = initialLibraryCardEles.find(ele => ele.getAttribute("uid") == cardId);
    
    if (!cardEle) continue;
    const cardCloneEle = cardEle.cloneNode(true);

    cardDeckListEle.append(cardCloneEle);
  }

  const cardScroller = document.querySelector("cardScroller");

  document.querySelector("cardControl.showLibrary").addEventListener("click", () => {
    document.body.className = "";
    cardScroller.className = "library";
  });
  document.querySelector("cardControl.showDeck").addEventListener("click", () => {
    cardScroller.className = "deck";
  });

  document.querySelector("cardControl.removeFromDeck").addEventListener("click", () => {
    const currentCardEle = getCurrentCardEle();

    if (currentCardEle) {
      const currentCardIndex = [...cardDeckListEle.children].indexOf(currentCardEle);

      deck.splice(currentCardIndex, 1);
      localStorage.setItem("deck", deck);
      updateDeck();

      showToast(`Card removed from deck`);
      currentCardEle.remove();
    }
  });
  document.querySelector("cardControl.addToDeck").addEventListener("click", () => {
    const currentCardEle = getCurrentCardEle();

    if (currentCardEle) {
      const cardEleClone = currentCardEle.cloneNode(true);

      cardDeckListEle.append(cardEleClone);
      deck.push(currentCardEle.getAttribute("uid"));
      updateDeck();

      showToast(`Card added to deck`);
      localStorage.setItem("deck", deck);
    }

  });
  document.querySelector("cardControl.shiftUp").addEventListener("click", () => {
    const currentCardEle = getCurrentCardEle();
    if (!currentCardEle) return;

    const previousCardEle = currentCardEle.previousElementSibling;
    if (!previousCardEle) return;

    const currentCardIndex = [...cardDeckListEle.children].indexOf(currentCardEle);
    const previousCardIndex = currentCardIndex - 1;

    deck[currentCardIndex] = previousCardEle.getAttribute("uid");
    deck[previousCardIndex] = currentCardEle.getAttribute("uid");

    localStorage.setItem("deck", deck);
    
    cardDeckListEle.insertBefore(currentCardEle, previousCardEle);
  });
  document.querySelector("cardControl.shiftDown").addEventListener("click", () => {
    const currentCardEle = getCurrentCardEle();
    if (!currentCardEle) return;

    const nextCardEle = currentCardEle.nextElementSibling;
    if (!nextCardEle) return;

    const currentCardIndex = [...cardDeckListEle.children].indexOf(currentCardEle);
    const nextCardIndex = currentCardIndex + 1;

    deck[currentCardIndex] = nextCardEle.getAttribute("uid");
    deck[nextCardIndex] = currentCardEle.getAttribute("uid");

    localStorage.setItem("deck", deck);
    
    cardDeckListEle.insertBefore(nextCardEle, currentCardEle);
  });

  const handleEdit = () => {
    document.body.className = "editing";
    
    const currentCardEle = getCurrentCardEle();
    if (!currentCardEle) return;

    var canvasEle = currentCardEle.querySelector("canvas");
    if (canvasEle) return;

    canvasEle = document.createElement("canvas");

    canvasEle.width = CARD_WIDTH;
    canvasEle.height = CARD_HEIGHT;
    
    currentCardEle.append(canvasEle);

    const canvasBoundingBox = canvasEle.getBoundingClientRect();

    const canvasContext = canvasEle.getContext('2d');

    var cx = 0;
    var cy = 0;

    var lineWidth = 8;
    var color = "#000000";

    const getXY = (e) => {
      const rx = (e.touches[0].clientX - canvasBoundingBox.left) * CARD_WIDTH / canvasBoundingBox.width;
      const ry = (e.touches[0].clientY - canvasBoundingBox.top) * CARD_HEIGHT / canvasBoundingBox.height;

      return [rx, ry];
    };

    const drawTo = (nx, ny) => {
      const drawType = document.body.getAttribute("drawType");

      if (drawType == "erase") {
        canvasContext.save();
        canvasContext.globalCompositeOperation = "destination-out";
        canvasContext.beginPath();
        canvasContext.arc(nx, ny, lineWidth, 0, 2 * Math.PI);
        canvasContext.fillStyle = color;
        canvasContext.fill();
        canvasContext.closePath();
        canvasContext.restore();
      } else {
        canvasContext.beginPath();
        canvasContext.arc(nx, ny, lineWidth, 0, 2 * Math.PI);
        canvasContext.fillStyle = color;
        canvasContext.fill();
        canvasContext.closePath();
      }

      [cx, cy] = [nx, ny];
    };

    canvasEle.addEventListener("touchmove", function (e) {
      const [nx, ny] = getXY(e);

      drawTo(nx, ny);

      e.preventDefault();
    }, false);
    canvasEle.addEventListener("touchstart", function (e) {
      [cx, cy] = getXY(e);

      drawTo(cx, cy);

      e.preventDefault();
    }, false);
    canvasEle.addEventListener("touchend", function (e) {
      e.preventDefault();
    }, false);
    canvasEle.addEventListener("touchcancel", function (e) {
      const [nx, ny] = getXY(e);

      drawTo(nx, ny);

      e.preventDefault();
    }, false);
  };

  document.querySelector("cardControl.edit").addEventListener("click", () => {
    document.body.setAttribute("drawType", "draw");

    handleEdit();
  });

  document.querySelector("cardControl.erase").addEventListener("click", () => {
    document.body.setAttribute("drawType", "erase");

    handleEdit();
  });

  document.querySelector("cardControl.end").addEventListener("click", () => {
    document.body.className = "";
  });

  const filterAdvocateEle = document.querySelector("cardControl.filterAdvocate");
  const filterAdversaryEle = document.querySelector("cardControl.filterAdversary");
  const filterNeutralEle = document.querySelector("cardControl.filterNeutral");
  const filterUpgradeEle = document.querySelector("cardControl.filterUpgrade");
  const filterRelicEle = document.querySelector("cardControl.filterRelic");

  var searchText = "";
  const filters = {
    advocate: {
      ele: filterAdvocateEle,
      filter: /advocate/i,
      active: false
    },
    adversary: {
      ele: filterAdversaryEle,
      filter: /adversary/i,
      active: false
    },
    neutral: {
      ele: filterNeutralEle,
      filter: /neutral/i,
      active: false
    },
    upgrade: {
      ele: filterUpgradeEle,
      filter: /upgrade/i,
      active: false
    },
    relic: {
      ele: filterRelicEle,
      filter: /relic/i,
      active: false
    }
  };

  const applyFilters = () => {
    const allFalse = !Object.values(filters).find(o => o.active);

    const libraryCardEles = [...cardLibraryListEle.querySelectorAll('card')];

    for (const cardEle of libraryCardEles) {
      const uid = cardEle.getAttribute("uid");
      const storeItem = store[uid];

      if (!storeItem) {
        cardEle.classList.toggle('inactive', !allFalse || !!searchText.trim());

        continue;
      }

      const filterShow = Object.values(filters).find(o => {
        return o.active && storeItem.match(o.filter);
      });

      const searchShow = storeItem.toLowerCase().includes(searchText.toLowerCase());

      cardEle.classList.toggle('inactive', (!allFalse && !filterShow) || !searchShow);
    }
    window.requestAnimationFrame(() => {
      cardScrollerEle.scrollTo(0, 0);
    });
  }

  Object.keys(filters)
    .forEach(key => {
      const object = filters[key];
      object.ele.addEventListener("click", () => {
        const startsInactive = object.ele.classList.contains('inactive');
        object.ele.classList.toggle('inactive');
    
        const isActive = !!startsInactive;
        object.active = isActive;
        
        applyFilters();
      });
    });

  document.querySelector("cardControl.search").addEventListener("click", async () => {
    searchText = prompt("Cards to search for (eg, dodge, spell): ");

    applyFilters();

    cardControlsEle.className = "searched";
  });
  document.querySelector("cardControl.clearSearch").addEventListener("click", async () => {
    // apply search within filters?
    searchText = "";

    applyFilters();

    cardControlsEle.className = "";
  });

  document.querySelector("cardControl.destroy").addEventListener("click", async () => {
    const currentCardEle = getCurrentCardEle();
    if (!currentCardEle) return;
    
    const confirmValue = confirm("Are you sure you want to remove this card from your library?");
    if (!confirmValue) return;

    // remove it from the library.
    const transaction = database.transaction(['cards'], 'readwrite');
    const objectStore = transaction.objectStore('cards');

    const index = parseInt(currentCardEle.getAttribute("index"))

    await objectStore.delete(index);

    showToast("Card Removed");
    currentCardEle.remove();
  });
};

init();