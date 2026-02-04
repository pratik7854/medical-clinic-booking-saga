Event-Driven Medical Clinic Booking System
Project Description
This project demonstrates an event-driven backend system for a medical clinic booking workflow implemented using the SAGA choreography pattern. The system supports distributed transactions, real-time status updates and compensation logic across multiple services.
Architecture
The system is built as independent services:
- booking-service
- pricing-service
- discount-service
- payment-service
- confirmation-service
All services communicate asynchronously using NATS events.
A command line client (CLI) is used to simulate the user flow and display real-time booking status updates.
Business Rules
R1 – Discount Rule:
A 12% discount is applicable if the user is female and today is her birthday or if the total base price is greater than 1000.

R2 – Daily Discount Quota:
A system-wide daily discount quota is enforced. If the quota is exhausted and a request qualifies for the discount, the booking is rejected.
Features
- Event-driven microservice architecture
- SAGA choreography based workflow
- Compensation logic for failures
- Real-time CLI status updates
- Distributed transaction tracing using sagaId
Technology Stack
- Node.js
- NATS
- Docker
How to Run
1. Start NATS using docker compose
2. Start all backend services
3. Run the CLI client
Failure and Compensation Testing
Payment failure can be simulated using an environment variable to demonstrate rollback and compensation logic.
Summary
This project demonstrates a real-world event-driven transaction workflow using SAGA choreography with proper failure handling and compensation logic.
