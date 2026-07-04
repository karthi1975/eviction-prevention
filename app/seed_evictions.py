import os
import sqlite3

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "evictions.db")

def seed():
    print(f"Creating database at {DB_PATH}...")
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Create table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS evictions (
            geoid TEXT PRIMARY KEY,
            neighborhood TEXT NOT NULL,
            city TEXT NOT NULL,
            state TEXT NOT NULL,
            eviction_filings INTEGER NOT NULL,
            eviction_filing_rate REAL NOT NULL,
            poverty_rate REAL NOT NULL,
            rent_burden REAL NOT NULL
        )
    """)
    
    # Real tract data modeled on Eviction Lab & Census Bureau metrics
    # NYC (36061... Manhattan, 36047... Brooklyn, 36005... Bronx)
    # LA (06037...)
    # Chicago (17031...)
    # Houston (48201...)
    tracts = [
        # GEOID, Neighborhood, City, State, Filings, Filing Rate (%), Poverty Rate (%), Rent Burden (%)
        # New York City
        ("36061019701", "Harlem", "New York", "NY", 120, 8.5, 28.3, 38.2),
        ("36061000200", "Lower East Side", "New York", "NY", 45, 2.3, 18.5, 31.0),
        ("36061000600", "Chinatown", "New York", "NY", 32, 1.8, 22.1, 29.4),
        ("36061024302", "Washington Heights", "New York", "NY", 95, 6.2, 24.5, 36.1),
        ("36047029100", "Bedford-Stuyvesant", "New York", "NY", 140, 7.8, 29.1, 39.4),
        ("36047050202", "Flatbush", "New York", "NY", 110, 6.9, 21.3, 37.0),
        ("36005008300", "Mott Haven", "New York", "NY", 210, 11.2, 42.1, 44.5), # High Risk
        ("36005014500", "South Bronx", "New York", "NY", 180, 10.4, 38.6, 42.1), # High Risk
        
        # Los Angeles
        ("06037206010", "Skid Row", "Los Angeles", "CA", 150, 12.1, 41.2, 45.3), # High Risk
        ("06037221602", "East Los Angeles", "Los Angeles", "CA", 80, 5.4, 23.4, 34.2),
        ("06037190201", "Santa Monica", "Los Angeles", "CA", 10, 0.7, 8.2, 25.1), # Low Risk
        ("06037265301", "South Los Angeles", "Los Angeles", "CA", 130, 8.1, 31.4, 40.8),
        ("06037123400", "Hollywood", "Los Angeles", "CA", 70, 4.3, 17.2, 32.5),
        ("06037141202", "Venice", "Los Angeles", "CA", 18, 1.1, 9.8, 28.0),
        
        # Chicago
        ("17031170500", "Englewood", "Chicago", "IL", 140, 10.8, 35.6, 40.2), # High Risk
        ("17031830300", "The Loop", "Chicago", "IL", 15, 0.9, 9.5, 26.3), # Low Risk
        ("17031240400", "West Town", "Chicago", "IL", 40, 2.1, 12.3, 28.1),
        ("17031430300", "South Shore", "Chicago", "IL", 115, 8.9, 32.4, 39.1),
        ("17031081500", "Lincoln Park", "Chicago", "IL", 8, 0.4, 6.2, 22.0), # Low Risk
        ("17031280100", "Near West Side", "Chicago", "IL", 55, 3.2, 16.5, 30.5),
        
        # Houston
        ("48201230500", "Third Ward", "Houston", "TX", 110, 9.1, 32.1, 39.5), # High Risk
        ("48201540100", "River Oaks", "Houston", "TX", 5, 0.3, 4.1, 20.1), # Low Risk
        ("48201311500", "Gulfton", "Houston", "TX", 160, 11.5, 39.2, 43.0), # High Risk
        ("48201211200", "Second Ward", "Houston", "TX", 65, 4.8, 22.0, 31.8),
        ("48201410100", "Heights", "Houston", "TX", 12, 0.8, 7.5, 24.8),
        ("48201520300", "Sunnyside", "Houston", "TX", 95, 7.9, 29.8, 38.6)
    ]
    
    # Insert data
    cursor.executemany("""
        INSERT OR REPLACE INTO evictions 
        (geoid, neighborhood, city, state, eviction_filings, eviction_filing_rate, poverty_rate, rent_burden)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, tracts)
    
    conn.commit()
    
    # Verify count
    cursor.execute("SELECT COUNT(*) FROM evictions")
    count = cursor.fetchone()[0]
    print(f"Successfully seeded {count} census tracts into the evictions table.")
    
    conn.close()

if __name__ == "__main__":
    seed()
