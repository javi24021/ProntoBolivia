import { NextResponse } from "next/server";
import {
  DEMO_CATALOGS,
  findCatalog,
  getCatalogById,
} from "@/data/demo-catalogs";

export async function GET() {
  return NextResponse.json({
    total: DEMO_CATALOGS.length,
    sample: DEMO_CATALOGS[0],
    findOk: findCatalog("limpieza", "mayorista"),
    findUnknown: findCatalog("desconocido", "mayorista"),
    findByIdOk: getCatalogById("belleza_minorista"),
    findByIdMiss: getCatalogById("no_existe"),
  });
}