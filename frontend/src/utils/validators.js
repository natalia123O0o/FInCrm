export const isColombianPhone = (v) =>
  /^(\+?57)?\s?3\d{9}$/.test(v) || /^(\+?57)?\s?60[1-8]\d{7}$/.test(v);