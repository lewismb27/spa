import { Stage } from "@prisma/client";

import { AccessControl } from "@/components/access-control";
import { Heading } from "@/components/heading";
import { PanelWrapper } from "@/components/panel-wrapper";

import { api } from "@/lib/trpc/server";
import { InstanceParams } from "@/lib/validations/params";

import { app, metadataTitle } from "@/content/config/app";
import { pages } from "@/content/pages";
import { MyReadingsDataTable } from "./_components/my-readings-data-table";

export async function generateMetadata({ params }: { params: InstanceParams }) {
    const { displayName } = await api.institution.instance.get({ params });
  
    return {
      title: metadataTitle([pages.myProjects.title, displayName, app.name]),
    };
  }

export default async function Page({ params }: { params: InstanceParams }) {
    // Will be : await api.user.reader.projects({ ????
    const { rowProjects } = await api.user.supervisor.projects({
        params,
      });

    return (
        <>
        <Heading>My Readings</Heading>
        <PanelWrapper className="pt-6">
        <AccessControl
          allowedStages={[Stage.ALLOCATION_PUBLICATION]}
        >
          <MyReadingsDataTable projects={rowProjects}/>
        </AccessControl>
      </PanelWrapper>
    </>
    );
}