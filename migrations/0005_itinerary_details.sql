-- Richer day-by-day itinerary: driving time, elevation, a list of attractions and the overnight stay. Additive only.

ALTER TABLE itinerary_days ADD COLUMN driving TEXT NOT NULL DEFAULT '';        -- e.g. 47 km / 1 to 1.5 hrs
ALTER TABLE itinerary_days ADD COLUMN elevation TEXT NOT NULL DEFAULT '';      -- e.g. 2200m / 7218ft
ALTER TABLE itinerary_days ADD COLUMN attractions TEXT NOT NULL DEFAULT '[]';  -- JSON array of strings
ALTER TABLE itinerary_days ADD COLUMN overnight TEXT NOT NULL DEFAULT '';      -- e.g. Overnight at the hotel in Thimphu
