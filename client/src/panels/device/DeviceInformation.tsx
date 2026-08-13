import { GridElement } from "../../components/GridstackGrid/GridstackGrid"
import { Widget } from "../common/Widget"
import { TableStatic, widgetHeightChange } from "../../common/web-components/Table/Table"
import { createSignal, Show, type JSXElement } from "solid-js"
import { ApiFetcher } from "../../components/ApiFetcher/ApiFetcher"
import type { apiMessageSimple } from "../../apiMessages/apiMessageSimple"
import { Button } from "../../common/web-components/Button/Button"
import { Icon } from "../../components/Icon/Icon"
import { useModalWindow } from "../../common/web-components/ModalWindow/ModalWindow"
import styles from "./DeviceInformation.module.css"
import { System } from "../../apiMessages/system/_"

interface DeviceInformationProps{
    id:string
}

type row = {
    label:string,
    value: apiMessageSimple,
    unit? : string,
    numberOnly?: boolean,
    prefix? : ()=>JSXElement
}

function renderRow(value : row, index : number){
    return ([
        <p style={{"justify-content":"left"}}>{value.label}</p>,
        <p style={{"justify-content":"right"}}>
            {value.prefix?.()}
            <ApiFetcher
                numberOnly={(value.numberOnly)?{decimalPlaces:2}:undefined}
                target={value.value}
                unit={value.unit}
            ></ApiFetcher>
        </p>
    ])
}

function HostnameEditor() {
    let modalWindowCntxt = useModalWindow()
    if (modalWindowCntxt === undefined) {
        throw Error("modal window context needed")
    }

    let newHostname = ""

    return (
        <Button flat={true} tooltip='change the hostname' callback={() => modalWindowCntxt.popup(() => (
            <div class={styles.modal}>
                <div class={styles.warning_text}>
                    <h4>Warning</h4>
                    <p>Changing the hostname will cause the device to <span class="bold">restart</span>. Please, make sure no experiments are currently running.</p>
                </div>
                <div class={styles.separator}>
                    <input
                        type="text"
                        class={"button "+styles.input}
                        placeholder="enter the new hostname..."
                        oninput={(e) => {
                            let value = e.target.value;
                            if (value.length > 8) {
                                e.target.value = value.slice(0,8)
                            }
                            newHostname = e.target.value
                        }}
                    >
                    </input>
                    <Button
                        tooltip="change the hostname and restart the device"
                        class={styles.submit_button}
                        callback={async () => {
                            await System.sendHostname(newHostname);
                            modalWindowCntxt.close()
                        }}
                    >
                        Submit & restart
                    </Button>
                </div>

            </div>
        ))}>
            <Icon name='edit'></Icon>
        </Button>
    )
}


export function DeviceInformation(props:DeviceInformationProps){
    const [rows,setRows] = createSignal<row[]>([
       {
            label: "SID",
            value: { url: "/core/sid", key: "sid" }
        },{
            label: "IP address",
            value: { url: "/core/ip_address", key: "ipAddress" }
        },{
            label: "Hostname",
            value: { url: "/core/hostname", key: "hostname" },
            prefix: HostnameEditor
        }, {
            label: "Serial number",
            value: { url: "/core/serial", key: "serial" }
        },{
            label: "Supply voltage",
            value: { url: "/core/supply/5v", key: "voltage" },
            unit: "V",
            numberOnly: true
        },{
            label: "Supply vin",
            value: { url: "/core/supply/vin", key: "voltage" },
            unit: "V",
            numberOnly: true
        },{
            label: "Supply poe",
            value: { url: "/core/supply/poe", key: "voltage" },
            unit: "V",
            numberOnly: true
        },{
            label: "Supply current",
            value: { url: "/core/supply/current", key: "current" },
            unit: "A",
            numberOnly: true
        },{
            label: "Supply power_draw",
            value: { url: "/core/supply/power_draw", key: "power_draw" },
            unit: "W",
            numberOnly: true
        }
    ])

    return (
        <GridElement id={props.id} w={1} h={widgetHeightChange(rows().length)}>
            <Widget name="Device information">
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
