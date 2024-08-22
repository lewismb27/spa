import { Role, Stage } from "@prisma/client";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AccessControl } from "@/components/access-control";
import { Heading, SubHeading } from "@/components/heading";
import { MarkdownRenderer } from "@/components/markdown-editor";
import { PageWrapper } from "@/components/page-wrapper";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Unauthorised } from "@/components/unauthorised";

import { api } from "@/lib/trpc/server";
import { cn } from "@/lib/utils";
import { formatParamsAsPath } from "@/lib/utils/general/get-instance-path";
import { previousStages } from "@/lib/utils/permissions/stage-check";
import { InstanceParams } from "@/lib/validations/params";

import { StudentPreferenceButton } from "./_components/student-preference-button";

type PageParams = InstanceParams & { id: string };

export default async function Project({ params }: { params: PageParams }) {
  const projectId = params.id;
  const exists = await api.project.exists({
    params,
    projectId: params.id,
  });
  if (!exists) notFound();

  const instancePath = formatParamsAsPath(params);

  const { access, studentFlagLabel } = await api.project.getUserAccess({
    params,
    projectId,
  });

  if (!access) {
    return (
      <Unauthorised
        message={`This project is not suitable for ${studentFlagLabel} students`}
      />
    );
  }

  const project = await api.project.getById({ projectId });
  const user = await api.user.get();
  const role = await api.user.role({ params });

  let preAllocated = false;
  if (role === Role.STUDENT) {
    preAllocated = !!(await api.user.student.isPreAllocated({ params }));
  }

  const preferenceStatus = await api.user.student.preference.getForProject({
    params,
    projectId,
  });

  return (
    <PageWrapper>
      <Heading
        className={cn(
          "flex items-center justify-between gap-2",
          project.title.length > 30 && "text-3xl",
        )}
      >
        {project.title}
        <AccessControl
          allowedRoles={[Role.STUDENT]}
          allowedStages={[Stage.PROJECT_SELECTION]}
          extraConditions={{ RBAC: { AND: !preAllocated } }}
        >
          <StudentPreferenceButton
            projectId={projectId}
            defaultStatus={preferenceStatus}
          />
        </AccessControl>
        <AccessControl
          allowedRoles={[Role.ADMIN]}
          allowedStages={previousStages(Stage.PROJECT_SELECTION)}
          extraConditions={{ RBAC: { OR: project.supervisor.id === user.id } }}
        >
          <Link
            className={cn(buttonVariants(), "min-w-32 text-nowrap")}
            href={`${instancePath}/projects/${projectId}/edit`}
          >
            Edit or Delete
          </Link>
        </AccessControl>
      </Heading>
      <div className="mt-6 flex gap-6">
        <div className="flex w-3/4 flex-col gap-16">
          <div className="flex flex-col">
            <SubHeading>Description</SubHeading>
            <div className="mt-6">
              <MarkdownRenderer source={project.description} />
            </div>
          </div>
          <div
            className={cn(
              "flex flex-col",
              project.specialTechnicalRequirements === "" && "hidden",
            )}
          >
            <SubHeading>Special Technical Requirements</SubHeading>
            <p className="mt-6">{project.specialTechnicalRequirements}</p>
          </div>
        </div>
        <div className="flex w-1/4 flex-col gap-5 rounded-md bg-accent px-5 py-3">
          <div>
            <h2 className="text-lg font-bold text-primary underline decoration-secondary decoration-[3px] underline-offset-2">
              Supervisor:
            </h2>
            {role === Role.ADMIN ? (
              <Link
                className={cn(buttonVariants({ variant: "link" }), "text-lg")}
                href={`../supervisors/${project.supervisor.id}`}
              >
                {project.supervisor.name}
              </Link>
            ) : (
              <p className="p-2 text-lg">{project.supervisor.name}</p>
            )}
          </div>
          <div>
            <h2
              className={cn(
                "mb-2 text-lg font-bold text-primary underline decoration-secondary decoration-[3px] underline-offset-2",
                project.flags.length === 0 && "hidden",
              )}
            >
              Flags:
            </h2>
            <div className="flex flex-wrap gap-2">
              {project.flags.map((flag, i) => (
                <Badge key={i} variant="outline">
                  {flag.title}
                </Badge>
              ))}
            </div>
          </div>
          <div>
            <h2
              className={cn(
                "mb-2 text-lg font-bold text-primary underline decoration-secondary decoration-[3px] underline-offset-2",
                project.tags.length === 0 && "hidden",
              )}
            >
              Keywords:
            </h2>
            <div className="flex flex-wrap gap-2">
              {project.tags.map((tag, i) => (
                <Badge key={i} variant="outline">
                  {tag.title}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
