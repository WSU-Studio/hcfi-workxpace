export interface Division {
  id: string;
  code: string;
  name: string;
  description: string | null;
  departments?: Array<{ id: string; code: string; name: string }>;
  _count?: { departments: number };
}
