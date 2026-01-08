export function computeBestDiscount({ categoryCounts, partySize, hasLoyalty }) {
    // You can change these rates to what your group agrees on
    const RATES = {
      child: 0.20,
      senior: 0.15,
      group: 0.10,   // applies if partySize > 10
      loyalty: 0.10, // loyalty card 10%
    };
  
    const candidates = [];
  
    // age-category candidates
    if (categoryCounts.child > 0) candidates.push({ type: "child", rate: RATES.child });
    if (categoryCounts.senior > 0) candidates.push({ type: "senior", rate: RATES.senior });
  
    // group candidate
    if (partySize > 10) candidates.push({ type: "group", rate: RATES.group });
  
    // loyalty candidate
    if (hasLoyalty) candidates.push({ type: "loyalty", rate: RATES.loyalty });
  
    if (candidates.length === 0) return { type: "none", rate: 0 };
  
    // pick the best (highest rate)
    candidates.sort((a, b) => b.rate - a.rate);
    return candidates[0];
  }
  