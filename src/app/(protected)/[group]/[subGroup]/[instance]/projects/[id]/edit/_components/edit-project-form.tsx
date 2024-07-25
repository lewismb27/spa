"use client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { useInstanceParams } from "@/components/params-context";
import { ProjectForm } from "@/components/project-form";

import { api } from "@/lib/trpc/client";
import { formatParamsAsPath } from "@/lib/utils/general/get-instance-path";
import {
  CurrentProjectFormDetails,
  FormInternalData,
  UpdatedProject,
} from "@/lib/validations/project-form";

import { ProjectRemovalButton } from "./project-removal-button";

export function EditProjectForm({
  formInternalData,
  project,
  isForked,
}: {
  formInternalData: FormInternalData;
  project: CurrentProjectFormDetails;
  isForked: boolean;
}) {
  const params = useInstanceParams();
  const router = useRouter();
  const instancePath = formatParamsAsPath(params);

  const { mutateAsync: editAsync } = api.project.edit.useMutation();

  function onSubmit(data: UpdatedProject) {
    void toast.promise(
      editAsync({
        params,
        projectId: project.id,
        updatedProject: data,
      }).then(() => {
        router.push(`${instancePath}/projects/${project.id}`);
        router.refresh();
      }),
      {
        loading: `Updating Project ${project.id}...`,
        error: "Something went wrong",
        success: `Successfully updated Project ${project.id}`,
      },
    );
  }

  return (
    <ProjectForm
      formInternalData={formInternalData}
      project={project}
      isForked={isForked}
      submissionButtonLabel="Update Project"
      onSubmit={onSubmit}
    >
      <ProjectRemovalButton projectId={project.id} />
    </ProjectForm>
  );
}
