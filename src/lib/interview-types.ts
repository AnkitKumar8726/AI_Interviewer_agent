export type CurriculumDay = {
  day: number;
  title: string;
  type: string;
  tools: string[];
  objectives: string[];
};

export type CurriculumModule = { n: number; title: string; days: number[] };

export type Curriculum = {
  cohort: string;
  modules: CurriculumModule[];
  days: CurriculumDay[];
};

export type Mission = {
  day: number;
  title: string;
  passed?: boolean;
  skipped?: boolean;
  attempts?: number;
};

export type CandidateProfile = {
  member: {
    id: string;
    name: string;
    jobRole: string;
    yearsExperience: number;
    education: string;
    status: string;
  };
  missions: Mission[];
  signals: { commitDays: number; missionsCompleted: number; missionsFirstTry: number };
};

export type InterviewFeedback = {
  summary: string;
  strengths: string[];
  gaps: string[];
  next: string[];
};

export type InterviewMeta = {
  questionNumber: number;
  totalQuestions: number;
  focusDays: { day: number; title: string }[];
  coveredDays: number[];
};
