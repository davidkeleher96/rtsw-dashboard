# Solar-Wind Dashboard  
**Real-time monitoring of space weather data**

---

## Table of Contents

- [Description](#description)  
- [Tech Stack](#tech-stack)  
- [Prerequisites](#prerequisites)  
- [Installation & Local Setup](#installation--local-setup)  
- [Configuration](#configuration)  
- [Project Structure](#project-structure)  
- [Usage](#usage)  
- [Contributing](#contributing)  
- [License](#license)  

---

## Description

This project containerizes the process of polling SWPC data from NOAA in an extensible format to make the data easily accessible for real-time dashboarding, alerting, and machine-learning workflows.


![Dashboard screenshot](/images/dashboard.png)
![Dashboard screenshot](/images/dashboard2.png)
---

## Tech Stack

- **Backend**: Python, Flask, MongoDB, Redis  
- **Frontend**: React  
- **Deployment**: Docker, Kubernetes, Helm  

---

## Prerequisites

- **Docker**  
- **kubectl**  
- **Helm**  
- *(Optional, for local development outside containers)*  
  - Node.js  
  - Python  

---

## Installation & Local Setup

1. **Clone the repo**  
   ```bash
   git clone 
   cd solar-wind-dashboard
   ```

2. **Build the Docker images**  
   ```powershell
   ./build.ps1
   ```

3. **Deploy with Helm**  
   ```bash
   helm install rtsw ./helm --namespace solar-wind --create-namespace
   ```

4. **Verify pods & services**  
   ```bash
   kubectl get pods,svc -n solar-wind
   ```

---

## Configuration

To add a new data source:

1. Open `helm/values.yaml`.  
2. Under the top-level `pollers:` section, add a new entry:

   ```yaml
   pollers:
     my-new-poller:
       collection: new_collection_name
       endpoint:   "https://example.com/data.json"
       pollInterval: 60           # seconds
       # …any other per-poller settings…
   ```
3. Re-apply helm chart:

   ```bash
   helm upgrade --install rtsw ./helm  --namespace solar-wind  --create-namespace 
   ```

This will spin up a new `sw-poll` pod that writes into the specified MongoDB collection.

---

## Project Structure

```
.
├── helm/                     # Helm chart and values.yaml
├── sw-poll/                  # Python poller: fetch JSON → MongoDB
│   └── app.py
├── sw-api/                   # Flask REST & SSE API
│   └── app.py
├── sw-alerts/                # Alert engine: watch Mongo → Redis queue
│   └── alerts.py
    └── rules.py              
└── sw-dashboard/             # React dashboard & live charts
    └── src/
```
![Dashboard screenshot](/images/flowchart.png)
- **sw-poll**  
  Configurable Python function that polls an HTTP JSON endpoint on a set cadence and upserts into MongoDB.

- **sw-api**  
  Flask service exposing REST endpoints and SSE streams for real-time dashboard updates.

- **sw-alerts**  
  Engine that watches each MongoDB collection (via Change Streams) and pushes threshold-based alerts into a Redis queue. Alerts configured in rules.py

- **sw-dashboard**  
  React application that displays time-series charts, metrics, and live alerts.

- **helm**  
  Kubernetes manifests and chart templates for deploying all services plus Redis and MongoDB.

---

## Usage

- **Dashboard**: visit `http://localhost:30080/`   
- **API**: `GET /api/data?limit=100`  
- **SSE stream**: listen on `/api/stream` and `/api/alerts/stream`  
- **Alerts**: consumed via Redis pub/sub or viewed in the dashboard sidebar

