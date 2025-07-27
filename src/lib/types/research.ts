export interface ResearchOutput {
  research_id: number;
  fac_nip: string;
  title: string;
  doi: string | null;
  published_at: string;
  journal_name: string | null;
  journal_index: string | null;
  type: string | null;
  journal_category: string | null;
  impact_factor: number | null;
  is_q1_last3years: boolean | null;
  is_peer_reviewed: boolean | null;
  role: string | null;
  is_domestic: boolean | null;
}

export interface ResearchClassification {
  fac_nip: string;
  research_id: number;
  is_basic: boolean;
  is_applied: boolean;
  is_teaching: boolean;
  is_peer_journal: boolean;
  is_other_reviewed: boolean;
  is_other_nonreviewed: boolean;
  created_at: string;
  updated_at: string;
}

// Boolean 속성만 추출한 타입
export type BooleanKeys = 'is_basic' | 'is_applied' | 'is_teaching' | 'is_peer_journal' | 'is_other_reviewed' | 'is_other_nonreviewed';