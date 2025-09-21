// src/lib/types/faculty.ts
export type FacultyData = {
  user_id: string;
  name: string;
  fac_name: string;
  college: string;
  department: string;
  job_type: string;
  job_rank: string;
  highest_degree: string;
  highest_degree_year: number | null;
  specialty_field1: string;
  specialty_field2: string;
  normal_professional_responsibilities: string;
  fac_discipline: string;
  fac_time: number;
  fac_ccataacsb: string;
  fac_cqualaacsb2013: string;
  full_time_equivalent: boolean;
};