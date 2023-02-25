const carouselEle = document.querySelector("cardCarousel");
const carouselCanvasEle = document.querySelector('cardCarousel canvas');

const updateCarousel = () => {
  // rerender the whole thing with index being the selected element, so render that one last.
  if (!cardLibraryListEle.clientWidth) return;

  const index = cardScrollerEle.scrollLeft / cardLibraryListEle.clientWidth;

  const libraryCardEles = [...cardLibraryListEle.children].filter(e => !e.classList.contains('inactive'));
  const count = libraryCardEles.length;

  const intervalWidth = carouselCanvasEle.width / count;

  const context = carouselCanvasEle.getContext('2d');
  // black out the carousel
  context.clearRect(0, 0, carouselCanvasEle.width, carouselCanvasEle.height);

  context.strokeStyle = `#091e21`;
  context.lineWidth = 3;

  const linePaddin = 3;

  // render lines at each width;
  for (var i = 0; i < count; i++) {
    const x = intervalWidth * 0.5 + intervalWidth * i;

    context.beginPath();
    context.moveTo(x, linePaddin + Math.random() * 3);
    context.lineTo(x, carouselCanvasEle.height - Math.random() * 6 - linePaddin);
    context.stroke();
  }

  const viewW = (CARD_WIDTH / CARD_HEIGHT) * carouselCanvasEle.height;
  const viewX = Math.max(0, Math.min(carouselCanvasEle.width - viewW, carouselCanvasEle.width * index - viewW * 0.5));

  // current scroll 
  context.strokeStyle = `white`;
  context.fillStyle = "black";
  context.beginPath();
  context.rect(viewX, 0, viewW, carouselCanvasEle.height);
  context.fill();
  context.stroke();
}

const applyCarousel = () => {
  // get the filtered card count
  const containerRect = carouselEle.getBoundingClientRect();

  carouselCanvasEle.width = containerRect.width;
  carouselCanvasEle.height = containerRect.height;

  updateCarousel();
}