export type DualisLoginState = 'logged-out' | 'logging-in' | 'logged-in' | 'failed';

export interface DualisCredentials {
  username: string;
  password: string;
}

export interface DualisSessionUrls {
  main?: string;
  courseResults?: string;
  studentResults?: string;
  monthlySchedule?: string;
  logout?: string;
  semesters: Record<string, string>;
}

export interface DualisStudySummary {
  gpaTotal: number | null;
  gpaMainModules: number | null;
  creditsGained: number | null;
  creditsTotal: number | null;
}

export interface DualisModule {
  id: string;
  name: string;
  grade: string;
  credits: string;
  passed: boolean;
  detailsUrl?: string;
}

export interface DualisExam {
  name: string;
  moduleName: string;
  semester: string;
  attempt: string;
  grade: string;
}

export interface DualisSemester {
  name: string;
  modules: DualisModule[];
}

export interface DualisDashboard {
  summary: DualisStudySummary | null;
  modules: DualisModule[];
  semesters: string[];
}
