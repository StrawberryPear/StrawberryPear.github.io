const filterCharactersEle = document.querySelector('cardControl.filterCharacter');
const filterAdvocateEle = document.querySelector('cardControl.filterAdvocate');
const filterAdversaryEle = document.querySelector('cardControl.filterAdversary');
const filterNeutralEle = document.querySelector('cardControl.filterNeutral');

const filterUpgradeEle = document.querySelector('cardControl.filterUpgrade');
const filterTacticEle = document.querySelector('cardControl.filterTactic');
const filterPotionEle = document.querySelector('cardControl.filterPotion');
const filterItemEle = document.querySelector('cardControl.filterItem');
const filterWeaponEle = document.querySelector('cardControl.filterWeapon');
const filterSpellEle = document.querySelector('cardControl.filterSpell');
const filterRelicUpgradeEle = document.querySelector('cardControl.filterRelicUpgrade');

const filterRelicEle = document.querySelector('cardControl.filterRelic');

const filterShopEle = document.querySelector('cardControl.filterShop');

var searchText = '';
const filters = {
  character: {
    ele: filterCharactersEle,
    filter: /character/i,
    active: false
  },
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
  tactic: {
    ele: filterTacticEle,
    filter: /tactic/i,
    active: false
  },
  potion: {
    ele: filterPotionEle,
    filter: /potion/i,
    active: false
  },
  item: {
    ele: filterItemEle,
    filter: /item/i,
    active: false
  },
  weapon: {
    ele: filterWeaponEle,
    filter: /weapon/i,
    active: false
  },
  spell: {
    ele: filterSpellEle,
    filter: /spell/i,
    active: false
  },
  relicUpgrade: {
    ele: filterRelicUpgradeEle,
    filter: /relic/i,
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
      return o.active && storeItem.base.match(o.filter);
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
