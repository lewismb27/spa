"use client";
import { PreferenceType, Role } from "@prisma/client";
import { User } from "next-auth";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  useInstanceParams,
  useInstancePath,
} from "@/components/params-context";
import DataTable from "@/components/ui/data-table/data-table";

import { api } from "@/lib/trpc/client";
import { ProjectTableDataDto } from "@/lib/validations/dto/project";
import { StudentPreferenceType } from "@/lib/validations/student-preference";

import { ToastSuccessCard } from "@/components/toast-success-card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { constructColumns } from "./all-projects-columns";

export function AllProjectsDataTable({
  data,
  user,
  role,
  projectPreferences,
}: {
  data: ProjectTableDataDto[];
  user: User;
  role: Role;
  projectPreferences: Map<string, PreferenceType>;
}) {
  const params = useInstanceParams();
  const instancePath = useInstancePath();
  const router = useRouter();

  const { mutateAsync: deleteAsync } = api.project.delete.useMutation();
  const { mutateAsync: deleteAllAsync } =
    api.project.deleteSelected.useMutation();

  async function handleDelete(projectId: string) {
    void toast.promise(
      deleteAsync({ params, projectId }).then(() => router.refresh()),
      {
        loading: "Deleting project...",
        error: "Something went wrong",
        success: `Successfully deleted project ${projectId}`,
      },
    );
  }

  async function handleDeleteSelected(projectIds: string[]) {
    void toast.promise(
      deleteAllAsync({ params, projectIds }).then(() => router.refresh()),
      {
        loading: "Deleting selected projects...",
        error: "Something went wrong",
        success: `Successfully deleted ${projectIds.length} projects`,
      },
    );
  }

  const { mutateAsync: changePreferenceAsync } =
    api.user.student.preference.update.useMutation();

  const { mutateAsync: changeSelectedPreferencesAsync } =
    api.user.student.preference.updateSelected.useMutation();

  async function handleChangePreference(
    preferenceType: StudentPreferenceType,
    projectId: string,
  ) {
    void toast.promise(
      changePreferenceAsync({
        params,
        preferenceType,
        projectId,
      }).then(() => router.refresh()),
      {
        loading: "Updating project preference...",
        error: "Something went wrong",
        success: (
          <ToastSuccessCard
            message="Successfully updated project preference"
            action={
              <Link
                href={`${instancePath}/my-preferences`}
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "flex h-full w-max items-center gap-2 self-end py-3 text-xs",
                )}
              >
                view &quot;My Preferences&quot;
              </Link>
            }
          />
        ),
      },
    );
  }

  async function handleChangeSelectedPreferences(
    preferenceType: StudentPreferenceType,
    projectIds: string[],
  ) {
    void toast.promise(
      changeSelectedPreferencesAsync({
        params,
        preferenceType,
        projectIds,
      }).then(() => router.refresh()),
      {
        loading: "Updating all project preferences...",
        error: "Something went wrong",
        success: (
          <ToastSuccessCard
            message={`Successfully updated ${projectIds.length} project preferences`}
            action={
              <Link
                href={`${instancePath}/my-preferences`}
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "flex h-full w-max items-center gap-2 self-end py-3 text-xs",
                )}
              >
                view &quot;My Preferences&quot;
              </Link>
            }
          />
        ),
      },
    );
  }

  const columns = constructColumns({
    user,
    role,
    projectPreferences,
    deleteProject: handleDelete,
    deleteSelectedProjects: handleDeleteSelected,
    changePreference: handleChangePreference,
    changeSelectedPreferences: handleChangeSelectedPreferences,
  });

  return (
    <DataTable
      searchableColumn={{ id: "title", displayName: "Project Titles" }}
      className="w-full"
      columns={columns}
      data={data}
    />
  );
}
