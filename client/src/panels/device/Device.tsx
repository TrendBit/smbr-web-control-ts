import { Show } from "solid-js";
import { GridstackGrid } from "../../components/GridstackGrid/GridstackGrid.tsx";
import { countInstancesOfType, useModuleListValue } from "../../components/other/ModuleListProvider.tsx";
import { DeviceInformation } from "./DeviceInformation.tsx";
import { ModuleListDisplay } from "./ModuleList.tsx";
import { ServicesStatus } from "./ServiceStatus.tsx";
import { CanStatistics } from "./CanStatistics.tsx";
import { ModuleProblems } from "./Problems.tsx";
import { ModuleIssues } from "./Issues.tsx";

export function Device() {
  const moduleListCntxt = useModuleListValue();


  return (
    <div  style={{ padding: "8px", "overflow-x": "hidden", "overflow-y" : "scroll"}}>
      <GridstackGrid>
          <ModuleListDisplay id="moduleList"></ModuleListDisplay>
          <ServicesStatus id="serviceStatus"></ServicesStatus>
          <Show when={countInstancesOfType(moduleListCntxt?.state(),"core","Exclusive")}>
            <DeviceInformation id="deviceInformation"></DeviceInformation>
          </Show>
          <CanStatistics id="canStatistics"></CanStatistics>
          <ModuleIssues id="issues"></ModuleIssues>
          <ModuleProblems id="problems"></ModuleProblems>
      </GridstackGrid>
    </div>
  );
}
