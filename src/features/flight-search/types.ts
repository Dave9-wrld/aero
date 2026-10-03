export type SearchCriteria = {
  origin: string;
  destination: string;
  date: string;
  passengers: number;
};

export type Airport = {
  code: string;
  city: string;
  name: string;
  country: string;
  timeZone: string;
};
