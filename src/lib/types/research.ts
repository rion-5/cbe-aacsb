export type BooleanKeys = 'is_basic' | 'is_applied' | 'is_teaching' | 'is_peer_journal' | 'is_other_reviewed' | 'is_other_nonreviewed';

export interface ResearchOutput {
  research_id: number;
  api_research_id: string | null;
  fac_nip: string;
  name: string | null;
  data_source: string;
  title: string;
  english_title: string | null;
  doi: string | null;
  published_at: string;
  publisher: string | null;
  journal_name: string | null;
  english_journal: string | null;
  journal_index: string | null;
  type: string | null;
  journal_category: string | null;
  impact_factor: number | null;
  is_q1_last3years: boolean | null;
  is_peer_reviewed: boolean | null;
  role: string | null;
  is_domestic: boolean | null;
  created_at: string;
  updated_at: string;
}

export interface ResearchClassification {
  research_id: number;
  fac_nip: string;
  is_basic: boolean;
  is_applied: boolean;
  is_teaching: boolean;
  is_peer_journal: boolean;
  is_other_reviewed: boolean;
  is_other_nonreviewed: boolean;
  created_at: string;
  updated_at: string;
}

export interface Faculty {
  user_id: string;
  name: string | null;
  college: string | null;
  department: string | null;
  job_type: string | null;
  job_rank: string | null;
  highest_degree: string | null;
}