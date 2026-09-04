import { createEffect, createSignal } from "solid-js"
import { GridElement } from "../../components/GridstackGrid/GridstackGrid"
import { TableStatic, widgetHeightChange } from "../../../lib/web-components/Table/Table"
import { Widget } from "../common/Widget"

import styles from "./ServiceStatus.module.css"
import { Services  as ServicesStatusNamespace} from "../../apiMessages/services/_"
import { refreshValueUpdate, useRefreshContext } from "../../../lib/web-components/other/RefreshProvider"
import { AutoScrollerP } from "../../../lib/web-components/AutoScroller/AutoScroller"
import { timeElapsedString } from "../../../lib/web-components/other/utils"
import { Time } from "../../apiMessages/time/_"

interface ServiceStatusProps{
    id:string
}
interface ServiceStatusBodyProps extends ServiceStatusProps{
    rowLenSetter : (value:number)=>void;
}

type row= {
    state: string,
    stateType : ServicesStatusNamespace.stateTypes
    name: string,
    stateSince : Date
}

function getStateDuration(sinceTime : Date, deviceTime : Date | undefined) {
    if (deviceTime) {
        let roundedTime = deviceTime.getTime() - sinceTime.getTime()
        roundedTime = roundedTime - (roundedTime % 1000)
        if (roundedTime < 0) {
            return "---"
        }
        return timeElapsedString(roundedTime,{maxTimeStrings: 2, excludeLabel: true, shortLabels: true})
    } else {
        return "---"
    }
}

function renderRow(value : row, index : number){
    let state = styles.warning;
    switch(value.stateType){
        case "ok":
            state=styles.ok;
            break;
        case "critical-problem":
            state=styles.error;
            break;
        default:
            break;
    }

    return([
        <p classList={{
            [state]:true,
            [styles.service_status]:true
        }}>{value.state}</p>,
        <AutoScrollerP value={value.name.slice(0,-8)}></AutoScrollerP>,
        <AutoScrollerP value={getStateDuration(value.stateSince,Time.deviceTime())}></AutoScrollerP>
    ])
}


export function ServicesStatusBody(props : ServiceStatusBodyProps){
    const [rows, setRows] = createSignal<row[]>([])
    const refreshCntxt = useRefreshContext();

    createEffect(async ()=>{
        if(!refreshValueUpdate(refreshCntxt?.listen())){
            return;
        }
        try {
            let result = await ServicesStatusNamespace.sendServicesStatus();
            let newRows : row[] = [];
            for(let service of result.services){
                newRows.push({
                    name: service.name,
                    stateSince: service.since,
                    state: service.activeState,
                    stateType: service.stateType
                })
            }
            setRows(newRows);
        } catch (error) {
            setRows([]);
            throw error;
        }
    })

    createEffect(()=>{
        props.rowLenSetter(rows().length)
    })


    return(
        <TableStatic
            data={rows()}
            headers={["state","service name","in this state for"]}
            colSizes={["80px",undefined,"80px"]}
            renderRow={renderRow}
            fillHeight={true}
        ></TableStatic>
    )
}

export function ServicesStatus(props : ServiceStatusProps){
    const [rowNum, setRowNum] = createSignal<number>(1);

    return (
        <GridElement id={props.id} w={1} h={widgetHeightChange(rowNum())}>
            <Widget name="Service status">
                <ServicesStatusBody
                    {...props}
                    rowLenSetter={setRowNum}
                ></ServicesStatusBody>
            </Widget>
        </GridElement>
    )
}
