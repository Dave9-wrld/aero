"use client";

import {
  createContext,
  useContext,
  useEffect,
  useReducer,
  useState,
  type Dispatch,
  type ReactNode,
} from "react";
import {
  bookingReducer,
  restoreBookingState,
  type BookingAction,
  type BookingState,
} from "./model";

const STORAGE_KEY = "aero-booking-v1";
const BookingContext = createContext<{
  state: BookingState;
  dispatch: Dispatch<BookingAction>;
  ready: boolean;
} | null>(null);

export default function BookingProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(bookingReducer, {
    draft: null,
    confirmation: null,
  });
  const [ready, setReady] = useState(false);
  const [storageUnavailable, setStorageUnavailable] = useState(false);
  useEffect(() => {
    try {
      dispatch({
        type: "hydrate",
        state: restoreBookingState(sessionStorage.getItem(STORAGE_KEY)),
      });
    } catch {
      setStorageUnavailable(true);
    }
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready) return;
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      setStorageUnavailable(true);
    }
  }, [state, ready]);
  return (
    <BookingContext.Provider value={{ state, dispatch, ready }}>
      {storageUnavailable && (
        <p className="storage-warning" role="status">
          Your browser cannot save this demo draft. Keep this tab open while
          booking.
        </p>
      )}
      {children}
    </BookingContext.Provider>
  );
}

export function useBooking() {
  const value = useContext(BookingContext);
  if (!value) throw new Error("useBooking must be used within BookingProvider");
  return value;
}
