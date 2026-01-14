// utils/loyalty.js
export function applyLoyaltyAfterSuccessfulPayment({ booking, user }) {
    if (!booking || !user) return false;
  
    const tickets = Array.isArray(booking.tickets) ? booking.tickets : [];
    const isSingleAdult =
      tickets.length === 1 &&
      String(tickets[0]?.category || "").toLowerCase() === "adult";
  
    if (!isSingleAdult) return false; // only count single adult ticket payments
  
    user.loyalty = user.loyalty || { bookingCount: 0, isMember: false };
    user.loyalty.bookingCount = (user.loyalty.bookingCount || 0) + 1;
  
    if (user.loyalty.bookingCount >= 3) {
      user.loyalty.isMember = true;
    }
  
    return true; // tells caller we updated loyalty
  }
  