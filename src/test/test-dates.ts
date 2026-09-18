export const yesterday = ((d: Date) =>
  new Date(new Date(d.setDate(d.getDate() - 1)).setHours(0, 0, 0)).toDateString())(new Date());
export const tomorrow = ((d: Date) =>
  new Date(new Date(d.setDate(d.getDate() + 1)).setHours(0, 0, 0)).toDateString())(new Date());
