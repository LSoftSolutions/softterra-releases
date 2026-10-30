import { createHash } from "node:crypto";
import {
  copyFileSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { basename, join } from "node:path";
import { pathToFileURL } from "node:url";

export const targets = ["windows-x86_64", "darwin-aarch64", "darwin-x86_64"];
function files(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? files(path) : [path];
  });
}
export function generateMetadata({
  input,
  output,
  version,
  baseUrl,
  notes,
  now = new Date(),
  qualificationRequired = false,
}) {
  if (new URL(baseUrl).protocol !== "https:")
    throw new Error("Release URLs must use HTTPS");
  if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version))
    throw new Error("Invalid release version");
  if (!notes?.fr?.trim() || !notes?.en?.trim())
    throw new Error("Both French and English release notes are required");
  mkdirSync(output, { recursive: true });
  const platforms = {};
  const downloads = [];
  const qualifications = {};
  for (const target of targets) {
    const available = files(join(input, target));
    const reportPath = available.find(
      (path) => basename(path) === "qualification.json",
    );
    if (qualificationRequired && !reportPath)
      throw Error(`Installer qualification missing for ${target}`);
    if (reportPath) {
      const report = JSON.parse(readFileSync(reportPath, "utf8"));
      if (
        report.version !== version ||
        report.target !== target ||
        report.installer !== true ||
        report.installedEngine !== true ||
        report.signatureVerified !== true ||
        !["preview", "production"].includes(report.signingMode) ||
        !/^[a-f0-9]{40}$/.test(report.sourceCommit)
      )
        throw Error(`Invalid qualification for ${target}`);
      qualifications[target] = report;
    }
    const updater = available.filter((path) =>
      target.startsWith("windows-")
        ? path.endsWith(".exe")
        : path.endsWith(".app.tar.gz"),
    );
    const installer = available.filter((path) =>
      target.startsWith("windows-")
        ? path.endsWith(".exe")
        : path.endsWith(".dmg"),
    );
    if (updater.length !== 1 || installer.length !== 1)
      throw new Error(
        `Expected exactly one updater and installer for ${target}`,
      );
    const signature = readFileSync(updater[0] + ".sig", "utf8").trim();
    if (!signature) throw new Error(`Missing signature for ${target}`);
    function asset(path) {
      const filename = `${target}-${basename(path)}`;
      copyFileSync(path, join(output, filename));
      return {
        filename,
        url: `${baseUrl.replace(/\/$/, "")}/${encodeURIComponent(filename)}`,
      };
    }
    const updateAsset = asset(updater[0]);
    asset(updater[0] + ".sig");
    platforms[target] = { url: updateAsset.url, signature };
    const downloadAsset =
      installer[0] === updater[0] ? updateAsset : asset(installer[0]);
    downloads.push({
      target,
      ...downloadAsset,
      size: statSync(installer[0]).size,
      sha256: createHash("sha256")
        .update(readFileSync(installer[0]))
        .digest("hex"),
    });
  }
  if (Object.keys(qualifications).length) {
    if (Object.keys(qualifications).length !== targets.length)
      throw Error("Incomplete installer qualification");
    if (
      new Set(Object.values(qualifications).map((r) => r.sourceCommit)).size !==
      1
    )
      throw Error("Installer source commits differ");
    writeFileSync(
      join(output, "qualification.json"),
      JSON.stringify(
        { schemaVersion: 1, version, platforms: qualifications },
        null,
        2,
      ) + "\n",
    );
  }
  const date = now.toISOString();
  const latest = {
    version,
    pub_date: date,
    notes: JSON.stringify(notes),
    platforms,
  };
  const catalog = {
    schemaVersion: 1,
    version,
    channel: version.includes("-") ? "beta" : "stable",
    publishedAt: date,
    notes,
    downloads,
  };
  writeFileSync(
    join(output, "latest.json"),
    JSON.stringify(latest, null, 2) + "\n",
  );
  writeFileSync(
    join(output, "downloads.json"),
    JSON.stringify(catalog, null, 2) + "\n",
  );
  writeFileSync(
    join(output, "SHA256SUMS"),
    downloads.map((item) => `${item.sha256}  ${item.filename}`).join("\n") +
      "\n",
  );
  return { latest, catalog };
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const [input, output, baseUrl, notesFile] = process.argv.slice(2);
  if (!notesFile)
    throw new Error(
      "Usage: npm run release:metadata -- input output https://host/version notes.json",
    );
  const { version } = JSON.parse(
    readFileSync(new URL("../package.json", import.meta.url), "utf8"),
  );
  generateMetadata({
    input,
    output,
    version,
    baseUrl,
    notes: JSON.parse(readFileSync(notesFile, "utf8")),
    qualificationRequired: process.env.SOFTTERRA_REQUIRE_QUALIFICATION === "1",
  });
}
