# 🗺️ DishaSetu - Indoor Navigation: The Complete Guide

This document provides a comprehensive overview of the **Indoor Navigation System** integrated into the DishaSetu platform. It details its features, technical architecture, database schema, and administration.

---

## 🏗️ 1. Overview
The indoor navigation system is a key differentiator of DishaSetu, allowing citizens to move seamlessly from street-level GPS navigation to room-level indoor guidance within multi-story public buildings like hospitals, schools, and government offices.

---

## ✨ 2. Core Features (User-Facing)

### 🏥 Building & Campus Mapping
*   **Contextual Maps**: Buildings are linked to specific projects. If you are viewing a hospital project, the building map is directly accessible.
*   **Multi-Building Support**: A single project can have multiple buildings (e.g., "Main Block", "Academic Wing").
*   **Floor Selector**: A smooth, horizontal floor selector lets users jump between levels (Ground, 1st, 2nd, etc.).

### 🔍 Search & Discovery
*   **Smart Room Search**: Find any room, clinic, or department by name, room number, or keywords.
*   **Categorized Icons**: Rooms are visually categorized using intuitive icons (e.g., 🧪 for Labs, 🚑 for Emergency, 🚺 for Restrooms).
*   **Landmark Recognition**: Important rooms (like "Reception" or "Main Exit") can be marked as landmarks to appear first in search.

### 🛣️ Smart Routing & Pathfinding
*   **Shortest Path Calculation**: Uses the **Dijkstra algorithm** to find the absolute shortest route through corridors, elevators, and stairs.
*   **Turn-by-Turn Instructions**: Generates a clear list of steps (e.g., *"Start at Entrance"*, *"Proceed to Elevator"*, *"Go to Floor 2"*, *"Arrive at ICU"*).
*   **Cross-Floor Navigation**: Seemlessly routes users across multiple floors.
*   **Arrival Tracking**: Real-time feedback and confirmation once the destination is reached.

### ♿ Accessibility First
*   **Accessible Mode**: A toggle that filters the pathfinder to **avoid stairs** entirely, only using elevators and ramps.
*   **Distance Metrics**: Shows the total walking distance in meters for better journey planning.

---

## ⚙️ 3. Technical Architecture

### 📊 Backend (Node.js & PostgreSQL/PostGIS)
*   **Graph Representation**: The indoor map is treated as a "Graph" where:
    *   **Nodes**: Rooms/Points of Interest.
    *   **Edges**: Hallways, elevators, or stairs connecting them.
*   **PostGIS Integration**: Buildings are geo-located, allowing the mobile app to handle transitions from outdoor to indoor navigation based on the user's proximity.
*   **RESTful API**:
    *   `GET /api/buildings`: Lists buildings with indoor support.
    *   `GET /api/navigation/search`: Searches for rooms globally or within a specific building.
    *   `GET /api/navigation/route`: The core pathfinding engine.

### 📱 Frontend (React Native & Expo)
*   **Dynamic UI**: The navigation button only appears if `building_id` exists for the current project.
*   **State Management**: Uses React state to track current floor, selected start/end rooms, and the calculated route.

---

## 🗄️ 4. Database Schema (PostgreSQL)

### `buildings` Table
Links a project to a physical structure.
*   `id` (UUID): Primary key.
*   `project_id` (FK): Links to `projects.id`.
*   `name`: Building name.
*   `location`: PostGIS geography (entrance coordinate).
*   `total_floors`: Integer count of floors.

### `floors` Table
Represents individual levels within a building.
*   `building_id` (FK): Links to `buildings.id`.
*   `floor_number`: Integer (e.g., 0 for Ground, 1 for First).
*   `map_image_url`: Optional URL for a SVG/PNG floor plan.

### `rooms` Table
Individual rooms and POIs.
*   `floor_id` (FK): Links to `floors.id`.
*   `type`: ENUM (entrance, exit, reception, classroom, icu, etc.).
*   `x_coordinate / y_coordinate`: Numerical coordinates on the floor map.
*   `is_landmark / is_accessible`: Boolean toggles.
*   `keywords`: Array of search strings.

### `connections` Table
The "Graph Edges" that define possible paths.
*   `from_room / to_room` (FK): Links two rooms in the `rooms` table.
*   `distance`: Numerical (meters).
*   `is_bidirectional`: Boolean (default TRUE).
*   `is_accessible`: Boolean (TRUE if suitable for wheelchairs).

---

## 🛠️ 5. Administration & Data Management

Admins can manage the entire system directly from the **DishaSetu Mobile App**'s Admin Dashboard:

1.  **Add/Delete Buildings**: Create the high-level mapping to a project.
2.  **Add Rooms**: Define new points on the map.
3.  **Create Connections**: Draw the logical paths that the AI uses to calculate routes.
4.  **Automatic Data Sync**: Changes made by admins are reflected instantly for all citizens.

---

## 🚀 6. Current Implementation Status

Currently, the following projects have **live** indoor navigation data for demo and testing:

| Project | Building | Contents |
|---|---|---|
| **Rajajinagar General Hospital Expansion** | *Main Block* | 3 floors, 15+ rooms, full routing including ICU and Emergency. |
| **Visvesvaraya Tech College Campus** | *New Block* | 2 floors, library, laboratory, and student departments. |

---

## 📝 7. How to Add a New Building (Checklist)

1.  **Select Project**: Identify the `project_id` of the infrastructure project.
2.  **Create Building**: Use the Admin UI or `INSERT INTO buildings`.
3.  **Define Floors**: Add a row for each level.
4.  **Add Rooms**: For each floor, mark the key rooms (especially entrances and elevators).
5.  **Link Everything**: Create connections between rooms on the same floor and floors sharing an elevator/stairwell.

---
*Created by Antigravity AI for DishaSetu.*
