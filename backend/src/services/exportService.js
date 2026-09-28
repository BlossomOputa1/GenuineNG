import { ZipArchive } from "archiver";
import { generateQrPng } from "./qrGenerator.js";

const PAGE_SIZE = 500;

async function loadOwnedBatch({ supabase, manufacturerId, batchId }) {
  const { data: batch, error } = await supabase
    .from("batches")
    .select(
      "id, batch_code, units_produced, manufactured_date, expiry_date, products!inner(name, manufacturer_id)",
    )
    .eq("id", batchId)
    .maybeSingle();
  if (error) throw error;
  if (!batch || batch.products?.manufacturer_id !== manufacturerId) {
    const err = new Error("Batch not found.");
    err.statusCode = 404;
    err.code = "BATCH_NOT_FOUND";
    throw err;
  }
  return batch;
}

async function countUnits(supabase, batchId) {
  const { count, error } = await supabase
    .from("unit_codes")
    .select("id", { count: "exact", head: true })
    .eq("batch_id", batchId);
  if (error) throw error;
  return Number(count || 0);
}

async function loadUnitPage(supabase, batchId, from, size = PAGE_SIZE) {
  const { data, error } = await supabase
    .from("unit_codes")
    .select("unit_id, unit_index, payload, signature, key_version, status")
    .eq("batch_id", batchId)
    .order("unit_index", { ascending: true })
    .range(from, from + size - 1);
  if (error) throw error;
  return data || [];
}

async function prepare({ supabase, manufacturerId, batchId }) {
  const batch = await loadOwnedBatch({ supabase, manufacturerId, batchId });
  const total = await countUnits(supabase, batchId);
  if (total < batch.units_produced) {
    const err = new Error(
      `Code generation is incomplete (${total} / ${batch.units_produced}). Resume generation before exporting.`,
    );
    err.statusCode = 409;
    err.code = "GENERATION_INCOMPLETE";
    throw err;
  }
  return { batch, total };
}

export async function sendCsvExport({
  supabase,
  manufacturerId,
  batchId,
  res,
}) {
  const { batch, total } = await prepare({ supabase, manufacturerId, batchId });
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${batch.batch_code}-codes.csv"`,
  );
  res.write("unit_id,unit_index,key_version,status,qr_filename\n");
  for (let from = 0; from < total; from += PAGE_SIZE) {
    const units = await loadUnitPage(supabase, batchId, from);
    for (const unit of units)
      res.write(
        `${unit.unit_id},${unit.unit_index},${unit.key_version},${unit.status},${unit.unit_id}.png\n`,
      );
  }
  res.end();
}

export async function sendManifestExport({
  supabase,
  manufacturerId,
  batchId,
  res,
}) {
  const { batch, total } = await prepare({ supabase, manufacturerId, batchId });
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${batch.batch_code}-print-manifest.csv"`,
  );
  res.write(
    "product,batch_code,manufactured_date,expiry_date,total_units,unit_id,unit_index\n",
  );
  for (let from = 0; from < total; from += PAGE_SIZE) {
    const units = await loadUnitPage(supabase, batchId, from);
    for (const unit of units) {
      const product = String(batch.products?.name || "").replaceAll('"', '""');
      res.write(
        `"${product}",${batch.batch_code},${batch.manufactured_date},${batch.expiry_date},${batch.units_produced},${unit.unit_id},${unit.unit_index}\n`,
      );
    }
  }
  res.end();
}

export async function streamQrZipExport({
  supabase,
  manufacturerId,
  batchId,
  res,
}) {
  const { batch, total } = await prepare({ supabase, manufacturerId, batchId });
  res.setHeader("Content-Type", "application/zip");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${batch.batch_code}-qr-codes.zip"`,
  );
  const archive = new ZipArchive({ zlib: { level: 0 } });
  archive.on("error", (error) => res.destroy(error));
  archive.pipe(res);
  for (let from = 0; from < total; from += PAGE_SIZE) {
    const units = await loadUnitPage(supabase, batchId, from);
    for (const unit of units) {
      const png = await generateQrPng({
        payload: unit.payload,
        signature: unit.signature,
      });
      archive.append(png, { name: `${unit.unit_id}.png` });
    }
  }
  await archive.finalize();
}
