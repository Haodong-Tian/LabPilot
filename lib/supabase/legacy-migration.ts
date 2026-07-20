"use client";

import { getReports, getRuns } from "@/lib/storage";
import { LabNotebookReport } from "@/lib/types";
import { createExperimentFromRun } from "./experiments";
import { createExperimentReport, findReportByExperiment } from "./experiment-reports";

const migrationKey = (userId: string) => `labpilot.cloudMigration.reports.v1.${userId}`;

export async function migrateLocalReportsToCloud(userId: string) {
  if (typeof window === "undefined") return { migrated: 0, skipped: 0 };
  if (localStorage.getItem(migrationKey(userId)) === "done") return { migrated: 0, skipped: 0 };

  const reports = getReports();
  const runs = getRuns();
  let migrated = 0;
  let skipped = 0;

  for (const report of reports) {
    const run = runs.find((item) => item.id === report.experimentRunId);
    if (!run) {
      skipped += 1;
      continue;
    }

    const experiment = await createExperimentFromRun(userId, run);
    const existing = await findReportByExperiment(userId, experiment.id);
    if (!existing) {
      const cloudReport: LabNotebookReport = { ...report, experimentRunId: experiment.id };
      await createExperimentReport(userId, cloudReport);
      migrated += 1;
    }
  }

  localStorage.setItem(migrationKey(userId), "done");
  return { migrated, skipped };
}
