import { createHash } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { basename, join } from "node:path";
import { targets } from "./release-metadata.mjs";

export function validateDistribution(
  directory,
  repository,
  tag,
  qualificationRequired = false,
) {
  if (!/^[\w.-]+\/[\w.-]+$/.test(repository))
    throw new Error("Invalid distribution repository");
  const latest = JSON.parse(
    readFileSync(join(directory, "latest.json"), "utf8"),
  );
  const catalog = JSON.parse(
    readFileSync(join(directory, "downloads.json"), "utf8"),
  );
  if (
    tag !== `v${latest.version}` ||
    latest.version !== catalog.version ||
    catalog.schemaVersion !== 1
  )
    throw new Error("Version mismatch");
  if (catalog.channel !== (latest.version.includes("-") ? "beta" : "stable"))
    throw new Error("Channel mismatch");
  if (
    !catalog.notes?.fr?.trim() ||
    !catalog.notes?.en?.trim() ||
    JSON.stringify(JSON.parse(latest.notes)) !== JSON.stringify(catalog.notes)
  )
    throw new Error("Release notes mismatch");
  if (
    JSON.stringify(Object.keys(latest.platforms).sort()) !==
    JSON.stringify([...targets].sort())
  )
    throw new Error("Missing update platforms");
  if (
    !Array.isArray(catalog.downloads) ||
    catalog.downloads.length !== targets.length ||
    new Set(catalog.downloads.map((file) => file.target)).size !==
      targets.length
  )
    throw new Error("Missing download platforms");
  const assets = new Set(["latest.json", "downloads.json", "SHA256SUMS"]);
  const qualificationPath = join(directory, "qualification.json");
  if (qualificationRequired && !existsSync(qualificationPath))
    throw Error("Installer qualification required before publication");
  if (existsSync(qualificationPath)) {
    const report = JSON.parse(readFileSync(qualificationPath, "utf8"));
    if (
      report.schemaVersion !== 1 ||
      report.version !== latest.version ||
      JSON.stringify(Object.keys(report.platforms).sort()) !==
        JSON.stringify([...targets].sort())
    )
      throw Error("Invalid qualification report");
    const commits = new Set();
    for (const target of targets) {
      const item = report.platforms[target];
      if (
        item.target !== target ||
        item.version !== latest.version ||
        item.installer !== true ||
        item.installedEngine !== true ||
        item.signatureVerified !== true ||
        !["preview", "production"].includes(item.signingMode) ||
        !/^[a-f0-9]{40}$/.test(item.sourceCommit)
      )
        throw Error("Unqualified installer");
      commits.add(item.sourceCommit);
    }
    if (commits.size !== 1) throw Error("Inconsistent qualification commits");
    assets.add("qualification.json");
  }
  function assetFromUrl(url) {
    const prefix = `https://github.com/${repository}/releases/download/${tag}/`;
    if (typeof url !== "string" || !url.startsWith(prefix))
      throw new Error("Unexpected release asset URL");
    const name = decodeURIComponent(url.slice(prefix.length));
    if (name !== basename(name) || /[\\/]/.test(name) || !name)
      throw new Error("Invalid asset path");
    return name;
  }
  const expectedHashes = [];
  for (const target of targets) {
    const update = latest.platforms[target];
    const updateName = assetFromUrl(update.url);
    const suffix = target.startsWith("windows-") ? ".exe" : ".app.tar.gz";
    if (!updateName.startsWith(`${target}-`) || !updateName.endsWith(suffix))
      throw new Error("Wrong updater architecture or format");
    readFileSync(join(directory, updateName));
    const signatureName = `${updateName}.sig`;
    if (
      !update.signature ||
      readFileSync(join(directory, signatureName), "utf8").trim() !==
        update.signature
    )
      throw new Error("Signature mismatch");
    assets.add(updateName);
    assets.add(signatureName);
    const file = catalog.downloads.find((file) => file.target === target);
    if (!file) throw new Error("Missing installer");
    const installerName = assetFromUrl(file.url);
    if (
      file.filename !== installerName ||
      !installerName.startsWith(`${target}-`) ||
      !installerName.endsWith(target.startsWith("windows-") ? ".exe" : ".dmg")
    )
      throw new Error("Invalid installer");
    const contents = readFileSync(join(directory, installerName));
    if (
      contents.length !== file.size ||
      createHash("sha256").update(contents).digest("hex") !== file.sha256
    )
      throw new Error("Installer checksum mismatch");
    expectedHashes.push(`${file.sha256}  ${installerName}`);
    assets.add(installerName);
  }
  if (
    readFileSync(join(directory, "SHA256SUMS"), "utf8").trim() !==
    expectedHashes.join("\n")
  )
    throw new Error("SHA256SUMS mismatch");
  return { latest, catalog, assets: [...assets] };
}
