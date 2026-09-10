import { GridElement } from "../../components/GridstackGrid/GridstackGrid"
import { Widget } from "../common/Widget"
import { TableStatic, widgetHeightChange } from "../../../lib/web-components/Table/Table"
import { createSignal } from "solid-js"
import { ApiFetcher } from "../../components/ApiFetcher/ApiFetcher"
import type { apiMessageSimple } from "../../../lib/api-messages/apiMessageSimple"
import { Button } from "../../../lib/web-components/Button/Button"
import { useModalWindow } from "../../../lib/web-components/ModalWindow/ModalWindow"
import { reactorApiTarget } from "../../../lib/api-messages/apiMessageConfig"

interface CanStatisticsProps{
    id:string
}

type row = {
    label:string,
    value: apiMessageSimple,
    unit? : string,
    decimalPlaces? : number
}

function renderRow(value : row, index : number){
    return ([
        <p style={{"justify-content":"left"}}>{value.label}</p>,
        <p style={{"justify-content":"right"}}>
            <ApiFetcher
                numberOnly={(value.decimalPlaces)?{decimalPlaces:value.decimalPlaces}:undefined}
                target={value.value}
                unit={value.unit}
            ></ApiFetcher>
        </p>
    ])
}

export function CanStatistics(props:CanStatisticsProps){
    const [rows,setRows] = createSignal<row[]>([
       {
            label: "RX packets",
            value: { url: "/system/can/rx_packets", key: "rx_packets", target:reactorApiTarget},
            decimalPlaces: 0
        },{
            label: "TX packets",
            value: { url: "/system/can/tx_packets", key: "tx_packets", target:reactorApiTarget},
            decimalPlaces: 0
        },{
            label: "RX errors",
            value: { url: "/system/can/rx_errors", key: "rx_errors", target:reactorApiTarget},
            decimalPlaces: 0
        },{
            label: "TX errors",
            value: { url: "/system/can/tx_errors", key: "tx_errors", target:reactorApiTarget},
            decimalPlaces: 0
        },{
            label: "RX dropped",
            value: { url: "/system/can/rx_dropped", key: "rx_dropped", target:reactorApiTarget},
            decimalPlaces: 0
        },{
            label: "TX dropped",
            value: { url: "/system/can/tx_dropped", key: "tx_dropped", target:reactorApiTarget},
            decimalPlaces: 0
        },{
            label: "collisions",
            value: { url: "/system/can/collisions", key: "collisions", target:reactorApiTarget},
            decimalPlaces: 0
        }
    ])


    return (
        <GridElement id={props.id} w={1} h={widgetHeightChange(rows().length)}>
            <Widget name="Can statistics">
                <TableStatic
                    data={rows()}
                    headers={["field","value"]}
                    colSizes={[undefined,"150px"]}
                    renderRow={renderRow}
                    fillHeight={true}
             ></TableStatic>
            </Widget>
        </GridElement>
    )
}
