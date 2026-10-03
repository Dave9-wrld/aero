# Aero

Read the relevant Next.js guidance in `node_modules/next/dist/docs/` before changing framework code.

This is a portfolio flight booking demo. Keep sample flights, prices, seat maps and confirmations clearly identified as demo data. Never create real orders or collect real payment details.

Keep routes in `src/app`, domain logic with its feature, and shared primitives in `src/components`. Flight data must pass through the provider interface. Store prices as integer minor units. Add explanations of material architecture decisions to `docs/architecture.md` so the owner can learn while building.
