export interface TaxonomyTopic {
  id: number;
  name: string;
  slug: string;
}

export interface TaxonomySubcategory {
  id: number;
  name: string;
  slug: string;
  topics: TaxonomyTopic[];
}

export interface TaxonomyCategory {
  id: number;
  name: string;
  slug: string;
  description?: string;
  subcategories: TaxonomySubcategory[];
}

export interface ExamTrack {
  id: number;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  status: 'live' | 'upcoming';
  upcoming_label?: string;
  categories: TaxonomyCategory[];
}

export interface TaxonomyTree {
  tracks: ExamTrack[];
}

export interface ActiveTaxonomyFilter {
  track_slug?: string;
  category_slug?: string;
  subcategory_slug?: string;
  topic_slug?: string;
  difficulty_est?: 'easy' | 'medium' | 'hard';
  format?: string;
  tags?: string[];
}
