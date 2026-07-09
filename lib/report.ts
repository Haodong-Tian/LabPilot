import { ExperimentRun, LabNotebookReport } from "./types";
import { createId } from "./storage";
import { formatDateTime, formatDuration } from "./utils";

export function reportMarkdown(run: ExperimentRun) {
  const materials = [...new Set(run.protocolSteps.flatMap((step) => step.materials))];
  return `# ${run.protocolName} - Lab Notebook\n\n**Date:** ${new Date(run.startedAt).toLocaleDateString()}  \n**Protocol:** ${run.protocolName} (v${run.protocolVersion})  \n**Started:** ${formatDateTime(run.startedAt)}  \n**Finished:** ${formatDateTime(run.endedAt)}\n\n## Objective\n${run.protocolObjective || run.protocolDescription || "Not specified."}\n\n## Materials\n${materials.map((item) => `- ${item}`).join("\n") || "Not recorded."}\n\n## Procedure and observations\n${run.stepLogs.map((log, index) => `### ${index + 1}. ${log.stepTitle} (${log.status.replace("_", " ")})\n- Actual time: ${formatDuration(log.actualDurationSeconds)}\n${log.notes ? `- Notes: ${log.notes}\n` : ""}${log.actualObservation ? `- Observation: ${log.actualObservation}\n` : ""}${log.timerSecondsElapsed !== undefined ? `- Timer elapsed: ${formatDuration(log.timerSecondsElapsed)}\n` : ""}`).join("\n")}\n## Next steps\n- [ ] Add next steps here.\n`;
}

export function reportFromRun(run: ExperimentRun): LabNotebookReport { const time = new Date().toISOString(); return { id: createId(), title: `${run.protocolName} - ${new Date(run.startedAt).toLocaleDateString()}`, experimentRunId: run.id, protocolId: run.protocolId, protocolTitle: run.protocolName, createdAt: time, updatedAt: time, markdown: reportMarkdown(run) }; }
