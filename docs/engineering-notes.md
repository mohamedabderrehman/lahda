## Coordinating four roles in one delivery product

The customer, merchant, driver and administrator see different parts of the same order. That creates two distinct authorization questions: may this role perform the action, and does this account own or handle this particular record? The API combines role guards with service-level ownership checks. The release demonstration exercises a complete delivery using synthetic accounts rather than showing four disconnected dashboards.

Order progression also changes financial records. A delivered order can create merchant ledger entries and driver earnings, so repeating a delivery update must not create another payment record. The acceptance script checks sequential repetition and terminal-state regression. Concurrent writes remain a separate verification task.

## A lesson from discounted cash collection

The discounted demonstration exposed a useful accounting distinction: a gross catalogue subtotal is not the cash collected from the customer. The remittance now uses the customer total minus the delivery fee, bounded at zero. The administrator can see the adjustment separately from the gross subtotal and application fee. This makes the price breakdown explainable instead of hiding the discount in an aggregate.

Previously publishing Lahda on Google Play demonstrates mobile delivery experience. The current release prepares reproducible API and administration demonstrations; maps, Firebase, fresh signing and device behavior need their own configuration and checks. The next engineering priorities are concurrent settlement scenarios and end-to-end notification delivery on devices.
