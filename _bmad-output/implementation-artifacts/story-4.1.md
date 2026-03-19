# Story 4.1: Relation API and Router

**Status: complete**

Implemented the tRPC router and service layer for relation CRUD operations including:
- Create, update, delete relation endpoints
- listByUnit query with context filtering
- listBetween query for relations between two specific units
- Input validation with Zod schemas
- Lifecycle validation (draft units cannot have relations)
