'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { useSession } from 'next-auth/react';
import Pagination from '@/components/Pagination';
import LoadingSpin from '@/components/ui/LoadingSpin';
import Card from '@/components/ui/Card';
import SearchInput from '@/components/ui/SearchInput';
import { Table, TableBodyRow, TableCell, TableEmptyRow, TableHead, TableHeaderRow } from '@/components/ui/Table';
import { Project } from '@/types/project';
import ProjectActions from './components/ProjectActions';

export default function ProjectPage() {
  const { data: session } = useSession();
  const [projects, setProjects] = useState<Project[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchKeyword, setSearchKeyword] = useState('');

  const itemsPerPage = 10;
  const canCreateProject = Boolean(session?.user?.access?.activityAccess?.createProject);
  const canEditProject = Boolean(session?.user?.access?.activityAccess?.editProject);
  const canDeleteProject = Boolean(session?.user?.access?.activityAccess?.deleteProject);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentProjects = filteredProjects.slice(startIndex, startIndex + itemsPerPage);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const res = await fetch('/api/workspace-management/project');
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();
        const list = data.projects || [];
        setProjects(list);
        setFilteredProjects(list);
      } catch {
        setError('Failed to load data');
        setProjects([]);
        setFilteredProjects([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (!searchKeyword.trim()) {
      setFilteredProjects(projects);
    } else {
      const kw = searchKeyword.trim().toLowerCase();
      setFilteredProjects(
        projects.filter(
          (p) =>
            p.name?.toLowerCase().includes(kw) ||
            p.code?.toLowerCase().includes(kw) ||
            p.description?.toLowerCase().includes(kw)
        )
      );
    }
    setCurrentPage(1);
  }, [searchKeyword, projects]);

  const refetch = async () => {
    const res = await fetch('/api/workspace-management/project');
    const data = await res.json();
    const list = data.projects || [];
    setProjects(list);
    setFilteredProjects(list);
  };

  if (isLoading) return <LoadingSpin />;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Project</h1>
      <div className="flex items-center justify-between gap-4">
        <SearchInput value={searchKeyword} onChange={(e) => setSearchKeyword(e.target.value)} />
        {canCreateProject && (
          <Link
            href="/workspace-management/project/new"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            Add Project
          </Link>
        )}
      </div>

      {error && <div className="text-red-500 py-4">{error}</div>}

      <Card>
        <Table>
          <thead>
            <TableHeaderRow>
              <TableHead>#</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="w-16" />
            </TableHeaderRow>
          </thead>
          <tbody>
            {currentProjects.length === 0 ? (
              <TableEmptyRow colSpan={5}>{searchKeyword.trim() ? 'No matches' : 'No projects'}</TableEmptyRow>
            ) : (
              currentProjects.map((project, i) => (
                <TableBodyRow key={project.id}>
                  <TableCell>{startIndex + i + 1}</TableCell>
                  <TableCell>{project.code}</TableCell>
                  <TableCell>{project.name}</TableCell>
                  <TableCell>{project.description || '-'}</TableCell>
                  <TableCell>
                    <ProjectActions
                      projectId={project.id}
                      onDelete={refetch}
                      canEdit={canEditProject}
                      canDelete={canDeleteProject}
                    />
                  </TableCell>
                </TableBodyRow>
              ))
            )}
          </tbody>
        </Table>
      </Card>
      <Pagination
        currentPage={currentPage}
        totalItems={filteredProjects.length}
        itemsPerPage={itemsPerPage}
        onPageChange={setCurrentPage}
      />
    </div>
  );
}
