"use client";
import { useEffect, useSyncExternalStore } from "react";
import { receiptStorageKey, type SandboxReceipt } from "./model";

let receipt: SandboxReceipt | null = null;
const listeners = new Set<() => void>();
function validReceipt(value: unknown): value is SandboxReceipt {
  if (!value || typeof value !== "object") return false;
  const r = value as Partial<SandboxReceipt>;
  return (
    r.source === "duffel-sandbox" &&
    typeof r.id === "string" &&
    r.id.startsWith("ord_") &&
    typeof r.reference === "string" &&
    typeof r.createdAt === "string" &&
    Number.isSafeInteger(r.totalCents) &&
    typeof r.currency === "string" &&
    !!r.details?.offer &&
    Array.isArray(r.details.segments) &&
    r.details.segments.length > 0 &&
    Array.isArray(r.travelers) &&
    Array.isArray(r.seats) &&
    Array.isArray(r.bags)
  );
}
function emit() {
  listeners.forEach((listener) => listener());
}
export function saveSandboxTrip(next: SandboxReceipt) {
  receipt = next;
  try {
    sessionStorage.setItem(receiptStorageKey, JSON.stringify(next));
    emit();
    return true;
  } catch {
    receipt = { ...next, memoryOnly: true };
    emit();
    return false;
  }
}
export function useSandboxTrip() {
  const value = useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    () => receipt,
    () => null,
  );
  useEffect(() => {
    if (receipt) return;
    try {
      const raw = sessionStorage.getItem(receiptStorageKey);
      const parsed: unknown = raw ? JSON.parse(raw) : null;
      if (validReceipt(parsed)) {
        receipt = parsed;
        emit();
      }
    } catch {
      /* Storage is optional; the current tab still holds its receipt. */
    }
  }, []);
  return value;
}
