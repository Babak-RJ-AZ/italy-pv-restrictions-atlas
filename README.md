# Where Can Solar Go? — PV Restrictions Atlas

**Pilot release: Lombardia**

Production-oriented pilot interface for the Italy PV Restrictions Atlas.

## Add the PMTiles file
Copy your generated archive to:

`data/Lombardia_PV_Restrictions_test.pmtiles`

The application expects source-layer `pv_restrictions` and attributes `LA`, `CH`, `NA`, `EC`, `INF`, `NH`, `N_CONSTR`, and `COMBO`.

## Run locally
Use the included byte-range-capable server:

```bash
python range_server.py
```

Then open `http://localhost:8000`.

## Research basis
Ranjgar, B.; Niccolai, A.; Leva, S. (2025). *Where Can Solar Go? Assessing Land Availability for PV in Italy Under Regulatory Constraints.* Solar, 5, 40. DOI: https://doi.org/10.3390/solar5030040

## Disclaimer
This atlas is a research and preliminary spatial-screening tool. It does not replace official planning, legal, environmental, cadastral, or permitting assessments.

## Basemap
OpenFreeMap / OpenStreetMap-derived data.
