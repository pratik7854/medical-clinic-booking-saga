# Medical Clinic Booking System – Event Driven SAGA

This project demonstrates an event-driven transactional workflow for a medical clinic booking system using SAGA choreography.

## Architecture

The system is implemented as multiple independent services communicating through events using NATS.

Services:
- booking-service
- pricing-service
- discount-service
- payment-service
- confirmation-service
- CLI client

Each booking request represents a distributed transaction identified by a sagaId.

## Event Flow

BookingRequested → PricingCalculated → DiscountReserved → PaymentCompleted → BookingConfirmed

Failure event:
BookingFailed

## Business Rules

R1 – Discount Rule:
12% discount is applicable if:
- user is female and today is her birthday, or
- total base price is greater than 1000.

R2 – Daily Discount Quota:
A system-wide daily quota is enforced for R1 discounts.
If the quota is exhausted, the booking is rejected.

## Compensation Logic

If a booking fails after the discount quota is reserved, the discount-service releases the reserved quota when it receives a booking.failed event.

This demonstrates SAGA choreography with compensation.

## Assumptions

- Service catalog is fixed.
- Daily quota is stored in memory for demonstration.
- Timezone used for discount validation is IST.
- CLI polls the booking-service to show real-time updates.

## Test Scenarios

1. Success case
   - Normal booking flow leading to booking confirmation.

2. Quota failure case
   - Booking fails due to daily discount quota limit.

3. Payment failure with compensation
   - Booking fails during payment and previously reserved quota is released.

## How to run

1. Start NATS
   docker compose up -d

2. Start services in separate terminals
   - booking-service
   - pricing-service
   - discount-service
   - payment-service
   - confirmation-service

3. Run CLI
   node cli/index.js
