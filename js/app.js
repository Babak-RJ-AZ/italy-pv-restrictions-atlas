(() => {
  const CONFIG = {
    mapStyle: "https://tiles.openfreemap.org/styles/liberty",
    pmtilesUrl: "pmtiles://./data/Lombardia_PV_Restrictions_test.pmtiles",
    sourceId: "pv-restrictions-source",
    sourceLayer: "pv_restrictions",
    bounds: [
      [8.498209, 44.679665],
      [11.427673, 46.635187]
    ],
    center: [9.95, 45.55],
    zoom: 7.0
  };

  const CATEGORIES = {
    LA: {
      label: "Landscape assets",
      color: "#5b8e7d",
      layerId: "cat-la"
    },
    CH: {
      label: "Cultural heritage",
      color: "#8d6e63",
      layerId: "cat-ch"
    },
    NA: {
      label: "Natural assets",
      color: "#3d8b5a",
      layerId: "cat-na"
    },
    EC: {
      label: "Environmental constraints",
      color: "#4d88b8",
      layerId: "cat-ec"
    },
    INF: {
      label: "Infrastructure",
      color: "#7b6aa6",
      layerId: "cat-inf"
    },
    NH: {
      label: "Natural hazards",
      color: "#c46a4a",
      layerId: "cat-nh"
    }
  };

  const protocol = new pmtiles.Protocol();
  maplibregl.addProtocol("pmtiles", protocol.tile);

  const map = new maplibregl.Map({
    container: "map",
    style: CONFIG.mapStyle,
    center: CONFIG.center,
    zoom: CONFIG.zoom,
    minZoom: 6,
    maxZoom: 12,
    maxBounds: [
      [7.9, 44.2],
      [12.1, 47.1]
    ],
    attributionControl: true
  });

  map.addControl(
    new maplibregl.NavigationControl({
      visualizePitch: true
    }),
    "top-right"
  );

  // Keep scale away from the overlap legend.
  map.addControl(
    new maplibregl.ScaleControl({
      maxWidth: 100,
      unit: "metric"
    }),
    "bottom-left"
  );

  const intensityColor = [
    "step",
    ["get", "N_CONSTR"],
    "#fff7bc",
    2, "#fec44f",
    3, "#fe9929",
    4, "#ec7014",
    5, "#cc4c02"
  ];

  let activePopup = null;

  // ============================================================
  // MAP INITIALIZATION
  // ============================================================

  map.on("load", () => {
    map.addSource(CONFIG.sourceId, {
      type: "vector",
      url: CONFIG.pmtilesUrl,
      attribution: "PV restrictions: Ranjgar et al. (2025)"
    });

    // ----------------------------------------------------------
    // OVERLAP INTENSITY LAYER
    // ----------------------------------------------------------

    map.addLayer({
      id: "pv-fill",
      type: "fill",
      source: CONFIG.sourceId,
      "source-layer": CONFIG.sourceLayer,
      paint: {
        "fill-color": intensityColor,
        "fill-opacity": 0.72
      }
    });

    map.addLayer({
      id: "pv-outline",
      type: "line",
      source: CONFIG.sourceId,
      "source-layer": CONFIG.sourceLayer,
      paint: {
        "line-color": "#6a3f1c",
        "line-opacity": 0.42,
        "line-width": [
          "interpolate",
          ["linear"],
          ["zoom"],
          6, 0.15,
          10, 0.55,
          12, 0.9
        ]
      }
    });

    // ----------------------------------------------------------
    // SIX INDIVIDUAL CATEGORY LAYERS
    // ----------------------------------------------------------

    Object.entries(CATEGORIES).forEach(([key, info]) => {
      map.addLayer({
        id: info.layerId,
        type: "fill",
        source: CONFIG.sourceId,
        "source-layer": CONFIG.sourceLayer,

        filter: [
          "==",
          ["get", key],
          1
        ],

        layout: {
          visibility: "none"
        },

        paint: {
          "fill-color": info.color,
          "fill-opacity": 0.46,
          "fill-outline-color": info.color
        }
      });
    });

    document
      .getElementById("loading")
      .classList.add("hidden");

    applyViewMode();
  });

  map.on("error", (event) => {
    console.error(
      "Map error:",
      event.error || event
    );
  });

  // ============================================================
  // MODE / CATEGORY HELPERS
  // ============================================================

  function currentMode() {
    return document.querySelector(
      'input[name="viewMode"]:checked'
    ).value;
  }

  function selectedCategories() {
    return [
      ...document.querySelectorAll(
        '#category-controls input[type="checkbox"]:checked'
      )
    ].map((element) => element.value);
  }

  function showOverlapLayers(show) {
    const visibility = show
      ? "visible"
      : "none";

    map.setLayoutProperty(
      "pv-fill",
      "visibility",
      visibility
    );

    map.setLayoutProperty(
      "pv-outline",
      "visibility",
      visibility
    );
  }

  function showCategoryLayers(selectedKeys) {
    Object.entries(CATEGORIES).forEach(
      ([key, info]) => {
        const visible =
          selectedKeys.includes(key);

        map.setLayoutProperty(
          info.layerId,
          "visibility",
          visible
            ? "visible"
            : "none"
        );
      }
    );
  }

  function applyViewMode() {
    if (!map.getLayer("pv-fill")) {
      return;
    }

    const mode = currentMode();

    const controls =
      document.getElementById(
        "category-controls"
      );

    const legend =
      document.getElementById(
        "legend"
      );

    // ----------------------------------------------------------
    // OVERLAP INTENSITY
    // ----------------------------------------------------------

    if (mode === "intensity") {
      controls.classList.add(
        "disabled"
      );

      legend.style.display = "";

      showOverlapLayers(true);
      showCategoryLayers([]);

      return;
    }

    // ----------------------------------------------------------
    // SELECTED CATEGORIES
    // ----------------------------------------------------------

    controls.classList.remove(
      "disabled"
    );

    legend.style.display = "none";

    showOverlapLayers(false);

    const selected =
      selectedCategories();

    // If nothing is checked, all six category layers are hidden.
    showCategoryLayers(selected);
  }

  // ============================================================
  // MAP MODE CONTROLS
  // ============================================================

  document
    .querySelectorAll(
      'input[name="viewMode"]'
    )
    .forEach((element) => {
      element.addEventListener(
        "change",
        applyViewMode
      );
    });

  document
    .querySelectorAll(
      '#category-controls input[type="checkbox"]'
    )
    .forEach((element) => {
      element.addEventListener(
        "change",
        () => {
          updateToggleAllLabel();
          applyViewMode();
        }
      );
    });

  function updateToggleAllLabel() {
    const boxes = [
      ...document.querySelectorAll(
        '#category-controls input[type="checkbox"]'
      )
    ];

    const allChecked =
      boxes.every(
        (box) => box.checked
      );

    document.getElementById(
      "toggle-all"
    ).textContent =
      allChecked
        ? "Clear all"
        : "Select all";
  }

  document
    .getElementById("toggle-all")
    .addEventListener(
      "click",
      () => {
        const boxes = [
          ...document.querySelectorAll(
            '#category-controls input[type="checkbox"]'
          )
        ];

        const allChecked =
          boxes.every(
            (box) => box.checked
          );

        boxes.forEach(
          (box) => {
            box.checked =
              !allChecked;
          }
        );

        updateToggleAllLabel();
        applyViewMode();
      }
    );

  // ============================================================
  // RESET VIEW
  // ============================================================

  document
    .getElementById("reset-view")
    .addEventListener(
      "click",
      () => {
        map.fitBounds(
          CONFIG.bounds,
          {
            padding: 35,
            duration: 700
          }
        );

        clearInspection();

        if (activePopup) {
          activePopup.remove();
          activePopup = null;
        }
      }
    );

  // ============================================================
  // CURSOR
  // ============================================================

  function setPointerCursor() {
    map.getCanvas().style.cursor =
      "pointer";
  }

  function clearPointerCursor() {
    map.getCanvas().style.cursor =
      "";
  }

  map.on(
    "mouseenter",
    "pv-fill",
    setPointerCursor
  );

  map.on(
    "mouseleave",
    "pv-fill",
    clearPointerCursor
  );

  Object.values(CATEGORIES).forEach(
    (info) => {
      map.on(
        "mouseenter",
        info.layerId,
        setPointerCursor
      );

      map.on(
        "mouseleave",
        info.layerId,
        clearPointerCursor
      );
    }
  );

  // ============================================================
  // CLICK IDENTIFICATION
  // ============================================================

  function identifyFeature(event) {
    if (!event.features?.length) {
      return;
    }

    const props =
      event.features[0].properties || {};

    showInspection(props);

    const active =
      Object.entries(CATEGORIES)
        .filter(
          ([key]) =>
            Number(props[key]) === 1
        )
        .map(
          ([, info]) =>
            info.label
        );

    const count =
      Number(props.N_CONSTR) ||
      active.length;

    const popupHtml = `
      <div style="min-width:190px">

        <strong>
          PV restriction screening
        </strong>

        <div
          style="
            margin:7px 0 4px;
            color:#a63d2f;
            font-weight:700;
          "
        >
          RESTRICTED
        </div>

        <div>
          <strong>${count}</strong>
          overlapping
          constraint${count === 1 ? "" : "s"}
        </div>

        <div
          style="
            margin-top:7px;
            color:#59645c;
          "
        >
          ${
            active.join(" · ") ||
            "No category attributes found"
          }
        </div>

      </div>
    `;

    if (activePopup) {
      activePopup.remove();
    }

    activePopup =
      new maplibregl.Popup({
        closeButton: true,
        maxWidth: "300px"
      })
        .setLngLat(event.lngLat)
        .setHTML(popupHtml)
        .addTo(map);

    activePopup.on(
      "close",
      () => {
        activePopup = null;
        clearInspection();
      }
    );
  }

  // Click identification for overlap mode.
  map.on(
    "click",
    "pv-fill",
    identifyFeature
  );

  // Click identification for category mode.
  Object.values(CATEGORIES).forEach(
    (info) => {
      map.on(
        "click",
        info.layerId,
        identifyFeature
      );
    }
  );

  // ============================================================
  // SIDEBAR INSPECTION
  // ============================================================

  function showInspection(props) {
    const activeCount =
      Number(props.N_CONSTR) ||
      Object.keys(CATEGORIES)
        .filter(
          (key) =>
            Number(props[key]) === 1
        ).length;

    document.getElementById(
      "inspection-empty"
    ).hidden = true;

    document.getElementById(
      "inspection-result"
    ).hidden = false;

    document.getElementById(
      "constraint-count"
    ).textContent =
      `${activeCount} constraint${
        activeCount === 1
          ? ""
          : "s"
      }`;

    const list =
      document.getElementById(
        "constraint-list"
      );

    list.innerHTML = "";

    Object.entries(CATEGORIES)
      .forEach(
        ([key, info]) => {
          const active =
            Number(props[key]) === 1;

          const element =
            document.createElement(
              "div"
            );

          element.className =
            `constraint-pill${
              active
                ? ""
                : " off"
            }`;

          element.textContent =
            `${active ? "✓" : "–"} ${
              info.label
            }`;

          list.appendChild(
            element
          );
        }
      );

    document.getElementById(
      "combo-value"
    ).textContent =
      props.COMBO || "—";
  }

  function clearInspection() {
    document.getElementById(
      "inspection-empty"
    ).hidden = false;

    document.getElementById(
      "inspection-result"
    ).hidden = true;

    document.getElementById(
      "constraint-list"
    ).innerHTML = "";

    document.getElementById(
      "combo-value"
    ).textContent = "";
  }

  // ============================================================
  // TABS
  // ============================================================

  document
    .querySelectorAll(".tab")
    .forEach((button) => {
      button.addEventListener(
        "click",
        () => {
          document
            .querySelectorAll(
              ".tab"
            )
            .forEach(
              (tab) => {
                tab.classList.remove(
                  "active"
                );
              }
            );

          document
            .querySelectorAll(
              ".tab-panel"
            )
            .forEach(
              (panel) => {
                panel.classList.remove(
                  "active"
                );
              }
            );

          button.classList.add(
            "active"
          );

          document
            .getElementById(
              `tab-${button.dataset.tab}`
            )
            .classList.add(
              "active"
            );
        }
      );
    });

  // ============================================================
  // MOBILE SIDEBAR
  // ============================================================

  const sidebar =
    document.getElementById(
      "sidebar"
    );

  document
    .getElementById(
      "mobile-menu"
    )
    .addEventListener(
      "click",
      () => {
        sidebar.classList.toggle(
          "open"
        );
      }
    );

  // ============================================================
  // INITIAL UI STATE
  // ============================================================

  updateToggleAllLabel();
})();