export type Seat = {
  id: string;
  row: number;
  column: number;
  occupied: boolean;
  premium: boolean;
  priceCents: number;
};

export function getSeats(offerId: string): Seat[] {
  const seed = [...offerId].reduce(
    (value, char) => value + char.charCodeAt(0),
    0,
  );
  return Array.from({ length: 84 }, (_, index) => {
    const row = Math.floor(index / 6) + 1;
    const column = index % 6;
    const premium = row <= 3 || row === 8;
    return {
      id: `${row}${"ABCDEF"[column]}`,
      row,
      column,
      occupied: (seed + index * 7) % 11 < 2,
      premium,
      priceCents: premium ? (row === 8 ? 2000000 : 3500000) : 0,
    };
  });
}

export function seatIndexForKey(index: number, key: string) {
  const rowStart = Math.floor(index / 6) * 6;
  if (key === "ArrowRight") return Math.min(rowStart + 5, index + 1);
  if (key === "ArrowLeft") return Math.max(rowStart, index - 1);
  if (key === "ArrowDown") return index >= 78 ? index : index + 6;
  if (key === "ArrowUp") return index < 6 ? index : index - 6;
  if (key === "Home") return rowStart;
  if (key === "End") return rowStart + 5;
  return index;
}
