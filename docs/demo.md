# Synthetic demonstration

Customer chooses an address and products → API calculates the order → merchant prepares → driver accepts an offer → delivery updates tracking → admin reconciles cash and ledger entries.

## Walkthrough

1. Create synthetic customer, merchant and driver accounts; keep former infrastructure disconnected.
2. Place a COD order, prepare it, accept the delivery offer, and complete delivery.
3. Inspect the admin order, merchant credit, driver earning and remittance; repeat the delivered update and compare ledger entries.
4. Use fresh Firebase configuration and Android debug signing for device checks.

## Acceptance checklist

- [ ] API compilation and Prisma schema/client generation
- [ ] Role and foreign-order rejection
- [ ] Promotion totals and sequential repeated financial updates
- [ ] Admin compilation; Android build/device checks are separate

## Evidence discipline

Screenshots must come from the running application with synthetic records. Record the component, viewport and configuration. A storyboard is not a recorded walkthrough. Benchmark only generated data and include hardware, input size, configuration, elapsed time and cache conditions.

Maps, push notifications and Android services need independently configured integrations. Historical signing material and production records are excluded. Current compilation is not a complete device or financial concurrency audit.
