import * as XLSX from "xlsx";
import type {
  findExportLocations,
  findExportMachines,
  findExportTools,
} from "./excel.repository";

type ExportTools = Awaited<ReturnType<typeof findExportTools>>;
type ExportLocations = Awaited<ReturnType<typeof findExportLocations>>;
type ExportMachines = Awaited<ReturnType<typeof findExportMachines>>;

export function buildInventoryExportWorkbook(args: {
  locations: ExportLocations;
  machines: ExportMachines;
  tools: ExportTools;
}) {
  const workbook = XLSX.utils.book_new();

  appendSheet(workbook, "Tools", args.tools.map(mapToolRow));
  appendSheet(workbook, "Locations", args.locations.map(mapLocationRow));
  appendSheet(workbook, "Machines", args.machines.map(mapMachineRow));
  appendSheet(workbook, "Summary", buildSummaryRows(args));

  return XLSX.write(workbook, { bookType: "xlsx", type: "buffer" }) as Buffer;
}

export function exportFileName() {
  return `tool-inventory-export-${new Date().toISOString().slice(0, 10)}.xlsx`;
}

function appendSheet(workbook: XLSX.WorkBook, name: string, rows: Record<string, unknown>[]) {
  const worksheet = XLSX.utils.json_to_sheet(rows.length > 0 ? rows : [{ Empty: "No data" }]);
  XLSX.utils.book_append_sheet(workbook, worksheet, name);
}

function mapToolRow(tool: ExportTools[number]) {
  return {
    Product: tool.productName,
    Manufacturer: tool.manufacturer?.name ?? "",
    "Article Number": tool.articleNumber ?? "",
    "Alternative Article": tool.alternativeArticleNumber ?? "",
    Grade: tool.grade ?? "",
    Mounting: tool.mounting ?? "",
    Type: tool.toolType?.name ?? "",
    Diameter: tool.diameter ?? "",
    "Cutting Length": tool.cuttingLength ?? "",
    "Cutting Size": tool.cuttingSize ?? "",
    Holder: tool.holder ?? "",
    "Secondary Holder": tool.holderSecondary ?? "",
    Overhang: tool.overhang ?? "",
    "Stock Raw": tool.stockRaw ?? "",
    Quantity: tool.quantity ?? "",
    "Secondary Quantity": tool.quantitySecondary ?? "",
    "Count Raw": tool.countRaw ?? "",
    "Price Raw": tool.priceRaw ?? "",
    "Total Price Raw": tool.totalPriceRaw ?? "",
    Location: tool.location?.rawLabel ?? "",
    Machine: tool.machine?.name ?? tool.machineRaw ?? "",
    Status: tool.status,
    Archived: tool.isArchived ? "Yes" : "No",
    "Source Sheet": tool.sourceSheet ?? "",
    "Source Row": tool.sourceRowNumber ?? "",
    Updated: tool.updatedAt.toISOString(),
  };
}

function mapLocationRow(location: ExportLocations[number]) {
  return {
    Label: location.rawLabel ?? "",
    Shelf: location.shelf ?? "",
    Drawer: location.drawer ?? "",
    Compartment: location.compartment ?? "",
    "Map Row": location.mapRow ?? "",
    "Map Column": location.mapColumn ?? "",
    "Source Sheet": location.sourceSheet ?? "",
    Description: location.description ?? "",
  };
}

function mapMachineRow(machine: ExportMachines[number]) {
  return {
    Name: machine.name,
    Description: machine.description ?? "",
    Created: machine.createdAt.toISOString(),
    Updated: machine.updatedAt.toISOString(),
  };
}

function buildSummaryRows(args: {
  locations: ExportLocations;
  machines: ExportMachines;
  tools: ExportTools;
}) {
  return [
    { Metric: "Exported at", Value: new Date().toISOString() },
    { Metric: "Tools", Value: args.tools.length },
    { Metric: "Locations", Value: args.locations.length },
    { Metric: "Machines", Value: args.machines.length },
  ];
}
