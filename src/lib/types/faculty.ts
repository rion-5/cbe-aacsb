// src/lib/types/faculty.ts
export type FacultyData = {
  user_id: string;
  name: string;
  english_name: string;
  college: string;
  department: string | null;
  job_type: string;
  job_rank: string;
  highest_degree: string;
  highest_degree_year: number | null;
  discipline_code: string;
};