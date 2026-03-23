export interface Project {
  id: string;
  code: string;
  name: string;
  description: string | null;
  createdAt?: string;
  updatedAt?: string;
}
