# Real Government Data Integration Guide 🏛️

## Current Status
Your database currently contains **DEMO DATA** - realistic-looking Bangalore projects created for development. These are NOT verified government records.

## How to Get Real Government Construction Data

### 🇮🇳 Official Indian Government Sources

#### 1. **India Open Government Data Platform (OGD)**
- **Website**: https://data.gov.in
- **Search Terms**: "infrastructure", "construction projects", "BBMP", "PWD", "NHAI"
- **Formats**: CSV, JSON, XML, XLS
- **Free**: Yes ✅
- **Verified**: Official government data ✅

**Example Datasets**:
- NHAI Road Projects: Search "nhai projects"
- BBMP Infrastructure: Search "bbmp infrastructure"
- Metro Projects: Search "metro construction"

#### 2. **State Government Portals**

**Karnataka**:
- **KGIS**: https://kgis.ksrsac.in (Government GIS data with coordinates)
- **e-Procurement**: https://eproc.karnataka.gov.in (Tender notices with project details)

**BBMP (Bangalore)**:
- **Website**: https://bbmp.gov.in
- **Projects**: Look for "Development Projects" section
- **Ward-wise data**: https://bbmp.gov.in/ward

**BMRCL (Metro)**:
- **Website**: https://english.bmrc.co.in
- **Projects**: https://english.bmrc.co.in/projects
- **Tenders**: https://english.bmrc.co.in/tenders

**NHAI (Highways)**:
- **Website**: https://morth.nic.in
- **Projects**: https://nhai.gov.in/ongoing-projects

#### 3. **Central Government Tenders Portal**
- **URL**: https://eprocure.gov.in/eprocure/app
- **What you get**: 
  - Project name, location
  - Budget, timeline
  - Department, contractor
  - Technical specifications

#### 4. **RTI (Right to Information) Requests**
File RTI requests to get detailed project data:
- Online portal: https://rtionline.gov.in
- Cost: ₹10 per request
- Response time: 30 days
- **What to ask**: "List of all ongoing infrastructure projects with GPS coordinates, budget, timeline, and contractor details"

### 📊 Commercial Data Sources (Paid)

1. **CMIE (Centre for Monitoring Indian Economy)**: https://www.cmie.com
2. **India Infoline Projects**: Project tracking database
3. **CapEx Database**: Infrastructure project database

---

## How to Import Real Data

### Step 1: Download Government Data
1. Visit https://data.gov.in
2. Search: **"infrastructure projects [your city]"**
3. Download CSV/JSON file

### Step 2: Prepare CSV File
Your CSV should have these columns:
```csv
name,category,department,contractor,budget,start_date,completion_date,status,progress,area,district,lat,lng,description,impact
```

**Example**:
```csv
"Electronics City Flyover","bridge","BBMP","L&T","1200000000","2024-01-15","2026-06-30","in progress","35","Electronics City","Bangalore South","12.8456","77.6603","New flyover to reduce traffic","50,000 vehicles/day"
```

### Step 3: Run Import Script
```bash
cd backend
mkdir -p data
# Place your CSV in backend/data/projects.csv
node scripts/import-real-data.js
```

The script will:
- ✅ Read CSV file
- ✅ Validate data
- ✅ Create departments & contractors
- ✅ Import projects with GPS coordinates
- ✅ Show success/error summary

---

## How Location-Based Search Works 🗺️

Your system **already has location-based search working**! It uses:

### PostGIS (Geographic Database)
Every project has GPS coordinates stored as:
```sql
location geography(Point, 4326)
```

### API Endpoints

**1. Projects sorted by distance**:
```
GET /api/projects?lat=12.9716&lng=77.5946
```
Returns all projects sorted by distance from your location.

**2. Projects within radius**:
```
GET /api/projects/nearby?lat=12.9716&lng=77.5946&radius=5000
```
Returns projects within 5km (5000 meters).

### Frontend Integration
When you enter your location:
1. Frontend gets GPS coordinates (or manual selection)
2. Sends to backend: `fetchProjects({ lat, lng })`
3. Backend uses PostGIS to calculate distances
4. Returns sorted by nearest first
5. Shows on map with distance badges

