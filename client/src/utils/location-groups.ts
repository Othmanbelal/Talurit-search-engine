import type { Location } from "../types/tools";

export type LocationGroup = {
  label: string;
  mapLocation?: Location;
  compartments: Location[];
};

export function groupLocationsByShelf(locations: Location[]) {
  const groups = new Map<string, LocationGroup>();

  for (const location of locations) {
    const label = location.rawLabel ?? location.shelf;
    if (!label) continue;

    const group = groups.get(label) ?? { label, compartments: [] };

    if (location.mapRow && location.mapColumn) {
      group.mapLocation = location;
    }

    if (location.compartment) {
      group.compartments.push(location);
    }

    groups.set(label, group);
  }

  return Array.from(groups.values()).sort((left, right) =>
    left.label.localeCompare(right.label, "sv-SE", { numeric: true }),
  );
}

export function sortCompartments(compartments: Location[]) {
  return [...compartments].sort((left, right) =>
    (left.compartment ?? "").localeCompare(right.compartment ?? "", "sv-SE", { numeric: true }),
  );
}
