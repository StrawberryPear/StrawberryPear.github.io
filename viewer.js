const CARD_WIDTH = 269;
const CARD_HEIGHT = 367;

var PDFJS = window['pdfjs-dist/build/pdf'];
PDFJS.GlobalWorkerOptions.workerSrc = './pdf.worker.js';

var database;
var deck = [];

const loadCardImagesFromUrl = (() => {
  const loadingCanvas = document.createElement('canvas');

  const CARD_ROWS = 3;
  const CARD_COLS = 3;
  const CARD_PER_PAGE = CARD_ROWS * CARD_COLS;

  const CARD_OFFSET_X = 55;
  const CARD_OFFSET_Y = 28;

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

        return saveCanvas.toDataURL();
      }
    })();

    const pdf = await loadingTask.promise;

    var totalPages = pdf.numPages
    var data = [];

    for (let pageNumber = 1; pageNumber <= totalPages; pageNumber++) {
      const page = await pdf.getPage(pageNumber);
      
      var scale = 1.5;
      var viewport = page.getViewport({ scale: scale });

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

    return cardImages;
  }
})();

const cardScrollerEle = document.querySelector("cardScroller");
const cardLibraryListEle = document.querySelector("cardList.library");
const cardDeckListEle = document.querySelector("cardList.deck");

const loadCardsFromUrl = async (url) => {
  const images = await loadCardImagesFromUrl(url);

  var cardsLoaded = 0;

  for (const imageIndex in images) {
    const image = images[imageIndex];
    const card = await addCardToDatabase(image);

    if (card) continue;

    loadCard(card);

    cardsLoaded++;
  }

  
  showToast(`${cardsLoaded} cards added to library`);
};

const loadCard = (card) => {
  if ((card?.image?.length ?? 0) < 8000) return false;

  const cardEle = document.createElement("card");
  cardLibraryListEle.append(cardEle);

  cardEle.setAttribute("uid", card.uid);

  cardEle.style.setProperty("background-image", `url('${card.image}')`);
};

const addCardToDatabase = async (image) => {
  // check if it's in there...
  if (image.length < 8064) return false;

  const transaction = database.transaction('cards', 'readwrite');

  try {
    const objectStore = transaction.objectStore('cards');
    const storeId = await objectStore.add({uid: image.substr(8000, 64), image});

    const result = await objectStore.get(storeId);

    console.log(result.uid, result.index);

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
  database = await idb.openDB('relicbladeCards', 1, {
    upgrade: db => {
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
      let [file] = event.target.files;
      if (!file) return;

      document.body.className = "loading";

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

  deck = (localStorage.getItem("deck") || "").split(',');
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
  }

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
    
    const currentCardEle = getCurrentCardEle();
    if (!currentCardEle) return;
  });
};

init();