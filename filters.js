const filterAdvocateEle = document.querySelector('cardControl.filterAdvocate');
const filterAdversaryEle = document.querySelector('cardControl.filterAdversary');
const filterNeutralEle = document.querySelector('cardControl.filterNeutral');
const filterUpgradeEle = document.querySelector('cardControl.filterUpgrade');
const filterRelicEle = document.querySelector('cardControl.filterRelic');
const filterShopEle = document.querySelector('cardControl.filterShop');

var searchText = '';
const filters = {
  advocate: {
    name: 'Advocate',
    filter: /advocate/i,
    icon: false
  },
  adversary: {
    name: 'Adversary',
    filter: /adversary/i,
    icon: false
  },
  neutral: {
    name: 'Neutral',
    filter: /neutral/i,
    icon: false
  },
  upgrade: {
    name: 'Upgrade',
    filter: /upgrade/i,
    icon: false
  },
  relic: {
    name: 'Relic',
    filter: /relic/i,
    icon: false
  },
  shop: {
    name: 'Purchase',
    filter: /purchase/i,
    icon: false
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

    const searchShow = storeItem.base.toLowerCase().includes(searchText.toLowerCase());

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
