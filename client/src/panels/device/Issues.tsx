import { createEffect, createSignal, For, Show, type JSXElement } from "solid-js"
import { GridElement } from "../../components/GridstackGrid/GridstackGrid"
import { Widget } from "../common/Widget"
import styles from "./Issues.module.css"
import { System } from "../../../lib/api-messages/system/_";
import { refreshValueUpdate, useRefreshContext } from "../../../lib/web-components/other/RefreshProvider";
import { ValueDisplay } from "../../../lib/web-components/ValueDisplay/ValueDisplay";
import { moduleInstanceColors, moduleInstances } from "../../../lib/common-types/Module";

function renderGeneric(issue: System.issueType) : JSXElement {
    return renderSpecific(
        issue,
        <>
            <p class={styles.name}>{issue.name}</p>
            <div class={styles.labeled_value}>
                <p>Value:</p>
                <ValueDisplay value={issue.value.toFixed(2)}></ValueDisplay>
            </div>
        </>,
        issue.index.toFixed(0)     
    )
}

function renderSpecific(issue: System.issueType, message: JSXElement, index: string | undefined = undefined): JSXElement {
    let timestampSplit = issue.timestamp.split("T");
    return (
        <div class={styles.issue} style={{"--instance-color":moduleInstanceColors[issue.instance]}}>
            <div class={styles.basic_info}>
                <div class={styles.basic_info}>
                    <div class={styles.labeled_value}>
                    <p>module:</p>
                    <p class={styles.module_name}>{issue.module} ({issue.instance})</p>
                    </div>
                    <Show when={index !== undefined}>
                        <div class={styles.labeled_value}>
                            <p>Index:</p>
                            <p>{index}</p>
                        </div>
                    </Show>
                </div>
                <div class={styles.time}>
                    <p>{timestampSplit[0]}</p>
                    <p>{timestampSplit[1]}</p>
                </div>
            </div>
            <div class={styles.values}>
                <p class={styles.id}>{issue.id}</p>
                <div class={styles.message}>
                    {message}
                </div>
            </div>
        </div>
    )
}

function renderTemperatureIssue(issue: System.issueType, tempTarget: string, index?: string): JSXElement {
    return renderSpecific(
        issue,
        <><p><b>{tempTarget}</b> temperature is too high (</p><ValueDisplay value={issue.value.toFixed(1)} unit="°C"></ValueDisplay><p>)</p></>
    );
}

function renderIssue(issue: System.issueType) : JSXElement{
    switch (issue.name) {
        case "HighLoad":
            return renderSpecific(
                issue,
                <><p><b>CPU</b> usage has reached a high threshold (</p><ValueDisplay value={issue.value.toFixed(1)} unit="%"></ValueDisplay><p>)</p></>
            );
        case "CoreOverTemp":
            return renderTemperatureIssue(issue,"CPU");
            
        case "BoardOverTemp":
            return renderTemperatureIssue(issue,"Board");
        case "Invalid5VSupply":
            return renderSpecific(
                issue,
                <><p><b>5V</b> supply is invalid</p></> //#TODO
            );
        case "InvalidVinSupply":
            return renderSpecific(
                issue,
                <><p><b>Vin</b> supply is invalid</p></> //#TODO
            );
        case "InvalidPoESupply":
            return renderSpecific(
                issue,
                <><p><b>PoE</b> supply is invalid</p></> //#TODO
            );
        case "OverCurrentDraw":
            return renderSpecific(
                issue,
                <><p><b>Current</b> draw over threshold: (</p><ValueDisplay value={issue.value.toFixed(1)} unit="A"></ValueDisplay><p>)</p></>
            );
        case "OverPowerDraw":
            return renderSpecific(
                issue,
                <><p><b>Power</b> draw over threshold: (</p><ValueDisplay value={issue.value.toFixed(1)} unit="A"></ValueDisplay><p>)</p></>
            );
        case "LEDPanelOverTemp":
            return renderTemperatureIssue(issue,"LED panel");
        case "HeaterOverTemp":
            return renderTemperatureIssue(issue,"Heater");
        case "MixerOverRPM":
            return renderTemperatureIssue(issue, "Mixer");
        case "BottleOverTemp":
            return renderTemperatureIssue(issue,"Bottle");
        case "BottleTopOverMeasTemp":
            return renderTemperatureIssue(issue,"Bottle (top)");
        case "BottleBottomOverMeasTemp":
            return renderTemperatureIssue(issue,"Bottle (bottom)");
        case "BottleTopOverSensorTemp":
            return renderTemperatureIssue(issue,"Bottle sensor (top)");
        case "BottleBottomOverSensorTemp":
            return renderTemperatureIssue(issue, "Bottle sensor (bottom)");
        case "FluorometerDetectorOverTemp":
            return renderTemperatureIssue(issue,"Fluorometer detector");
        case "FluorometerEmitorOverTemp":
            return renderTemperatureIssue(issue,"Fluorometer emitor");
        case "SpectrophotometerEmitorOverTemp":
            return renderTemperatureIssue(issue, "Spectroph... emitor");
        case "InvalidInstance": //#TODO not tested as it is not in the API (yet)
            return renderSpecific(
                issue,
                <><p>Invalid instance selected (</p><ValueDisplay value={moduleInstances[issue.index]}></ValueDisplay><p>)!</p></>
            )
        default:
            return renderGeneric(issue);
    }
}

interface ModuleIssuesProps {
    id: string
}

function ModuleIssuesBody(props : ModuleIssuesProps){
    const [issues , setIssues] = createSignal<System.issueType[] | undefined>(undefined)
    const [errorsOccured, setErrorsOccured] = createSignal<boolean>(false);

    const refreshCntxt = useRefreshContext();

    createEffect(async ()=>{
        if(!refreshValueUpdate(refreshCntxt?.listen())){
            return
        }

        try {
            let response = await System.sendIssues();

            setIssues(response.issues);
            setErrorsOccured(false);
        } catch (error) {
            setErrorsOccured(true);
            setIssues(undefined);
            throw error;
        }
    })


    return (
        <>
            <div class={styles.issue_count}>
                <p>Currently active issues:</p>
                <ValueDisplay value={issues()?.length.toString()} error={errorsOccured()}></ValueDisplay>
            </div>
            <div class={styles.issue_list_container}>
                <div class={styles.issue_list}>
                    <For each={issues() ?? []}>
                        {(el,index)=>(
                            renderIssue(el)
                        )}
                    </For>
                </div>
            </div>
        </>
    )
}

export function ModuleIssues(props: ModuleIssuesProps){
    
    return (
        <GridElement id={props.id} w={1} h={5}>
            <Widget name="Module issues">
                <ModuleIssuesBody {...props}></ModuleIssuesBody>
            </Widget>
        </GridElement>
    )
}
