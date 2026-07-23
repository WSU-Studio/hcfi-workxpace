export interface Department {
  id: string;
  code: string;
  name: string;
  description: string | null;
  headId: string | null;
  divisionId?: string | null;
  isActive?: boolean;
  head?: { id: string; name: string } | null;
  division?: { id: string; code: string; name: string } | null;
}