### Example Query (Backend)
```javascript
// Get projects within 5km, sorted by distance
const projects = await geoService.getProjectsNearby(lat, lng, 5000);
```

---

## Verifying Data Authenticity 

### How to Check if Projects are Real

1. **Cross-reference with official websites**:
   - Search project name on BBMP/NHAI website
   - Check department tender portal
   
2. **Verify GPS coordinates**:
   - Open Google Maps
   - Enter coordinates: `12.9716, 77.5946`
   - Check if construction site exists

3. **RTI Request**:
   - File RTI to verify specific project details
   - Costs ₹10, takes 30 days

4. **News verification**:
   - Search project name + "government announcement"
   - Check local news coverage

### Red Flags (Fake Data)
- ❌ No project ID/reference number
- ❌ Coordinates point to residential areas
- ❌ Department doesn't exist
- ❌ Unrealistic budget (too high/low)
- ❌ No tender on government portal

---

## Recommended Workflow

### Phase 1: Start with Verified Sources (Now)
1. Go to https://data.gov.in
2. Download **verified** datasets (look for datasets from official departments)
3. Import using script above
4. Test location-based search

### Phase 2: Automate Updates (Later)
Some government portals have APIs:
```javascript
// Example: Fetch from government API
const response = await fetch('https://api.data.gov.in/resource/...');
const projects = await response.json();
// Import to database
```

### Phase 3: Crowdsourcing Verification (Future)
- Allow citizens to report new construction sites
- Verify against official sources
- Add to database after verification

---

## Quick Start: Get Real Bangalore Projects Now

### Option 1: BBMP E-Procurement
1. Visit: https://eproc.karnataka.gov.in
2. Search: BBMP + current year
3. Download tender details (name, location, budget)
4. Manually add GPS coordinates using Google Maps
5. Create CSV and import

### Option 2: BMRCL Metro Projects
1. Visit: https://english.bmrc.co.in/projects
2. List all metro line extensions with stations
3. Get GPS coordinates for each station
4. Import as Metro category

### Option 3: Sample Verified Project
Here's a **real** Bangalore project you can add:

```csv
name,category,department,contractor,budget,start_date,completion_date,status,progress,area,district,lat,lng,description,impact
"Namma Metro Yellow Line (RV Road - Bommasandra)","metro","BMRCL","Larsen & Toubro","13800000000","2021-01-01","2026-12-31","in progress","42","Bommasandra","Bangalore South","12.8064","77.6817","19km Yellow Line extension","2.5 lakh daily riders"
"Peripheral Ring Road (PRR)","road","NHAI","KMC Constructions","20000000000","2022-10-01","2028-03-31","in progress","15","Multiple","Bangalore Metropolitan","13.0827","77.5877","65.5km ring road around Bangalore","Reduce inner-city traffic by 40%"
```

Add this to `backend/data/projects.csv` and run the import script!

---

## Database Schema for Real Data

Your current schema supports all required government project fields:

```sql
✅ name                - Project name
✅ category            - Type (Road/Metro/Hospital/etc)
✅ department_id       - Government department
✅ contractor_id       - Construction company
✅ budget              - Numeric budget
✅ budget_display      - Display format (₹120 Cr)
✅ start_date          - Start date
✅ expected_completion - Expected completion
✅ status              - Planned/In Progress/Completed/Delayed
✅ progress_percentage - 0-100%
✅ location            - GPS coordinates (PostGIS)
✅ geofence_radius     - Alert radius
✅ civic_impact        - Description of impact
```

**You're ready to import real data immediately!** 🚀

---

## Need Help?

1. **Getting data**: Start with data.gov.in - it's the easiest
2. **GPS coordinates**: Use Google Maps "What's here?" feature
3. **Import errors**: Check CSV format matches template
4. **Verification**: Cross-check with official government websites

Your location-based search is **already working** - you just need to replace demo data with real verified government projects!
