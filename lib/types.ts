export type StepStatus = "not_started" | "in_progress" | "completed" | "skipped" | "paused";
export type RunStatus = "not_started" | "running" | "paused" | "completed" | "skipped" | "aborted";

export interface UserInputField {
  id: string;
  label: string;
  placeholder?: string;
  required?: boolean;
}

export interface ProtocolStep {
  id: string;
  title: string;
  instruction: string;
  materials: string[];
  timerMinutes?: number;
  warning?: string;
  expectedObservation?: string;
  userInputFields?: UserInputField[];
  instrument?: string;
  temperature?: string;
  editableNotes?: string;
}

export interface Protocol {
  id: string;
  title: string;
  description: string;
  version: string;
  objective?: string;
  createdAt: string;
  updatedAt: string;
  steps: ProtocolStep[];
}

export interface StepRunLog {
  stepId: string;
  stepTitle: string;
  status: StepStatus;
  startedAt?: string;
  completedAt?: string;
  actualDurationSeconds?: number;
  timerSecondsElapsed?: number;
  notes?: string;
  actualObservation?: string;
  userInputs?: Record<string, string>;
  skippedAt?: string;
  plannedDurationSeconds?: number;
  timerStartedAt?: string;
  timerPausedAt?: string;
  accumulatedPausedSeconds?: number;
}

export interface ExperimentRun {
  id: string;
  protocolId: string;
  protocolName: string;
  protocolVersion: string;
  protocolDescription: string;
  protocolObjective?: string;
  protocolSteps: ProtocolStep[];
  startedAt: string;
  endedAt?: string;
  status: RunStatus;
  stepLogs: StepRunLog[];
  notes?: string;
  deviations?: string;
  currentStepIndex?: number;
  updatedAt?: string;
  /** Legacy embedded chats are retained for migration into the dedicated chat store. */
  chatMessages?: ChatMessage[];
}

export interface LabNotebookReport {
  id: string;
  title: string;
  experimentRunId: string;
  protocolId: string;
  protocolTitle: string;
  createdAt: string;
  updatedAt: string;
  markdown: string;
  isFavorite?: boolean;
  tags?: string[];
}

export interface ExperimentChatMessage {
  id: string;
  runId: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
}

export type ChatMessage = Omit<ExperimentChatMessage, "runId"> & { runId?: string };

export type ProtocolImportSource = "text" | "pdf" | "word" | "image";

export interface ProtocolDraft extends Protocol {
  sourceType: ProtocolImportSource;
  sourceName?: string;
  sourceText?: string;
}
