# Monorepo Migration Guide

This document details the steps to restructure the initial SvelteKit project into a monorepo architecture with separate folders for the frontend and backend.

## 1. Target Folder Structure

The goal is to achieve the following structure at the root of the repository:

```
.
├── api/                  # Future Backend microservice (NestJS)
├── frontend/             # Frontend microservice (SvelteKit)
└── docker-compose.yml    # Orchestrator for all services
```

## 2. Migration Steps

- [ ] **Task 1: Create the `frontend/` Folder**:
  - At the root of your project, create a new folder named `frontend`.

- [ ] **Task 2: Move Frontend Files**:
  - Move **all current content** of the project (the `src`, `static`, `node_modules` folders, and the `package.json`, `svelte.config.js`, `README.md` files, etc.) into the new `frontend/` folder.

- [ ] **Task 3: Create the `api/` Folder**:
  - At the root of the project, create an empty folder named `api/`. This folder will house the NestJS project later on.

- [ ] **Task 4: Create the Root `docker-compose.yml`**:
  - At the root of the project, create a `docker-compose.yml` file. This file will be empty for now, but will be populated in later phases.

- [X] **Task 5: Update the Root `README.md`**:
  - The `README.md` file currently in `frontend/` must be moved to the root of the project and updated to describe the new monorepo architecture.

After these steps, the project structure will be aligned with the microservices vision, and the development of each service can continue independently within its own folder.
