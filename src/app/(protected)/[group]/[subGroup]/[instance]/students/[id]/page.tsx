import { Heading } from "@/components/heading";
import { PageWrapper } from "@/components/page-wrapper";

import { api } from "@/lib/trpc/server";
import { InstanceParams } from "@/lib/validations/params";

import { StudentPreferenceDataTable } from "./_components/student-preference-data-table";

interface pageParams extends InstanceParams {
  id: string;
}

export default async function Student({ params }: { params: pageParams }) {
  const { user: student } = await api.user.student.getById({
    params,
    studentId: params.id,
  });

  const data = await api.user.student.preference.getAll({
    params,
    studentId: params.id,
  });

  const role = await api.user.role({ params });
  const stage = await api.institution.instance.currentStage({ params });

  return (
    <PageWrapper>
      <Heading>{student.name}</Heading>
      <StudentPreferenceDataTable role={role} stage={stage} data={data} />
    </PageWrapper>
  );
}
