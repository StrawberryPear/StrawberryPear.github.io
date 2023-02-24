const filterAdvocateEle = document.querySelector('cardControl.filterAdvocate');
const filterAdversaryEle = document.querySelector('cardControl.filterAdversary');
const filterNeutralEle = document.querySelector('cardControl.filterNeutral');
const filterUpgradeEle = document.querySelector('cardControl.filterUpgrade');
const filterRelicEle = document.querySelector('cardControl.filterRelic');
const filterShopEle = document.querySelector('cardControl.filterShop');

var searchText = '';
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
  },
  shop: {
    ele: filterShopEle,
    filter: /purchase/i,
    active: false
  }
};

const applyFilters = () => {
  const allFalse = !Object.values(filters).find(o => o.active);

  const libraryCardEles = [...cardLibraryListEle.children];

  for (const cardEle of libraryCardEles) {
    const uid = cardEle.getAttribute('uid');
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

  // check purchases
  for (const purchaseEle of [...libraryCardEles.filter(ele => ele.tagName == "PURCHASE")]) {
    const uid = purchaseEle.getAttribute("uid").toLowerCase();

    const hasCardsMatching = libraryCardEles
      .filter(ele => ele.tagName == "CARD")
      .find(cardEle => (cardEle.getAttribute("uid") || "").toLowerCase().includes(uid));

    purchaseEle.classList.toggle("bought", !!hasCardsMatching);
  }
}
